import { z } from "zod";

export const typingSchema =

  z.object({

    conversationId:

      z.string()

        .min(1)

        .max(100)
  });