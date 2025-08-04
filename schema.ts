import { type Lists } from ".keystone/types";

import { User } from "./schemas/user";
import { Video } from "./schemas/video";
import { Ad } from "./schemas/ad";
import { Category } from "./schemas/category";
import { list } from "@keystone-6/core";
import { Instagram } from "./schemas/instagram";
import { text, password, timestamp } from "@keystone-6/core/fields";
import { allowAll } from "@keystone-6/core/access";

export const lists = {
  User: list({
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
      email: text({ validation: { isRequired: true }, isIndexed: "unique" }),
      password: password({ validation: { isRequired: true } }),
    },
  }),
  Video,
  Ad,
  Category,
  Instagram,
} satisfies Lists;
