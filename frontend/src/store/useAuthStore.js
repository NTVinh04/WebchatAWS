import { create } from "zustand";
import toast from "react-hot-toast";
import {
  CognitoUser,
  AuthenticationDetails,
  CognitoUserPool,
} from "amazon-cognito-identity-js";
import { userPool } from "../lib/cognito.js"; // Đảm bảo cấu hình đúng

export const useAuthStore = create((set) => ({
  authUser: null,
  isSigningUp: false,
  isLoggingIng: false,
  isCheckingAuth: true,
  onlineUsers: [],
  setOnlineUsers: (users) => set({ onlineUsers: users }),

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
        const res = await fetch("https://05tpsgyjzi.execute-api.ap-southeast-1.amazonaws.com/dev/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
      
        const data = await res.json();
        console.log("Fetched user from /me:", data); // ← Thêm dòng này để debug
      
        if (!res.ok || !data?.UserId) {
          throw new Error("Không lấy được thông tin người dùng");
        }
      
        set({ authUser: data }); // <-- Sửa lại dùng toàn bộ `data`, không phải `data.user`
      } catch (err) {
        console.error("Fetch user info failed:", err);
        toast.error("Không lấy được thông tin người dùng");
        set({ authUser: null });
      }
    
      set({ isLoggingIng: false });
    },

      onFailure: (err) => {
        toast.error("Đăng nhập thất bại");
        console.error("Login error:", err);
        set({ isLoggingIng: false });
      },

      newPasswordRequired: () => {
        toast.error("Cần đổi mật khẩu mới");
        set({ isLoggingIng: false });
      },
    });
  },

  logout: () => {
    const { authUser } = useAuthStore.getState();
    if (authUser?.signOut) {
      authUser.signOut(); // CognitoUser case
    }
    set({ authUser: null });
    toast.success("Đăng xuất thành công");
  },

  checkAuth: () => {
  const currentUser = userPool.getCurrentUser();
  if (currentUser) {
    currentUser.getSession(async (err, session) => {
      if (err || !session.isValid()) {
        set({ authUser: null, isCheckingAuth: false });
        return;
      }

      try {
        const token = session.getIdToken().getJwtToken();
        const res = await fetch("https://05tpsgyjzi.execute-api.ap-southeast-1.amazonaws.com/dev/me", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) throw new Error("Lỗi lấy thông tin người dùng");

        const data = await res.json();
        console.log("checkAuth /me result:", data); // debug xem dữ liệu gì đang trả về
        set({ authUser: data }); // dùng toàn bộ object
      } catch (err) {
        console.error("checkAuth fetch failed", err);
        set({ authUser: null });
      }

      set({ isCheckingAuth: false });
    });
  } else {
    set({ authUser: null, isCheckingAuth: false });
  }
}
,
}));
