import { useState } from "react"
import { useResetPassword } from "../hooks/useResetPassword"
import { AuthInput } from "./AuthInput"
import { AuthButton } from "./AuthButton"

export default function ResetPasswordForm({ defaultEmail }: { defaultEmail?: string }) {

  const { mutate, isPending } = useResetPassword()

  const [email, setEmail] = useState(defaultEmail || "")
  const [otp, setOtp] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    mutate({
      email,
      otp,
      newPassword: password
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col space-y-4">

      <AuthInput
        label="Email"
        type="email"
        placeholder="Enter email"
        value={email}
        required
        readOnly={!!defaultEmail}
        className={defaultEmail ? "opacity-70 cursor-not-allowed" : ""}
        onChange={(e) => setEmail(e.target.value)}
      />

      <AuthInput
        label="OTP"
        type="text"
        placeholder="Enter OTP code"
        value={otp}
        required
        onChange={(e) => setOtp(e.target.value)}
      />

      <AuthInput
        label="New Password"
        type="password"
        placeholder="Enter new password"
        value={password}
        required
        onChange={(e) => setPassword(e.target.value)}
      />

      <AuthButton
        type="submit"
        disabled={isPending}
        isLoading={isPending}
      >
        {isPending ? "Resetting..." : "Reset Password"}
      </AuthButton>

    </form>
  )
}