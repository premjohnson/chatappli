import { Link } from "react-router-dom"
import SignupForm from "../components/SignupForm"
import AuthLayout from "../components/AuthLayout"
import AuthCard from "../components/AuthCard"

export default function SignupPage() {
  return (
    <AuthLayout>
      <AuthCard
        title="Create Account"
        subtitle="Start chatting with friends"
        className="p-6"
      >
        <SignupForm />

        <div className="mt-6 text-center text-sm">
          <p className="text-gray-500">
            Already have an account?{" "}
            <Link
              to="/login"
              className="text-gray-900 hover:text-black font-semibold transition-colors duration-200"
            >
              Login
            </Link>
          </p>
        </div>
      </AuthCard>
    </AuthLayout>
  )
}