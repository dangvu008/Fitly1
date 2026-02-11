/**
 * File: gems.ts
 * Purpose: Constants cho pricing và packages
 * 
 * Input: Locale
 * Output: PRICING, CURRENCY constants
 * 
 * Note: 3 lần đầu tiên miễn phí (lifetime), không reset
 */

// Cost per try-on (internal tracking)
export const TRYON_COSTS = {
    STANDARD: 1,
    HD: 2,
} as const;

// Free try-ons for new users (FIRST TIME ONLY, lifetime)
export const FREE_TRYONS_INITIAL = 3;

// Currency conversion rates (base: USD)
export const CURRENCY_RATES = {
    USD: 1,
    VND: 24500,
    JPY: 150,
    KRW: 1350,
    THB: 35,
    EUR: 0.92,
    GBP: 0.79,
} as const;

export type CurrencyCode = keyof typeof CURRENCY_RATES;

// Locale to currency mapping
export const LOCALE_CURRENCY: Record<string, CurrencyCode> = {
    en: 'USD',
    vi: 'VND',
    ja: 'JPY',
    ko: 'KRW',
    th: 'THB',
    zh: 'USD', // Chinese users often prefer USD
    id: 'USD', // Indonesia - USD for international
    de: 'EUR',
    fr: 'EUR',
    es: 'EUR',
    gb: 'GBP',
};

// Pricing packages (base USD)
export const PRICING_PACKAGES = [
    {
        id: 'starter',
        name: 'Starter',
        tryons: 50,
        price_usd: 1.99,
        is_popular: false,
    },
    {
        id: 'pro',
        name: 'Pro',
        tryons: 150,
        price_usd: 4.99,
        is_popular: true,
    },
    {
        id: 'premium',
        name: 'Premium',
        tryons: 500,
        price_usd: 14.99,
        is_popular: false,
    },
] as const;

// Convert USD price to local currency
export function convertPrice(usd: number, currency: CurrencyCode): number {
    return Math.round(usd * CURRENCY_RATES[currency]);
}

// Get currency symbol
export function getCurrencySymbol(currency: CurrencyCode): string {
    const symbols: Record<CurrencyCode, string> = {
        USD: '$',
        VND: '₫',
        JPY: '¥',
        KRW: '₩',
        THB: '฿',
        EUR: '€',
        GBP: '£',
    };
    return symbols[currency];
}

// Format price with currency
export function formatPrice(usd: number, currency: CurrencyCode): string {
    const amount = convertPrice(usd, currency);
    const symbol = getCurrencySymbol(currency);

    if (currency === 'VND') {
        return `${amount.toLocaleString()}${symbol}`;
    }
    return `${symbol}${amount.toLocaleString()}`;
}

