import { create } from "zustand";
import toast from "react-hot-toast";
import {
  CognitoUser,
  AuthenticationDetails,
  CognitoUserPool,
} from "amazon-cognito-identity-js";
import { userPool } from "../lib/cognito.js"; // Đảm bảo cấu hình đúng

export const useAuthStore = create((set) => ({
  user: null,
  isSigningUp: false,
  isLoggingIng: false,
  isCheckingAuth: true,
  onlineUsers: [],
  setOnlineUsers: (users) => set({ onlineUsers: users }),

  updateProfile: async (updatedData) => {
  const idToken = localStorage.getItem("idToken");
  if (!idToken) {
    toast.error("Không tìm thấy token người dùng");
    return;
  }

  try {
    const res = await fetch("https://kaczhbahxc.execute-api.ap-southeast-1.amazonaws.com/dev/me", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(updatedData),
    });

    if (!res.ok) throw new Error("Cập nhật thông tin thất bại");

    const newUser = await res.json();
    set({ user: newUser });
      toast.success("Cập nhật thành công");
    } catch (err) {
      console.error("Update profile error:", err);
      toast.error("Lỗi khi cập nhật thông tin");
    }
  },

  signup: async ({ email, password }) => {
    set({ isSigningUp: true });

    userPool.signUp(email, password, [], null, (err, result) => {
      if (err) {
        toast.error(err.message || "Lỗi đăng ký");
        set({ isSigningUp: false });
        return;
      }

      toast.success("Đăng ký thành công. Vui lòng xác minh email");
      set({ isSigningUp: false });
    });
  },

  login: async ({ email, password }) => {
    set({ isLoggingIng: true });

    const authDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });

    const user = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    user.authenticateUser(authDetails, {
      onSuccess: async (result) => {
        toast.success("Đăng nhập thành công");

        const token = result.getIdToken().getJwtToken();

        try {
          const res = await fetch("https://kaczhbahxc.execute-api.ap-southeast-1.amazonaws.com/dev/me", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          const data = await res.json();
          console.log("Fetched user from /me:", data);

          if (!res.ok || !data?.UserId) {
            throw new Error("Không lấy được thông tin người dùng");
          }

          set({ user: data });
        } catch (err) {
          console.error("Fetch user info failed:", err);
          toast.error("Không lấy được thông tin người dùng");
          set({ user: null });
        }

        set({ isLoggingIng: false });
      },

      onFailure: (err) => {
        toast.error("Đăng nhập thất bại");
        console.error("Login error:", err);
        set({ isLoggingIng: false });
      },
    });
  },

  logout: (showToast = true) => {
  const currentUser = userPool.getCurrentUser();
  if (currentUser) {
    currentUser.signOut();
  }

  localStorage.removeItem("idToken");
  set({ user: null, isCheckingAuth: false });

  if (showToast) {
    toast.success("Đăng xuất thành công");
  }

  setTimeout(() => {
    window.location.href = "/login";
  }, 2000);
}
,

  checkAuth: () => {
  const idToken = localStorage.getItem("idToken");
  if (!idToken) {
    // Không có token => không cần check
    set({ user: null, isCheckingAuth: false });
    return;
  }

  const currentUser = userPool.getCurrentUser();
  if (currentUser) {
    currentUser.getSession(async (err, session) => {
      if (err || !session.isValid()) {
        set({ user: null, isCheckingAuth: false });
        return;
      }

      try {
        const token = session.getIdToken().getJwtToken();
        const res = await fetch("https://kaczhbahxc.execute-api.ap-southeast-1.amazonaws.com/dev/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error("Lỗi lấy thông tin người dùng");

        const data = await res.json();
        console.log("checkAuth /me result:", data);
        set({ user: data });
      } catch (err) {
        console.error("checkAuth fetch failed", err);
        set({ user: null });
      }

      set({ isCheckingAuth: false });
    });
  } else {
    set({ user: null, isCheckingAuth: false });
    }
  },
}));
