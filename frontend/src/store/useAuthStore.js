import { create } from "zustand";
import toast from "react-hot-toast";
import { CognitoUser, AuthenticationDetails } from "amazon-cognito-identity-js";
import { userPool } from "../lib/cognito.js";

export const useAuthStore = create((set, get) => ({
  user: null,
  isSigningUp: false,
  isLoggingIn: false,
  isCheckingAuth: true,
  onlineUsers: [],
  ws: null,
  activeInterval: null,

  setOnlineUsers: (users) => {
    console.log("Setting online users:", users);
    set({ onlineUsers: users });
  },

  // Kết nối WebSocket
  connectWebSocket: () => {
    const { ws, user } = get();

    // Nếu chưa đăng nhập thì không mở kết nối
    if (!user) {
      console.warn("No user found, cannot connect WebSocket");
      return;
    }

    // Nếu socket đã mở thì bỏ qua
    if (ws && ws.readyState === WebSocket.OPEN) return;

    // Lấy JWT token từ localStorage
    const idToken = localStorage.getItem("idToken");
    if (!idToken) {
      console.error("No token found, cannot connect WebSocket");
      return;
    }

    // Khởi tạo WebSocket với token trong query string
    const wsUrl = `wss://hiuze9jnyb.execute-api.ap-southeast-1.amazonaws.com/production?token=${idToken}`;
    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      console.log("WebSocket connected successfully");
      // Yêu cầu danh sách online users ngay sau khi connect
      get().fetchOnlineUsers();
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("🔍 RAW WebSocket message received:", event.data);
        console.log("🔍 Parsed data:", data);
        console.log("🔍 Message type:", data.type);
        console.log("🔍 Message payload:", data.payload);

        switch (data.type) {
          case "message":
            console.log("✅ Processing chat message");
            console.log("📩 Message payload details:", {
              senderId: data.payload?.senderId,
              receiverId: data.payload?.receiverId,
              text: data.payload?.text,
              conversationId: data.payload?.conversationId
            });
            
            // Import dynamic để tránh circular dependency
            import("./useChatStore.js").then(({ useChatStore }) => {
              console.log("🎯 useChatStore imported successfully");
              const chatStore = useChatStore.getState();
              console.log("🎯 chatStore state:", chatStore);
              
              if (chatStore && typeof chatStore.addMessage === 'function') {
                console.log("🎯 Calling addMessage with:", data.payload);
                chatStore.addMessage(data.payload);
                console.log("🎯 addMessage called successfully");
              } else {
                console.error("❌ Chat store addMessage function not available");
              }
            }).catch((err) => {
              console.error("❌ Failed to import chat store:", err);
            });
            break;
            
          case "user_status":
            console.log("👥 Processing user status change");
            if (data.payload) {
              const { userId, status } = data.payload;
              const currentOnlineUsers = get().onlineUsers;
              
              if (status === "online") {
                if (!currentOnlineUsers.includes(userId)) {
                  set({ onlineUsers: [...currentOnlineUsers, userId] });
                }
              } else if (status === "offline") {
                set({ onlineUsers: currentOnlineUsers.filter(id => id !== userId) });
              }
            }
            break;
            
          case "online_users":
            console.log("👥 Processing complete online users list");
            if (Array.isArray(data.payload)) {
              const currentUser = get().user;
              const filteredOnlineUsers = currentUser 
                ? data.payload.filter(userId => userId !== currentUser.userId)
                : data.payload;
              set({ onlineUsers: filteredOnlineUsers });
            }
            break;
            
          default:
            console.warn("⚠️ Unknown WS message type:", data.type);
            console.log("⚠️ Full message data:", data);
        }
      } catch (err) {
        console.error("❌ WS message parse error:", err);
        console.error("❌ Raw message:", event.data);
      }
    };

    socket.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    socket.onclose = (event) => {
      console.log("WebSocket closed", event.code, event.reason);
      set({ ws: null });

      // Chỉ reconnect nếu không phải do logout hoặc authentication error
      if (event.code !== 1000 && event.code !== 4401) {
        // Thử reconnect sau 3 giây
        setTimeout(() => {
          const currentUser = get().user;
          if (currentUser) { // Chỉ reconnect nếu user vẫn đăng nhập
            get().connectWebSocket();
          }
        }, 3000);
      }
    };

    set({ ws: socket });
  },

  fetchOnlineUsers: async () => {
    const idToken = localStorage.getItem("idToken");
    if (!idToken) {
      console.warn("No token found for fetching online users");
      return;
    }

    try {
      console.log("Fetching online users...");
      const res = await fetch(
        "https://kaczhbahxc.execute-api.ap-southeast-1.amazonaws.com/dev/user",
        {
          headers: { Authorization: `Bearer ${idToken}` },
        }
      );

      if (!res.ok) {
        throw new Error(`Fetch online users failed: ${res.status}`);
      }

      const data = await res.json();
      console.log("Raw user data from API:", data);
      
      const now = Date.now();
      const ONLINE_THRESHOLD = 5 * 60 * 1000; // 5 phút
      
      const currentUser = get().user;
      
      const onlineUserIds = data
        .filter((u) => {
          // Loại bỏ chính user hiện tại
          if (currentUser && u.userId === currentUser.userId) return false;
          
          if (!u.lastActiveAt) return false;
          const lastActive = new Date(u.lastActiveAt).getTime();
          const timeDiff = now - lastActive;
          const isOnline = timeDiff < ONLINE_THRESHOLD;
          
          console.log(`User ${u.userId}: lastActive=${u.lastActiveAt}, timeDiff=${timeDiff}ms, isOnline=${isOnline}`);
          return isOnline;
        })
        .map((u) => u.userId);

      console.log("Calculated online users (excluding self):", onlineUserIds);
      set({ onlineUsers: onlineUserIds });
      
    } catch (err) {
      console.error("Failed to fetch online users:", err);
    }
  },

  startActivePing: () => {
    const idToken = localStorage.getItem("idToken");
    if (!idToken) return;

    const ping = async () => {
      try {
        const res = await fetch(
          "https://kaczhbahxc.execute-api.ap-southeast-1.amazonaws.com/dev/active",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${idToken}` },
          }
        );
        
        if (res.ok) {
          console.log("Active ping successful");
          // Sau khi ping thành công, cập nhật danh sách online users
          get().fetchOnlineUsers();
        }
      } catch (err) {
        console.error("Active ping failed:", err);
      }
    };

    // Ping ngay lập tức
    ping();
    // Sau đó ping mỗi 30 giây
    const interval = setInterval(ping, 30000);
    set({ activeInterval: interval });
  },

  updateProfile: async (updatedData) => {
    const idToken = localStorage.getItem("idToken");
    if (!idToken) {
      toast.error("Không tìm thấy token người dùng");
      return;
    }

    try {
      const res = await fetch(
        "https://kaczhbahxc.execute-api.ap-southeast-1.amazonaws.com/dev/me",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify(updatedData),
        }
      );

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

  login: async ({ email, password }) => {
    set({ isLoggingIn: true });

    const authDetails = new AuthenticationDetails({
      Username: email,
      Password: password,
    });

    const cognitoUser = new CognitoUser({
      Username: email,
      Pool: userPool,
    });

    cognitoUser.authenticateUser(authDetails, {
      onSuccess: async (result) => {
        toast.success("Đăng nhập thành công");

        const token = result.getIdToken().getJwtToken();
        localStorage.setItem("idToken", token);

        try {
          const res = await fetch(
            "https://kaczhbahxc.execute-api.ap-southeast-1.amazonaws.com/dev/me",
            {
              method: "GET",
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          if (!res.ok) throw new Error("Không lấy được thông tin người dùng");

          const data = await res.json();
          if (!data?.userId) throw new Error("Dữ liệu người dùng không hợp lệ");

          set({ user: data });
          
          // Set global user ID để useChatStore có thể sử dụng
          window.__AUTH_USER_ID__ = data.userId;

          // Thực hiện các bước khởi tạo theo thứ tự
          await get().fetchOnlineUsers();
          get().startActivePing();
          get().connectWebSocket();
          
        } catch (err) {
          console.error("Fetch user info failed:", err);
          toast.error("Không lấy được thông tin người dùng");
          set({ user: null });
        }

        set({ isLoggingIn: false });
      },

      onFailure: (err) => {
        toast.error(err.message || "Đăng nhập thất bại");
        console.error("Login error:", err);
        set({ isLoggingIn: false });
      },
    });
  },

  logout: (showToast = true) => {
    const currentUser = userPool.getCurrentUser();
    if (currentUser) currentUser.signOut();

    localStorage.removeItem("idToken");

    const interval = get().activeInterval;
    if (interval) clearInterval(interval);

    const ws = get().ws;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.close(1000, "User logout"); // Đóng với code 1000 (normal closure)
    }

    set({
      user: null,
      isCheckingAuth: false,
      onlineUsers: [],
      ws: null,
      activeInterval: null,
    });

    // Clear global user ID
    window.__AUTH_USER_ID__ = null;

    if (showToast) toast.success("Đăng xuất thành công");

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
    if (!currentUser) {
      set({ user: null, isCheckingAuth: false });
      return;
    }

    currentUser.getSession(async (err, session) => {
      if (err || !session.isValid()) {
        set({ user: null, isCheckingAuth: false });
        return;
      }

      try {
        const token = session.getIdToken().getJwtToken();
        localStorage.setItem("idToken", token);

        const res = await fetch(
          "https://kaczhbahxc.execute-api.ap-southeast-1.amazonaws.com/dev/me",
          {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!res.ok) throw new Error("Lỗi lấy thông tin người dùng");

        const data = await res.json();
        set({ user: data });

        // Set global user ID để useChatStore có thể sử dụng
        window.__AUTH_USER_ID__ = data.userId;

        // Thực hiện các bước khởi tạo theo thứ tự
        await get().fetchOnlineUsers();
        get().startActivePing();
        get().connectWebSocket();
        
      } catch (err) {
        console.error("checkAuth fetch failed", err);
        set({ user: null });
      }

      set({ isCheckingAuth: false });
    });
  },
}));