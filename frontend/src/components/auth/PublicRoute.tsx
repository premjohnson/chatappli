import { Navigate } from "react-router-dom"
import { useAuthStore } from "../../store/auth.store"
import type { ReactNode } from "react"

interface PublicRouteProps {
    children: ReactNode
}

export default function PublicRoute({ children }: PublicRouteProps) {
    const user = useAuthStore((state) => state.user)

    if (user) {
        return <Navigate to="/chat" replace />
    }

    return <>{children}</>
}
