/**
 * File: outfit_manager.js
 * Purpose: Quản lý danh sách outfit đã lưu (Saved Outfits) và lịch sử Try-on
 * Layer: Application / Feature
 *
 * Data Contract:
 * - Exports: handleSaveOutfit, handleGetOutfits, handleGetTryonHistory
 *
 * Storage strategy:
 * - Authenticated user: ghi vào bảng `saved_outfits` trên Supabase (persistent, cross-device)
 * - Fallback: chrome.storage.local nếu network lỗi
 * - Demo/guest: in-memory demoState + chrome.storage.local
 *
 * DB Table: public.saved_outfits
 *   id uuid PK | user_id uuid FK | name text | result_image_url text |
 *   clothing_image_url text | model_image_url text | tryon_history_id uuid FK | created_at timestamptz
 *
 * Fix Log:
 * - [Fix 1] handleSaveOutfit chỉ dùng demoState → mất data sau reload
 *           → Fixed: ghi vào Supabase saved_outfits khi authenticated, fallback local storage
 * - [Fix 2] handleGetOutfits chỉ đọc demoState → luôn trả mock data
 *           → Fixed: đọc từ Supabase saved_outfits + merge local fallback
 */

import { isDemoMode, getAuthToken } from './auth_state_manager.js';
import { demoState, MOCK_USER, SUPABASE_AUTH_KEY, SUPABASE_AUTH_URL } from './ENVIRONMENT_CONFIG.js';
import { log } from './debug_logger.js';

const LOCAL_OUTFITS_KEY = 'fitly_saved_outfits';
const MAX_LOCAL_OUTFITS = 50;

// ============================================================================
// LOCAL STORAGE HELPERS (fallback khi offline / guest)
// ============================================================================

async function loadLocalOutfits() {
    try {
        const data = await chrome.storage.local.get([LOCAL_OUTFITS_KEY]);
        return data[LOCAL_OUTFITS_KEY] || [];
    } catch (e) {
        console.warn('[OutfitManager] Failed to load local outfits:', e.message);
        return [];
    }
}

async function saveLocalOutfits(outfits) {
    try {
        const trimmed = outfits.slice(0, MAX_LOCAL_OUTFITS);
        await chrome.storage.local.set({ [LOCAL_OUTFITS_KEY]: trimmed });
    } catch (e) {
        console.warn('[OutfitManager] Failed to save local outfits:', e.message);
    }
}

// ============================================================================
// SAVE OUTFIT
// ============================================================================

/**
 * Lưu outfit sau khi try-on thành công.
 *
 * Flow:
 * 1. Authenticated → INSERT vào Supabase saved_outfits
 * 2. Fallback → persist vào chrome.storage.local
 * 3. Demo/guest → in-memory demoState + local storage
 */
export async function handleSaveOutfit(data) {
    const demoMode = await isDemoMode();

    // STEP 1: Build outfit object
    const outfitPayload = {
        name: data.name || `Outfit ${new Date().toLocaleDateString('vi-VN')}`,
        result_image_url: data.result_image_url,
        clothing_image_url: data.clothing_image_url || null,
        model_image_url: data.model_image_url || null,
        tryon_history_id: data.tryon_history_id || null,
        source_type: data.source_type || 'tryon',
        source_url: data.source_url || null,
    };

    if (demoMode) {
        // Demo mode: in-memory + local storage
        const newOutfit = {
            id: 'outfit-' + Date.now(),
            user_id: MOCK_USER.id,
            ...outfitPayload,
            created_at: new Date().toISOString(),
        };
        demoState.outfits.unshift(newOutfit);
        const existingLocal = await loadLocalOutfits();
        await saveLocalOutfits([newOutfit, ...existingLocal]);
        return { success: true, outfit: newOutfit };
    }

    // STEP 2: Authenticated → lưu lên Supabase
    try {
        const token = await getAuthToken();
        if (!token) throw new Error('NOT_AUTHENTICATED');

        const response = await fetch(
            `${SUPABASE_AUTH_URL}/rest/v1/saved_outfits`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': SUPABASE_AUTH_KEY,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=representation',
                },
                body: JSON.stringify(outfitPayload),
            }
        );

        if (response.ok) {
            const [savedOutfit] = await response.json();
            log('[OutfitManager] Saved outfit to Supabase:', savedOutfit?.id);

            // Cập nhật local cache luôn để offline fallback
            const existingLocal = await loadLocalOutfits();
            await saveLocalOutfits([savedOutfit, ...existingLocal]);

            return { success: true, outfit: savedOutfit };
        } else {
            const errText = await response.text();
            console.warn('[OutfitManager] Supabase insert failed:', response.status, errText);
            throw new Error(`HTTP ${response.status}: ${errText}`);
        }
    } catch (error) {
        console.warn('[OutfitManager] Cloud save failed, falling back to local:', error.message);

        // STEP 3: Fallback → local storage only
        const newOutfit = {
            id: 'outfit-local-' + Date.now(),
            ...outfitPayload,
            created_at: new Date().toISOString(),
        };
        const existingLocal = await loadLocalOutfits();
        await saveLocalOutfits([newOutfit, ...existingLocal]);

        return { success: true, outfit: newOutfit, savedLocally: true };
    }
}

