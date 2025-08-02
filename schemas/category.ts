import { list } from "@keystone-6/core";
import {
  text,
  select,
  checkbox,
  image,
  relationship,
} from "@keystone-6/core/fields";
import { allowAll } from "@keystone-6/core/access";

export const Category = list({
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
    name: text({ validation: { isRequired: true } }),
    videos: relationship({ ref: "Video.categories", many: true }),
  },
});
