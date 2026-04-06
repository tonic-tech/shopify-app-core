# @tonic/shopify-app-core — Shared Shopify App Package

## What This Is

ORM-agnostic shared logic for all Tonic Shopify Remix apps (BlockTonic, FlowTonic, TrackTonic). Provides handler factories, billing system, validation, security, and common utilities without any database/ORM coupling. Apps provide their own Drizzle-specific implementations via ops callbacks.

## Tech Stack

- **Language**: TypeScript
- **Format**: ESM module (no CommonJS)
- **Peer Dependencies**: Remix 2, Zod
- **Testing**: Vitest
- **Version**: 0.3.0

## Purpose & Design

This package provides **factories** that apps use to build their own ORM-specific handlers. The core pattern is ops callbacks — the shared package defines what needs to happen, apps provide Drizzle implementations.

Example:
```typescript
// In the shared package (ORM-agnostic)
export function createUninstallHandler(ops: UninstallOps) { ... }

// In the app (Drizzle-specific)
import { createUninstallHandler } from '@tonic/shopify-app-core/handlers';
export const handleUninstall = createUninstallHandler({
  onCleanup: async (shop) => {
    await db.delete(shops).where(eq(shops.shopDomain, shop));
  }
});
```

## File Structure

```
src/
├── handlers/              # Factory functions (uninstall, gdpr, health, subscription)
│   ├── uninstall.ts
│   ├── gdpr.ts
│   ├── health.ts
│   ├── subscription.ts
│   └── index.ts
├── billing/               # Billing system (declarative config → Shopify API)
│   ├── config.ts          # createBillingConfig()
│   ├── types.ts           # BillingConfig, Plan, Feature, etc.
│   ├── middleware.ts      # requirePlan() Remix loader
│   ├── confirmation.ts    # createChargeConfirmationLoader()
│   ├── usage.ts           # createUsageRecord() metered billing
│   └── index.ts
├── components/            # Shared React components (if any)
│   └── index.ts
├── index.ts               # Main barrel export
├── env.server.ts          # Environment validation
├── logger.server.ts       # Structured logging
├── rate-limit.server.ts   # Rate limiting
├── sentry.server.ts       # Sentry integration
├── security-headers.server.ts # Security headers
├── tonic-link.server.ts   # TonicLinkClient (cross-app communication)
├── validation.server.ts   # Zod validation utilities
└── metafields.server.ts   # Shopify metafield helpers
```

## Exports

Main exports via package.json:
```json
{
  "main": "dist/index.js",
  "exports": {
    ".": { "import": "./dist/index.js", "types": "./dist/index.d.ts" },
    "./handlers": { "import": "./dist/handlers/index.js", "types": "./dist/handlers/index.d.ts" },
    "./billing": { "import": "./dist/billing/index.js", "types": "./dist/billing/index.d.ts" }
  }
}
```

Import examples:
```typescript
// Main
import { validateShopifyRequest } from '@tonic/shopify-app-core';

// Handlers
import { createUninstallHandler } from '@tonic/shopify-app-core/handlers';

// Billing
import { createBillingConfig, requirePlan } from '@tonic/shopify-app-core/billing';
```

## Handler Factories

### Handler Pattern

All handlers follow the ops-callback pattern:
1. Shared package exports factory function
2. App defines ops object with database operations
3. Factory returns configured handler for use in routes

### createUninstallHandler(ops: UninstallOps)

Handles `app/uninstalled` webhook.

```typescript
export const handleUninstall = createUninstallHandler({
  onCleanup: async (shop) => {
    // Delete shop from Drizzle
    await db.delete(shops).where(eq(shops.shopDomain, shop));
  },
  onBillingCleanup: async (shop) => {
    // Cancel active subscriptions
    await billingService.cancelAllSubscriptions(shop);
  }
});
```

**Ops interface**: `UninstallOps`
```typescript
type UninstallOps = {
  onCleanup: (shop: string) => Promise<void>;
  onBillingCleanup?: (shop: string) => Promise<void>;
};
```

### createGdprHandler(ops: GdprOps)

Handles GDPR webhooks: data request, customer redact, shop redact.

**Ops interface**: `GdprOps`
```typescript
type GdprOps = {
  onDataRequest: (shop: string, customerId?: string) => Promise<object>;
  onCustomerRedact: (shop: string, customerId: string) => Promise<void>;
  onShopRedact: (shop: string) => Promise<void>;
};
```

### createHealthHandler(ops: HealthOps)

Health check endpoint for uptime monitoring.

**Ops interface**: `HealthOps`
```typescript
type HealthOps = {
  checkDatabase: () => Promise<boolean>;
  checkRedis?: () => Promise<boolean>;
};
```

### createSubscriptionHandler(ops: SubscriptionOps)

Handles `app_subscriptions/update` webhook.

