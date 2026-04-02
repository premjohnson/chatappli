import { Link } from "react-router-dom"
import ResetPasswordForm from "../components/ResetPasswordForm"
import AuthLayout from "../components/AuthLayout"
import AuthCard from "../components/AuthCard"

export default function ResetPasswordPage() {
  return (
    <AuthLayout>
      <AuthCard
        title="Reset Password"
        subtitle="Enter your OTP and new password"
      >
        <ResetPasswordForm />

        <div className="mt-6 text-center text-sm">
          <Link
            to="/login"
            className="text-gray-600 hover:text-gray-900 transition-colors duration-200"
          >
            Back to Login
          </Link>
        </div>
      </AuthCard>
    </AuthLayout>
  )
}