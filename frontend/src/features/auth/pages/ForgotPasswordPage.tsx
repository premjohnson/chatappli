import { useState } from "react"
import { Link } from "react-router-dom"
import ForgotPasswordForm from "../components/ForgotPasswordForm"
import ResetPasswordForm from "../components/ResetPasswordForm"
import AuthLayout from "../components/AuthLayout"
import AuthCard from "../components/AuthCard"

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<"email" | "reset">("email")
  const [savedEmail, setSavedEmail] = useState("")

  return (
    <AuthLayout>
      <AuthCard
        title={step === "email" ? "Forgot Password" : "Reset Password"}
        subtitle={step === "email" ? "Enter your email to receive an OTP." : "Enter OTP and new password."}
      >
        {step === "email" ? (
          <ForgotPasswordForm onSuccess={(email) => {
            setSavedEmail(email)
            setStep("reset")
          }} />
        ) : (
          <ResetPasswordForm defaultEmail={savedEmail} />
        )}

        <div className="mt-6 text-center text-sm">
          <Link
            to="/login"
            className="text-gray-600 hover:text-[#1f2937] transition-colors duration-200"
          >
            Back to Login
          </Link>
        </div>
      </AuthCard>
    </AuthLayout>
  )
}