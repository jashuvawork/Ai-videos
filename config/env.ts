import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
  STORAGE_URL: z.string().optional(),
  STORAGE_BUCKET: z.string().optional(),
  STORAGE_LOCAL_PATH: z.string().default("./uploads"),
  REDIS_URL: z.string().optional(),
  AI_TEXT_PROVIDER: z.string().default("mock"),
  AI_IMAGE_PROVIDER: z.string().default("mock"),
  AI_VIDEO_PROVIDER: z.string().default("mock"),
  AI_VOICE_PROVIDER: z.string().default("mock"),
  AI_MUSIC_PROVIDER: z.string().default("mock"),
  LLM_API_KEY: z.string().optional(),
  IMAGE_API_KEY: z.string().optional(),
  VIDEO_API_KEY: z.string().optional(),
  VOICE_API_KEY: z.string().optional(),
  MUSIC_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  APP_URL: z.string().default("http://localhost:3000"),
  /** Origin of the host that stores rendered media (e.g. Railway backend when UI is on Vercel). */
  ASSETS_BASE_URL: z.string().optional(),
  DEV_USER_ID: z.string().default("dev-user-001"),
  RENDER_FPS: z.coerce.number().default(30),
  RENDER_QUALITY: z.enum(["low", "medium", "high"]).default("high"),
  DISABLE_INLINE_WORKER: z
    .string()
    .optional()
    .transform((v) => v === "true" || v === "1"),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const raw = { ...process.env };

  // Allow Next.js build without a live database (set real URL in Vercel/Railway env)
  if (!raw.DATABASE_URL && process.env.npm_lifecycle_event === "build") {
    raw.DATABASE_URL = "postgresql://build:build@localhost:5432/build";
  }

  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    console.error("Invalid environment variables:", parsed.error.flatten().fieldErrors);
    throw new Error("Invalid environment configuration");
  }
  return parsed.data;
}

export const env = loadEnv();
