import ResetPasswordForm from "../components/ResetPasswordForm"
import { AuthLayout } from "../components/AuthLayout"
import AuthCard from "../components/AuthCard"

export default function ResetPasswordPage() {
  return (
    <AuthLayout>
      <AuthCard
        title="Security"
        subtitle="Confirm your new identity"
      >
        <ResetPasswordForm />
      </AuthCard>
    </AuthLayout>
  )
}
