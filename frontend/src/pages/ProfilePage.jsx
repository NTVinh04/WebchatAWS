import { Camera, Check, X, Mail, User } from "lucide-react";
import React, { useRef, useState } from "react";
import { useAuthStore } from "../store/useAuthStore";
import toast from "react-hot-toast";

const ProfilePage = () => {
  const { user, updateProfile, isUpdatingProfile } = useAuthStore();
  const [selectedFile, setSelectedFile] = useState(null); // File gốc
  const [previewUrl, setPreviewUrl] = useState(null); // Ảnh base64
  const [isPreviewing, setIsPreviewing] = useState(false);
  const fileInputRef = useRef();

  if (!user) return <p>Đang tải thông tin người dùng...</p>;

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
      setSelectedFile(file);
      setIsPreviewing(true);
    };
    reader.readAsDataURL(file);
  };

  const handleCancelImage = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
    setIsPreviewing(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

const handleConfirmImage = async () => {
  if (!selectedFile) return;

  const fileType = selectedFile.type;
  const token = localStorage.getItem("idToken");

  try {
    // B1: Lấy pre-signed URL từ backend
    const res = await fetch('https://kaczhbahxc.execute-api.ap-southeast-1.amazonaws.com/dev/me/avatar', {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ fileType }),
    });

    const data = await res.json();
    console.log("Upload info:", data);

    if (!data.uploadUrl || !data.imageUrl) throw new Error("Không lấy được URL upload");

    // B2: Upload ảnh lên S3
    await fetch(data.uploadUrl, {
      method: "PUT",
      body: selectedFile,
      headers: { "Content-Type": fileType },
    });

    // B3: Cập nhật ảnh đại diện (tùy backend bạn có cần gọi không)
    await fetch("https://kaczhbahxc.execute-api.ap-southeast-1.amazonaws.com/dev/me", {
     method: "PUT",
     headers: {
       Authorization: `Bearer ${token}`,
       "Content-Type": "application/json",
     },
     body: JSON.stringify({ profilePic: data.imageUrl }),
    });

    // B4: Reset UI và reload user info
    setPreviewUrl(null);
    setSelectedFile(null);
    setIsPreviewing(false);
    if (fileInputRef.current) fileInputRef.current.value = "";

    toast.success("Cập nhật ảnh đại diện thành công!");
    useAuthStore.getState().checkAuth();

  } catch (error) {
    console.error("Lỗi khi upload ảnh:", error);
    toast.error("Lỗi khi cập nhật ảnh: " + error.message);
  }
};

  return (
    <div className="h-screen pt-20">
      <div className="max-w-2xl mx-auto p-4 py-8">
        <div className="bg-base-300 rounded-xl p-6 space-y-8">
          <div className="text-center">
            <h1 className="text-2xl font-semibold">Trang cá nhân</h1>
            <p className="mt-2">Thông tin cá nhân của bạn</p>
          </div>

          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <img
                src={previewUrl || user.profilePic || "/avatar.png"}
                alt="Avatar"
                className="size-32 rounded-full object-cover border-4"
              />
              <label
                htmlFor="avatar-upload"
                className={`absolute bottom-0 right-0 bg-base-content hover:scale-105 p-2 rounded-full cursor-pointer transition-all duration-200 ${
                  isUpdatingProfile ? "animate-pulse pointer-events-none" : ""
                }`}
              >
                <Camera className="w-5 h-5 text-base-200" />
                <input
                  type="file"
                  id="avatar-upload"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageSelect}
                  disabled={isUpdatingProfile}
                  ref={fileInputRef}
                />
              </label>

              {/* Hiển thị nút xác nhận */}
              {isPreviewing && (
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex gap-2 mt-2">
                  <button
                    onClick={handleConfirmImage}
                    className="bg-green-600 hover:bg-green-700 text-white p-1 rounded-full"
                  >
                    <Check size={18} />
                  </button>
                  <button
                    onClick={handleCancelImage}
                    className="bg-red-600 hover:bg-red-700 text-white p-1 rounded-full"
                  >
                    <X size={18} />
                  </button>
                </div>
              )}
            </div>

            <p className="text-sm text-zinc-400">
              {isUpdatingProfile ? "Đang cập nhật ảnh..." : "Nhấn camera để thay đổi ảnh đại diện"}
            </p>
          </div>

          <div className="space-y-6">
            <div className="space-y-1.5">
              <div className="text-sm text-zinc-400 flex items-center gap-2">
                <User className="w-4 h-4" />
                Họ và tên
              </div>
              <p className="px-4 py-2.5 bg-base-200 rounded-lg border">{user?.fullName}</p>
            </div>

            <div className="space-y-1.5">
              <div className="text-sm text-zinc-400 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Địa chỉ email
              </div>
              <p className="px-4 py-2.5 bg-base-200 rounded-lg border">{user?.email}</p>
            </div>
          </div>

          <div className="mt-6 bg-base-300 rounded-xl p-6">
            <h2 className="text-lg font-medium mb-4">Thông tin tài khoản</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-zinc-700">
                <span>Là thành viên lúc</span>
                <span>{user.createdAt?.split("T")[0]}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span>Tình trạng tài khoản</span>
                <span className="text-green-500">Hoạt động</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
