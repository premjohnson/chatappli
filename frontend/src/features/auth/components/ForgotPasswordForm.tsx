import { useState } from "react"
import { useForgotPassword } from "../hooks/useForgotPassword"
import { AuthInput } from "./AuthInput"
import { AuthButton } from "./AuthButton"

export default function ForgotPasswordForm({ onSuccess }: { onSuccess?: (email: string) => void }) {

  const { mutate, isPending } = useForgotPassword()

  const [email, setEmail] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    mutate(email, {
      onSuccess: () => {
        if (onSuccess) onSuccess(email)
      }
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col space-y-6">

      <AuthInput
        label="Email"
        type="email"
        placeholder="Enter email"
        value={email}
        required
        onChange={(e) => setEmail(e.target.value)}
      />

      <AuthButton
        type="submit"
        disabled={isPending}
        isLoading={isPending}
      >
        {isPending ? "Sending..." : "Send OTP"}
      </AuthButton>

    </form>
  )
}