**Ops interface**: `SubscriptionOps`
```typescript
type SubscriptionOps = {
  onSubscriptionUpdate: (shop: string, subscription: ShopifySubscription) => Promise<void>;
};
```

## Billing Module

Complete billing system: declarative config → Shopify Billing API.

### createBillingConfig

Define plans and features declaratively:

```typescript
const billingConfig = createBillingConfig({
  plans: [
    {
      name: 'FREE',
      price: 0,
      features: {
        maxFlows: 1,
        maxAreas: 10,
        maxSubmissions: 10
      }
    },
    {
      name: 'STARTER',
      price: 4900, // cents
      features: {
        maxFlows: 3,
        maxAreas: 100,
        maxSubmissions: 100
      }
    }
  ],
  currency: 'USD',
  returningCustomerDiscount: 10, // percent
  trialDays: 14
});
```

### requirePlan Middleware

Remix loader middleware to gate features by plan:

```typescript
export const loader = async ({ request, context }: LoaderFunctionArgs) => {
  const shop = await requireShop(request, context);
  const subscription = await requirePlan(shop, 'PROFESSIONAL', billingConfig);

  if (!subscription.canUseFeature('maxFlows', 10)) {
    throw new Response('Plan limit exceeded', { status: 403 });
  }

  return json({ subscription });
};
```

### createChargeConfirmationLoader

Handle Shopify's confirmation URL after user accepts billing:

```typescript
export const loader = createChargeConfirmationLoader({
  onConfirmation: async (shop, charge) => {
    // Store subscription in Drizzle
    await db.insert(subscriptions).values({
      shop,
      chargeId: charge.id,
      plan: charge.plan
    });
  }
});
```

### createUsageRecord

Metered billing (track usage, submit to Shopify):

```typescript
export const action = async ({ request, context }: ActionFunctionArgs) => {
  const shop = await requireShop(request, context);

  await createUsageRecord({
    shop,
    chargeId: subscription.chargeId,
    usage: {
      quantity: flowSubmissionCount
    }
  });
};
```

Features:
- Idempotency keys (prevent duplicate charges)
- Batching for efficiency
- Error retry logic

## Security & Utilities

### validateShopifyRequest

Verify incoming webhook/API request is from Shopify.

```typescript
const isValid = await validateShopifyRequest(request, SHOPIFY_API_SECRET);
if (!isValid) {
  throw new Response('Unauthorized', { status: 401 });
}
```

### securityHeaders

Apply security headers to all responses.

```typescript
export const headers = securityHeaders({
  contentSecurityPolicy: "default-src 'self'",
  corsOrigin: 'https://myshop.shopify.com'
});
```

### rate-limit

Rate limiting middleware.

```typescript
import { createRateLimiter } from '@tonic/shopify-app-core';

const limiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 100
});
```

### logger

Structured logging with Sentry integration.

```typescript
import { logger } from '@tonic/shopify-app-core';

logger.info('User action', { shop, action: 'flow_created' });
logger.error('Database error', { error, shop });
```

### metafields

Shopify metafield helpers.

```typescript
import { getMetafield, setMetafield } from '@tonic/shopify-app-core';

const value = await getMetafield(product, 'custom.my_field');
await setMetafield(product, 'custom.my_field', newValue);
```

## Commands

```bash
npm run build          # Build TypeScript → dist/
npm run dev            # TypeScript watch mode
npm run typecheck      # Type checking without emit
npm run test           # Run tests (Vitest)
npm run test:run       # Run tests once (CI mode)
```

## Testing

183 tests covering:
- Handler factories
- Billing config validation
- Ops callback invocation
- Middleware behavior
- Error scenarios

Run with:
```bash
npm run test       # Watch mode
npm run test:run   # Single run
```

## Critical Rules

1. **ORM-agnostic** — NEVER import Drizzle, Prisma, or any ORM directly
2. **Ops callbacks** — Use callbacks for all DB operations; apps provide implementations
3. **Server-side files end in `.server.ts`** — Remix convention for server-only code
4. **Peer dependencies** — Remix 2 and Zod are peer deps; don't bundle them
5. **ESM-only** — No CommonJS; apps must support ESM
6. **Type-safe exports** — Always provide `.d.ts` types alongside compiled code
7. **No side effects** — Don't modify global state; functions must be pure or properly scoped

## Consumer Apps

Integrated into:
- BlockTonic (app/lib/handlers/*)
- FlowTonic (app/lib/handlers/*)
- TrackTonic (app/lib/handlers/*)

Each app wraps shared factories with Drizzle-specific implementations in their own handlers directory. This allows the shared package to remain completely ORM-agnostic.

## MCP Servers

- **context7** — TypeScript, Remix, Zod documentation
- **shopify-dev-mcp** — Shopify API reference for billing/subscription features
