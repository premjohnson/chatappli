import api from "../../../lib/axios";
import type { LiveBlock } from "../types/liveblock.types";

export const getLiveBlockApi = async (
  blockId: string
): Promise<LiveBlock> => {
  const res = await api.get(`/liveblocks/${blockId}`);
  return res.data.data;
};
