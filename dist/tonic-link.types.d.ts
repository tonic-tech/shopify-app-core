/**
 * Tonic Account Linking
 * Types for linking Shopify shops to Tonic (Uptonica) user accounts.
 * The source of truth is auth.shop_links on the Laravel side.
 */
export interface TonicLinkStatus {
    linked: boolean;
    userId: number | null;
    tenantId: number | null;
    linkedAt: string | null;
}
export interface TonicLinkInitiateResponse {
    linkToken: string;
    linkUrl: string;
    expiresAt: string;
}
export interface TonicAppInstallReport {
    shopDomain: string;
    appName: "blocktonic" | "flowtonic" | "tracktonic";
    installed: boolean;
    plan: string;
    installedAt: string | null;
}
export interface TonicShopOverview {
    shopDomain: string;
    apps: {
        blocktonic?: {
            installed: boolean;
            plan: string;
        };
        flowtonic?: {
            installed: boolean;
            plan: string;
        };
        tracktonic?: {
            installed: boolean;
            plan: string;
        };
    };
    linkedUser?: {
        id: number;
        name: string;
        email: string;
    };
}
//# sourceMappingURL=tonic-link.types.d.ts.map