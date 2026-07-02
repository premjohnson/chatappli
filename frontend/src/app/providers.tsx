import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";

import { queryClient } from "../lib/queryClient";
import { connectSocket, disconnectSocket } from "../lib/socket";
import { useAuthStore } from "../store/auth.store";

interface Props {
  children: React.ReactNode;
}

function SocketProvider({ children }: Props) {
  const accessToken = useAuthStore((s) => s.accessToken);

  // Connect / reconnect whenever token changes
  useEffect(() => {
    if (!accessToken) {
      disconnectSocket();
      return;
    }

    connectSocket(accessToken);
  }, [accessToken]);

  // Disconnect only when provider unmounts
  useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, []);

  return <>{children}</>;
}

export default function Providers({ children }: Props) {
  return (
    <QueryClientProvider client={queryClient}>
      <SocketProvider>{children}</SocketProvider>
    </QueryClientProvider>
  );
}