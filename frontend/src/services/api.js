import axios from "axios";

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "https://57yp657i65.execute-api.ap-south-1.amazonaws.com/staging/api",
});

api.interceptors.request.use((config) => {
  const nextConfig = { ...config };
  const requestUrl = String(nextConfig.url || "");
  const adminToken = localStorage.getItem("adminToken") || "";

  if (adminToken && requestUrl.startsWith("/admin")) {
    nextConfig.headers = {
      ...(nextConfig.headers || {}),
      Authorization: `Bearer ${adminToken}`,
    };
  }

  return nextConfig;
});

export default api;
