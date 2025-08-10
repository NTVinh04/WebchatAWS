import Navbar from "./components/Navbar";
import { Routes, Route, Navigate } from "react-router-dom";
import HomePage from "./pages/HomePage";
import SignUpPage from "./pages/SignUpPage";
import LoginPage from "./pages/LoginPage";
import SettingsPage from "./pages/SettingsPage";
import ProfilePage from "./pages/ProfilePage";
import ConfirmSignUpPage from "./pages/ConfirmSignUpPage";
import { useAuthStore } from "./store/useAuthStore";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { Loader } from "lucide-react";
import { useThemeStore } from "./store/useThemeStore";
import TokenFetcher from "./components/TokenFetcher";

const App = () => {
  const user = useAuthStore((state) => state.user);
  const checkAuth = useAuthStore((state) => state.checkAuth);
  const isCheckingAuth = useAuthStore((state) => state.isCheckingAuth);
  const theme = useThemeStore((state) => state.theme);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Hiển thị loading trong khi checkAuth đang chạy 
  // nếu cầu kiểm tra token thì dán {user && <TokenFetcher />} vào phía trên Toaster
  if (isCheckingAuth) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader className="size-10 animate-spin" />
      </div>
    );
  }

  return (
    <div data-theme={theme}>
      <Navbar />

      <Routes>
        <Route path="/" element={user ? <HomePage /> : <Navigate to="/login" />} />
        <Route path="/signup" element={!user ? <SignUpPage /> : <Navigate to="/" />} />
        <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/" />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/profile" element={user ? <ProfilePage /> : <Navigate to="/login" />} />
        <Route path="/confirm-signup" element={<ConfirmSignUpPage />} />
      </Routes>
      <Toaster />
    </div>
  );
};

export default App;
