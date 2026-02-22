# Edge Function: process-tryon

## Mục đích

Edge Function chính để xử lý virtual try-on requests. Function này nhận model image và clothing images, validate gems balance, deduct gems, upload images, gọi Gemini Flash AI qua Replicate, và trả về tryon_id để client poll status.

## Endpoint

```
POST /process-tryon
```

## Authentication

Yêu cầu JWT token trong Authorization header:
```
Authorization: Bearer <jwt_token>
```

## Request Body

```json
{
  "model_image": "base64_encoded_image",
  "clothing_images": [
    {
      "image": "base64_encoded_image",
      "category": "top",
      "name": "Blue T-Shirt"
    },
    {
      "image": "base64_encoded_image",
      "category": "bottom",
      "name": "Black Jeans"
    }
  ],
  "quality": "standard"
}
```

### Fields

- `model_image` (string, required): Base64-encoded full-body photo của user
- `clothing_images` (array, required): Array of clothing items (1-5 items)
  - `image` (string, required): Base64-encoded clothing image
  - `category` (string, required): One of: `top`, `bottom`, `dress`, `shoes`, `accessories`
  - `name` (string, optional): Tên của clothing item
- `quality` (string, required): `standard` (1 gem) hoặc `hd` (2 gems)

## Response

### Success (200)

```json
{
  "tryon_id": "uuid",
  "status": "processing",
  "gems_remaining": 98,
  "gems_used": 2
}
```

### Error Responses

#### 400 Bad Request
```json
{
  "error": "INVALID_REQUEST",
  "message": "Yêu cầu không hợp lệ. Vui lòng kiểm tra lại thông tin."
}
```

#### 401 Unauthorized
```json
{
  "error": "UNAUTHORIZED",
  "message": "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
}
```

#### 429 Too Many Requests
```json
{
  "error": "RATE_LIMIT_EXCEEDED",
  "message": "Bạn đã thực hiện quá nhiều requests. Vui lòng thử lại sau.",
  "retryAfter": 30
}
```

## Rate Limiting

- **Limit**: 10 requests per minute per user
- **Headers**: Response includes `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Flow

1. Validate JWT token
2. Check rate limit (10 req/min)
3. Validate request body
4. Check gems balance
5. Deduct gems atomically
6. Upload model image và clothing images to Storage
7. Construct Gemini prompt
8. Create tryon_history record (status = processing)
9. Call Replicate API
10. Return tryon_id

## Error Handling

- **Insufficient gems**: Request rejected, không deduct gems
- **Upload failed**: Gems refunded
- **Replicate API failed**: Gems refunded, status = failed

## Testing

```bash
# Test với curl
curl -X POST https://[project-id].supabase.co/functions/v1/process-tryon \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "model_image": "base64...",
    "clothing_images": [
      {
        "image": "base64...",
        "category": "top",
        "name": "T-Shirt"
      }
    ],
    "quality": "standard"
  }'
```

## Dependencies

- `lib/rate_limiter.ts` - Rate limiting
- `lib/error_handler.ts` - Error handling và refund
- `lib/construct_gemini_prompt.ts` - Prompt engineering
- `lib/replicate_client.ts` - Replicate API calls
- `lib/retry_helper.ts` - Retry logic

## Environment Variables

- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anon key
- `REPLICATE_API_KEY` - Replicate API key
