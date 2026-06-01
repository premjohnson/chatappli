import { z } from "zod";

export const messageSchema =
   z.object({

      conversationId:
         z.string(),

      content:
         z.string()
           .min(1)
           .max(5000)
   });