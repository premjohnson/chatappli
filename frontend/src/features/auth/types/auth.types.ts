export interface User {
  id: string
  email: string
  username: string
  avatar: string | null
}

export interface LoginRequest {
  email: string
  password: string
}

export interface SignupRequest {
  email: string
  username: string
  password: string
  avatar?: File
}

export interface LoginResponse {
  status: "success"
  data: {
    user: User
    accessToken: string
  }
}

export interface RegisterResponse {
  status: "success"
  message: string
  data: {
    id: string
    email: string
    username: string
    avatar: string | null
  }
}

export interface RefreshResponse {
  status: "success"
  accessToken: string
}