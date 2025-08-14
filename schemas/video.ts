import path from "path";
import { graphql, list } from "@keystone-6/core";
import {
  text,
  relationship,
  timestamp,
  checkbox,
  file,
  image,
  select,
} from "@keystone-6/core/fields";
import { allowAll } from "@keystone-6/core/access";
import axios from "axios";
import { verifyVideosHandler } from "../api/sync";

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
    sourceType: select({
      options: [
        { label: "Youtube", value: "youtube" },
        { label: "Embed", value: "embed" },
        { label: "Upload", value: "upload" },
      ],
      defaultValue: "youtube",
      ui: {
        displayMode: "segmented-control",
        itemView: { fieldMode: "read" },
        description:
          "Select the source type: YouTube, external embed code, or uploaded file.",
      },
    }),

    youtubeUrl: text({
      ui: {
        description:
          "Full YouTube video URL (e.g., https://www.youtube.com/watch?v=abc123).",
      },
    }),
    embedCode: text({
      ui: {
        description:
          "HTML embed code for videos from platforms other than YouTube",
        itemView: { fieldMode: "read" },
      },
      db: { nativeType: "Text", isNullable: true },
    }),
    //     type: graphql.String,
    //     resolve: (item) => {
    //       // Retorna o valor salvo, ou o valor inicial se estiver criando
    //       return (
    //         item.detalhes || {
    //           sourceType: "youtube",
    //           title: "",
    //           description: "",
    //         }
    //       );
    //     },
    //   }),
    //   ui: {
    //     views: "./admin/components/videoDetails.tsx",
    //     createView: { fieldMode: "edit" },
    //     itemView: { fieldMode: "edit" },
    //   },
    // }),
    //   field: graphql.field({
    //     type: graphql.JSON,
    //     async resolve(item, args, context) {
    //       // Retorne os campos que quer passar para o componente React
    //       return {
    //         sourceType: item.sourceType,
    //         youtubeUrl: item.youtubeUrl,
    //         embedCode: item.embedCode,
    //       };
    //     },
    //   }),
    //   ui: {
    //     views: "./admin/components/SourceTypeField",
    //   },
    // }),

    uploadedFile: file({
      storage: "video_files",
      ui: {
        itemView: {
          fieldMode: ({ item }) =>
            item?.sourceType == "upload" ? "edit" : "hidden",
        },
        description: "Video file uploaded directly to the system.",
      },
    }),

    title: text({
      ui: {
        itemView: {
          fieldMode: "read",
        },
        description: "Video title (automatically filled when possible).",
      },
      validation: { isRequired: false },
    }),
    description: text({
      ui: {
        description: "Optional description or summary of the video.",
        displayMode: "textarea",
      },
      validation: { isRequired: false },
      db: { nativeType: "Text", isNullable: true },
    }),
    thumbnail: image({
      storage: "thumbnails",
      ui: {
        description: "Video thumbnail image (generated or manually uploaded).",
      },
    }),

    author: text({
      label: "Author/Channel",
      validation: { isRequired: false },
      ui: {
        description: "Name of the author or channel that published the video.",
      },
    }),

    videoId: text({
      label: "ID do Vídeo (YouTube)",
      isIndexed: "unique",
      ui: {
        createView: { fieldMode: "hidden" },
        itemView: { fieldMode: "read" },
        description:
          "Unique video identifier on YouTube (extracted from the URL).",
      },
    }),
    createdAt: timestamp({
      defaultValue: { kind: "now" },
      ui: {
        description: "Date and time when this video entry was created.",
      },
    }),

    isPublic: checkbox({
      defaultValue: true,
      label: "Public",
      ui: {
        description:
          "Controls whether the video is publicly visible or hidden.",
      },
    }),
    categories: relationship({
      ref: "Category.videos",
      many: true,
      ui: {
        description: "Categories associated with this video.",
      },
    }),
    isRestricted: checkbox({
      defaultValue: false,
      label: "Restricted",
      ui: {
        description:
          "Indicates whether the video has automatically detected restrictions..",
        createView: { fieldMode: "hidden" },
        itemView: { fieldMode: "read" },
      },
    }),
    verificationMessage: text({
      ui: {
        description: "Message returned by automatic video verification.",
        displayMode: "textarea",
        createView: { fieldMode: "hidden" },
        itemView: { fieldMode: "read" },
      },
      db: { nativeType: "Text", isNullable: true },
    }),
  },

  ui: {
    listView: {
      initialColumns: ["thumbnail", "title", "author", "isPublic"],
    },
  },

  hooks: {
    validateInput: async ({ resolvedData, addValidationError, operation }) => {
      if (operation === "create") {
        const { sourceType, youtubeUrl, embedCode, uploadedFile } =
          resolvedData;
        if (sourceType === "youtube" && !youtubeUrl) {
          addValidationError("For YouTube source, the URL is required.");
        }
        if (sourceType === "embed" && !embedCode) {
          addValidationError(
            "For the Embed source, the embed code is required."
          );
        }
        if (sourceType === "upload" && !uploadedFile) {
          addValidationError("For the Upload source, the file is mandatory.");
        }
      }
    },
    resolveInput: async ({ resolvedData, operation, item, context }) => {
      const rawConfig = resolvedData.sourceConfig;

      if (rawConfig && typeof rawConfig === "object") {
        // Se veio como objeto (ideal), desestrutura
        const { sourceType, youtubeUrl, embedCode } = rawConfig;

        resolvedData.sourceType = sourceType;
        resolvedData.youtubeUrl = sourceType === "youtube" ? youtubeUrl : null;
        resolvedData.embedCode = sourceType === "embed" ? embedCode : null;
      }

      // --- Abaixo continua sua lógica para YouTube ---
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
          console.warn(`Video with ID ${videoId} already exists.`);
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
                author: resolvedData.author || videoDetails.channelTitle,
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
          console.warn("Nenhuma thumbnail encontrada para este vídeo.");
        }
      }

      return resolvedData;
    },
  },
});
