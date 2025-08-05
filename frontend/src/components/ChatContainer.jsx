import { useAuthStore } from "../store/useAuthStore";
import { useChatStore } from "../store/useChatStore";
import { useEffect, useRef } from "react";
import MessageInput from "./MessageInput";
import ChatHeader from "./ChatHeader";
import MessageSkeleton from "./skeletons/MessageSkeleton";
import { formatMessageTime } from "../lib/utils";

const ChatContainer = () => {
  const {
    messages,
    getMessages,
    isMessagesLoading,
    selectedUser,
    subscribeToMessages,
    unsubscribeFromMessages,
  } = useChatStore();

  const { user } = useAuthStore();
  const messageEndRef = useRef(null);

  // Gọi khi selectedUser thay đổi
  useEffect(() => {
    if (!selectedUser) return;

    getMessages(); // Sử dụng store để tự tạo conversationId
    subscribeToMessages();

    return () => {
      unsubscribeFromMessages();
    };
  }, [selectedUser]);

  // Scroll xuống cuối khi có tin nhắn mới
  useEffect(() => {
    if (messageEndRef.current && messages?.length) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Nếu chưa chọn user thì hiển thị thông báo
  if (!selectedUser) {
    return (
      <div className="flex-1 flex items-center justify-center text-zinc-500">
        <p>Hãy chọn một người để bắt đầu trò chuyện.</p>
      </div>
    );
  }

  // Loading state
  if (isMessagesLoading) {
    return (
      <div className="flex-1 flex flex-col overflow-auto">
        <ChatHeader />
        <MessageSkeleton />
        <MessageInput />
      </div>
    );
  }

  // Hiển thị tin nhắn
  return (
    <div className="flex-1 flex flex-col overflow-auto">
      <ChatHeader />
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`chat ${message.senderId === user.userId ? "chat-end" : "chat-start"}`}
          >
            <div className="chat-image avatar">
              <div className="size-10 rounded-full border">
                <img
                  src={
                    message.senderId === user.userId
                      ? user.profilePic || "/avatar.png"
                      : selectedUser.profilePic || "/avatar.png"
                  }
                  alt="profile pic"
                />
              </div>
            </div>
            <div className="chat-header mb-1">
              <time className="text-xs opacity-50 ml-1">
                {message.createdAt ? formatMessageTime(message.createdAt) : ""}
              </time>
            </div>
            <div className="chat-bubble flex flex-col">
              {(message.attachment || message.image) && message.type === "image" && (
                <img
                  src={message.attachment || message.image}
                  alt="Attachment"
                  className="sm:max-w-[200px] rounded-md mb-2 cursor-pointer hover:opacity-90 transition"
                  onClick={() =>
                    window.open(message.attachment || message.image, "_blank")
                  }
                />
              )}
              {message.text && <p>{message.text}</p>}
            </div>
          </div>
        ))}
        <div ref={messageEndRef} />
      </div>
      <MessageInput />
    </div>
  );
};

export default ChatContainer;
