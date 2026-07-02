import axios from "axios";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5013/api/v1";

export const authClient = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});