import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from "axios";

import { disconnectSocket } from "./socket";
import { useAuthStore } from "../store/auth.store";
import { sessionService } from "../features/auth/services/session.service";

interface RetryAxiosRequestConfig
  extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5013/api/v1";

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

/* ================= REQUEST ================= */

api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

/* ================= REFRESH QUEUE ================= */

let isRefreshing = false;

type FailedRequest = {
  resolve: (token: string | null) => void;
  reject: (error: unknown) => void;
};

let failedQueue: FailedRequest[] = [];

const processQueue = (
  error: unknown,
  token: string | null
) => {
  failedQueue.forEach((request) => {
    if (error) {
      request.reject(error);
    } else {
      request.resolve(token);
    }
  });

  failedQueue = [];
};

/* ================= RESPONSE ================= */

api.interceptors.response.use(

  (response) => response,

  async (error: AxiosError) => {

    const originalRequest =
      error.config as RetryAxiosRequestConfig | undefined;

    if (!originalRequest) {
      return Promise.reject(error);
    }

    if (
      error.response?.status !== 401 ||
      originalRequest._retry
    ) {
      return Promise.reject(error);
    }

    if (isRefreshing) {

      return new Promise<string | null>((resolve, reject) => {

        failedQueue.push({
          resolve,
          reject,
        });

      }).then((token: string | null) => {

        originalRequest.headers = {
          ...originalRequest.headers,
          Authorization: `Bearer ${token}`,
        };

        return api(originalRequest);

      });

    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {

      const newToken =
        await sessionService.refreshSession();

      api.defaults.headers.common.Authorization =
        `Bearer ${newToken}`;

      originalRequest.headers = {
        ...originalRequest.headers,
        Authorization: `Bearer ${newToken}`,
      };

      processQueue(null, newToken);

      return api(originalRequest);

    } catch (err) {

      processQueue(err, null);

      const { logout } = useAuthStore.getState();

      logout();

      disconnectSocket();

      if (window.location.pathname !== "/login") {
        window.location.replace("/login");
      }

      return Promise.reject(err);

    } finally {

      isRefreshing = false;

    }

  }

);

export default api;