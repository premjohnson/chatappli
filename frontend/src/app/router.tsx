import { createBrowserRouter, Navigate } from "react-router-dom"

import {
  LoginPage,
  SignupPage,
  ForgotPasswordPage,
  ResetPasswordPage
} from "../features/auth"

import ErrorPage from "../components/layout/ErrorPage"
import ProtectedRoute from "../components/auth/ProtectedRoute"
import PublicRoute from "../components/auth/PublicRoute"
import ChatPage from "../features/chat/pages/ChatPage"

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Navigate to="/login" replace />,
    errorElement: <ErrorPage />
  },
  {
    path: "/login",
    element: (
      <PublicRoute>
        <LoginPage />
      </PublicRoute>
    )
  },
  {
    path: "/signup",
    element: (
      <PublicRoute>
        <SignupPage />
      </PublicRoute>
    )
  },
  {
    path: "/forgot-password",
    element: (
      <PublicRoute>
        <ForgotPasswordPage />
      </PublicRoute>
    )
  },
  {
    path: "/reset-password",
    element: (
      <PublicRoute>
        <ResetPasswordPage />
      </PublicRoute>
    )
  },
  {
    path: "/chat",
    element: (
      <ProtectedRoute>
        <ChatPage />
      </ProtectedRoute>
    )
  }
])