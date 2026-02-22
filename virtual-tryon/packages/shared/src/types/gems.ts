/**
 * File: gems.ts
 * Purpose: Type definitions cho Gems system
 * 
 * Input: N/A
 * Output: GemPackage, GemTransaction interfaces
 */

export type GemTransactionType = 'purchase' | 'used' | 'refund' | 'bonus';

export interface GemPackage {
    id: string;
    name: string;
    gems: number;
    price_vnd: number;
    gateway_price_id?: string;
    is_popular?: boolean;
}

export interface GemTransaction {
    id: string;
    user_id: string;
    amount: number; // positive = add, negative = subtract
    type: GemTransactionType;
    description?: string;
    created_at: string;
}

export interface GemsBalance {
    balance: number;
    last_updated: string;
}
