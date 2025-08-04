import { Request, Response } from "express";
import { KeystoneContext } from "@keystone-6/core/types";
import { z } from "zod";

const instaQuerySchema = z.object({
  page: z
    .string()
    .regex(/^\d+$/, { message: "Page must be a valid number" })
    .transform(Number)
    .default(1),
  search_query: z.string().optional(),
  category: z.union([z.string(), z.array(z.string())]).optional(),
});

const PAGE_SIZE = 20;

export const postSearchHandler = async (
  req: Request,
  res: Response,
  context: KeystoneContext
) => {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const parse = instaQuerySchema.safeParse(req.query);
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
      where.OR = [{ description: { contains: search_query } }];
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

    const posts = await context.query.Instagram.findMany({
      where,
      take: PAGE_SIZE,
      skip,
      orderBy: { createdAt: "desc" },
      query: `
        id
        description
        author
        createdAt
        url
        embedCode
        categories { id name }
      `,
    });

    const totalCount = await context.query.Instagram.count({ where });

    return res.status(200).json({
      page,
      totalPages: Math.ceil(totalCount / PAGE_SIZE),
      posts,
    });
  } catch (error) {
    console.error("Error finding instagram posts:", error);
    return res
      .status(500)
      .json({ error: `Intern error finding instagram posts: ${error}` });
  }
};
