import { list } from "@keystone-6/core";
import {
  text,
  select,
  checkbox,
  image,
  relationship,
  file,
  timestamp,
} from "@keystone-6/core/fields";
import { allowAll } from "@keystone-6/core/access";

export const AudioItem = list({
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
        { label: "External URL", value: "url" },
        { label: "Direct Upload", value: "upload" },
      ],
      defaultValue: "url",
      ui: { displayMode: "segmented-control" },
    }),
    audioUrl: text({ ui: { description: "Audio URL (If aplicable)" } }),
    uploadedFile: file({ storage: "audio_files" }),
    coverImage: image({ storage: "thumbnails" }),
    isPublic: checkbox({ defaultValue: true, label: "Public" }),
    categories: relationship({ ref: "Category", many: true }),
    audioType: select({
      options: [
        { label: "Podcast", value: "podcast" },
        { label: "Music", value: "music" },
        { label: "Radio Program", value: "radio" },
      ],
      defaultValue: "podcast",
      ui: { displayMode: "segmented-control" },
    }),
    author: relationship({ ref: "User.audios" }),
    createdAt: timestamp({ defaultValue: { kind: "now" } }),
  },
});
