import { Link } from "react-router-dom"
import ForgotPasswordForm from "../components/ForgotPasswordForm"
import { AuthLayout } from "../components/AuthLayout"
import AuthCard from "../components/AuthCard"
import { motion } from "framer-motion"

export default function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <AuthCard
        title="Recovery"
        subtitle="Reset your secure access"
      >
        <ForgotPasswordForm />

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 text-center"
        >
          <Link
            to="/login"
            className="text-[11px] font-bold uppercase tracking-[0.2em] text-gray-400 hover:text-brand-primary transition-colors"
          >
            Back to Sign In
          </Link>
        </motion.div>
      </AuthCard>
    </AuthLayout>
  )
}
