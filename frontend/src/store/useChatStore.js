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
    const senderId = window.__AUTH_USER_ID__ || null; // Sẽ set từ useAuthStore
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
    const { messages, selectedUser, getConversationId } = get();
    const senderId = window.__AUTH_USER_ID__ || null; // Sẽ set từ useAuthStore
    const receiverId = selectedUser?.userId;

    if (!senderId || !receiverId) {
      toast.error("Không xác định được người gửi hoặc người nhận");
      console.warn("sendMessage: senderId hoặc receiverId bị thiếu", { senderId, receiverId });
      return;
    }

    const conversationId = getConversationId();

    try {
      const res = await axiosInstance.post(`/send-message`, {
        ...messageData,
        senderId,
        receiverId,
        conversationId,
      });

      const newMessage = {
        ...res.data,
        image: res.data.attachment || null,
        type: res.data.attachment ? "image" : "text",
      };

      set({ messages: [...messages, newMessage] });
    } catch (error) {
      console.error("Lỗi khi gửi tin nhắn:", error);
      toast.error(error.response?.data?.message || "Lỗi khi gửi tin nhắn");
    }
  },

  // Thêm tin nhắn mới từ WebSocket (thay thế cho subscribeToMessages)
  addMessage: (newMessage) => {
    const { messages } = get();
    
    if (!newMessage) return;

    const formattedMessage = {
      ...newMessage,
      image: newMessage.attachment || null,
      type: newMessage.attachment ? "image" : "text",
    };

    set({ messages: [...messages, formattedMessage] });
  },

  setSelectedUser: (selectedUser) => {
    set({ selectedUser });
  },
  // Chỉ cần sửa phần addMessage trong useChatStore của bạn:

// Thêm tin nhắn mới từ WebSocket
// Thay thế addMessage trong useChatStore:

// Thêm tin nhắn mới từ WebSocket
// Thêm debug vào addMessage trong useChatStore:

addMessage: (newMessage) => {
  console.log(" addMessage called with:", newMessage);
  
  const { messages } = get();
  console.log("🔍 Current messages count:", messages.length);
  
  if (!newMessage) {
    console.warn("❌ newMessage is null/undefined");
    return;
  }

  // Kiểm tra duplicate đơn giản
  const isDuplicate = messages.some(msg => 
    msg.timestamp === newMessage.timestamp && 
    msg.senderId === newMessage.senderId &&
    msg.text === newMessage.text
  );

  console.log(" Is duplicate:", isDuplicate);

  if (isDuplicate) {
    console.log(" Duplicate message detected, skipping");
    return;
  }

  const formattedMessage = {
    ...newMessage,
    image: newMessage.attachment || null,
    type: newMessage.attachment ? "image" : "text",
  };

  console.log(" Adding formatted message:", formattedMessage);
  set({ messages: [...messages, formattedMessage] });
  console.log(" Messages updated, new count:", messages.length + 1);
},
}));