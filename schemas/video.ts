import path from "path";
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
import axios from "axios";

function getYouTubeVideoId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

async function fetchYoutubeVideoDetails(videoId: string) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error("Youtube Api Key not set in .env file");

  const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet`;
  const embed = `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
  try {
    const { data } = await axios.get(url);
    if (data.items && data.items.length > 0) {
      const snippet = data.items[0].snippet;
      return {
        title: snippet.title,
        description: snippet.description,
        thumbnailUrl:
          snippet.thumbnails.default?.url ||
          snippet.thumbnails.high?.url ||
          snippet.thumbnails.maxres?.url,
        channelTitle: snippet.channelTitle,
        createdAt: snippet.publishedAt,
        embedCode: embed,
      };
    }
    return null;
  } catch (error) {
    console.error("Error finding data from YT:", error);
    return null;
  }
}

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
    title: text({ ui: { itemView: { fieldMode: "read" } } }),
    description: text({
      ui: { displayMode: "textarea" },
      db: { nativeType: "Text", isNullable: true },
    }),
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
      ui: { description: "URL from youtube video" },
      db: { nativeType: "Text", isNullable: true },
    }),
    videoId: text({
      label: "ID do Vídeo (Automático)",
      isIndexed: "unique",
      ui: { itemView: { fieldMode: "read" } },
    }),
    embedCode: text({
      ui: { displayMode: "textarea", description: "<iframe> code" },
      db: { nativeType: "Text", isNullable: true },
    }),
    uploadedFile: file({ storage: "video_files" }),
    thumbnail: image({ storage: "thumbnails" }),
    isPublic: checkbox({ defaultValue: true, label: "Public" }),
    categories: relationship({ ref: "Category.videos", many: true }),
    author: text({ validation: { isRequired: false } }),
    createdAt: timestamp({ defaultValue: { kind: "now" } }),
  },
  hooks: {
    resolveInput: async ({ resolvedData, operation, item, context }) => {
      const { images } = context;
      const { sourceType, youtubeUrl } = resolvedData;

      if (sourceType === "youtube" && youtubeUrl) {
        if (operation === "update" && youtubeUrl === item?.youtubeUrl) {
          return resolvedData;
        }

        const videoId = getYouTubeVideoId(youtubeUrl);
        if (!videoId) return resolvedData;

        const existing = await context.prisma.video.findUnique({
          where: { videoId },
        });

        if (existing) {
          console.warn(`Vídeo with ID ${videoId} Already exists.`);
          return existing;
        }
        const videoDetails = await fetchYoutubeVideoDetails(videoId);
        if (videoDetails?.thumbnailUrl) {
          try {
            const response = await axios.get(videoDetails.thumbnailUrl, {
              responseType: "stream",
            });
            if (response.status === 200) {
              const filename = `youtube-thumbnail-${videoId}${path.extname(
                videoDetails.thumbnailUrl
              )}`;
              // const streamable = response.data as NodeJS.ReadableStream;

              // Envia o stream para o adaptador de armazenamento de arquivos do Keystone
              const imageData = await context
                .images("thumbnails")
                .getDataFromStream(response.data, filename);

              return {
                ...resolvedData,
                videoId,
                title: resolvedData.title || videoDetails.title,
                description:
                  resolvedData.description || videoDetails.description,
                thumbnail: imageData,
                author: resolvedData.channelTitle || videoDetails.channelTitle,
                createdAt: videoDetails.createdAt || resolvedData.createdAt,
                embedCode: videoDetails.embedCode || resolvedData.embedCode,
              };
            } else {
              console.error("Erro ao baixar a thumbnail:", response.status);
            }
          } catch (error) {
            console.error("Erro ao processar a thumbnail:", error);
          }
        } else {
          console.warn("Nenhuma URL de thumbnail encontrada para este vídeo.");
        }
      }

      return resolvedData;
    },
  },
});
