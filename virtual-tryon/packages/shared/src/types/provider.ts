export interface ProviderConfig {
    id: string;
    providerId: string; // 'nanoBanana', 'qwen', etc.
    displayName: string;
    isActive: boolean;
    priority: number;
    apiEndpoint?: string;
    updatedAt: string;
    updatedBy?: string;
}

export type AIProviderId = 'nanoBanana' | 'qwen' | 'gemini' | 'idm-vton';

export interface ProviderStats {
    providerId: string;
    totalRequests: number;
    successRate: number;
    avgLatency: number;
    lastUsed: string;
}
