/**
 * File: process-tryon/index.ts
 * Purpose: Virtual try-on sử dụng Replicate API với model google/gemini-2.5-flash-image
 * Layer: Application
 *
 * Data Contract:
 * - Input (try-on): { model_image: base64|url, clothing_images: [{image: base64|url, category, name}], quality: 'standard'|'hd' }
 * - Input (edit):   { model_image: base64|url, edit_mode: true, edit_prompt: string }
 * - Output: { tryon_id, result_image_url, result_image: base64, gems_remaining, gems_used, cached }
 *
 * Flow:
 * 1. Validate JWT → extract user_id
 * 2. Rate limit check (5 req/min)
 * 3. Validate request body
 * 4. Check gems balance
 * 5. Check cache
 * 6. Deduct gems atomically
 * 7. Load system_prompt từ ai_config table
 * 8. Upload images tạm thời lên Supabase Storage (Replicate cần URL public)
 * 9. Gọi Replicate API với model google/gemini-2.5-flash-image
 * 10. Polling kết quả từ Replicate (async prediction)
 * 11. Upload result image vào Storage
 * 12. Save tryon_history record
 * 13. Return result
 *
 * Security Note:
 * - JWT validation bắt buộc
 * - REPLICATE_API_KEY lưu trong Supabase Secrets
 * - Rate limit 5 req/min per user
 */

// @ts-nocheck — Deno runtime file: deno.land và Deno.env không được VS Code TS server nhận dạng

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Rate Limiting handled via Database Query (see below)

// =============================================
// REPLICATE API HELPER
// =============================================

const REPLICATE_API_BASE = 'https://api.replicate.com/v1'
const REPLICATE_MODEL = 'google/gemini-2.5-flash-image'

interface ReplicateInput {
  prompt: string
  image?: string       // URL ảnh model (người mặc)
  images?: string[]    // Multiple images (model + clothing)
  image_input?: string[] // Array of URIs for google/gemini-2.5-flash-image
}

interface ReplicatePrediction {
  id: string
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled'
  output?: string | string[] | null
  error?: string
  urls?: { get: string }
}

/**
 * Tạo Replicate prediction với model google/gemini-2.5-flash-image
 * Model này nhận multiple images + text prompt và generate/edit image
 */
async function createReplicatePrediction(
  apiKey: string,
  input: ReplicateInput
): Promise<ReplicatePrediction> {
  const response = await fetch(`${REPLICATE_API_BASE}/models/${REPLICATE_MODEL}/predictions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'wait=60', // Synchronous wait up to 60s
    },
    body: JSON.stringify({ input }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Replicate API error ${response.status}: ${errorText}`)
  }

  return response.json()
}

/**
 * Poll Replicate prediction cho đến khi hoàn thành
 * Timeout sau maxWaitMs (default 180s)
 */
