const socket = new WebSocket("wss://n5rwnf1sm9.execute-api.ap-southeast-1.amazonaws.com/production");

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
