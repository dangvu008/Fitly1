export type ReportReason =
    | 'face_changed'      // Khuôn mặt bị thay đổi
    | 'wrong_color'       // Màu sắc sai
    | 'wrong_item'        // Đồ không đúng
    | 'low_quality'       // Chất lượng thấp
    | 'distorted'         // Ảnh bị méo
    | 'inappropriate'     // Nội dung không phù hợp
    | 'other';

export type ReportStatus = 'pending' | 'reviewed' | 'refunded' | 'rejected';

export interface TryOnReport {
    id: string;
    userId: string;
    tryonResultId: string;

    // Report details
    reason: ReportReason;
    description?: string;

    // Status
    status: ReportStatus;

    // Refund info
    gemsToRefund?: number;
    refunded: boolean;

    // Review details
    reviewedBy?: string;
    reviewedAt?: string; // ISO date
    reviewNotes?: string;

    // Context images (snapshots at time of report)
    personImageUrl?: string;
    clothingImageUrl?: string;
    resultImageUrl?: string;

    // Meta
    providerUsed?: string;
    createdAt: string; // ISO date
}

export interface CreateReportRequest {
    tryonResultId: string;
    reason: ReportReason;
    description?: string;
}