// ============================================================================
// GET OUTFITS
// ============================================================================

/**
 * Lấy danh sách outfits để hiển thị "Outfit vừa tạo".
 *
 * Flow:
 * 1. Authenticated → đọc từ Supabase saved_outfits (newest first)
 * 2. Merge với local storage (offline-created outfits)
 * 3. Demo/guest → local storage + demoState fallback
 */
export async function handleGetOutfits(data = {}) {
    const limit = Math.min(data?.limit || 20, 50);
    const demoMode = await isDemoMode();

    if (demoMode) {
        const localOutfits = await loadLocalOutfits();
        const merged = mergeAndDedup([...localOutfits, ...demoState.outfits]);
        return { success: true, outfits: merged.slice(0, limit), total: merged.length };
    }

    // Authenticated user → đọc từ Supabase
    try {
        const token = await getAuthToken();
        if (!token) throw new Error('NOT_AUTHENTICATED');

        const response = await fetch(
            `${SUPABASE_AUTH_URL}/rest/v1/saved_outfits?order=created_at.desc&limit=${limit}&select=id,name,result_image_url,clothing_image_url,model_image_url,tryon_history_id,source_type,source_url,created_at`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': SUPABASE_AUTH_KEY,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (response.ok) {
            const cloudOutfits = await response.json();
            log('[OutfitManager] Loaded', cloudOutfits.length, 'outfits from Supabase');

            // Merge với local storage (outfits được lưu offline)
            const localOutfits = await loadLocalOutfits();
            const merged = mergeAndDedup([...cloudOutfits, ...localOutfits]);

            // Sync local cache
            await saveLocalOutfits(merged.slice(0, MAX_LOCAL_OUTFITS));

            return { success: true, outfits: merged.slice(0, limit), total: merged.length };
        } else {
            const errText = await response.text();
            console.warn('[OutfitManager] GET_OUTFITS Supabase failed:', response.status, errText);
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        console.warn('[OutfitManager] GET_OUTFITS fallback to local:', error.message);
        // Fallback: local storage only
        const localOutfits = await loadLocalOutfits();
        return { success: true, outfits: localOutfits.slice(0, limit), total: localOutfits.length };
    }
}

// ============================================================================
// GET TRYON HISTORY (Gallery)
// ============================================================================

/**
 * Lấy lịch sử try-on đầy đủ từ Supabase để hiển thị Gallery.
 */
export async function handleGetTryonHistory(data = {}) {
    const demoMode = await isDemoMode();
    if (demoMode) {
        return { success: true, history: [] };
    }

    try {
        const token = await getAuthToken();
        if (!token) {
            return { success: false, error: 'NOT_AUTHENTICATED', history: [] };
        }

        const limit = Math.min(data?.limit || 50, 100);

        const response = await fetch(
            `${SUPABASE_AUTH_URL}/rest/v1/tryon_history?status=eq.completed&order=created_at.desc&limit=${limit}&select=id,result_image_url,clothing_image_urls,gems_used,quality,status,created_at`,
            {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'apikey': SUPABASE_AUTH_KEY,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) {
            const errText = await response.text();
            console.error('[Fitly] GET_TRYON_HISTORY error:', response.status, errText);
            return { success: false, error: `HTTP ${response.status}`, history: [] };
        }

        const history = await response.json();
        log('[Fitly] Loaded', history.length, 'tryon history items from DB');
        return { success: true, history: history || [] };
    } catch (error) {
        console.error('[Fitly] handleGetTryonHistory error:', error);
        return { success: false, error: error.message, history: [] };
    }
}

// ============================================================================
// UTILS
// ============================================================================

/**
 * Merge và dedup outfits dựa trên result_image_url.
 * Newest first (by created_at).
 */
function mergeAndDedup(outfits) {
    const seen = new Set();
    return outfits
        .filter(o => {
            if (!o?.result_image_url) return false;
            if (seen.has(o.result_image_url)) return false;
            seen.add(o.result_image_url);
            return true;
        })
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
}
