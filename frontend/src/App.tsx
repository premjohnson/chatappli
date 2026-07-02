import AppShell from "./app/App"
import AuthBootstrap from "./features/auth/components/AuthBootstrap"

export default function App() {
  return(
  <AuthBootstrap>
    <AppShell />
  </AuthBootstrap>
  )
   
}