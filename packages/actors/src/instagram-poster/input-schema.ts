import { z } from "zod";

export const instagramPosterInputSchema = z.object({
  profileId: z.string().min(1),
  caption: z.string().min(1),
  mediaPath: z.string().min(1),
});

export type InstagramPosterInput = z.infer<typeof instagramPosterInputSchema>;
