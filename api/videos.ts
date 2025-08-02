import { Request, Response } from "express";
import { KeystoneContext } from "@keystone-6/core/types";
import { z } from "zod";

const videosQuerySchema = z.object({
  page: z
    .string()
    .regex(/^\d+$/, { error: "Page must be a valid number" })
    .transform(Number)
    .default(1),
  search_query: z.string(),
});

const PAGE_SIZE = 20;

export const searchHandler = async (
  req: Request,
  res: Response,
  context: KeystoneContext
) => {
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method not allowed" });

  const parse = videosQuerySchema.safeParse(req.query);

  if (!parse.success) {
    return res.status(400).json({ error: parse.error.flatten() });
  }

  const { page, search_query } = parse.data;
  const skip = (page - 1) * PAGE_SIZE;

  try {
    const where = {
      isPublic: { equals: true },
      ...(search_query && {
        OR: [
          { title: { contains: search_query } },
          { description: { contains: search_query } },
        ],
      }),
    };

    const videos = await context.query.Video.findMany({
      where,
      take: PAGE_SIZE,
      skip,
      orderBy: { createdAt: "desc" },
      query: `
      id
      title
      categories {
      id
      name
      }
      author {
      name
      }
      thumbnail {
      url
      }
      createdAt
      `,
    });

    const totalCount = await context.query.Video.count({ where });

    res.json({
      page,
      totalPages: Math.ceil(totalCount / PAGE_SIZE),
    });
  } catch (error) {
    console.log(error);
    res.status(401).json({ error: `Error featching media: ${error}` });
  }
};
