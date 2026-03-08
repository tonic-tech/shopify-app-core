/**
 * Tonic Account Link Client
 * Communicates with auth.tonic.app/api/shop-links
 * Requires TONIC_AUTH_BASE_URL and TONIC_LINK_API_SECRET env vars.
 */
import type { TonicLinkStatus, TonicLinkInitiateResponse, TonicAppInstallReport } from "./tonic-link.types.js";
export declare class TonicLinkClient {
    private baseUrl;
    private apiSecret;
    constructor(baseUrl?: string, apiSecret?: string);
    private get configured();
    initiate(shopDomain: string, appName: string): Promise<TonicLinkInitiateResponse>;
    checkStatus(shopDomain: string): Promise<TonicLinkStatus>;
    reportInstall(report: TonicAppInstallReport): Promise<void>;
    reportUninstall(shopDomain: string, appName: string): Promise<void>;
    unlink(shopDomain: string): Promise<void>;
}
//# sourceMappingURL=tonic-link.server.d.ts.map