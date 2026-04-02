import { useState } from "react"
import { useLogin } from "../hooks/useLogin"
import { AuthInput } from "./AuthInput"
import { AuthButton } from "./AuthButton"

export default function LoginForm() {

  const { mutate: login, isPending: isLoggingIn } = useLogin()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    login({
      email,
      password
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col space-y-6">

      <AuthInput
        label="Email"
        type="email"
        placeholder="Enter your email"
        value={email}
        required
        onChange={(e) => setEmail(e.target.value)}
      />

      <AuthInput
        label="Password"
        type="password"
        placeholder="Enter your password"
        value={password}
        required
        onChange={(e) => setPassword(e.target.value)}
      />

      <AuthButton
        type="submit"
        disabled={isLoggingIn}
        isLoading={isLoggingIn}
      >
        {isLoggingIn ? "Logging in..." : "Login"}
      </AuthButton>

    </form>
  )
}