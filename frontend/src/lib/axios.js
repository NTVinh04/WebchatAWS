import axios from "axios";

// Tạo instance Axios với baseURL là API Gateway URL
export const api = axios.create({
  baseURL: "https://05tpsgyjzi.execute-api.ap-southeast-1.amazonaws.com/dev",
});

// Thêm interceptor: Tự động gắn Authorization header với token Cognito
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("idToken"); // Lấy token đã lưu sau khi đăng nhập
    if (token) {
      config.headers.Authorization = token;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
