import axios from "axios";
import toast from "react-hot-toast";
import { useAuthStore } from "../store/useAuthStore";

//  Tránh lặp lại toast khi có nhiều request cùng lỗi
let hasShownTokenExpiredToast = false;

export const api = axios.create({
  baseURL: "https://pf86nve7i8.execute-api.ap-southeast-1.amazonaws.com/dev",
});

// Request interceptor – gắn token nếu có
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("idToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor – xử lý lỗi token hết hạn
api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || "";

    const isTokenExpired =
      status === 401 &&
      message.toLowerCase().includes("token") &&
      message.toLowerCase().includes("expired");

    if (isTokenExpired && !hasShownTokenExpiredToast) {
      hasShownTokenExpiredToast = true;

      toast.error("Phiên đăng nhập đã hết hạn. Bạn đã bị đăng xuất.", {
        duration: 7000, // ⏱ Hiện toast 7 giây
      });

      // Xoá token và logout
      localStorage.removeItem("idToken");
      const logout = useAuthStore.getState().logout;
      logout(false);

      // Reset flag sau 3 giây để không hiện lặp
      setTimeout(() => {
        hasShownTokenExpiredToast = false;
      }, 3000);

      // Không return error để tránh hiện toast từ nơi khác
      return Promise.reject(); 
    }

    // Các lỗi khác vẫn trả về bình thường
    return Promise.reject(error);
  }
);
