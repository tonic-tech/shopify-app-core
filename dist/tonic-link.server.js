/**
 * Tonic Account Link Client
 * Communicates with auth.tonic.app/api/shop-links
 * Requires TONIC_AUTH_BASE_URL and TONIC_LINK_API_SECRET env vars.
 */
export class TonicLinkClient {
    baseUrl;
    apiSecret;
    constructor(baseUrl, apiSecret) {
        this.baseUrl = baseUrl || process.env.TONIC_AUTH_BASE_URL || "";
        this.apiSecret = apiSecret || process.env.TONIC_LINK_API_SECRET || "";
    }
    get configured() {
        return Boolean(this.baseUrl && this.apiSecret);
    }
    async initiate(shopDomain, appName) {
        if (!this.configured)
            throw new Error("TonicLinkClient not configured: set TONIC_AUTH_BASE_URL and TONIC_LINK_API_SECRET");
        throw new Error("Not implemented");
    }
    async checkStatus(shopDomain) {
        if (!this.configured)
            throw new Error("TonicLinkClient not configured: set TONIC_AUTH_BASE_URL and TONIC_LINK_API_SECRET");
        throw new Error("Not implemented");
    }
    async reportInstall(report) {
        if (!this.configured)
            throw new Error("TonicLinkClient not configured: set TONIC_AUTH_BASE_URL and TONIC_LINK_API_SECRET");
        throw new Error("Not implemented");
    }
    async reportUninstall(shopDomain, appName) {
        if (!this.configured)
            throw new Error("TonicLinkClient not configured: set TONIC_AUTH_BASE_URL and TONIC_LINK_API_SECRET");
        throw new Error("Not implemented");
    }
    async unlink(shopDomain) {
        if (!this.configured)
            throw new Error("TonicLinkClient not configured: set TONIC_AUTH_BASE_URL and TONIC_LINK_API_SECRET");
        throw new Error("Not implemented");
    }
}
//# sourceMappingURL=tonic-link.server.js.map