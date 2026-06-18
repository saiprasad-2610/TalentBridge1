import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Automatically inject JWT Token from localStorage if present
api.interceptors.request.use(
  (config) => {
    let token = null;
    try {
      token = localStorage.getItem("token");
      if (!token) {
        const savedAuth = localStorage.getItem("talentbridge_auth");
        if (savedAuth) {
          try {
            const authData = JSON.parse(savedAuth);
            token = authData.token || null;
          } catch (e) {
            // ignore parsing error
          }
        }
      }
    } catch (e) {
      console.warn("Storage access is blocked:", e);
    }
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
