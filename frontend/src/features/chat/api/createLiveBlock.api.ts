import api from "../../../lib/axios";
import type { LiveBlock } from "../types/liveblock.types";

interface CreatePayload {
  conversationId: string;
  type: "checklist" | "poll";
  state?: Record<string, any>;
}

export const createLiveBlockApi = async (
  payload: CreatePayload
): Promise<LiveBlock> => {
  const res = await api.post("/liveblocks", payload);
  return res.data.data;
};
