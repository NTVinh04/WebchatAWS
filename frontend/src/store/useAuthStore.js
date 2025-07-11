import {create} from 'zustand';
import { axiosInstance } from '../lib/axios.js';
import toast from 'react-hot-toast';
import io from 'socket.io-client';

const BASE_URL = "http://localhost:5001"

export const useAuthStore = create((set,get) =>({
    onlineUsers: [],
    authUser: null,
    isSigningUp: false,
    isLoggingIng: false,
    isUpdatingProfile: false,
    socket: null,
    isCheckingAuth: true,

    checkAuth: async() =>{
        try {
            const res = await axiosInstance.get("/auth/check");
            set({authUser: res.data});
            
            // Connect socket if user is authenticated
            if (res.data) {
                get().connectSocket();
            }
        } catch (error) {
            console.log("Error in checkAuth: ", error);
            set({authUser: null});
        } finally{
            set({isCheckingAuth: false});
        }
    },

    signup: async (data) =>{
        set({ isSigningUp: true});
        try {
            const res = await axiosInstance.post("/auth/signup", data);
            set({authUser: res.data});
            toast.success("Tạo tài khoản thành công");
            
            // Connect socket after successful signup
            get().connectSocket();
        } catch (error) {
            toast.error(error.response.data.message);
        } finally{
            set({isSigningUp: false});
        }
    },

    login: async(data) =>{
        set({ isLoggingIng: true});
        try {
            const res = await axiosInstance.post("/auth/login", data);
            set({authUser: res.data});
            toast.success("Đăng nhập thành công");

            // Connect socket after successful login
            get().connectSocket();
        } catch (error) {
            toast.error("Tài khoản hoặc mật khẩu sai");
        } finally{
            set({isLoggingIng: false});
        }
    },

    logout: async() =>{
        try {
            await axiosInstance.post("/auth/logout");
            set({authUser: null});
            toast.success("Đăng xuất thành công");
            
            // Disconnect socket before logout
            get().disconnectSocket();
        } catch (error) {
            toast.error(error.response.data.message);
        }
    },

    updateProfile: async(data) =>{
        set({ isUpdatingProfile: true});
        try {
            const res = await axiosInstance.put("/auth/update-profile", data);
            set({authUser: res.data});
            toast.success("Cập nhật thành công");
        } catch (error) {
            console.log("error in update profile: ", error)
            toast.error("Không thể cập nhật được");
        } finally{
            set({isUpdatingProfile: false});
        }
    },

    connectSocket: () => {
        const { authUser, socket } = get();
        
        // Don't connect if no user or socket already connected
        if (!authUser || socket?.connected) return;
        
        console.log("Connecting socket for user:", authUser._id);
        
        const newSocket = io(BASE_URL, {
            query: {
                userId: authUser._id,
            },
        });

        set({ socket: newSocket });

        // Socket event listeners
        newSocket.on("connect", () => {
            console.log("Socket connected successfully:", newSocket.id);
        });

        newSocket.on("disconnect", () => {
            console.log("Socket disconnected");
        });

        newSocket.on("connect_error", (error) => {
            console.error("Socket connection error:", error);
        });

        newSocket.on("getOnlineUsers", (userIds) => {
            console.log("Online users received:", userIds);
            set({ onlineUsers: userIds });
        });

        // Listen for when other users come online/offline
        newSocket.on("userConnected", (userId) => {
            console.log("User connected:", userId);
            set({ onlineUsers: [...get().onlineUsers, userId] });
        });

        newSocket.on("userDisconnected", (userId) => {
            console.log("User disconnected:", userId);
            set({ onlineUsers: get().onlineUsers.filter(id => id !== userId) });
        });
    },

    disconnectSocket: () => {
        const { socket } = get();
        if (socket?.connected) {
            console.log("Disconnecting socket");
            socket.disconnect();
            set({ socket: null, onlineUsers: [] });
        }
    },
}));