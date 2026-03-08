/**
 * Tonic Account Link Client
 * Communicates with auth.tonic.app/api/shop-links
 * Requires TONIC_AUTH_BASE_URL and TONIC_LINK_API_SECRET env vars.
 */

import type {
  TonicLinkStatus,
  TonicLinkInitiateResponse,
  TonicAppInstallReport,
} from "./tonic-link.types.js";

export class TonicLinkClient {
  private baseUrl: string;
  private apiSecret: string;

  constructor(baseUrl?: string, apiSecret?: string) {
    this.baseUrl = baseUrl || process.env.TONIC_AUTH_BASE_URL || "";
    this.apiSecret = apiSecret || process.env.TONIC_LINK_API_SECRET || "";
  }

  private get configured(): boolean {
    return Boolean(this.baseUrl && this.apiSecret);
  }

  async initiate(
    shopDomain: string,
    appName: string,
  ): Promise<TonicLinkInitiateResponse> {
    if (!this.configured)
      throw new Error(
        "TonicLinkClient not configured: set TONIC_AUTH_BASE_URL and TONIC_LINK_API_SECRET",
      );
    throw new Error("Not implemented");
  }

  async checkStatus(shopDomain: string): Promise<TonicLinkStatus> {
    if (!this.configured)
      throw new Error(
        "TonicLinkClient not configured: set TONIC_AUTH_BASE_URL and TONIC_LINK_API_SECRET",
      );
    throw new Error("Not implemented");
  }

  async reportInstall(report: TonicAppInstallReport): Promise<void> {
    if (!this.configured)
      throw new Error(
        "TonicLinkClient not configured: set TONIC_AUTH_BASE_URL and TONIC_LINK_API_SECRET",
      );
    throw new Error("Not implemented");
  }

  async reportUninstall(shopDomain: string, appName: string): Promise<void> {
    if (!this.configured)
      throw new Error(
        "TonicLinkClient not configured: set TONIC_AUTH_BASE_URL and TONIC_LINK_API_SECRET",
      );
    throw new Error("Not implemented");
  }

  async unlink(shopDomain: string): Promise<void> {
    if (!this.configured)
      throw new Error(
        "TonicLinkClient not configured: set TONIC_AUTH_BASE_URL and TONIC_LINK_API_SECRET",
      );
    throw new Error("Not implemented");
  }
}
