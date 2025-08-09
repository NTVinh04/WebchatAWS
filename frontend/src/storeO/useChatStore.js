import { create } from "zustand";
import toast from "react-hot-toast";
import { api as axiosInstance } from "../lib/axios";
import { useAuthStore } from "./useAuthStore";

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
    const senderId = useAuthStore.getState().user?.userId;
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
    const senderId = useAuthStore.getState().user?.userId;
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

  // Nhận tin nhắn mới qua socket.io
  subscribeToMessages: () => {
    const socket = useAuthStore.getState().socket;
    const currentUserId = useAuthStore.getState().user?.userId;
    const { selectedUser } = get();

    if (!socket || !selectedUser || !currentUserId) return;

    const expectedConversationId = [currentUserId, selectedUser.userId].sort().join("_");

    socket.on("newMessage", (newMessage) => {
      if (newMessage.conversationId !== expectedConversationId) return;

      const formattedMessage = {
        ...newMessage,
        image: newMessage.attachment || null,
        type: newMessage.attachment ? "image" : "text",
      };

      set((state) => ({
        messages: [...state.messages, formattedMessage],
      }));
    });
  },

  unsubscribeFromMessages: () => {
    const socket = useAuthStore.getState().socket;
    if (!socket) return;
    socket.off("newMessage");
  },

  setSelectedUser: (selectedUser) => {
    set({ selectedUser });
  },
}));