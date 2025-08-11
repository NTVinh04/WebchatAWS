import { create } from "zustand";
import toast from "react-hot-toast";
import { api as axiosInstance } from "../lib/axios";

export const useChatStore = create((set, get) => ({
  messages: [],
  users: [],
  selectedUser: null,
  isUsersLoading: false,
  isMessagesLoading: false,

  // Lấy danh sách người dùng
  getUsers: async () => {
    set({ isUsersLoading: true });
    try {
      const res = await axiosInstance.get("/user");
      set({ users: res.data });
    } catch (error) {
      toast.error(error.response?.data?.message || "Không thể tải danh sách người dùng");
    } finally {
      set({ isUsersLoading: false });
    }
  },

  // Tạo conversationId từ senderId và receiverId
  getConversationId: () => {
    const { selectedUser } = get();
    const senderId = window.__AUTH_USER_ID__ || null;
    const receiverId = selectedUser?.userId;

    if (!senderId || !receiverId) return null;
    return [senderId, receiverId].sort().join("_");
  },

  // Lấy tin nhắn từ một cuộc trò chuyện
  getMessages: async () => {
    set({ isMessagesLoading: true });

    const conversationId = get().getConversationId();
    if (!conversationId) {
      toast.error("Không xác định được cuộc trò chuyện");
      set({ isMessagesLoading: false });
      return;
    }

    try {
      const res = await axiosInstance.get(`/message/${conversationId}`);
      const rawMessages = res.data;

      const parsedMessages = rawMessages.map((msg) => ({
        conversationId: msg.conversationId || "",
        senderId: msg.senderId || "",
        receiverId: msg.receiverId || "",
        text: msg.text || "",
        image: msg.attachment || null,
        attachment: msg.attachment || null,
        type: msg.attachment ? "image" : "text",
        createdAt: msg.createdAt || null,
        timestamp: msg.timestamp || null,
      }));

      set({ messages: parsedMessages });
    } catch (error) {
      console.error("Lỗi khi tải tin nhắn:", error);
      toast.error(error.response?.data?.message || "Lỗi khi tải tin nhắn");
    } finally {
      set({ isMessagesLoading: false });
    }
  },

  // Gửi tin nhắn
  sendMessage: async (messageData) => {
    console.log(" sendMessage called with:", messageData);
    
    const { messages, selectedUser, getConversationId } = get();
    const senderId = window.__AUTH_USER_ID__ || null;
    const receiverId = selectedUser?.userId;

    console.log(" Send message details:", {
      senderId,
      receiverId,
      selectedUser: selectedUser?.email || selectedUser?.userId,
      messageData
    });

    if (!senderId || !receiverId) {
      toast.error("Không xác định được người gửi hoặc người nhận");
      console.warn(" sendMessage: senderId hoặc receiverId bị thiếu", { senderId, receiverId });
      return;
    }

    const conversationId = getConversationId();
    console.log(" Conversation ID:", conversationId);

    const payload = {
      ...messageData,
      senderId,
      receiverId,
      conversationId,
    };

    console.log(" Full payload being sent:", payload);

    try {
      console.log(" Sending POST request to /send-message...");
      
      const res = await axiosInstance.post(`/send-message`, payload);
      
      console.log(" Send message response:", res.data);
      console.log(" Response status:", res.status);

      const newMessage = {
        ...res.data,
        image: res.data.attachment || null,
        type: res.data.attachment ? "image" : "text",
      };

      console.log(" Formatted new message:", newMessage);
      
      set({ messages: [...messages, newMessage] });
      console.log(" Message added to local store");
      
      return newMessage;
    } catch (error) {
      console.error(" Error sending message:", error);
      console.error(" Error response:", error.response?.data);
      console.error(" Error status:", error.response?.status);
      toast.error(error.response?.data?.message || "Lỗi khi gửi tin nhắn");
    }
  },

  //  FIXED: Enhanced addMessage with proper debug and conversation check
  addMessage: (newMessage) => {
    console.log(" ===== ADD MESSAGE DEBUG =====");
    console.log(" Called with:", newMessage);
    console.log(" Message type:", typeof newMessage);
    console.log(" Message keys:", Object.keys(newMessage || {}));
    
    const { messages, selectedUser } = get();
    const currentUserId = window.__AUTH_USER_ID__;
    
    console.log(" Current state:", {
      messagesCount: messages.length,
      selectedUser: selectedUser?.userId,
      currentUserId: currentUserId
    });
    
    if (!newMessage) {
      console.warn(" newMessage is null/undefined");
      return;
    }

    // Kiểm tra xem có phải tin nhắn của conversation hiện tại không
    const conversationId = get().getConversationId();
    const messageConversationId = newMessage.conversationId;
    
    console.log(" Conversation check:", {
      currentConversationId: conversationId,
      messageConversationId: messageConversationId,
      isMatch: conversationId === messageConversationId
    });

    // Nếu không phải conversation hiện tại thì bỏ qua
    if (conversationId !== messageConversationId) {
      console.log(" Message not for current conversation, ignoring");
      return;
    }

    // Kiểm tra duplicate
    const isDuplicate = messages.some(msg => 
      msg.timestamp === newMessage.timestamp && 
      msg.senderId === newMessage.senderId &&
      msg.text === newMessage.text
    );

    console.log(" Duplicate check:", {
      isDuplicate: isDuplicate,
      existingMessagesCount: messages.length
    });

    if (isDuplicate) {
      console.log(" Duplicate message detected, skipping");
      return;
    }

    const formattedMessage = {
      ...newMessage,
      image: newMessage.attachment || null,
      type: newMessage.attachment ? "image" : "text",
    };

    console.log(" Formatted message:", formattedMessage);
    
    const updatedMessages = [...messages, formattedMessage];
    console.log(" Updating messages array:", {
      oldCount: messages.length,
      newCount: updatedMessages.length
    });
    
    set({ messages: updatedMessages });
    
    console.log(" Messages updated successfully");
    console.log(" ===== END ADD MESSAGE DEBUG =====");
  },

  setSelectedUser: (selectedUser) => {
    set({ selectedUser });
  },
}));

// Expose store cho debug (thêm vào cuối file)
if (typeof window !== 'undefined') {
  window.__chatStore = useChatStore;
  window.__chatState = () => useChatStore.getState();
}