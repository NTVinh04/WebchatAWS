import { create } from "zustand";
import toast from "react-hot-toast";
import { userPool } from "../lib/cognito.js";

export const useAuthStore = create((set, get) => ({
  user: null,
  isSigningUp: false,
  isCheckingAuth: true,
  onlineUsers: [],
  ws: null,
  activeInterval: null,
  // Connection state tracking
  isConnecting: false,
  connectionAttempts: 0,
  maxConnectionAttempts: 3,

  //  Helper function để set user từ bên ngoài
  setUser: (userData) => {
    console.log(" Setting user:", userData?.userId);
    set({ user: userData });
    
    if (userData?.userId) {
      window.__AUTH_USER_ID__ = userData.userId;
    }
  },

  setOnlineUsers: (users) => {
    console.log("Setting online users:", users);
    set({ onlineUsers: users });
  },

  //  Function để khởi tạo tất cả services sau khi login
  initializeUserServices: async () => {
    const { user } = get();
    
    if (!user?.userId) {
      console.warn(" No user found, cannot initialize services");
      return;
    }

    console.log(" Initializing services for user:", user.userId);
    
    // Clean any existing connections first
    get().disconnectWebSocket();
    
    // Clear any existing intervals
    const existingInterval = get().activeInterval;
    if (existingInterval) {
      clearInterval(existingInterval);
      set({ activeInterval: null });
    }
    
    // Reset connection states
    set({ 
      ws: null,
      isConnecting: false,
      connectionAttempts: 0,
      onlineUsers: []
    });
    
    try {
      console.log(" Step 1: Fetching online users...");
      await get().fetchOnlineUsers();
      
      console.log(" Step 2: Starting active ping...");
      get().startActivePing();
      
      // Wait a bit for ping to establish presence
      await new Promise(resolve => setTimeout(resolve, 200));
      
      console.log(" Step 3: Connecting WebSocket...");
      get().connectWebSocket();
      
      console.log(" All services initialized successfully for user:", user.userId);
      
      //  VERIFICATION: Check connection after a delay
      setTimeout(() => {
        const status = get().checkWebSocketStatus();
        if (status.isConnected) {
          console.log(" WebSocket connection verified successfully");
        } else {
          console.warn(" WebSocket connection verification failed, status:", status);
        }
      }, 1000);
      
    } catch (err) {
      console.error(" Error initializing services:", err);
      throw err;
    }
  },

  // WebSocket connection với validation và cleanup
  connectWebSocket: () => {
    const { ws, user, isConnecting, connectionAttempts, maxConnectionAttempts } = get();

    if (!user?.userId) {
      console.warn(" No user or userId found, cannot connect WebSocket");
      return;
    }

    if (isConnecting) {
      console.log(" Connection already in progress, skipping...");
      return;
    }

    if (connectionAttempts >= maxConnectionAttempts) {
      console.error(" Max connection attempts reached, stopping reconnect");
      return;
    }

    // Clean up existing connection first
    if (ws) {
      console.log(" Cleaning up existing WebSocket connection");
      try {
        ws.close(1000, "New connection starting");
      } catch (err) {
        console.error("Error closing old websocket:", err);
      }
      set({ ws: null });
    }

    const idToken = localStorage.getItem("idToken");
    if (!idToken) {
      console.error(" No token found, cannot connect WebSocket");
      return;
    }

    // Validate token format
    try {
      const tokenParts = idToken.split('.');
      if (tokenParts.length !== 3) {
        throw new Error("Invalid token format");
      }
      
      const payload = JSON.parse(atob(tokenParts[1]));
      if (!payload.sub || payload.sub !== user.userId) {
        console.error(" Token userId mismatch:", { tokenSub: payload.sub, currentUser: user.userId });
        get().logout(false);
        return;
      }
      
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        console.error(" Token expired");
        get().logout(false);
        return;
      }
      
    } catch (err) {
      console.error(" Token validation failed:", err);
      get().logout(false);
      return;
    }

    set({ isConnecting: true, connectionAttempts: connectionAttempts + 1 });

    console.log(` Connecting WebSocket for user: ${user.userId} (attempt ${connectionAttempts + 1})`);

    //  FIXED: URL khớp với backend $connect handler
    const wsUrl = `wss://5gm2fis56a.execute-api.ap-southeast-1.amazonaws.com/production?token=${encodeURIComponent(idToken)}`;
    console.log(" WebSocket URL (token masked):", wsUrl.replace(idToken, '[TOKEN]'));
    
    const socket = new WebSocket(wsUrl);
    const connectionUserId = user.userId;

    // Connection timeout
    const connectionTimeout = setTimeout(() => {
      if (socket.readyState === WebSocket.CONNECTING) {
        console.error(" WebSocket connection timeout");
        socket.close();
        set({ isConnecting: false });
      }
    }, 10000);

    socket.onopen = () => {
      clearTimeout(connectionTimeout);
      
      const currentUser = get().user;
      if (!currentUser || currentUser.userId !== connectionUserId) {
        console.warn(" User changed during connection, closing socket");
        socket.close(1000, "User changed");
        return;
      }

      console.log(" WebSocket connected successfully for user:", connectionUserId);
      
      set({ 
        ws: socket, 
        isConnecting: false, 
        connectionAttempts: 0 
      });
      
      get().fetchOnlineUsers();
      
      const identifyMessage = {
        action: "identify",
        userId: connectionUserId,
        timestamp: new Date().toISOString()
      };
      
      try {
        socket.send(JSON.stringify(identifyMessage));
        console.log(" Identification sent:", identifyMessage);
      } catch (err) {
        console.error(" Failed to send identification:", err);
      }
    };

    socket.onmessage = (event) => {
      const currentUser = get().user;
      
      if (!currentUser || currentUser.userId !== connectionUserId) {
        console.warn(" Received message but user changed, ignoring");
        return;
      }

      console.log(" WebSocket message received for user:", currentUser.userId);
      
      try {
        const data = JSON.parse(event.data);
        console.log(" Parsed data:", JSON.stringify(data, null, 2));

        if (!data.type) {
          console.warn(" Message missing type field");
          return;
        }

        switch (data.type) {
          case "message":
            if (!data.payload || !data.payload.receiverId) {
              console.warn(" Invalid message payload");
              break;
            }
            
            if (data.payload.receiverId !== currentUser.userId) {
              console.log(" Message not for current user, ignoring");
              break;
            }
            
            if (window.__chatStore) {
              const chatState = window.__chatStore.getState();
              chatState.addMessage(data.payload);
              console.log(" Message added to chat store");
            } else {
              console.error(" Chat store not available");
            }
            break;
            
          case "user_status":
            if (!data.payload || !data.payload.userId) {
              console.warn(" Invalid user status payload");
              break;
            }
            
            const { userId, status } = data.payload;
            
            if (userId === currentUser.userId) {
              console.log(" Ignoring status update for self");
              break;
            }
            
            const currentOnlineUsers = get().onlineUsers;
            
            if (status === "online" && !currentOnlineUsers.includes(userId)) {
              set({ onlineUsers: [...currentOnlineUsers, userId] });
              console.log(" User came online:", userId);
            } else if (status === "offline") {
              set({ onlineUsers: currentOnlineUsers.filter(id => id !== userId) });
              console.log(" User went offline:", userId);
            }
            break;
            
          case "online_users":
            if (!Array.isArray(data.payload)) {
              console.warn(" Invalid online users payload");
              break;
            }
            
            const filteredUsers = data.payload.filter(userId => 
              userId !== currentUser.userId
            );
            console.log(" Setting online users (excluding self):", filteredUsers);
            set({ onlineUsers: filteredUsers });
            break;
            
          case "pong":
            console.log(" Received pong");
            break;

          case "error":
            console.error(" Received error:", data.payload);
            if (data.payload?.code === 'USER_MISMATCH') {
              console.error(" Critical: User mismatch detected, logging out");
              get().logout(false);
            }
            break;
            
          default:
            console.warn(" Unknown message type:", data.type);
        }
        
      } catch (err) {
        console.error(" Message parse error:", err.message);
      }
    };

    socket.onerror = (err) => {
      clearTimeout(connectionTimeout);
      console.error(" WebSocket error:", err);
      set({ isConnecting: false });
    };

    socket.onclose = (event) => {
      clearTimeout(connectionTimeout);
      console.log(" WebSocket closed:", event.code, event.reason);
      
      const currentWs = get().ws;
      if (currentWs === socket) {
        set({ ws: null });
      }
      
      set({ isConnecting: false });

      const shouldReconnect = 
        event.code !== 1000 && // Normal closure
        event.code !== 4401 && // Unauthorized
        event.code !== 4403;   // Forbidden

      if (shouldReconnect) {
        const currentUser = get().user;
        const attempts = get().connectionAttempts;
        
        if (currentUser && currentUser.userId === connectionUserId && attempts < maxConnectionAttempts) {
          const delay = Math.min(1000 * Math.pow(2, attempts), 10000);
          console.log(` Reconnecting in ${delay}ms... (attempt ${attempts + 1}/${maxConnectionAttempts})`);
          
          setTimeout(() => {
            const stillCurrentUser = get().user;
            if (stillCurrentUser && stillCurrentUser.userId === connectionUserId) {
              get().connectWebSocket();
            }
          }, delay);
        } else {
          console.log(" Max reconnection attempts reached or user changed");
          set({ connectionAttempts: 0 });
        }
      }
    };

    console.log(" WebSocket connection initiated for user:", connectionUserId);
  },

  disconnectWebSocket: () => {
    const { ws } = get();
    const currentUser = get().user;
    
    console.log(" Disconnecting WebSocket for user:", currentUser?.userId);
    
    set({ 
      isConnecting: false, 
      connectionAttempts: 0 
    });
    
    if (ws) {
      try {
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close(1000, "Manual disconnect");
        }
      } catch (err) {
        console.error("Error during WebSocket disconnect:", err);
      }
    }
    
    set({ ws: null });
  },

  fetchOnlineUsers: async () => {
    const idToken = localStorage.getItem("idToken");
    const currentUser = get().user;
    
    if (!idToken || !currentUser?.userId) {
      console.warn("No token or user found for fetching online users");
      return;
    }

    try {
      console.log("Fetching online users for user:", currentUser.userId);
      const res = await fetch(
        "https://pf86nve7i8.execute-api.ap-southeast-1.amazonaws.com/dev/user",
        {
          headers: { Authorization: `Bearer ${idToken}` },
        }
      );

      if (!res.ok) {
        throw new Error(`Fetch online users failed: ${res.status}`);
      }

      const data = await res.json();
      
      const stillCurrentUser = get().user;
      if (!stillCurrentUser || stillCurrentUser.userId !== currentUser.userId) {
        console.log(" User changed during fetch, ignoring results");
        return;
      }
      
      const now = Date.now();
      const ONLINE_THRESHOLD = 5 * 60 * 1000;
      
      const onlineUserIds = data
        .filter((u) => {
          if (u.userId === currentUser.userId) return false;
          
          if (!u.lastActiveAt) return false;
          const lastActive = new Date(u.lastActiveAt).getTime();
          const timeDiff = now - lastActive;
          const isOnline = timeDiff < ONLINE_THRESHOLD;
          
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
    const existingInterval = get().activeInterval;
    if (existingInterval) {
      clearInterval(existingInterval);
    }

    const idToken = localStorage.getItem("idToken");
    if (!idToken) return;

    const ping = async () => {
      const currentUser = get().user;
      if (!currentUser?.userId) {
        console.log("No user found, stopping active ping");
        return;
      }

      try {
        const res = await fetch(
          "https://pf86nve7i8.execute-api.ap-southeast-1.amazonaws.com/dev/active",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${idToken}` },
          }
        );
        
        if (res.ok) {
          console.log("Active ping successful for user:", currentUser.userId);
          get().fetchOnlineUsers();
        } else {
          console.warn("Active ping failed:", res.status);
        }
      } catch (err) {
        console.error("Active ping failed:", err);
      }
    };

    ping();
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
        "https://pf86nve7i8.execute-api.ap-southeast-1.amazonaws.com/dev/me",
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

  logout: (showToast = true) => {
    const currentUser = get().user;
    console.log(" Logging out user:", currentUser?.userId);

    // Clean disconnect và clear tất cả states
    get().disconnectWebSocket();

    const cognitoUser = userPool.getCurrentUser();
    if (cognitoUser) cognitoUser.signOut();

    localStorage.removeItem("idToken");

    const interval = get().activeInterval;
    if (interval) {
      clearInterval(interval);
    }

    // Reset tất cả states
    set({
      user: null,
      isCheckingAuth: false,
      onlineUsers: [],
      ws: null,
      activeInterval: null,
      isConnecting: false,
      connectionAttempts: 0,
    });

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
          "https://pf86nve7i8.execute-api.ap-southeast-1.amazonaws.com/dev/me",
          {
            method: "GET",
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!res.ok) throw new Error("Lỗi lấy thông tin người dùng");

        const data = await res.json();
        
        // SỬA: Sử dụng setUser thay vì set trực tiếp
        get().setUser(data);

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

  // Test functions
  testWebSocket: () => {
    const { ws, user } = get();
    
    if (!user?.userId) {
      console.error(" No user logged in");
      return false;
    }
    
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      console.error(" WebSocket not connected");
      console.log(" WebSocket state:", get().checkWebSocketStatus());
      return false;
    }
    
    console.log(" Testing WebSocket for user:", user.userId);
    
    const testMessage = {
      action: "ping",
      userId: user.userId,
      timestamp: new Date().toISOString()
    };
    
    try {
      ws.send(JSON.stringify(testMessage));
      console.log(" Test message sent:", testMessage);
      return true;
    } catch (error) {
      console.error(" Failed to send test message:", error);
      return false;
    }
  },

  checkWebSocketStatus: () => {
    const { ws, user, isConnecting, connectionAttempts } = get();
    
    const status = {
      hasUser: !!user,
      userId: user?.userId,
      hasWebSocket: !!ws,
      isConnected: ws?.readyState === WebSocket.OPEN,
      isConnecting,
      connectionAttempts,
      hasToken: !!localStorage.getItem("idToken"),
      wsReadyState: ws?.readyState,
      wsUrl: ws?.url
    };
    
    console.log(" WebSocket Status Check:", status);
    return status;
  },

  reconnectWebSocket: () => {
    console.log(" Force reconnecting WebSocket...");
    
    get().disconnectWebSocket();
    set({ connectionAttempts: 0 });
    
    setTimeout(() => {
      get().connectWebSocket();
    }, 1000);
  }
}));