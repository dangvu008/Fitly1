/**
 * File: tests/setup.js
 * Purpose: Mock Chrome Extension APIs cho testing
 * Layer: Testing Infrastructure
 * 
 * Data Contract:
 * - Input: Test scenarios
 * - Output: Mocked Chrome APIs (storage, runtime)
 * 
 * Flow:
 * 1. Mock chrome.storage.local với in-memory storage
 * 2. Mock chrome.runtime.sendMessage
 * 3. Setup global test utilities
 * 
 * Security Note: Chỉ dùng trong test environment
 */

import { vi } from 'vitest'

// Mock Chrome Storage API
const mockStorage = new Map()

global.chrome = {
  storage: {
    local: {
      get: vi.fn((keys) => {
        if (typeof keys === 'string') {
          return Promise.resolve({ [keys]: mockStorage.get(keys) })
        }
        if (Array.isArray(keys)) {
          const result = {}
          keys.forEach(key => {
            if (mockStorage.has(key)) {
              result[key] = mockStorage.get(key)
            }
          })
          return Promise.resolve(result)
        }
        // Get all
        const result = {}
        mockStorage.forEach((value, key) => {
          result[key] = value
        })
        return Promise.resolve(result)
      }),
      set: vi.fn((items) => {
        Object.entries(items).forEach(([key, value]) => {
          mockStorage.set(key, value)
        })
        return Promise.resolve()
      }),
      remove: vi.fn((keys) => {
        const keyArray = Array.isArray(keys) ? keys : [keys]
        keyArray.forEach(key => mockStorage.delete(key))
        return Promise.resolve()
      }),
      clear: vi.fn(() => {
        mockStorage.clear()
        return Promise.resolve()
      })
    }
  },
  runtime: {
    sendMessage: vi.fn()
  }
}

// Helper để reset mock storage giữa các tests
global.resetMockStorage = () => {
  mockStorage.clear()
}

// Helper để set token với TTL cụ thể
global.setMockToken = (ttlSeconds) => {
  const now = Date.now()
  const expiresAt = now + (ttlSeconds * 1000)
  mockStorage.set('auth_token', 'mock-jwt-token')
  mockStorage.set('refresh_token', 'mock-refresh-token')
  mockStorage.set('expires_at', expiresAt)
}

// Helper để get token TTL
global.getMockTokenTTL = () => {
  const expiresAt = mockStorage.get('expires_at')
  if (!expiresAt) return null
  return Math.floor((expiresAt - Date.now()) / 1000)
}
