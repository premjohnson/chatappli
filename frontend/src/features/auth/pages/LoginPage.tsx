import { Link } from "react-router-dom"
import LoginForm from "../components/LoginForm"
import { AuthLayout } from "../components/AuthLayout"
import AuthCard from "../components/AuthCard"
import { motion } from "framer-motion"

export default function LoginPage() {
  return (
    <AuthLayout>
      <AuthCard
        title="Welcome"
        subtitle="Access your secure communication workspace"
      >
        <LoginForm />

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-8 md:mt-10 flex flex-col items-center gap-4"
        >
          <Link
            to="/forgot-password"
            className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400 hover:text-gray-900 transition-colors"
          >
            Forgot Password
          </Link>

          <div className="h-[1px] w-4 bg-gray-100" />

          <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em]">
            New Member?{" "}
            <Link
              to="/signup"
              className="text-gray-900 hover:opacity-70 transition-opacity ml-1 border-b border-gray-900/20"
            >
              Request Access
            </Link>
          </p>
        </motion.div>
      </AuthCard>
    </AuthLayout>
  )
}
