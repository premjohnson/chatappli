import { authClient } from "../../../lib/authClient";
import type { RefreshResponse } from "../types/auth.types"

export const refreshTokenApi = async (): Promise<RefreshResponse> => {

const { data } = await authClient.post<RefreshResponse>(
    "/auth/refresh"
);

  return data
}