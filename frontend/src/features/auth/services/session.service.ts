import { refreshTokenApi } from "../api/refreshToken.api";
import { useAuthStore } from "../../../store/auth.store";
import { isTokenExpired } from "../utils/jwt.util";

class SessionService {


  /**
   * Single-flight refresh promise.
   * Prevents multiple concurrent refresh requests.
   */
  private refreshPromise: Promise<string> | null = null;

  /**
   * Refresh the current session.
   *
   * Responsibilities:
   * - Ensure only one refresh request is in-flight.
   * - Update Zustand with the new access token.
   * - Return the new access token.
   *
   * Does NOT:
   * - Navigate
   * - Logout
   * - Disconnect sockets
   * - Show UI
   */
async refreshSession(): Promise<string> {
  if (this.refreshPromise) {
    return this.refreshPromise;
  }

  this.refreshPromise = (async () => {
    try {
      const response = await refreshTokenApi();

      // Validate backend response
      if (
        !response.data ||
        !response.data.user ||
        !response.data.accessToken
      ) {
        throw new Error("Invalid refresh response");
      }

      const { user, accessToken } = response.data;

      // Atomically update auth state
      useAuthStore.getState().setAuth(user, accessToken);

      return accessToken;
    } finally {
      // Always clear the in-flight promise
      this.refreshPromise = null;
    }
  })();

  return this.refreshPromise;
}


async bootstrapSession(): Promise<void> {

  const store = useAuthStore.getState();

  store.setAuthStatus("checking");

  try {

    const token = store.accessToken;

    if (!token) {
      store.setAuthStatus("anonymous");
      return;
    }

    if (!isTokenExpired(token)) {
      store.setAuthStatus("authenticated");
      return;
    }

    await this.refreshSession();

    store.setAuthStatus("authenticated");

  } catch {

    store.logout();

    store.setAuthStatus("anonymous");

  }

}
}

export const sessionService = new SessionService();