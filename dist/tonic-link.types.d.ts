/**
 * Tonic Account Linking — Types
 * Automatic registration/linking when merchants install Shopify apps.
 */
export type TonicAppName = "blocktonic" | "flowtonic" | "tracktonic";
export interface TonicAppStatus {
    installed: boolean;
    plan: string;
    installed_at: string | null;
    uninstalled_at: string | null;
}
export interface TonicLinkStatus {
    linked: boolean;
    user_id: number | null;
    tenant_id: number | null;
    linked_at: string | null;
    apps: Partial<Record<TonicAppName, TonicAppStatus | null>>;
    user?: {
        id: number;
        name: string;
        email: string;
    };
}
export interface TonicRegisterOrLinkResponse {
    status: "linked";
    created: boolean;
    user_id: number;
    tenant_id: number;
    linked_at: string;
    apps: Partial<Record<TonicAppName, TonicAppStatus>>;
}
export interface TonicReportResponse {
    status: "updated" | "not_linked";
    apps: Partial<Record<TonicAppName, TonicAppStatus>>;
    all_uninstalled?: boolean;
    message?: string;
}
//# sourceMappingURL=tonic-link.types.d.ts.map