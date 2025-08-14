// Welcome to Keystone!
//
// This file is what Keystone uses as the entry-point to your headless backend
//
// Keystone imports the default export of this file, expecting a Keystone configuration object
//   you can find out more at https://keystonejs.com/docs/apis/config

import { config } from "@keystone-6/core";
import { lists } from "./schema";
import express, { Request, Response } from "express";
import cors from "cors";
import { config as dotenvConfig } from "dotenv";

import { withAuth, session } from "./auth";
import { searchHandler } from "./api/videos";
import { categoryHandler } from "./api/categories";
import { postSearchHandler } from "./api/instagram";
import { verifyVideosHandler } from "./api/sync";

dotenvConfig();
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : ["http://localhost:3000", "https://eternityready.com"];

export default withAuth(
  config({
    db: {
      provider: "mysql",
      url: process.env.DATABASE_URL!,
      onConnect: async (context) => {
        try {
          if ((await context.db.User.count()) === 0) {
            console.log("No users found. Create the first one at Admin UI");
          }
        } catch (err) {
          console.error("Error connecting to database:", err);
        }
      },
    },
    ui: {
      isAccessAllowed: async (context) => {
        const users = await context.db.User.count();
        if (users === 0) {
          return true;
        } // Libera acesso à tela de criação do primeiro user
        return !!context.session?.data; // Depois disso, exige login
      },
    },
    lists,
    session,
    storage: {
      video_files: {
        kind: "local",
        type: "file",
        generateUrl: (path) => `/videos/${path}`,
        serverRoute: {
          path: "/videos",
        },
        storagePath: "public/videos",
      },
      thumbnails: {
        kind: "local",
        type: "image",
        generateUrl: (path) => `/thumbnails/${path}`,
        serverRoute: {
          path: "/thumbnails",
        },
        storagePath: "public/thumbnails",
      },
      ads: {
        kind: "local",
        type: "image",
        generateUrl: (path) => `/ads/${path}`,
        serverRoute: {
          path: "/ads",
        },
        storagePath: "public/ads",
      },
    },

    server: {
      extendExpressApp: (app, context) => {
        app.use(
          cors({
            origin: function (origin, callback) {
              if (!origin) return callback(null, true);
              if (allowedOrigins.includes(origin)) {
                return callback(null, true);
              } else {
                return callback(new Error("Not allowed by CORS"));
              }
            },
            methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            allowedHeaders: ["Content-Type", "Authorization"],
            credentials: true,
          })
        );

        app.use(
          (
            err: Error,
            req: Request,
            res: Response,
            next: (arg0: Error) => void
          ) => {
            if (err instanceof Error && err.message === "Not allowed by CORS") {
              res
                .status(403)
                .json({ error: "CORS Error: Not allowed by CORS" });
            } else {
              next(err);
            }
          }
        );

        app.use(
          cors({
            origin: true, // permite qualquer origem
            credentials: true,
          })
        );

        app.use(express.json());

        app.get("/api/search", async (req: Request, res: Response) => {
          await searchHandler(req, res, context);
        });

        app.get("/api/categories", async (req: Request, res: Response) => {
          await categoryHandler(req, res, context);
        });

        app.get("/api/instagram", async (req: Request, res: Response) => {
          await postSearchHandler(req, res, context);
        });

        app.post("/api/verifyVideo", async (req: Request, res: Response) => {
          await verifyVideosHandler(req, res, context);
        });
      },
    },
  })
);
