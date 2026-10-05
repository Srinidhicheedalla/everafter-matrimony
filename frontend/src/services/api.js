import axios from "axios";

// Set per environment: frontend/.env.development (npm run dev), .env.production (builds)
const baseURL = import.meta.env.VITE_API_URL;
if (!baseURL) throw new Error("VITE_API_URL is not set (see frontend/.env.development)");

const api = axios.create({ baseURL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Expired/invalid token: drop the stale session and send the user to login.
// Only when a token was sent, so a wrong password on /login doesn't redirect.
api.interceptors.response.use(undefined, (err) => {
  if (err.response?.status === 401 && err.config.headers.Authorization) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    window.location.href = "/login";
  }
  return Promise.reject(err);
});

export default api;
