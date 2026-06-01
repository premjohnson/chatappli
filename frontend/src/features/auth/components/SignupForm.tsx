import { useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { signupApi } from "../api/signup.api"
import { AuthInput } from "./AuthInput"
import { AuthButton } from "./AuthButton"
import { User, Mail, Lock, Camera } from "lucide-react"

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
    <form onSubmit={handleSubmit} className="flex flex-col space-y-3.5 w-full">
      <AuthInput
        label="Username"
        type="text"
        placeholder="Enter your username"
        onChange={(e) => setUsername(e.target.value)}
        required
        icon={<User className="h-5 w-5" />}
      />

      <AuthInput
        label="Email Address"
        type="email"
        placeholder="Enter your email"
        onChange={(e) => setEmail(e.target.value)}
        required
        icon={<Mail className="h-5 w-5" />}
      />

      <AuthInput
        label="Password"
        type="password"
        placeholder="••••••••"
        onChange={(e) => setPassword(e.target.value)}
        required
        icon={<Lock className="h-5 w-5" />}
      />

      <div className="w-full space-y-1.5">
        <label className="block text-[10px] font-bold uppercase tracking-[0.15em] text-gray-900/40 ml-3">Avatar (Optional)</label>
        <div className="relative group">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-brand-primary transition-colors pointer-events-none z-30">
            <Camera className="h-5 w-5" />
          </div>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setAvatar(e.target.files?.[0] || null)}
            className="flex h-12 w-full rounded-2xl border border-white/40 bg-white/20 pl-11 pr-4 py-2 text-xs transition-all file:mr-4 file:py-1 file:px-3 file:rounded-xl file:border-0 file:text-[9px] file:font-bold file:uppercase file:tracking-widest file:bg-brand-primary/10 file:text-brand-primary hover:file:bg-brand-primary/20 cursor-pointer focus:outline-none focus:border-brand-primary/30 focus:bg-white/40 backdrop-blur-2xl shadow-[inset_0_1.5px_2px_rgba(255,255,255,0.7),inset_0_-1px_1px_rgba(255,255,255,0.1)] relative z-10"
          />
        </div>
      </div>

      <AuthButton
        type="submit"
        isLoading={mutation.isPending}
        className="mt-3"
      >
        Create Account
      </AuthButton>
    </form>
  )
}
