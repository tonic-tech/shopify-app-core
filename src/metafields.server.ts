/**
 * Shopify Metafield Sync
 * Syncs app plan to Shop-level metafields for theme access via Liquid
 */

type AdminGraphQL = {
  graphql: (query: string, options?: { variables?: Record<string, unknown> }) => Promise<Response>;
};

const METAFIELD_MUTATION = `
  mutation SetPlanMetafield($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
        namespace
        key
        value
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const DEFINITION_MUTATION = `
  mutation CreateMetafieldDefinition($definition: MetafieldDefinitionInput!) {
    metafieldDefinitionCreate(definition: $definition) {
      createdDefinition {
        id
        name
      }
      userErrors {
        field
        message
      }
    }
  }
`;

/**
 * Sync app plan to Shopify metafields
 *
 * @param admin - Shopify Admin API client
 * @param namespace - App namespace (e.g., "blocktonic", "flowtonic")
 * @param plan - Current plan name
 */
export async function syncPlanMetafield(
  admin: AdminGraphQL,
  namespace: string,
  plan: string
) {
  const response = await admin.graphql(METAFIELD_MUTATION, {
    variables: {
      metafields: [
        {
          namespace,
          key: "plan",
          type: "single_line_text_field",
          value: plan,
          ownerId: "gid://shopify/Shop",
        },
        {
          namespace,
          key: "installed",
          type: "boolean",
          value: "true",
          ownerId: "gid://shopify/Shop",
        },
      ],
    },
  });

  const data = await response.json();

  if (data.data?.metafieldsSet?.userErrors?.length > 0) {
    console.error("Metafield sync errors:", data.data.metafieldsSet.userErrors);
    throw new Error(`Failed to sync metafields: ${JSON.stringify(data.data.metafieldsSet.userErrors)}`);
  }

  return data.data?.metafieldsSet?.metafields;
}

/**
 * Clear plan metafield on uninstall (sets plan to FREE)
 */
export async function clearPlanMetafield(admin: AdminGraphQL, namespace: string) {
  return syncPlanMetafield(admin, namespace, "FREE");
}

/**
 * Register metafield definitions for theme access
 * Call once on app install
 */
export async function createMetafieldDefinitions(
  admin: AdminGraphQL,
  namespace: string,
  appName: string
) {
  const definitions = [
    {
      name: "Plan",
      namespace,
      key: "plan",
      type: "single_line_text_field",
      ownerType: "SHOP",
      description: `Current subscription plan for ${appName}`,
    },
    {
      name: "Installed",
      namespace,
      key: "installed",
      type: "boolean",
      ownerType: "SHOP",
      description: `Whether ${appName} app is installed`,
    },
  ];

  for (const definition of definitions) {
    try {
      await admin.graphql(DEFINITION_MUTATION, {
        variables: { definition },
      });
    } catch {
      console.log(`Metafield definition ${definition.key} may already exist`);
    }
  }
}
