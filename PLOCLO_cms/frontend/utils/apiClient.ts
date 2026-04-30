import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

// 1. Create an Axios Instance
export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// 2. Add an Interceptor to automatically inject the Token
// This replaces the need to manually grab localStorage in every single API call
apiClient.interceptors.request.use(
  (config) => {
    // Check if we are in the browser
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
