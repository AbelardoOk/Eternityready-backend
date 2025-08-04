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
      ui: { displayMode: "textarea" },
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
      },
      db: { nativeType: "Text", isNullable: true },
      validation: { isRequired: false },
    }),
    isPublic: checkbox({ defaultValue: true, label: "Public" }),
    categories: relationship({ ref: "Category.instagram", many: true }),
    author: text({ validation: { isRequired: true } }),
    createdAt: timestamp({ defaultValue: { kind: "now" } }),
  },
});
