import axios from "axios"
import { updateSocketAuth } from "./socket"
import { useAuthStore } from "../store/auth.store"

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5013/api/v1"

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true
})

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

/* ================= REFRESH QUEUE ================= */

let isRefreshing = false
let failedQueue: any[] = []

const processQueue = (error: any, token: string | null) => {

  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error)
    } else {
      prom.resolve(token)
    }
  })

  failedQueue = []
}

/* ================= RESPONSE INTERCEPTOR ================= */

api.interceptors.response.use(

  (response) => response,

  async (error) => {

    const originalRequest = error.config

    if (error.response?.status !== 401 || originalRequest._retry) {
      return Promise.reject(error)
    }

    if (isRefreshing) {

      return new Promise((resolve, reject) => {

        failedQueue.push({
          resolve,
          reject
        })

      }).then((token) => {

        originalRequest.headers.Authorization = `Bearer ${token}`
        return api(originalRequest)

      })

    }

    originalRequest._retry = true
    isRefreshing = true

    try {

      const res = await axios.post(
        `${API_URL}/auth/refresh`,
        {},
        { withCredentials: true }
      )

      const newToken = res.data.accessToken

      // Update Zustand store so subsequent requests get the new token
      useAuthStore.getState().updateToken(newToken)

      // Update axios default header
      api.defaults.headers.common.Authorization = `Bearer ${newToken}`

      // Update originalRequest header for the retried request
      originalRequest.headers.Authorization = `Bearer ${newToken}`

      processQueue(null, newToken)

      /* ================= SOCKET RECONNECT ================= */

      updateSocketAuth(newToken)

      return api(originalRequest)

    } catch (err) {

      processQueue(err, null)

      return Promise.reject(err)

    } finally {

      isRefreshing = false

    }

  }
)

export default api