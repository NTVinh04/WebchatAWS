const socket = new WebSocket("wss://f3dufx8egk.execute-api.ap-southeast-1.amazonaws.com/production/");

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
