// TokenFetcher.jsx
import { useEffect, useState } from "react";
import { getCurrentIdToken } from "../lib/gettoken";

const TokenFetcher = () => {
  const [token, setToken] = useState("");

  useEffect(() => {
    getCurrentIdToken()
      .then((tok) => setToken(tok))
      .catch((err) => console.error("Lỗi lấy token:", err));
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold">Token hiện tại:</h2>
      <textarea
        readOnly
        className="w-full h-40 p-2 border border-gray-300 rounded"
        value={token || "Chưa đăng nhập hoặc không có token"}
      />
    </div>
  );
};

export default TokenFetcher;
