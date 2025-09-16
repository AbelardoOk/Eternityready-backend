import { list } from "@keystone-6/core";
import {
  text,
  relationship,
  timestamp,
  select,
  checkbox,
  file,
  image,
} from "@keystone-6/core/fields";
import { allowAll } from "@keystone-6/core/access";

const APP_ID = process.env.APP_ID;
const APP_SECRET = process.env.APP_SECRET;

async function fetchInstagramData(url: string) {
  // Extracts the shortcode from link https://www.instagram.com/p/{shortcode}/
  const match = url.match(/instagram\.com\/p\/([^/?]+)/);
  if (!match) return null;

  const shortcode = match[1];
  // const endpoint = `https://graph.instagram.com/${shortcode}?fields=id,media_type,media_url,username,timestamp,caption&access_token=${INSTAGRAM_TOKEN}`;
  const endpoint = `https://graph.facebook.com/v19.0/instagram_oembed?url=${url}&access_token=${APP_ID}|${APP_SECRET}
`;
  console.log(endpoint);

  const res = await fetch(endpoint);
  if (!res.ok) {
    console.error("Erro no Instagram API:", await res.text());
    return null;
  }
  return res.json();
}

export const Instagram = list({
  access: {
    operation: {
      query: allowAll,
      create: ({ session, context }) => {
        return !!context.sudo || !!session?.isServer;
      },
      update: ({ session, context }) => {
        return !!context.sudo || !!session?.isServer;
      },
      delete: ({ session, context }) => {
        return !!context.sudo || !!session?.isServer;
      },
    },
  },
  fields: {
    description: text({
      ui: { displayMode: "textarea", createView: { fieldMode: "hidden" } },
      db: { nativeType: "Text", isNullable: true },
      validation: { isRequired: false },
    }),
    url: text({
      ui: { description: "Instagram URL Post" },
    }),
    embedCode: text({
      ui: {
        displayMode: "textarea",
        description: "<iframe> code from instagram",
        createView: { fieldMode: "hidden" },
      },
      db: { nativeType: "Text", isNullable: true },
      validation: { isRequired: false },
    }),
    isPublic: checkbox({ defaultValue: true, label: "Public" }),
    categories: relationship({ ref: "Category.instagram", many: true }),
    author: text({
      validation: { isRequired: false },
      ui: { createView: { fieldMode: "hidden" } },
    }),
    createdAt: timestamp({
      defaultValue: { kind: "now" },
      ui: { createView: { fieldMode: "hidden" } },
    }),
  },
  hooks: {
    resolveInput: async ({ resolvedData, operation }) => {
      if (
        (operation === "create" || operation === "update") &&
        resolvedData.url
      ) {
        const data = await fetchInstagramData(resolvedData.url);
        if (data) {
          if (!resolvedData.author && data.username) {
            resolvedData.author = data.username;
          }
          if (!resolvedData.description && data.caption) {
            resolvedData.description = data.caption;
          }
          if (!resolvedData.embedCode && data.media_url) {
            // você pode criar manualmente um iframe com a media_url
            resolvedData.embedCode = `<img src="${data.media_url}" style="max-width:100%" />`;
          }
        }
      }
      return resolvedData;
    },
  },
});
