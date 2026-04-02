import { forwardRef } from "react"

export interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string
}

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
    ({ label, ...props }, ref) => {
        return (
            <div className="w-full">
                <label className="block text-sm font-medium text-[#6b7280] mb-2 px-1">
                    {label}
                </label>
                <input
                    ref={ref}
                    {...props}
                    className={`w-full px-4 h-10 py-2 bg-[#eef2f6] text-[#1f2937] placeholder:text-[#6b7280] rounded-[20px] focus:outline-none focus:ring-2 focus:ring-[#8fa3ba]/50 transition-all ${props.className || ""}`}
                    style={{
                        boxShadow: "inset 2px 2px 6px rgba(0,0,0,0.06), inset -2px -2px 6px rgba(255,255,255,0.8)"
                    }}
                />
            </div>
        )
    }
)

AuthInput.displayName = "AuthInput"
