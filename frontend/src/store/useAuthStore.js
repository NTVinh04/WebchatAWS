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
  // Thêm debug vào connectWebSocket trong useAuthStore:

// Thay thế toàn bộ phần connectWebSocket trong useAuthStore với version có debug chi tiết hơn:

connectWebSocket: () => {
  const { ws, user } = get();

  if (!user) {
    console.warn("No user found, cannot connect WebSocket");
    return;
  }

  if (ws && ws.readyState === WebSocket.OPEN) {
    console.log("WebSocket already connected, skipping");
    return;
  }

  const idToken = localStorage.getItem("idToken");
  if (!idToken) {
    console.error("No token found, cannot connect WebSocket");
    return;
  }

  console.log("🔗 Attempting to connect WebSocket...");
  console.log("🔗 User ID:", user.userId);
  console.log("🔗 Token exists:", !!idToken);

  const wsUrl = `wss://hiuze9jnyb.execute-api.ap-southeast-1.amazonaws.com/production?token=${idToken}`;
  console.log("🔗 WebSocket URL:", wsUrl);
  
  const socket = new WebSocket(wsUrl);

  socket.onopen = () => {
    console.log(" WebSocket connected successfully");
    console.log(" Socket ready state:", socket.readyState);
    console.log(" Socket URL:", socket.url);
    
    get().fetchOnlineUsers();
    
    // Test ngay sau khi connect
    setTimeout(() => {
      console.log("🧪 Testing WebSocket after connect...");
      const testMessage = {
        action: "ping",
        message: "connection test",
        timestamp: new Date().toISOString()
      };
      try {
        socket.send(JSON.stringify(testMessage));
        console.log("🧪 Connection test sent:", testMessage);
      } catch (err) {
        console.error(" Failed to send connection test:", err);
      }
    }, 1000);
  };

  //  QUAN TRỌNG: Debug message handler chi tiết
  // Trong phần socket.onmessage của connectWebSocket, sửa import như sau:

socket.onmessage = (event) => {
  console.log("📨 ================================");
  console.log("📨 WebSocket message received!");
  console.log("📨 Timestamp:", new Date().toISOString());
  console.log("📨 Raw data:", event.data);
  console.log("📨 Data type:", typeof event.data);
  console.log("📨 Socket state:", socket.readyState);
  
  try {
    const data = JSON.parse(event.data);
    console.log("🔍 Parsed data structure:", {
      type: data.type,
      hasPayload: !!data.payload,
      payloadType: typeof data.payload,
      keys: Object.keys(data)
    });
    console.log("🔍 Full parsed data:", JSON.stringify(data, null, 2));

    switch (data.type) {
      case "message":
        console.log("💬 ===== PROCESSING MESSAGE =====");
        console.log("💬 Message payload:", data.payload);
        console.log("💬 Payload keys:", Object.keys(data.payload || {}));
        
        //  SỬA: Import đúng đường dẫn
        // Thay vì import động, sử dụng window.__chatStore
        if (window.__chatStore) {
          const chatState = window.__chatStore.getState();
          const currentConversationId = chatState.getConversationId();
          
          console.log("💬 Current conversation ID:", currentConversationId);
          console.log("💬 Message conversation ID:", data.payload?.conversationId);
          console.log("💬 Is same conversation:", currentConversationId === data.payload?.conversationId);
          
          console.log("💬 Adding message to chat store...");
          chatState.addMessage(data.payload);
          console.log("💬 Message added successfully");
        } else {
          console.error(" Chat store not available on window");
        }
        break;
        
      case "user_status":
        console.log("👥 ===== PROCESSING USER STATUS =====");
        console.log("👥 Status data:", data.payload);
        if (data.payload) {
          const { userId, status } = data.payload;
          const currentOnlineUsers = get().onlineUsers;
          
          if (status === "online" && !currentOnlineUsers.includes(userId)) {
            set({ onlineUsers: [...currentOnlineUsers, userId] });
            console.log("👥 User came online:", userId);
          } else if (status === "offline") {
            set({ onlineUsers: currentOnlineUsers.filter(id => id !== userId) });
            console.log("👥 User went offline:", userId);
          }
        }
        break;
        
      case "online_users":
        console.log("👥 ===== PROCESSING ONLINE USERS =====");
        console.log("👥 Users data:", data.payload);
        if (Array.isArray(data.payload)) {
          const currentUser = get().user;
          const filteredUsers = data.payload.filter(userId => 
            currentUser && userId !== currentUser.userId
          );
          console.log("👥 Setting online users:", filteredUsers);
          set({ onlineUsers: filteredUsers });
        }
        break;
        
      case "pong":
        console.log("🏓 ===== RECEIVED PONG =====");
        console.log("🏓 Pong data:", data.payload);
        break;
        
      default:
        console.warn("⚠️ ===== UNKNOWN MESSAGE TYPE =====");
        console.warn("⚠️ Type:", data.type);
        console.warn("⚠️ Full data:", JSON.stringify(data, null, 2));
    }
    
  } catch (err) {
    console.error(" ===== MESSAGE PARSE ERROR =====");
    console.error(" Error:", err.message);
    console.error(" Stack:", err.stack);
    console.error(" Raw data:", event.data);
  }
  
  console.log("📨 ================================");
};

  socket.onerror = (err) => {
    console.error(" ===== WEBSOCKET ERROR =====");
    console.error(" Error event:", err);
    console.error(" Socket state:", socket.readyState);
    console.error(" Socket URL:", socket.url);
  };

  socket.onclose = (event) => {
    console.log("🔌 ===== WEBSOCKET CLOSED =====");
    console.log("🔌 Close code:", event.code);
    console.log("🔌 Close reason:", event.reason);
    console.log("🔌 Was clean:", event.wasClean);
    console.log("🔌 Socket state:", socket.readyState);
    
    set({ ws: null });

    if (event.code !== 1000 && event.code !== 4401) {
      console.log("🔄 Attempting to reconnect in 3 seconds...");
      setTimeout(() => {
        const currentUser = get().user;
        if (currentUser) {
          get().connectWebSocket();
        }
      }, 3000);
    }
  };

  set({ ws: socket });
  console.log("🔗 WebSocket instance created and stored");
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
  // Thêm các function test này vào useAuthStore

// Test WebSocket connection
testWebSocket: () => {
  const { ws } = get();
  
  if (!ws || ws.readyState !== WebSocket.OPEN) {
    console.error(" WebSocket not connected");
    console.log("🔍 WebSocket state:", {
      exists: !!ws,
      readyState: ws?.readyState,
      readyStateText: ws?.readyState === 0 ? 'CONNECTING' : 
                     ws?.readyState === 1 ? 'OPEN' : 
                     ws?.readyState === 2 ? 'CLOSING' : 
                     ws?.readyState === 3 ? 'CLOSED' : 'UNKNOWN'
    });
    return false;
  }
  
  console.log("🧪 Testing WebSocket by sending ping...");
  
  // Thử gửi một message test
  const testMessage = {
    action: "ping",
    message: "test from client",
    timestamp: new Date().toISOString()
  };
  
  try {
    ws.send(JSON.stringify(testMessage));
    console.log("🧪 Test message sent:", testMessage);
    return true;
  } catch (error) {
    console.error(" Failed to send test message:", error);
    return false;
  }
},

// Kiểm tra trạng thái kết nối WebSocket
checkWebSocketStatus: () => {
  const { ws, user } = get();
  
  console.log("🔍 WebSocket Status Check:");
  console.log("🔍 User logged in:", !!user);
  console.log("🔍 User ID:", user?.userId);
  console.log("🔍 WebSocket exists:", !!ws);
  console.log("🔍 WebSocket ready state:", ws?.readyState);
  console.log("🔍 WebSocket URL:", ws?.url);
  console.log("🔍 Token exists:", !!localStorage.getItem("idToken"));
  
  if (ws) {
    const stateNames = {
      0: 'CONNECTING',
      1: 'OPEN', 
      2: 'CLOSING',
      3: 'CLOSED'
    };
    console.log("🔍 WebSocket state:", stateNames[ws.readyState] || 'UNKNOWN');
  }
  
  return {
    hasUser: !!user,
    hasWebSocket: !!ws,
    isConnected: ws?.readyState === WebSocket.OPEN,
    hasToken: !!localStorage.getItem("idToken")
  };
},

// Force reconnect WebSocket
reconnectWebSocket: () => {
  console.log("🔄 Force reconnecting WebSocket...");
  
  const { ws } = get();
  
  // Đóng kết nối cũ nếu có
  if (ws) {
    ws.close(1000, "Manual reconnect");
  }
  
  // Đợi một chút rồi kết nối lại
  setTimeout(() => {
    get().connectWebSocket();
  }, 1000);
}
}));