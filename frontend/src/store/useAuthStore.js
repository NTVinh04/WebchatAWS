import { create } from "zustand";
import toast from "react-hot-toast";
import {
  CognitoUser,
  AuthenticationDetails,
  CognitoUserPool,
} from "amazon-cognito-identity-js";
import { userPool } from "../lib/cognito.js"; // Đảm bảo file này đã cấu hình đúng

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
      onSuccess: (result) => {
        toast.success("Đăng nhập thành công");
        set({ authUser: user });
      },
      onFailure: (err) => {
        toast.error("Đăng nhập thất bại");
        console.error("Login error:", err);
      },
      newPasswordRequired: () => {
        toast.error("Cần đổi mật khẩu mới");
      },
    });

    set({ isLoggingIng: false });
  },

  logout: () => {
    const { authUser } = useAuthStore.getState();
    if (authUser) {
      authUser.signOut();
      set({ authUser: null });
      toast.success("Đăng xuất thành công");
    }
  },

  checkAuth: () => {
    const currentUser = userPool.getCurrentUser();
    if (currentUser) {
      currentUser.getSession((err, session) => {
        if (err || !session.isValid()) {
          set({ authUser: null, isCheckingAuth: false });
          return;
        }

        set({ authUser: currentUser, isCheckingAuth: false });
      });
    } else {
      set({ authUser: null, isCheckingAuth: false });
    }
  },
}));
