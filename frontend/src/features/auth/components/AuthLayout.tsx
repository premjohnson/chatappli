import type { ReactNode } from "react"

interface AuthLayoutProps {
    children: ReactNode
}

export default function AuthLayout({ children }: AuthLayoutProps) {
    return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#e8edf2] p-4 sm:p-8 relative overflow-hidden">
            {children}
        </div>
    )
}
