/**
 * Tonic Account Link Client
 * Communicates with auth.uptonica.com/api/shop-links
 * Automatically registers merchants on first app install.
 */
import type { TonicAppName, TonicLinkStatus, TonicRegisterOrLinkResponse, TonicReportResponse } from "./tonic-link.types.js";
export declare class TonicLinkClient {
    private baseUrl;
    private apiSecret;
    constructor(baseUrl?: string, apiSecret?: string);
    get configured(): boolean;
    private request;
    registerOrLink(shopDomain: string, email: string, name: string, appName: TonicAppName, plan: string): Promise<TonicRegisterOrLinkResponse>;
    reportPlanChange(shopDomain: string, appName: TonicAppName, plan: string, subscriptionStatus?: string): Promise<TonicReportResponse>;
    reportUninstall(shopDomain: string, appName: TonicAppName): Promise<TonicReportResponse>;
    getStatus(shopDomain: string): Promise<TonicLinkStatus>;
}
//# sourceMappingURL=tonic-link.server.d.ts.map