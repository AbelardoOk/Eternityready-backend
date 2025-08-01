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
import { searchHandler } from "./api/queries";

dotenvConfig();
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : ["https://localhost:3000", "https://eternityready.com"];

export default withAuth.withAuth(
  config({
    db: {
      provider: "sqlite",
      url: "file:./keystone.db",
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
      audio_files: {
        kind: "local",
        type: "file",
        generateUrl: (path) => `/audio/${path}`,
        serverRoute: {
          path: "/audio",
        },
        storagePath: "public/audio",
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

        app.use((err, req, res, next) => {
          if (err instanceof Error && err.message === "Not allowed by CORS") {
            res.status(403).json({ error: "CORS Error: Not allowed by CORS" });
          } else {
            next(err);
          }
        });

        app.use(express.json());

        app.get("/api/search", async (req: Request, res: Response) => {
          const { search_query, page } = req.params;

          if (!search_query) {
            return res.status(400).json({ error: "Search Query is required" });
          }

          if (!page) {
            return res.status(400).json({ error: "Page number is required" });
          }
          await searchHandler(search_query, page);
        });
      },
    },
  })
);