async function pollReplicatePrediction(
  apiKey: string,
  predictionId: string,
  maxWaitMs = 180000,
  intervalMs = 3000
): Promise<ReplicatePrediction> {
  const startTime = Date.now()

  while (Date.now() - startTime < maxWaitMs) {
    const response = await fetch(`${REPLICATE_API_BASE}/predictions/${predictionId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })

    if (!response.ok) {
      throw new Error(`Poll error ${response.status}: ${await response.text()}`)
    }

    const prediction: ReplicatePrediction = await response.json()

    if (prediction.status === 'succeeded') return prediction
    if (prediction.status === 'failed' || prediction.status === 'canceled') {
      throw new Error(`Prediction ${prediction.status}: ${prediction.error || 'Unknown error'}`)
    }

    // Chưa xong, đợi interval rồi poll tiếp
    await new Promise(resolve => setTimeout(resolve, intervalMs))
  }

  throw new Error('Replicate prediction timeout sau 180 giây')
}

/**
 * Extract URL ảnh kết quả từ Replicate output
 */
function extractResultUrl(output: string | string[] | null | undefined): string {
  if (!output) throw new Error('Replicate không trả về output')
  if (typeof output === 'string') return output
  if (Array.isArray(output) && output.length > 0) return output[0]
  throw new Error('Replicate output format không hợp lệ')
}

// =============================================
// CACHE KEY HELPER
// =============================================

async function generateCacheKey(
  modelImageData: string,
  clothingImagesData: string[],
  quality: string
): Promise<string> {
  const content = [
    modelImageData.slice(0, 500),
    ...clothingImagesData.map(img => img.slice(0, 500)),
    quality
  ].join('|')

  const encoder = new TextEncoder()
  const data = encoder.encode(content)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32)
}

// =============================================
// STORAGE HELPER — Upload base64 image
// =============================================

/**
 * Upload base64 ảnh đầu vào tạm thời vào bucket 'user-models'
 * Bucket này public và có RLS policy cho phép user upload
 * Path: temp-inputs/{userId}/{filename}
 */
async function uploadBase64ToStorage(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  base64Data: string,
  _folder: string, // kept for API compat, ignored
  mimeType = 'image/jpeg'
): Promise<string> {
  const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '')
  const bytes = Uint8Array.from(atob(cleanBase64), c => c.charCodeAt(0))
  const ext = mimeType.includes('png') ? 'png' : 'jpg'
  const filename = `${crypto.randomUUID()}.${ext}`
  // Dùng bucket 'user-models' — public + có RLS policy theo userId
  const path = `${userId}/temp-inputs/${filename}`

  const { error } = await supabase.storage
    .from('user-models')
    .upload(path, bytes, { contentType: mimeType, upsert: false })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)

  const { data: { publicUrl } } = supabase.storage.from('user-models').getPublicUrl(path)
  return publicUrl
}

/**
 * Upload ảnh kết quả từ URL Replicate vào bucket 'tryon-results'
 * Bucket này public và có RLS policy cho phép lưu kết quả
 * Path: {userId}/{filename}
 */
async function uploadUrlToStorage(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  imageUrl: string,
  _folder: string // kept for API compat, ignored
): Promise<string> {
  const imgResponse = await fetch(imageUrl)
  if (!imgResponse.ok) throw new Error(`Không fetch được ảnh: ${imageUrl}`)

  const contentType = imgResponse.headers.get('content-type') || 'image/jpeg'
  const bytes = new Uint8Array(await imgResponse.arrayBuffer())
  const ext = contentType.includes('png') ? 'png' : 'jpg'
  const filename = `${crypto.randomUUID()}.${ext}`
  // Dùng bucket 'tryon-results' — public + có RLS policy theo userId
  const path = `${userId}/${filename}`

  const { error } = await supabase.storage
    .from('tryon-results')
    .upload(path, bytes, { contentType, upsert: false })

  if (error) throw new Error(`Storage upload failed: ${error.message}`)

  const { data: { publicUrl } } = supabase.storage.from('tryon-results').getPublicUrl(path)
  return publicUrl
}

// =============================================
// PROMPT BUILDER — Phân tích ảnh & build prompt thông minh
// =============================================

interface ClothingItem {
  category: string
  name?: string
  image_type?: string  // 'flatlay' | 'mannequin' | 'worn' | 'product' | 'lifestyle' | 'unknown'
  color?: string
  material?: string
}

interface PromptBuilderInput {
  systemPrompt: string
  quality: string
  clothingItems: ClothingItem[]
  totalImages: number
}

/**
 * Build user-facing prompt cho Replicate model.
 * Phân tích metadata từng item để hướng dẫn model
 * xử lý đúng với nhiều loại ảnh đầu vào không chuẩn.
 */
function buildTryOnPrompt(input: PromptBuilderInput): string {
  const { quality, clothingItems, totalImages } = input

  // --- IMAGE MAPPING SECTION ---
  const imageMapLines: string[] = [
    `IMPORTANT - Image assignment:`,
    `• Image 1 = The person/model to dress (may be full-body, half-body, seated, angled, or any pose)`,
  ]

  clothingItems.forEach((item, idx) => {
    const imageNum = idx + 2
    const label = item.name || item.category
    const typeHint = describeClothingImageType(item.image_type)
    const colorHint = item.color ? `, color: ${item.color}` : ''
    const materialHint = item.material ? `, material: ${item.material}` : ''
    imageMapLines.push(`• Image ${imageNum} = Clothing item: "${label}" (${item.category}${colorHint}${materialHint}) — photo type: ${typeHint}`)
  })

  // --- ANALYSIS INSTRUCTION SECTION ---
  const analysisLines: string[] = [
    `\nSTEP 1 — ANALYZE ALL IMAGES BEFORE PROCESSING:`,
    `• Image 1 (person): Identify pose (standing/seated/angled), visible body parts, body proportions, existing clothing to replace, skin tone, lighting direction`,
  ]

  clothingItems.forEach((item, idx) => {
    const imageNum = idx + 2
    analysisLines.push(
      `• Image ${imageNum} (clothing): Identify exact garment boundaries, color, fabric type, pattern, front/back orientation, fit style (slim/regular/oversized)`
    )
  })

  // --- CONSTRAINTS SECTION (CRITICAL) ---
  const applyLines: string[] = [
    `\nSTEP 2 — STRICT CONSTRAINTS (CRITICAL):`,
    `1. IDENTITY PRESERVATION (CRITICAL):`,
    `   - The person's face, hair style, hair color, skin tone, body shape, and pose MUST remain exactly identical to Image 1.`,
    `   - The background must remain completely unchanged.`,
    `   - Any tattoos, accessories (unless explicitly replaced), and distinguishing features must be preserved.`,
    `2. CLOTHING PLACEMENT (CRITICAL):`,
    `   - Apply ALL ${clothingItems.length} clothing item(s) simultaneously to the person in Image 1.`,
    `   - Fit the clothing naturally to the person's body proportions and pose, respecting gravity and drape.`,
    `   - Layering order: Base layers first, outerwear last, accessories on top.`,
    `   - If the person is not full-body, only apply the parts of the clothing that should be visible in the frame.`,
    `3. COLOR & DESIGN ACCURACY (CRITICAL):`,
    `   - The color, pattern, texture, and text/graphics on the clothing MUST match the source clothing images exactly.`,
    `   - Do not hallucinate details or change the design of the garments.`,
    `4. LIGHTING & SHADOWS:`,
    `   - The lighting, highlights, and shadows on the clothing must match the environmental lighting of Image 1.`,
  ]

  // --- QUALITY SECTION ---
  const qualityLine = quality === 'hd'
    ? `\nOUTPUT: Ultra HD photorealistic result. Maximum detail in fabric texture, stitching, and fit. Zero visible AI artifacts. Seams between clothing and skin must be flawless.`
    : `\nOUTPUT: High-quality photorealistic result. Clean edges, natural fabric appearance. No visible AI artifacts.`

  // --- FALLBACK RULE ---
  const fallbackLine = `\nFALLBACK: If any input image is unclear, make a best-effort attempt based on available information. Do NOT fail — always produce a photorealistic result.`

  return [
    imageMapLines.join('\n'),
    analysisLines.join('\n'),
    applyLines.join('\n'),
    qualityLine,
    fallbackLine,
    `\nTotal images provided: ${totalImages} (1 person + ${clothingItems.length} clothing)`,
  ].join('\n')
}

/**
 * Mô tả loại ảnh quần áo bằng ngôn ngữ tự nhiên cho model hiểu
 */
function describeClothingImageType(imageType?: string): string {
  const typeMap: Record<string, string> = {
    flatlay: 'flat lay on surface',
    mannequin: 'on mannequin/dress form',
    worn: 'worn by another model',
    product: 'product photo (plain background)',
    lifestyle: 'lifestyle/editorial photo',
    unknown: 'unspecified — analyze and extract appropriately',
  }
  return typeMap[imageType || 'unknown'] || 'unspecified — analyze and extract appropriately'
}

// =============================================
// MAIN HANDLER
// =============================================

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const startTime = Date.now()

  try {
    // 1. Validate JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      console.error('[process-tryon] ❌ Missing Authorization header')
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // ✅ DEBUG: Log thông tin token để diagnose 401
    const tokenPart = authHeader.replace('Bearer ', '')
    console.log('[process-tryon] 🔑 Auth header present, token length:', tokenPart.length)
    console.log('[process-tryon] 🔑 Token prefix (20 chars):', tokenPart.substring(0, 20))

    // Decode JWT payload để xem expiry (không verify, chỉ để debug)
    try {
      const parts = tokenPart.split('.')
      if (parts.length === 3) {
        const payload = JSON.parse(atob(parts[1]))
        const expMs = (payload.exp || 0) * 1000
        const nowMs = Date.now()
        const diffSec = Math.floor((expMs - nowMs) / 1000)
        console.log('[process-tryon] 🔑 JWT payload - sub:', payload.sub)
        console.log('[process-tryon] 🔑 JWT payload - role:', payload.role)
        console.log('[process-tryon] 🔑 JWT exp:', new Date(expMs).toISOString())
        console.log('[process-tryon] 🔑 JWT status:', diffSec > 0 ? `Valid (còn ${diffSec}s)` : `EXPIRED ${Math.abs(diffSec)}s ago`)
        console.log('[process-tryon] 🔑 JWT iss:', payload.iss)
      } else {
        console.warn('[process-tryon] ⚠️ Token không phải JWT format (parts:', parts.length, ')')
      }
    } catch (decodeErr) {
      console.warn('[process-tryon] ⚠️ Không decode được JWT:', decodeErr)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const replicateApiKey = Deno.env.get('REPLICATE_API_KEY')

    if (!replicateApiKey) {
      console.error('REPLICATE_API_KEY không có trong Supabase Secrets')
      return new Response(JSON.stringify({ error: 'AI service not configured' }), {
        status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // userClient: authenticated with user JWT — for auth check, rate limit, gems
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    // serviceClient: authenticated with service_role key — for post-AI operations
    // (storage upload, save history) that may happen after user JWT expires
    const serviceClient = createClient(supabaseUrl, serviceRoleKey)

    console.log('[process-tryon] 🔑 Calling supabase.auth.getUser()...')
    const { data: { user }, error: authError } = await userClient.auth.getUser(tokenPart)
    if (authError || !user) {
      console.error('[process-tryon] ❌ Auth failed:', authError?.message, '| user:', user)
      return new Response(JSON.stringify({
        error: 'Unauthorized',
        detail: authError?.message || 'No user found'
      }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }
    console.log('[process-tryon] ✅ Auth success, userId:', user.id)

    const userId = user.id

    // 2. Rate limit (Database-backed for scalability)
    // Check request count in the last 60 seconds
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000).toISOString()
    const { count: requestCount, error: countError } = await userClient
      .from('tryon_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gt('created_at', oneMinuteAgo)

    if (countError) {
      console.error('[process-tryon] Rate limit check error:', countError)
    } else if (requestCount !== null && requestCount >= 5) {
      return new Response(JSON.stringify({
        error: 'RATE_LIMIT_EXCEEDED',
        message: 'Bạn đã đạt giới hạn 5 lần thử/phút. Vui lòng đợi giây lát.',
        reset_in: '60s'
      }), { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 3. Parse request
    const body = await req.json()
    const { model_image, clothing_images, quality = 'standard', edit_mode = false, edit_prompt } = body

    if (!model_image) {
      return new Response(JSON.stringify({ error: 'model_image là bắt buộc' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Edit mode: chỉ cần model_image + edit_prompt
    if (edit_mode) {
      if (!edit_prompt || typeof edit_prompt !== 'string' || edit_prompt.trim().length === 0) {
        return new Response(JSON.stringify({ error: 'edit_prompt là bắt buộc khi edit_mode=true' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    } else {
      // Try-on mode: cần clothing_images
      if (!clothing_images || !Array.isArray(clothing_images) || clothing_images.length === 0) {
        return new Response(JSON.stringify({ error: 'clothing_images array là bắt buộc' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
      if (clothing_images.length > 5) {
        return new Response(JSON.stringify({ error: 'Tối đa 5 món đồ mỗi lần thử' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }
    }

    // 4. Load ai_config
    const { data: aiConfig } = await userClient
      .from('ai_config')
      .select('system_prompt, cost_standard, cost_hd')
      .eq('id', 'default')
      .single()

    const systemPrompt = aiConfig?.system_prompt || ''
    // Edit mode luôn tốn 1 gem (standard cost)
    const gemsRequired = edit_mode
      ? (aiConfig?.cost_standard || 1)
      : (quality === 'hd' ? (aiConfig?.cost_hd || 2) : (aiConfig?.cost_standard || 1))

    // 5. Check gems balance
    const { data: profile, error: profileError } = await userClient
      .from('profiles')
      .select('gems_balance')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: 'Không tìm thấy profile người dùng' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (profile.gems_balance < gemsRequired) {
      return new Response(JSON.stringify({
        error: 'INSUFFICIENT_GEMS',
        message: `Không đủ gems. Cần ${gemsRequired}, hiện có ${profile.gems_balance}.`,
        gems_balance: profile.gems_balance,
        gems_required: gemsRequired
      }), { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 6. Check cache (bỏ qua cache cho edit mode vì mỗi edit prompt khác nhau)
    let cacheKey = ''
    if (!edit_mode) {
      const clothingDataList = clothing_images.map((c: { image: string }) => c.image)
      cacheKey = await generateCacheKey(model_image, clothingDataList, quality)

      const { data: cachedResult } = await userClient
        .from('tryon_history')
        .select('id, result_image_url')
        .eq('cache_key', cacheKey)
        .eq('status', 'completed')
        .not('result_image_url', 'is', null)
        .limit(1)
        .maybeSingle()

      if (cachedResult?.result_image_url) {
        console.log('[process-tryon] Cache hit:', cacheKey)
        return new Response(JSON.stringify({
          tryon_id: cachedResult.id,
          result_image_url: cachedResult.result_image_url,
          gems_remaining: profile.gems_balance,
          gems_used: 0,
          cached: true,
          processing_time_ms: Date.now() - startTime
        }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }

    // 7. Deduct gems atomically
    const { data: newBalance, error: deductError } = await userClient.rpc('deduct_gems_atomic', {
      p_user_id: userId,
      p_amount: gemsRequired,
      p_tryon_id: null,
    })

    if (deductError) {
      return new Response(JSON.stringify({
        error: 'GEM_DEDUCTION_FAILED',
        message: 'Lỗi khi trừ gems. Vui lòng thử lại.'
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 8. Chuẩn bị images + prompt cho Replicate
    let modelImageUrl: string
    let clothingImageUrls: string[] = []
    let sortedClothing: typeof clothing_images = []
    let finalPrompt: string

    try {
      // Upload model/source image
      if (model_image.startsWith('http')) {
        modelImageUrl = model_image
      } else {
        modelImageUrl = await uploadBase64ToStorage(userClient, userId, model_image, 'temp-inputs', 'image/jpeg')
      }

      if (edit_mode) {
        // === EDIT MODE ===
        // Chỉ cần 1 ảnh gốc + edit prompt
        finalPrompt = `You are a photorealistic image editor. Edit the following image according to this instruction: "${edit_prompt.trim()}"

CRITICAL CONSTRAINTS — MUST FOLLOW:

1. FACE & IDENTITY PRESERVATION (HIGHEST PRIORITY):
   - The person's FACE must remain PIXEL-IDENTICAL to the original: same facial structure, eyes, nose, mouth, jawline, cheekbones, skin tone, facial hair, and all distinguishing facial features.
   - Do NOT alter face shape, skin color, eye size, or any facial proportions under ANY circumstance.
   - If the edit involves the head area (adding/removing hats, changing hair, headwear, helmets, glasses), the face underneath MUST stay exactly the same — only the requested item changes.
   - Hair style and hair color should remain unchanged UNLESS the edit instruction explicitly asks to change them.

2. BODY PRESERVATION:
   - Body shape, proportions, pose, hands, skin tone, and height must remain identical.
   - Only modify the specific area or item mentioned in the instruction.

3. BACKGROUND & COMPOSITION:
   - Background must remain completely unchanged.
   - Camera angle, framing, and overall composition must stay identical.
   - Lighting direction and intensity must remain consistent.

4. EDIT SCOPE:
   - ONLY change what the instruction explicitly asks for. Nothing else.
   - Apply the change naturally with correct perspective, lighting, and shadows.
   - Ensure seamless blending at boundaries between edited and original areas.

5. OUTPUT QUALITY:
   - Photorealistic result with no visible AI artifacts, seams, or distortions.
   - Maintain the same image resolution and quality as the original.`
        console.log('[process-tryon] EDIT MODE - prompt:', edit_prompt.trim().substring(0, 100))
      } else {
        // === TRY-ON MODE ===
        // Sort clothing items trước khi upload
        const catPriority: Record<string, number> = {
          dress: 1, top: 2, bottom: 3, outerwear: 4, shoes: 5, accessories: 6
        }
        sortedClothing = [...clothing_images].sort(
          (a: { category: string }, b: { category: string }) =>
            (catPriority[a.category] || 9) - (catPriority[b.category] || 9)
        )

        // Upload sorted clothing images
        clothingImageUrls = await Promise.all(
          sortedClothing.map(async (item: { image: string }, i: number) => {
            if (item.image.startsWith('http')) return item.image
            return uploadBase64ToStorage(userClient, userId, item.image, 'temp-inputs', 'image/jpeg')
          })
        )

        // Build prompt thông minh cho try-on
        finalPrompt = buildTryOnPrompt({
          systemPrompt,
          quality,
          clothingItems: sortedClothing,
          totalImages: 1 + sortedClothing.length,
        })
      }
    } catch (uploadError) {
      // Refund gems nếu upload thất bại
      await userClient.rpc('refund_gems_atomic', { p_user_id: userId, p_amount: gemsRequired, p_tryon_id: null })
      console.error('[process-tryon] Upload error:', uploadError)
      return new Response(JSON.stringify({
        error: 'UPLOAD_FAILED',
        message: 'Lỗi upload ảnh. Gems đã hoàn lại.'
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 10. Gọi Replicate API
    const modeLabel = edit_mode ? 'EDIT' : 'TRY-ON'
    console.log(`[process-tryon] [${modeLabel}] Calling Replicate ${REPLICATE_MODEL} for user ${userId}...`)
    console.log(`[process-tryon] Source image: ${modelImageUrl}`)
    console.log(`[process-tryon] Clothing images: ${clothingImageUrls.length} items`)

    // Replicate gemini-2.5-flash-image nhận multiple images
    const allImageUrls = edit_mode ? [modelImageUrl] : [modelImageUrl, ...clothingImageUrls]

    let prediction: ReplicatePrediction

    try {
      // Tạo prediction — Prefer: wait=60 sẽ chờ tối đa 60s synchronously
      prediction = await createReplicatePrediction(replicateApiKey, {
        prompt: finalPrompt,
        image_input: allImageUrls,
      })

      // Nếu chưa xong, poll tiếp
      if (prediction.status !== 'succeeded') {
        prediction = await pollReplicatePrediction(replicateApiKey, prediction.id, 180000, 3000)
      }
    } catch (replicateError) {
      // Refund gems khi Replicate thất bại
      await serviceClient.rpc('refund_gems_atomic', { p_user_id: userId, p_amount: gemsRequired, p_tryon_id: null })
      console.error('[process-tryon] Replicate error:', replicateError)

      let errorMsg = 'AI xử lý thất bại. Gems đã được hoàn lại. Vui lòng thử lại.'
      if (String(replicateError).includes('429')) {
        errorMsg = 'Hệ thống AI đang quá tải hoặc hết credits. Vui lòng thử lại sau vài giây.'
      }

      return new Response(JSON.stringify({
        error: 'AI_PROCESSING_FAILED',
        message: errorMsg,
        detail: String(replicateError)
      }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 11. Extract result URL
    const resultImageUrl_replicate = extractResultUrl(prediction.output)

    // 12. Lưu result vào Storage (dùng serviceClient — không bị JWT expired)
    let resultImageUrl: string
    try {
      resultImageUrl = await uploadUrlToStorage(serviceClient, userId, resultImageUrl_replicate, 'results')
    } catch (storageError) {
      console.error('[process-tryon] Storage save error:', storageError)
      // Fallback: dùng URL từ Replicate (có thể expire)
      resultImageUrl = resultImageUrl_replicate
    }

    // 13. Save tryon_history record (dùng serviceClient — không bị JWT expired)
    const processingTime = Date.now() - startTime
    const { data: tryonRecord } = await serviceClient
      .from('tryon_history')
      .insert({
        user_id: userId,
        model_image_url: modelImageUrl,
        clothing_image_urls: edit_mode ? [] : clothingImageUrls,
        gems_used: gemsRequired,
        quality: edit_mode ? 'edit' : quality,
        status: 'completed',
        result_image_url: resultImageUrl,
        replicate_prediction_id: prediction.id,
        cache_key: cacheKey || null,
        processing_time_ms: processingTime,
        completed_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    console.log(`[process-tryon] Done in ${processingTime}ms, tryon_id: ${tryonRecord?.id}`)

    return new Response(JSON.stringify({
      tryon_id: tryonRecord?.id || crypto.randomUUID(),
      result_image_url: resultImageUrl,
      gems_remaining: typeof newBalance === 'number' ? newBalance : profile.gems_balance - gemsRequired,
      gems_used: gemsRequired,
      cached: false,
      processing_time_ms: processingTime,
      provider: 'replicate',
      model: REPLICATE_MODEL,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('[process-tryon] Unexpected error:', error)
    return new Response(JSON.stringify({
      error: 'INTERNAL_ERROR',
      message: 'Lỗi hệ thống. Vui lòng thử lại.'
    }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
