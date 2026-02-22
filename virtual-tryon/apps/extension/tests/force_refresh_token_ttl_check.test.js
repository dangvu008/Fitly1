/**
 * File: tests/force_refresh_token_ttl_check.test.js
 * Purpose: Unit test cho forceRefreshToken() TTL check logic
 * Layer: Testing / Unit Test
 * 
 * Data Contract:
 * - Input: Token với TTL khác nhau
 * - Output: Verify TTL check hoạt động đúng
 * 
 * Flow:
 * 1. Setup token với TTL > 300s → verify không refresh
 * 2. Setup token với TTL <= 300s → verify có refresh
 * 3. Setup token expired → verify throw error
 * 
 * Feature: session-timeout-during-tryon-processing (Bugfix)
 * Task: 3.2 - Export forceRefreshToken() and add TTL check
 * **Validates: Requirements 2.1, 2.2**
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { forceRefreshToken } from '../background/auth_state_manager.js'

// Mock environment config
vi.mock('../background/ENVIRONMENT_CONFIG.js', () => ({
  DEMO_MODE_OVERRIDE: false,
  SUPABASE_AUTH_URL: 'https://test.supabase.co',
  SUPABASE_AUTH_KEY: 'test-anon-key'
}))

describe('forceRefreshToken() TTL Check', () => {
  beforeEach(() => {
    resetMockStorage()
    vi.clearAllMocks()
    
    // Mock fetch globally
    global.fetch = vi.fn()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  /**
   * Test Case 1: Token với TTL > 300s không cần refresh
   * 
   * Expected: Return token hiện tại, không gọi refresh API
   */
  it('SHOULD return current token when TTL > 300s (no refresh needed)', async () => {
    // Setup: Token với TTL = 600 giây (10 phút)
    setMockToken(600)
    
    // Mock fetch - không nên được gọi
    global.fetch.mockImplementation(async () => {
      throw new Error('Fetch should not be called when TTL > 300s')
    })
    
    // Action: Gọi forceRefreshToken()
    const result = await forceRefreshToken()
    
    // Verify: Return token hiện tại
    expect(result).toBe('mock-jwt-token')
    
    // Verify: Không gọi refresh API
    expect(global.fetch).not.toHaveBeenCalled()
    
    console.log('✅ TTL Check PASSED: Token với TTL > 300s không refresh')
  })

  /**
   * Test Case 2: Token với TTL = 300s (boundary) không cần refresh
   */
  it('SHOULD return current token when TTL = 300s (boundary case)', async () => {
    // Setup: Token với TTL = 300 giây (exactly 5 phút)
    setMockToken(300)
    
    // Mock fetch - không nên được gọi
    global.fetch.mockImplementation(async () => {
      throw new Error('Fetch should not be called when TTL = 300s')
    })
    
    // Action
    const result = await forceRefreshToken()
    
    // Verify: TTL = 300s nên KHÔNG refresh (>= 300s)
    expect(result).toBe('mock-jwt-token')
    expect(global.fetch).not.toHaveBeenCalled()
    
    console.log('✅ Boundary Check PASSED: Token với TTL = 300s không refresh')
  })

  /**
   * Test Case 3: Token với TTL < 300s cần refresh
   * 
   * Expected: Gọi refresh API và return token mới
   */
  it('SHOULD refresh token when TTL < 300s', async () => {
    // Setup: Token với TTL = 120 giây (2 phút)
    setMockToken(120)
    
    // Mock refresh API success
    global.fetch.mockImplementation(async (url) => {
      if (url.includes('/auth/v1/token')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            access_token: 'new-fresh-token',
            refresh_token: 'new-refresh-token',
            expires_in: 3600
          })
        }
      }
      return { ok: false, status: 404 }
    })
    
    // Action
    const result = await forceRefreshToken()
    
    // Verify: Return token mới
    expect(result).toBe('new-fresh-token')
    
    // Verify: Gọi refresh API
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/v1/token'),
      expect.objectContaining({
        method: 'POST',
        body: expect.stringContaining('mock-refresh-token')
      })
    )
    
    console.log('✅ Refresh PASSED: Token với TTL < 300s được refresh')
  })

  /**
   * Test Case 4: Token với TTL = 299s (boundary) cần refresh
   */
  it('SHOULD refresh token when TTL = 299s (boundary case)', async () => {
    // Setup: Token với TTL = 299 giây (just under 5 phút)
    setMockToken(299)
    
    // Mock refresh API
    global.fetch.mockImplementation(async (url) => {
      if (url.includes('/auth/v1/token')) {
        return {
          ok: true,
          json: async () => ({
            access_token: 'refreshed-token',
            expires_in: 3600
          })
        }
      }
      return { ok: false, status: 404 }
    })
    
    // Action
    const result = await forceRefreshToken()
    
    // Verify
    expect(result).toBe('refreshed-token')
    expect(global.fetch).toHaveBeenCalled()
    
    console.log('✅ Boundary Check PASSED: Token với TTL = 299s được refresh')
  })

  /**
   * Test Case 5: Token đã expire và refresh fail → throw error
   * 
   * Expected: Throw error với errorCode = 'REFRESH_FAILED'
   */
  it('SHOULD throw error with errorCode when refresh fails', async () => {
    // Setup: Token đã expire
    setMockToken(-10)
    
    // Mock refresh API fail
    global.fetch.mockImplementation(async (url) => {
      if (url.includes('/auth/v1/token')) {
        return {
          ok: false,
          status: 400,
          text: async () => 'Invalid refresh token'
        }
      }
      return { ok: false, status: 404 }
    })
    
    // Action & Verify
    try {
      await forceRefreshToken()
      
      // Should not reach here
      expect(true).toBe(false)
      
    } catch (error) {
      // Verify error có errorCode
      expect(error.errorCode).toBe('REFRESH_FAILED')
      expect(error.message).toContain('Token refresh failed')
      
      console.log('✅ Error Handling PASSED: Throw error với errorCode = REFRESH_FAILED')
    }
  })

  /**
   * Test Case 6: Token với TTL < 300s nhưng refresh fail → fallback về token hiện tại
   * 
   * Expected: Return token hiện tại nếu còn valid (TTL > 0)
   */
  it('SHOULD fallback to current token when refresh fails but token still valid', async () => {
    // Setup: Token với TTL = 120 giây (còn valid nhưng < 300s)
    setMockToken(120)
    
    // Mock refresh API fail
    global.fetch.mockImplementation(async (url) => {
      if (url.includes('/auth/v1/token')) {
        return {
          ok: false,
          status: 500,
          text: async () => 'Server error'
        }
      }
      return { ok: false, status: 404 }
    })
    
    // Action
    const result = await forceRefreshToken()
    
    // Verify: Fallback về token hiện tại
    expect(result).toBe('mock-jwt-token')
    
    console.log('✅ Fallback PASSED: Refresh fail nhưng token còn valid → return current token')
  })

  /**
   * Test Case 7: Verify logging cho TTL check
   */
  it('SHOULD log TTL check results', async () => {
    // Setup: Token với TTL = 600s
    setMockToken(600)
    
    // Spy on console.log
    const consoleSpy = vi.spyOn(console, 'log')
    
    // Action
    await forceRefreshToken()
    
    // Verify: Log TTL check - check for specific log messages
    const logCalls = consoleSpy.mock.calls.map(call => call.join(' '))
    
    expect(logCalls.some(log => log.includes('[forceRefreshToken]') && log.includes('START'))).toBe(true)
    expect(logCalls.some(log => log.includes('Current token TTL:') && log.includes('600'))).toBe(true)
    expect(logCalls.some(log => log.includes('Token TTL >= 300s'))).toBe(true)
    
    consoleSpy.mockRestore()
    
    console.log('✅ Logging PASSED: TTL check được log đúng')
  })
})
