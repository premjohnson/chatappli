import { useState } from "react"
import { useLogin } from "../hooks/useLogin"
import { AuthInput } from "./AuthInput"
import { AuthButton } from "./AuthButton"
import { Mail, Lock } from "lucide-react"

export default function LoginForm() {
  const { mutate: login, isPending: isLoggingIn } = useLogin()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    login({ email, password })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col space-y-4 w-full">
      <AuthInput
        label="Email Address"
        type="email"
        placeholder="name@example.com"
        value={email}
        required
        onChange={(e) => setEmail(e.target.value)}
        icon={<Mail className="h-5 w-5" />}
      />

      <AuthInput
        label="Password"
        type="password"
        placeholder="••••••••"
        value={password}
        required
        onChange={(e) => setPassword(e.target.value)}
        icon={<Lock className="h-5 w-5" />}
      />

      <AuthButton
        type="submit"
        isLoading={isLoggingIn}
        className="mt-3"
      >
        Sign In
      </AuthButton>
    </form>
  )
}
