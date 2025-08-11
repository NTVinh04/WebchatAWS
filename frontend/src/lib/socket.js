const socket = new WebSocket("wss://5gm2fis56a.execute-api.ap-southeast-1.amazonaws.com/production");

socket.onopen = () => {
  console.log("WebSocket connected");
};

socket.onmessage = (event) => {
  const data = JSON.parse(event.data);
  // Hiển thị tin nhắn hoặc thay đổi trạng thái online
};

socket.onclose = () => {
  console.log("WebSocket disconnected");
};
