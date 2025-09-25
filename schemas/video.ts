import path from "path";
import { list } from "@keystone-6/core";
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
import { DateTime } from "luxon";

function getYouTubeVideoId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return match && match[2].length === 11 ? match[2] : null;
}

function parseISODuration(isoDuration: string): string {
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = isoDuration.match(regex);

  if (!matches) return "00:00";

  const hours = parseInt(matches[1] || "0");
  const minutes = parseInt(matches[2] || "0");
  const seconds = parseInt(matches[3] || "0");

  const h = hours > 0 ? String(hours).padStart(2, "0") + ":" : "";
  const m = String(minutes).padStart(2, "0");
  const s = String(seconds).padStart(2, "0");

  return `${h}${m}:${s}`;
}

async function fetchYoutubeVideoDetails(videoId: string) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) throw new Error("Youtube Api Key not set in .env file");

  const url = `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails`;
  const embed = `<iframe width="560" height="315" src="https://www.youtube.com/embed/${videoId}" title="YouTube video player" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>`;
  try {
    const { data } = await axios.get(url);
    if (data.items && data.items.length > 0) {
      const item = data.items[0];
      const snippet = item.snippet;
      const duration = item.contentDetails?.duration
        ? parseISODuration(item.contentDetails.duration)
        : "00:00";
      return {
        title: snippet.title,
        description: snippet.description,
        thumbnailUrl:
          snippet.thumbnails.maxres?.url ||
          snippet.thumbnails.standard?.url ||
          snippet.thumbnails.high?.url,
        channelTitle: snippet.channelTitle,
        createdAt: snippet.publishedAt,
        publishedAt: snippet.publishedAt,
        embedCode: embed,
        duration: duration,
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
      label: "ID from Video (YouTube)",
      isIndexed: "unique",
      ui: {
        createView: { fieldMode: "hidden" },
        itemView: { fieldMode: "read" },
        description:
          "Unique video identifier on YouTube (extracted from the URL).",
      },
    }),

    duration: text({
      label: "Duration (HH:MM:SS)",
      ui: {
        createView: { fieldMode: "hidden" },
        itemView: { fieldMode: "read" },
        description: "Video duration automatically fetched from YouTube.",
      },
    }),

    isNew: checkbox({
      label: "New Video",
      defaultValue: false,
      ui: {
        createView: { fieldMode: "hidden" },
        itemView: { fieldMode: "read" },
        description:
          "Indicates if the video was published in the last 30 days.",
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
    featured: checkbox({
      defaultValue: false,
      label: "Public",
      ui: {
        description: "Videos marked as featured appear in a dedicated slider.",
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
      defaultValue: undefined,
      label: "Restricted",
      ui: {
        description:
          "Indicates whether the video has automatically detected restrictions..",
        createView: { fieldMode: "hidden" },
        itemView: { fieldMode: "read" },
      },
    }),
    verificationMessage: text({ defaultValue: "" }),
    publishedAt: timestamp({
      label: "Published on YouTube",
      ui: {
        createView: { fieldMode: "hidden" },
        itemView: { fieldMode: "read" },
        description: "Original publication date of the video on YouTube.",
      },
    }),
  },

  ui: {
    listView: {
      initialColumns: [
        "thumbnail",
        "title",
        "author",
        "publishedAt",
        "isPublic",
      ],
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
        const { sourceType, youtubeUrl, embedCode } = rawConfig;

        resolvedData.sourceType = sourceType;
        resolvedData.youtubeUrl = sourceType === "youtube" ? youtubeUrl : null;
        resolvedData.embedCode = sourceType === "embed" ? embedCode : null;
      }

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
          throw new Error(
            `Video with ID ${videoId} already exists in the database.`
          );
        }

        const videoDetails = await fetchYoutubeVideoDetails(videoId);

        if (!videoDetails) {
          console.error(
            `Não foi possível buscar os detalhes para o vídeo ID: ${videoId}`
          );
          return resolvedData;
        }

        const publishedDate = DateTime.fromISO(videoDetails.publishedAt);
        const now = DateTime.now();
        const daysDifference = now.diff(publishedDate, "days").days;
        const isNew = daysDifference <= 30;

        let imageData;

        if (videoDetails.thumbnailUrl) {
          try {
            const response = await axios.get(videoDetails.thumbnailUrl, {
              responseType: "stream",
            });
            if (response.status === 200) {
              const filename = `youtube-thumbnail-${videoId}${path.extname(
                videoDetails.thumbnailUrl
              )}`;
              imageData = await context
                .images("thumbnails")
                .getDataFromStream(response.data, filename);
              console.log(
                `Thumbnail for video ${videoId} successfully downloaded.`
              );
            }
          } catch (error) {
            console.error(
              `Failed to download thumbnail for ${videoId}:`,
              error
            );
          }
        }

        return {
          ...resolvedData,
          videoId,
          title: resolvedData.title || videoDetails.title,
          description: resolvedData.description || videoDetails.description,
          author: resolvedData.author || videoDetails.channelTitle,
          publishedAt: videoDetails.publishedAt,
          embedCode: videoDetails.embedCode || resolvedData.embedCode,
          duration: videoDetails.duration,
          isNew: isNew,
          ...(imageData && { thumbnail: imageData }),
        };
      }

      return resolvedData;
    },
  },
});
