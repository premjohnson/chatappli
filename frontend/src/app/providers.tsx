import { QueryClientProvider } from "@tanstack/react-query"
import { queryClient } from "../lib/queryClient"
import { connectSocket, disconnectSocket, updateSocketAuth } from "../lib/socket"
import { useEffect } from "react"
import { useAuthStore } from "../store/auth.store"

interface Props {
  children: React.ReactNode
}

function SocketProvider({ children }: Props) {

  const accessToken = useAuthStore((s) => s.accessToken)

  /* ================= INITIAL CONNECT ================= */

  useEffect(() => {

    if (!accessToken) return

    console.log("[SocketProvider] Initial socket connection")

    connectSocket(accessToken)

    return () => {
      console.log("[SocketProvider] Cleanup socket")
      disconnectSocket()
    }

  }, [])

  /* ================= TOKEN REFRESH ================= */

  useEffect(() => {

    if (!accessToken) return

    console.log("[SocketProvider] Updating socket auth")

    updateSocketAuth(accessToken)

  }, [accessToken])

  return <>{children}</>
}

export default function Providers({ children }: Props) {

  return (
    <QueryClientProvider client={queryClient}>
      <SocketProvider>{children}</SocketProvider>
    </QueryClientProvider>
  )
}