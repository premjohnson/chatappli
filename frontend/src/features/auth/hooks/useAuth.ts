import { useAuthStore } from "../../../store/auth.store";

export const useAuth = () => {

  const hydrated = useAuthStore((s) => s.hydrated);
  const authStatus = useAuthStore((s) => s.authStatus);

  return {
    hydrated,
    authStatus,
    authenticated: authStatus === "authenticated",
  };

};