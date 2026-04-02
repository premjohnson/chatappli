import { forwardRef } from "react"

export interface AuthButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    isLoading?: boolean
    children: React.ReactNode
}

export const AuthButton = forwardRef<HTMLButtonElement, AuthButtonProps>(
    ({ isLoading, children, className = "", ...props }, ref) => {
        return (
            <button
                ref={ref}
                {...props}
                className={`w-full px-4 h-11 py-2 bg-[#eef2f6] text-[#1f2937] font-bold rounded-[20px] transition-all duration-300 transform hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:hover:scale-100 flex justify-center items-center ${className}`}
                style={{
                    boxShadow: "8px 8px 16px rgba(0,0,0,0.08), -8px -8px 16px rgba(255,255,255,0.9)"
                }}
            >
                {isLoading ? (
                    <div className="w-5 h-5 border-2 border-[#1f2937]/30 border-t-[#1f2937] rounded-full animate-spin mr-2" />
                ) : null}
                {children}
            </button>
        )
    }
)

AuthButton.displayName = "AuthButton"
