/**
 * Tonic Account Link Client
 * Communicates with auth.uptonica.com/api/shop-links
 * Automatically registers merchants on first app install.
 */
export class TonicLinkClient {
    baseUrl;
    apiSecret;
    constructor(baseUrl, apiSecret) {
        this.baseUrl = (baseUrl || process.env.TONIC_AUTH_BASE_URL || "").replace(/\/$/, "");
        this.apiSecret = apiSecret || process.env.TONIC_LINK_API_SECRET || "";
    }
    get configured() {
        return Boolean(this.baseUrl && this.apiSecret);
    }
    async request(method, path, body) {
        const url = `${this.baseUrl}/api/shop-links${path}`;
        const res = await fetch(url, {
            method,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.apiSecret}`,
            },
            body: body ? JSON.stringify(body) : undefined,
        });
        if (!res.ok) {
            const text = await res.text().catch(() => "");
            throw new Error(`TonicLink ${method} ${path} failed (${res.status}): ${text}`);
        }
        return res.json();
    }
    async registerOrLink(shopDomain, email, name, appName, plan) {
        if (!this.configured)
            throw new Error("TonicLinkClient not configured");
        return this.request("POST", "/register-or-link", {
            shop_domain: shopDomain,
            email,
            name,
            app_name: appName,
            plan,
            installed_at: new Date().toISOString(),
        });
    }
    async reportPlanChange(shopDomain, appName, plan, subscriptionStatus = "ACTIVE") {
        if (!this.configured)
            throw new Error("TonicLinkClient not configured");
        return this.request("POST", "/report-plan-change", {
            shop_domain: shopDomain,
            app_name: appName,
            plan,
            subscription_status: subscriptionStatus,
        });
    }
    async reportUninstall(shopDomain, appName) {
        if (!this.configured)
            throw new Error("TonicLinkClient not configured");
        return this.request("POST", "/report-uninstall", {
            shop_domain: shopDomain,
            app_name: appName,
            uninstalled_at: new Date().toISOString(),
        });
    }
    async getStatus(shopDomain) {
        if (!this.configured)
            throw new Error("TonicLinkClient not configured");
        return this.request("GET", `/status?shop_domain=${encodeURIComponent(shopDomain)}`);
    }
}
//# sourceMappingURL=tonic-link.server.js.map