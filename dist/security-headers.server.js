/**
 * Security Headers for Shopify Embedded Apps
 */
export const SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "geolocation=(), microphone=(), camera=(), payment=(self)",
    "X-DNS-Prefetch-Control": "on",
};
export function addSecurityHeaders(response) {
    const headers = new Headers(response.headers);
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
        if (!headers.has(key))
            headers.set(key, value);
    }
    return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}
export function createSecureHeaders(additionalHeaders) {
    const headers = new Headers();
    for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
        headers.set(key, value);
    }
    if (additionalHeaders) {
        for (const [key, value] of Object.entries(additionalHeaders)) {
            headers.set(key, value);
        }
    }
    return headers;
}
export function getCSPHeader(nonce) {
    const directives = [
        "default-src 'self'",
        `script-src 'self' ${nonce ? `'nonce-${nonce}'` : "'unsafe-inline'"} https://cdn.shopify.com https://cdn.shopifycloud.com`,
        "style-src 'self' 'unsafe-inline' https://cdn.shopify.com",
        "img-src 'self' data: https: blob:",
        "font-src 'self' https://cdn.shopify.com",
        "connect-src 'self' https://*.myshopify.com https://*.shopify.com wss://*.shopify.com",
        "frame-ancestors https://*.myshopify.com https://admin.shopify.com",
        "form-action 'self' https://*.myshopify.com",
        "base-uri 'self'",
        "object-src 'none'",
        ...(process.env.NODE_ENV === "production" ? ["upgrade-insecure-requests"] : []),
    ];
    return directives.join("; ");
}
export function generateNonce() {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
}
//# sourceMappingURL=security-headers.server.js.map