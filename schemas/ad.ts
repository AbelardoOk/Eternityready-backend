import { list } from "@keystone-6/core";
import { text, select, checkbox, image } from "@keystone-6/core/fields";
import { allowAll } from "@keystone-6/core/access";

export const Ad = list({
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
    title: text(),
    location: select({
      options: [
        { label: "Header", value: "header" },
        { label: "Footer", value: "footer" },
        { label: "Sidebar", value: "sidebar" },
        { label: "preVideo", value: "preVideo" },
      ],
      ui: { displayMode: "segmented-control" },
    }),
    image: image({ storage: "ads" }),
    link: text({ ui: { description: "Click ad link" } }),
    isActive: checkbox({ defaultValue: true }),
  },
});
