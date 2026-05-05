import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { isTokenValid } from "../components/PrivateRoute";

/**
 * Хук для периодической проверки токена
 * Проверяет каждую минуту и перенаправляет на логин при истечении
 */
export function useTokenCheck() {
  const navigate = useNavigate();

  useEffect(() => {
    // Проверка при монтировании
    if (!isTokenValid()) {
      console.log("🔒 Token invalid on mount, redirecting to login");
      localStorage.removeItem("accessToken");
      navigate("/login", { replace: true });
      return;
    }

    // Периодическая проверка каждые 60 секунд
    const interval = setInterval(() => {
      if (!isTokenValid()) {
        console.log("⏰ Token expired during session, redirecting to login");
        localStorage.removeItem("accessToken");
        navigate("/login", { replace: true });
      }
    }, 60000); // 60 секунд

    return () => clearInterval(interval);
  }, [navigate]);
}