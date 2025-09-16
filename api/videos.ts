import { Request, Response } from "express";
import { KeystoneContext } from "@keystone-6/core/types";
import { parse, z } from "zod";

const videosQuerySchema = z.object({
  page: z
    .string()
    .regex(/^\d+$/, { message: "Page must be a valid number" })
    .transform(Number)
    .default(1),
  search_query: z.string().optional(),
  category: z.union([z.string(), z.array(z.string())]).optional(),
});

const PAGE_SIZE = 20;

export const searchHandler = async (
  req: Request,
  res: Response,
  context: KeystoneContext
) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const parse = videosQuerySchema.safeParse(req.query);
  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const { page, search_query, category } = parse.data;
  const skip = (page - 1) * PAGE_SIZE;

  try {
    const where: any = {
      isPublic: { equals: true },
    };

    // busca por texto
    if (search_query) {
      where.OR = [
        { title: { contains: search_query } },
        { description: { contains: search_query } },
      ];
    }

    // filtro por categoria
    if (category) {
      const categories = Array.isArray(category) ? category : [category];
      where.categories = {
        some: {
          name: { in: categories },
        },
      };
    }

    const videos = await context.query.Video.findMany({
      where,
      take: PAGE_SIZE,
      skip,
      orderBy: { createdAt: "desc" },
      query: `  
        id
        sourceType
        videoId
        title
        duration
        description
        createdAt
        isNew
        thumbnail { url }
        author
        categories { id name }
      `,
    });

    const totalCount = await context.query.Video.count({ where });

    return res.status(200).json({
      page,
      totalPages: Math.ceil(totalCount / PAGE_SIZE),
      videos,
    });
  } catch (error) {
    console.error("Erro ao buscar vídeos:", error);
    return res.status(500).json({ error: "Erro interno ao buscar vídeos" });
  }
};

export const videoHandler = async (
  req: Request,
  res: Response,
  context: KeystoneContext
) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { id: videoId } = req.params;
  if (!videoId) {
    return res
      .status(400)
      .json({ error: "The video ID is required in the URL." });
  }

  try {
    const video = await context.query.Video.findOne({
      where: {
        id: videoId,
      },
      query: `  
        id
        sourceType
        title
        description
        videoId
        duration
        createdAt
        isNew
        thumbnail { url }
        author
        categories { id name }
      `,
    });

    if (!video) {
      return res.status(404).json({ error: "Video not found or not public." });
    }

    return res.status(200).json({
      video,
    });
  } catch (error) {
    console.error("Erro ao buscar vídeos:", error);
    return res.status(500).json({ error: "Erro interno ao buscar vídeos" });
  }
};
