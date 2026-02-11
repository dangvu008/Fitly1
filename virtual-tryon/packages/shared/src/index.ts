/**
 * File: index.ts
 * Purpose: Entry point cho shared types và utilities
 * 
 * Input: N/A
 * Output: Export tất cả shared types, constants, và utilities
 * 
 * Flow:
 * 1. Export types từ ./types
 * 2. Export constants từ ./constants
 */

// Types
export * from './types/user';
export * from './types/tryon';
export * from './types/gems';
export * from './types/wardrobe';

// Constants
export * from './constants/gems';
export * from './constants/api';

// i18n
export * from './i18n';
