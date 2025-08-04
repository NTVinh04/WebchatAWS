import React, { useState } from 'react';
import { Eye, EyeOff, Loader2, Lock, Mail, SquareUserRound, User } from 'lucide-react';
import { Link } from 'react-router-dom';
import AuthImagePattern from '../components/AuthImagePattern.jsx';
import toast from 'react-hot-toast';
import { CognitoUserAttribute } from 'amazon-cognito-identity-js';
import { userPool } from '../lib/cognito';
import { useNavigate } from "react-router-dom";

const SignUpPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
  });
  const [isSigningUp, setIsSigningUp] = useState(false);

  const navigate = useNavigate(); // Thêm để chuyển trang sau khi signup

  const validateForm = () => {
    if (!formData.fullName.trim()) return toast.error('Nhập đầy đủ tên');
    if (!formData.email.trim()) return toast.error('Nhập email');
    if (!/\S+@\S+\.\S+/.test(formData.email)) return toast.error('Sai định dạng email');
    if (!formData.password) return toast.error('Nhập mật khẩu');
    if (formData.password.length < 6) return toast.error('Mật khẩu phải có ít nhất 6 ký tự');
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm() !== true) return;

    setIsSigningUp(true);

    const { email, password, fullName } = formData;

    const attributes = [
      new CognitoUserAttribute({ Name: 'email', Value: email }),
      new CognitoUserAttribute({ Name: 'name', Value: fullName }),
    ];

    userPool.signUp(email, password, attributes, null, (err, result) => {
      setIsSigningUp(false);
      if (err) {
        toast.error(err.message || 'Đăng ký thất bại');
      } else {
        toast.success('Đăng ký thành công! Kiểm tra email để xác nhận.');

        // Lưu fullName vào localStorage để sử dụng ở login (tạo user trên DynamoDB)
        localStorage.setItem("fullName", fullName);

        // Chuyển sang trang xác nhận
        navigate("/confirm-signup");
      }
    });
  };


  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* Trái */}
      <div className="flex flex-col justify-center items-center p-6 sm:p-12">
        <div className="w-full max-w-md space-y-8">
          {/* LOGO */}
          <div className="text-center mb-8">
            <div className="flex flex-col items-center gap-2 group">
              <div className="size-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              </div>
              <h1 className="text-2xl font-bold mt-2">Đăng ký</h1>
              <p className="text-base-content/60">Bắt đầu với một tài khoản miễn phí</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Họ và tên</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="size-5 text-base-content/40" />
                </div>
                <input
                  type="text"
                  className="input input-bordered w-full pl-10"
                  placeholder="John Doe"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                />
              </div>
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text font-medium">Email</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="size-5 text-base-content/40" />
                </div>
                <input
                  type="email"
                  className="input input-bordered w-full pl-10"
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
                  <Lock className="size-5 text-base-content/40" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="input input-bordered w-full pl-10"
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
                    <EyeOff className="size-5 text-base-content/40" />
                  ) : (
                    <Eye className="size-5 text-base-content/40" />
                  )}
                </button>
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full" disabled={isSigningUp}>
              {isSigningUp ? (
                <>
                  <Loader2 className="size-5 animate-spin" />
                  Loading...
                </>
              ) : (
                'Tạo tài khoản'
              )}
            </button>
          </form>

          <div className="text-center">
            <p className="text-base-content/60">
              Đã có tài khoản?{' '}
              <Link to="/login" className="link link-primary">
                Đăng nhập
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

      {/* phải */}
      <AuthImagePattern
        title="Tham gia cộng đồng của chúng tôi"
        subtitle="Kết nối cùng bạn bè, lưu giữ những khoảnh khắc bên cạnh những người bạn yêu thương."
      />
    </div>
  );
};

export default SignUpPage;
