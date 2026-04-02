import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { signupApi } from "../api/signup.api"
import { AuthInput } from "./AuthInput"
import { AuthButton } from "./AuthButton"

export default function SignupForm() {

  const mutation = useMutation({
    mutationFn: signupApi
  })

  const [email, setEmail] = useState("")
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [avatar, setAvatar] = useState<File | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    mutation.mutate({
      email,
      username,
      password,
      avatar: avatar || undefined
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col space-y-4">

      <AuthInput
        label="Username"
        type="text"
        placeholder="Enter username"
        onChange={(e) => setUsername(e.target.value)}
        required
      />

      <AuthInput
        label="Email"
        type="email"
        placeholder="Enter email"
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <AuthInput
        label="Password"
        type="password"
        placeholder="Enter password"
        onChange={(e) => setPassword(e.target.value)}
        required
      />

      {/* Avatar input retains some custom styling for the file picker but adopts neumorphic layout */}
      <div className="w-full">
        <label className="block text-sm font-medium text-[#6b7280] mb-2 px-1">Avatar (Optional)</label>
        <input
          type="file"
          accept="image/*"
          onChange={(e) => setAvatar(e.target.files?.[0] || null)}
          className="w-full px-5 py-3 text-sm text-[#1f2937] file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-medium file:bg-white file:text-[#1f2937] hover:file:bg-gray-100 transition-all rounded-[20px] bg-[#eef2f6]"
          style={{
            boxShadow: "inset 2px 2px 6px rgba(0,0,0,0.06), inset -2px -2px 6px rgba(255,255,255,0.8)"
          }}
        />
      </div>

      <AuthButton
        type="submit"
        disabled={mutation.isPending}
        isLoading={mutation.isPending}
      >
        {mutation.isPending ? "Registering..." : "Register"}
      </AuthButton>

    </form>
  )
}