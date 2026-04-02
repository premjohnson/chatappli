import type { ReactNode } from "react"

interface AuthCardProps {
    title: string
    subtitle: string
    children: ReactNode
    className?: string
}

export default function AuthCard({ title, subtitle, className = "p-8 sm:p-10", children }: AuthCardProps) {
    return (
        <div
            className={`w-full max-w-md ${className} bg-[#eef2f6] rounded-[24px]`}
            style={{
                boxShadow: "8px 8px 16px rgba(0,0,0,0.08), -8px -8px 16px rgba(255,255,255,0.9)"
            }}
        >
            <div className="text-center mb-8">
                <h1 className="text-3xl sm:text-4xl font-bold text-[#1f2937] tracking-tight pb-2">
                    {title}
                </h1>
                <p className="text-sm sm:text-base text-[#6b7280]">
                    {subtitle}
                </p>
            </div>

            <div className="space-y-6">
                {children}
            </div>
        </div>
    )
}
