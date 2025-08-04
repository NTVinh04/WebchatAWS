import { Link } from "react-router-dom";
import AuthImagePattern from "../components/AuthImagePattern";
import { Eye, EyeOff, Loader2, Lock, Mail, SquareUserRound } from "lucide-react";
import { useState } from "react";
import { loginCognito } from "../lib/cognito"; 
import toast from "react-hot-toast";
import { api } from "../lib/axios";
import { avatarS3 } from "../constants/avatars3";

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false); //
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const handleSubmit = async (e) => {
  e.preventDefault();
  setIsLoggingIn(true);

  try {
    // Đăng nhập bằng Cognito
    const result = await loginCognito(formData.email, formData.password);
    const idToken = result.getIdToken().getJwtToken();
    const email = result.getIdToken().payload.email;
    const fullName = localStorage.getItem("fullName") || email.split("@")[0];

    // Lưu token vào localStorage
    localStorage.setItem("idToken", idToken);

    // Kiểm tra user đã tồn tại trong DynamoDB chưa
    try {
  await api.get("/me", {
    headers: { Authorization: idToken }
  });
  console.log("User đã tồn tại trong DynamoDB");
} catch (err) {
  const status = err.response?.status;
  
  if (status === 404) {
    // User chưa tồn tại → tạo mới
    try {
      await api.post("/create-user", {
        fullName,
        avatar: avatarS3
      }, {
        headers: { Authorization: idToken }
      });
      console.log("Đã tạo user mới trong DynamoDB");
    } catch (createErr) {
      toast.error(createErr.response?.data?.error || "Không thể tạo người dùng mới");
      console.error("Lỗi khi tạo user:", createErr);
    }
  } else if (status === 401) {
    toast.error("Không có quyền truy cập (401)");
    console.error("Token không hợp lệ:", err);
  } else if (status === 500) {
    console.warn("Server chưa có user hoặc lỗi khác - đang xử lý tạo user...");
    try {
      await api.post("/create-user", {
        fullName,
        avatar: avatarS3
      }, {
        headers: { Authorization: idToken }
      });
      console.log("Đã tạo user mới trong DynamoDB");
    } catch (createErr) {
      toast.error("Lỗi khi tạo user sau lỗi 500");
      console.error("Lỗi khi tạo user:", createErr);
    }
  } else {
    toast.error(err.response?.data?.error || "Lỗi không xác định");
    console.error("Lỗi khi gọi /me:", err);
  }
}


    toast.success("Đăng nhập thành công!");
    window.location.href = "/";
    
  } catch (err) {
    toast.error("Đăng nhập thất bại");
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
