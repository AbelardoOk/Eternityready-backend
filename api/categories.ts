import { Request, Response } from "express";
import { KeystoneContext } from "@keystone-6/core/types";
import { z } from "zod";

// Permite 0 ou mais parâmetros `name`
const querySchema = z.object({
  name: z.union([z.string(), z.array(z.string())]).optional(),
});

export const categoryHandler = async (
  req: Request,
  res: Response,
  context: KeystoneContext
) => {
  if (req.method !== "GET")
    return res.status(405).json({ error: "Method Not Allowed" });

  try {
    // valida os parâmetros
    const result = querySchema.safeParse(req.query);
    if (!result.success) {
      return res
        .status(400)
        .json({ error: "Invalid parameters", details: result.error.format() });
    }

    const { name } = result.data;

    let categories;

    if (name) {
      const names = Array.isArray(name) ? name : [name];
      categories = await context.db.Category.findMany({
        where: {
          name: { in: names },
        },
      });
    } else {
      categories = await context.db.Category.findMany({});
    }

    return res.status(200).json(categories);
  } catch (err) {
    console.error("Error searching for categories:", err);
    return res.status(500).json({ error: "Error fetching categories" });
  }
};
