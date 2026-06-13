import { z } from "zod";

// Helper to validate MongoDB ObjectId hex string (24 chars)
const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, {
  message: "Invalid ObjectId format",
});

export const createLiveBlockSchema = z.object({
  conversationId: objectIdSchema,
  type: z.enum(["checklist", "poll"]),
  state: z.record(z.any()).optional().default({}),
});

// Validator for checklist actions
const checklistPayloadSchema = z.union([
  z.object({
    text: z.string().min(1, "Text is required for adding a checklist item"),
  }),
  z.object({
    itemId: z.string().uuid("Invalid item ID format"),
  }),
]);

// Validator for poll actions
const pollPayloadSchema = z.union([
  z.object({
    text: z.string().min(1, "Text is required for adding a poll option"),
  }),
  z.object({
    optionId: z.string().uuid("Invalid option ID format"),
  }),
]);

export const liveblockActionSchema = z.object({
  blockId: objectIdSchema,
  clientVersion: z.number().int().nonnegative({
    message: "clientVersion must be a non-negative integer",
  }),
  action: z.discriminatedUnion("type", [
    z.object({
      type: z.literal("ADD_ITEM"),
      payload: z.object({
        text: z.string().min(1, "Item text cannot be empty"),
      }),
    }),
    z.object({
      type: z.literal("TOGGLE_ITEM"),
      payload: z.object({
        itemId: z.string().uuid(),
      }),
    }),
    z.object({
      type: z.literal("REMOVE_ITEM"),
      payload: z.object({
        itemId: z.string().uuid(),
      }),
    }),
    z.object({
      type: z.literal("ADD_OPTION"),
      payload: z.object({
        text: z.string().min(1, "Option text cannot be empty"),
      }),
    }),
    z.object({
      type: z.literal("VOTE"),
      payload: z.object({
        optionId: z.string().uuid(),
      }),
    }),
    z.object({
      type: z.literal("FREEZE"),
      payload: z.any().optional(),
    }),
  ]),
});
