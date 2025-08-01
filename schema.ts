import { type Lists } from ".keystone/types";

import { User } from "./schemas/user";
import { Video } from "./schemas/video";
import { AudioItem } from "./schemas/audio";
import { Ad } from "./schemas/ad";
import { Category } from "./schemas/category";

export const lists = {
  User,
  Video,
  AudioItem,
  Ad,
  Category,
} satisfies Lists;
