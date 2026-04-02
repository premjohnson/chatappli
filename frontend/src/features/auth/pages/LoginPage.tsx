import { Link } from "react-router-dom"
import LoginForm from "../components/LoginForm"
import AuthLayout from "../components/AuthLayout"
import AuthCard from "../components/AuthCard"

export default function LoginPage() {
  return (
    <AuthLayout>
      <AuthCard
        title="Welcome Back"
        subtitle="Login to continue chatting"
      >
        <LoginForm />

        <div className="mt-6 flex flex-col items-center gap-4 text-sm">
          <Link
            to="/forgot-password"
            className="text-gray-600 hover:text-gray-900 transition-colors duration-200"
          >
            Forgot Password?
          </Link>

          <p className="text-gray-500">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="text-gray-900 hover:text-black font-semibold transition-colors duration-200"
            >
              Sign up
            </Link>
          </p>
        </div>
      </AuthCard>
    </AuthLayout>
  )
}