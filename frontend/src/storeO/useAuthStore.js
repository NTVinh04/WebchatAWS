import { create } from "zustand";
import toast from "react-hot-toast";
import {
  CognitoUser,
  AuthenticationDetails,
  CognitoUserPool,
} from "amazon-cognito-identity-js";
import { userPool } from "../lib/cognito.js";

export const useAuthStore = create((set, get) => ({
  user: null,
  isSigningUp: false,
  isLoggingIn: false,
  isCheckingAuth: true,
  onlineUsers: [],
  ws: null,
  activeInterval: null,

  // THÊM function này
  setUser: (userData) => {
    set({ user: userData });
    // Set global user ID để useChatStore có thể sử dụng
    window.__AUTH_USER_ID__ = userData?.userId;
  },

  setOnlineUsers: (users) => {
    console.log("Setting online users:", users);
    set({ onlineUsers: users });
  },

  // Hàm mới: lấy danh sách user đang online
  fetchOnlineUsers: async () => {
    const idToken = localStorage.getItem("idToken");
    if (!idToken) return;

    try {
      const res = await fetch("https://pf86nve7i8.execute-api.ap-southeast-1.amazonaws.com/dev/user", {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      const data = await res.json();
      const now = Date.now();

      const onlineUserIds = data
        .filter((u) => now - new Date(u.lastActiveAt).getTime() < 60 * 1000) // nếu hơn 60s thì coi là offline
        .map((u) => u.userId);

      set({ onlineUsers: onlineUserIds });
    } catch (err) {
      console.error("Failed to fetch online users:", err);
    }
  },

  // Hàm mới: ping /active mỗi 30s để cập nhật online
  startActivePing: () => {
    const idToken = localStorage.getItem("idToken");
    if (!idToken) return;

    const ping = () => {
      fetch("https://pf86nve7i8.execute-api.ap-southeast-1.amazonaws.com/dev/active", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      }).catch((err) => console.error("Active ping failed:", err));
    };

    ping(); // gọi lần đầu
    const interval = setInterval(ping, 30000); // mỗi 30s

    // Lưu lại để clear nếu cần
    set({ activeInterval: interval });
  },

  updateProfile: async (updatedData) => {
    const idToken = localStorage.getItem("idToken");
    if (!idToken) {
      toast.error("Không tìm thấy token người dùng");
      return;
    }

    try {
      const res = await fetch("https://pf86nve7i8.execute-api.ap-southeast-1.amazonaws.com/dev/me", {
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

    userPool.signUp(email, password, [], null, (err) => {
      if (err) {
        toast.error(err.message || "Lỗi đăng ký");
        set({ isSigningUp: false });
        return;
      }

      toast.success("Đăng ký thành công. Vui lòng xác minh email");
      set({ isSigningUp: false });
    });
  },

  logout: (showToast = true) => {
    const currentUser = userPool.getCurrentUser();
    if (currentUser) {
      currentUser.signOut();
    }

    localStorage.removeItem("idToken");

    // Dừng ping
    const interval = get().activeInterval;
    if (interval) clearInterval(interval);

    set({ user: null, isCheckingAuth: false, onlineUsers: [] });

    if (showToast) {
      toast.success("Đăng xuất thành công");
    }

    setTimeout(() => {
      window.location.href = "/login";
    }, 2000);
  },

  checkAuth: () => {
    const idToken = localStorage.getItem("idToken");
    if (!idToken) {
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
          localStorage.setItem("idToken", token);

          const res = await fetch("https://pf86nve7i8.execute-api.ap-southeast-1.amazonaws.com/dev/me", {
            method: "GET",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!res.ok) throw new Error("Lỗi lấy thông tin người dùng");

          const data = await res.json();
          set({ user: data });

          await get().fetchOnlineUsers();      // cập nhật online users
          get().startActivePing();             // bắt đầu ping
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
