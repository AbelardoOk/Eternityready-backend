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

export const Video = list({
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
    title: text({ validation: { isRequired: true } }),
    description: text({ ui: { displayMode: "textarea" } }),
    sourceType: select({
      options: [
        { label: "YouTube", value: "youtube" },
        { label: "Embed", value: "embed" },
        { label: "Upload Direto", value: "upload" },
      ],
      defaultValue: "youtube",
      ui: { displayMode: "segmented-control" },
    }),
    youtubeUrl: text({
      ui: { description: "URL do vídeo no YouTube (se aplicável)" },
    }),
    embedCode: text({
      ui: { displayMode: "textarea", description: "Código <iframe> ou outro" },
    }),
    uploadedFile: file({ storage: "video_files" }),
    thumbnail: image({ storage: "thumbnails" }),
    isPublic: checkbox({ defaultValue: true, label: "Público" }),
    categories: relationship({ ref: "Category.videos", many: true }),
    author: relationship({ ref: "User.videos" }),
    createdAt: timestamp({ defaultValue: { kind: "now" } }),
  },
});
