/**
 * Security Headers for Shopify Embedded Apps
 */
export declare const SECURITY_HEADERS: {
    readonly "X-Content-Type-Options": "nosniff";
    readonly "X-Frame-Options": "SAMEORIGIN";
    readonly "X-XSS-Protection": "1; mode=block";
    readonly "Referrer-Policy": "strict-origin-when-cross-origin";
    readonly "Permissions-Policy": "geolocation=(), microphone=(), camera=(), payment=(self)";
    readonly "X-DNS-Prefetch-Control": "on";
};
export declare function addSecurityHeaders(response: Response): Response;
export declare function createSecureHeaders(additionalHeaders?: Record<string, string>): Headers;
export declare function getCSPHeader(nonce?: string): string;
export declare function generateNonce(): string;
//# sourceMappingURL=security-headers.server.d.ts.map