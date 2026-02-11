/**
 * File: index.ts
 * Purpose: Export all i18n utilities
 * 
 * This module provides shared translations and utilities for both
 * web app and browser extension.
 * 
 * Web App Usage:
 *   - Uses next-intl with JSON message files in apps/web/messages/
 *   - Import { useTranslations } from 'next-intl'
 *   - See I18N_GUIDELINES.md for details
 * 
 * Extension Usage:
 *   - Uses inline translations in sidebar.js
 *   - Can import from this shared module for consistency
 */

export * from './translations';

// Re-export types for convenience
export type {
    SupportedLocale,
    TranslationStrings,
} from './translations';
