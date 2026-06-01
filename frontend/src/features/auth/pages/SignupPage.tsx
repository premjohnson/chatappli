import { Link } from "react-router-dom"
import SignupForm from "../components/SignupForm"
import { AuthLayout } from "../components/AuthLayout"
import AuthCard from "../components/AuthCard"
import { motion } from "framer-motion"

export default function SignupPage() {
  return (
    <AuthLayout>
      <AuthCard
        title="Identity"
        subtitle="Establish your unique secure presence"
      >
        <SignupForm />

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-8 md:mt-10 text-center"
        >
          <p className="text-gray-400 font-bold text-[10px] uppercase tracking-[0.2em]">
            Already Registered?{" "}
            <Link
              to="/login"
              className="text-gray-900 hover:opacity-70 transition-opacity ml-1 border-b border-gray-900/20"
            >
              Sign In
            </Link>
          </p>
        </motion.div>
      </AuthCard>
    </AuthLayout>
  )
}
