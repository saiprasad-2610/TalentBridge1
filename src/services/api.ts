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
    let token = localStorage.getItem("token");
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
