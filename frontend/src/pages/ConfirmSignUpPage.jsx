import React, { useState } from "react";
import { Loader2, Mail, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { CognitoUser } from "amazon-cognito-identity-js";
import { userPool } from "../lib/cognito";
import toast from "react-hot-toast";
import AuthImagePattern from "../components/AuthImagePattern";
import { Link } from 'react-router-dom';

const ConfirmSignUpPage = () => {
  const [formData, setFormData] = useState({
    email: "",
    code: "",
  });

  const [isConfirming, setIsConfirming] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    const { email, code } = formData;

    if (!email || !code) return toast.error("Nhập email và mã xác nhận");

    setIsConfirming(true);

    const userData = {
      Username: email,
      Pool: userPool,
    };

    const cognitoUser = new CognitoUser(userData);

    cognitoUser.confirmRegistration(code, true, (err, result) => {
      setIsConfirming(false);

      if (err) {
        toast.error(err.message || "Xác minh thất bại");
      } else {
        toast.success("Xác minh thành công! Mời bạn đăng nhập");
        navigate("/login");
      }
    });
  };

  return (
    <div className="h-screen grid lg:grid-cols-2">
      {/* Trái */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="flex flex-col items-center gap-2 group">
              <h1 className="text-2xl font-bold mt-2">Xác minh tài khoản</h1>
              <p className="text-base-content/60">Nhập mã được gửi qua email</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
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
                  className="input input-bordered w-full pl-10"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Mã xác nhận */}
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Mã xác minh</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  className="input input-bordered w-full pl-10"
                  placeholder="Nhập mã 6 chữ số"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Submit */}
            <button type="submit" className="btn btn-primary w-full" disabled={isConfirming}>
              {isConfirming ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Xác minh...
                </>
              ) : (
                "Xác minh tài khoản"
              )}
            </button>
            <div className="text-center">
                <p className="text-base-content/60">
                  Chưa có tài khoản?{" "}
                  <Link to="/signup" className="link link-primary">
                    Tạo tài khoản
                  </Link>
                </p>
            </div>
            <div className="text-center">
                <p className="text-base-content/60">
                  Đã có tài khoản?{" "}
                  <Link to="/login" className="link link-primary">
                    Đăng nhập
                  </Link>
                </p>
            </div>
          </form>
        </div>
      </div>

      {/* Phải */}
      <AuthImagePattern
        title={"Xác thực tài khoản"}
        subtitle={"Nhập email và mã xác nhận để hoàn tất đăng ký"}
      />
    </div>
  );
};

export default ConfirmSignUpPage;
