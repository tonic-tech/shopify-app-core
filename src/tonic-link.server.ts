/**
 * Tonic Account Link Client
 * Communicates with auth.uptonica.com/api/shop-links
 * Automatically registers merchants on first app install.
 */

import type {
  TonicAppName,
  TonicLinkStatus,
  TonicRegisterOrLinkResponse,
  TonicReportResponse,
} from "./tonic-link.types.js";

export class TonicLinkClient {
  private baseUrl: string;
  private apiSecret: string;

  constructor(baseUrl?: string, apiSecret?: string) {
    this.baseUrl = (baseUrl || process.env.TONIC_AUTH_BASE_URL || "").replace(/\/$/, "");
    this.apiSecret = apiSecret || process.env.TONIC_LINK_API_SECRET || "";
  }

  get configured(): boolean {
    return Boolean(this.baseUrl && this.apiSecret);
  }

  private async request<T>(method: string, path: string, body?: Record<string, unknown>): Promise<T> {
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

    return res.json() as Promise<T>;
  }

  async registerOrLink(
    shopDomain: string,
    email: string,
    name: string,
    appName: TonicAppName,
    plan: string
  ): Promise<TonicRegisterOrLinkResponse> {
    if (!this.configured) throw new Error("TonicLinkClient not configured");
    return this.request<TonicRegisterOrLinkResponse>("POST", "/register-or-link", {
      shop_domain: shopDomain,
      email,
      name,
      app_name: appName,
      plan,
      installed_at: new Date().toISOString(),
    });
  }

  async reportPlanChange(
    shopDomain: string,
    appName: TonicAppName,
    plan: string,
    subscriptionStatus: string = "ACTIVE"
  ): Promise<TonicReportResponse> {
    if (!this.configured) throw new Error("TonicLinkClient not configured");
    return this.request<TonicReportResponse>("POST", "/report-plan-change", {
      shop_domain: shopDomain,
      app_name: appName,
      plan,
      subscription_status: subscriptionStatus,
    });
  }

  async reportUninstall(
    shopDomain: string,
    appName: TonicAppName
  ): Promise<TonicReportResponse> {
    if (!this.configured) throw new Error("TonicLinkClient not configured");
    return this.request<TonicReportResponse>("POST", "/report-uninstall", {
      shop_domain: shopDomain,
      app_name: appName,
      uninstalled_at: new Date().toISOString(),
    });
  }

  async getStatus(shopDomain: string): Promise<TonicLinkStatus> {
    if (!this.configured) throw new Error("TonicLinkClient not configured");
    return this.request<TonicLinkStatus>("GET", `/status?shop_domain=${encodeURIComponent(shopDomain)}`);
  }
}
