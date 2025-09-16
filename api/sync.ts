import { Request, Response } from "express";
import { KeystoneContext } from "@keystone-6/core/types";
import { z } from "zod";
import { configDotenv } from "dotenv";

configDotenv();
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;
if (!YOUTUBE_API_KEY) throw new Error("YOUTUBE KEY not defined at .env");

const VerifyVideosSchema = z.object({
  videos: z.array(
    z.object({
      id: z.string(),
      sourceType: z.enum(["youtube", "embed", "upload"]),
      videoId: z.string().nullable(),
    })
  ),
});

export const verifyVideosHandler = async (
  req: Request,
  res: Response,
  context: KeystoneContext
) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  console.log(req.body);

  const parse = VerifyVideosSchema.safeParse(req.body);
  if (!parse.success) {
    const errorMessage = parse.error.issues[0].message;
    console.log(`Error: ${errorMessage}`);
    return res.status(400).json({ error: errorMessage });
  }

  const { videos } = parse.data;

  const results: Record<
    string,
    {
      isPublic: boolean;
      isRestricted: boolean;
      message: string;
    }
  > = {};

  for (const video of videos) {
    if (video.sourceType !== "youtube" || !video.videoId) {
      const result = {
        isPublic: false,
        isRestricted: true,
        message: "Não é um vídeo do YouTube ou não possui ID.",
      };

      results[video.id] = result;

      await context.db.Video.updateOne({
        where: { id: video.id },
        data: {
          isPublic: result.isPublic,
          isRestricted: result.isRestricted,
          verificationMessage: result.message,
        },
      });
      continue;
    }

    try {
      const response = await fetch(
        `https://www.googleapis.com/youtube/v3/videos?id=${video.videoId}&part=status,contentDetails&key=${YOUTUBE_API_KEY}`
      );
      const data = await response.json();

      if (data.items && data.items.length > 0) {
        const details = data.items[0];
        const isPublic = details.status.privacyStatus === "public";
        const isRestricted = !!details.contentDetails?.regionRestriction;

        let message = "";
        if (isPublic && !isRestricted) {
          message = "✅ All right! Video without problems";
        } else {
          const errors = [];
          if (!isPublic) errors.push("Video not public");
          if (isRestricted) errors.push("Video with regions");
          message = `❌ Problems found: ${errors.join(" and ")}`;
        }

        results[video.id] = { isPublic, isRestricted, message };

        await context.db.Video.updateOne({
          where: { id: video.id },
          data: {
            isPublic,
            isRestricted,
            verificationMessage: message,
          },
        });
      } else {
        const result = {
          isPublic: false,
          isRestricted: true,
          message: "❌ Error: Video not found at YouTube.",
        };
        results[video.id] = result;

        await context.db.Video.updateOne({
          where: { id: video.id },
          data: {
            isPublic: result.isPublic,
            isRestricted: result.isRestricted,
            verificationMessage: result.message,
          },
        });
      }

      return res.status(200).json({
        results,
      });
    } catch (err) {
      const result = {
        isPublic: false,
        isRestricted: true,
        message: "❌ Failed fetching YouTube API.",
      };
      results[video.id] = result;

      await context.db.Video.updateOne({
        where: { id: video.id },
        data: {
          isPublic: result.isPublic,
          isRestricted: result.isRestricted,
          verificationMessage: result.message,
        },
      });
    }
  }
};
