import { z } from "zod";

import { browserProviderSchema } from "@mmo-claw/browser";

export const instagramPosterInputSchema = z.object({
  profileId: z.string().min(1),
  caption: z.string().min(1),
  mediaPath: z.string().min(1),
  provider: browserProviderSchema.default("camoufox"),
  headless: z.boolean().default(true),
  startUrl: z.string().url().default("https://www.instagram.com"),
  fingerprintId: z.string().min(1).optional(),
});

export type InstagramPosterInput = z.input<typeof instagramPosterInputSchema>;
export type ParsedInstagramPosterInput = z.output<typeof instagramPosterInputSchema>;
