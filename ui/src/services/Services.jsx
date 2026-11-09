import axios from "axios";
const api = axios.create({
  baseURL: "http://localhost:5178/api",
});

api.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("hotelToken") ||
      sessionStorage.getItem("hotelToken");

    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export default api;