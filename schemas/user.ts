import { list } from "@keystone-6/core";
import type { Lists } from ".keystone/types";
import {
  text,
  select,
  image,
  relationship,
  file,
  timestamp,
  password,
} from "@keystone-6/core/fields";
import { allowAll } from "@keystone-6/core/access";

export const User: Lists.User = list({
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
    email: text({
      validation: { isRequired: true },
      isIndexed: "unique",
    }),
    password: password(),
    profileImage: image({ storage: "thumbnails" }),
    role: select({
      options: [
        { label: "Administrador", value: "admin" },
        { label: "Editor", value: "editor" },
        { label: "Visualizador", value: "viewer" },
      ],
      defaultValue: "viewer",
      ui: { displayMode: "segmented-control" },
    }),
    videos: relationship({ ref: "Video.author", many: true }),
    createdAt: timestamp({ defaultValue: { kind: "now" } }),
  },
});
