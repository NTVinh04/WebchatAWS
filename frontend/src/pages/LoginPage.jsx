import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { loginCognito } from "../lib/cognito"; // Giả sử đây là hàm login
import { api } from "../lib/axios"; // Axios đã cấu hình
import {avatarS3} from "../constants/avatars3"; // giả sử có ảnh mặc định
import { Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';
import AuthImagePattern from "../components/AuthImagePattern";
import { useAuthStore } from "../store/useAuthStore";

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [formData, setFormData] = useState({ email: "", password: "" });
  const navigate = useNavigate();
  const setUser = useAuthStore((state) => state.setUser);
  const checkAuth = useAuthStore((state) => state.checkAuth);

const handleSubmit = async (e) => {
  e.preventDefault();
  setIsLoggingIn(true);

  try {
    const result = await loginCognito(formData.email, formData.password);
    const idToken = result.getIdToken().getJwtToken();
    const email = result.getIdToken().payload.email;
    const fullName = localStorage.getItem("fullName") || email.split("@")[0];

    localStorage.setItem("idToken", idToken);

    let isUserCreatedOrExists = false;

    try {
      await api.get("/me", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      console.log("User đã tồn tại trong DynamoDB");
      isUserCreatedOrExists = true;
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message?.toLowerCase() || "";

      if (status === 401 && message.includes("token") && message.includes("expired")) {
        return;
      }

      if (status === 404 || status === 500) {
        try {
          await api.post(
            "/create-user",
            {
              fullName,
              avatar: avatarS3,
            },
            {
              headers: { Authorization: idToken },
            }
          );
          console.log("Đã tạo user mới trong DynamoDB");
          isUserCreatedOrExists = true;
        } catch (createErr) {
          toast.error("Không thể tạo người dùng mới", { duration: 7000 });
          console.error("Lỗi khi tạo user:", createErr);
        }
      } else {
        toast.error("Đăng nhập lỗi: " + (err.response?.data?.error || "Không xác định"), {
          duration: 7000,
        });
        console.error("Lỗi khi gọi /me:", err);
      }
    }

    if (isUserCreatedOrExists) {
      await checkAuth(); // Cập nhật lại user chính xác trong store
      toast.success("Đăng nhập thành công!", { duration: 3000 });
      navigate("/");
    }
  } catch (err) {
    toast.error("Đăng nhập thất bại", { duration: 7000 });
    console.error(err);
  } finally {
    setIsLoggingIn(false);
  }
};

  return (
    <div className="h-screen grid lg:grid-cols-2">
      {/* Trái*/}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex flex-col items-center gap-2 group">
              <div
                className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20
              transition-colors"
              >
                
              </div>
              <h1 className="text-2xl font-bold mt-2">Chào mừng bạn</h1>
              <p className="text-base-content/60">Đăng nhập vào tài khoản</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Email</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-base-content/40" />
                </div>
                <input
                  type="email"
                  className={`input input-bordered w-full pl-10`}
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Mật khẩu</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-base-content/40" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  className={`input input-bordered w-full pl-10`}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-base-content/40" />
                  ) : (
                    <Eye className="h-5 w-5 text-base-content/40" />
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={isLoggingIn}>
              {isLoggingIn ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading...
                </>
              ) : (
                "Đăng nhập"
              )}
            </button>
          </form>

          <div className="text-center">
            <p className="text-base-content/60">
              Không có tài khoản?{" "}
              <Link to="/signup" className="link link-primary">
                Tạo tài khoản
              </Link>
            </p>
          </div>
          <div className="text-center">
            <p className="text-base-content/60">
              <Link to="/confirm-signup" className="link link-primary">
                Xác minh tài khoản
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Phải*/}
      <AuthImagePattern
        title={"Mừng bạn trở lại!"}
        subtitle={"Hãy đăng nhập để tiếp tục các cuộc trò chuyện của bạn."}
      />
    </div>
  );
};

export default LoginPage;
