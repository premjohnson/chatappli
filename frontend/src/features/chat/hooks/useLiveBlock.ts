import { useQuery } from "@tanstack/react-query"
import { getLiveBlockApi } from "../api/getLiveBlock.api"
import type { LiveBlock } from "../types/liveblock.types"
import { useAuthStore } from "../../../store/auth.store"

export const useLiveBlock = (blockId: string) => {
  const accessToken = useAuthStore((s) => s.accessToken)

  return useQuery<LiveBlock>({
    queryKey: ["liveblock", blockId],
    queryFn: () => getLiveBlockApi(blockId),
    enabled: !!accessToken && !!blockId,
    refetchOnWindowFocus: false,
    staleTime: 1000 * 60 * 5,
  })
}
