import { z } from "zod";

const aspectRatioSchema = z.literal("9:16");

const imageAssetSchema = z.object({
  id: z.string().min(1),
  path: z.string().min(1),
  usage: z.enum(["cover", "body"]),
});

const coverSceneSchema = z.object({
  id: z.string().min(1),
  type: z.literal("cover"),
  title: z.string().min(1),
  subtitle: z.string().min(1),
  duration: z.number().int().positive(),
});

const imageTextSceneSchema = z.object({
  id: z.string().min(1),
  type: z.literal("image-text"),
  heading: z.string().min(1),
  text: z.string().min(1),
  keywords: z.array(z.string().min(1)),
  imageId: z.string().min(1).optional(),
  duration: z.number().int().positive(),
});

const infoSceneSchema = z.object({
  id: z.string().min(1),
  type: z.literal("info"),
  heading: z.string().min(1),
  bullets: z.array(z.string().min(1)).min(1),
  duration: z.number().int().positive(),
});

const endingSceneSchema = z.object({
  id: z.string().min(1),
  type: z.literal("ending"),
  heading: z.string().min(1),
  text: z.string().min(1),
  duration: z.number().int().positive(),
});

export const sceneSchema = z.discriminatedUnion("type", [
  coverSceneSchema,
  imageTextSceneSchema,
  infoSceneSchema,
  endingSceneSchema,
]);

export const videoSpecSchema = z.object({
  meta: z.object({
    title: z.string().min(1),
    aspectRatio: aspectRatioSchema,
    theme: z.string().min(1),
    sourceFile: z.string().min(1),
  }),
  assets: z.object({
    images: z.array(imageAssetSchema),
  }),
  scenes: z.array(sceneSchema).min(1),
});

export type VideoSpec = z.infer<typeof videoSpecSchema>;
export type Scene = z.infer<typeof sceneSchema>;
