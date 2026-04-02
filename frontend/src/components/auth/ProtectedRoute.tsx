import { Navigate, useLocation } from "react-router-dom"
import { useAuthStore } from "../../store/auth.store"
import type { ReactNode } from "react"

interface ProtectedRouteProps {
    children: ReactNode
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
    const user = useAuthStore((state) => state.user)
    const location = useLocation()

    if (!user) {
        return <Navigate to="/login" state={{ from: location }} replace />
    }

    return <>{children}</>
}
