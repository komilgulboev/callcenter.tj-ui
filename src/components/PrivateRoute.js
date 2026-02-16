import { Navigate } from "react-router-dom";

/**
 * Проверяет наличие и валидность токена
 * @returns {boolean} true если токен валиден
 */
export function isTokenValid() {
  const token = localStorage.getItem("accessToken");
  
  if (!token) {
    console.log("🔒 No token found");
    return false;
  }

  try {
    // Простая проверка JWT структуры
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.log("❌ Invalid token format");
      return false;
    }

    // Декодируем payload
    const payload = JSON.parse(atob(parts[1]));
    const now = Math.floor(Date.now() / 1000);
    
    if (payload.exp && payload.exp < now) {
      console.log("⏰ Token expired:", {
        expiredAt: new Date(payload.exp * 1000),
        now: new Date(now * 1000),
      });
      return false;
    }

    console.log("✅ Token is valid, expires:", new Date(payload.exp * 1000));
    return true;
  } catch (error) {
    console.error("❌ Token validation error:", error);
    return false;
  }
}

/**
 * Компонент для защиты приватных роутов
 * Перенаправляет на /login если токен невалиден
 */
export function PrivateRoute({ children }) {
  if (!isTokenValid()) {
    // Удаляем невалидный токен
    localStorage.removeItem("accessToken");
    console.log("🔄 Redirecting to login...");
    return <Navigate to="/login" replace />;
  }

  return children;
}

/**
 * Компонент для публичных роутов (например, страница логина)
 * Перенаправляет на Dashboard если пользователь уже авторизован
 */
export function PublicRoute({ children }) {
  if (isTokenValid()) {
    console.log("🔄 Already authenticated, redirecting to dashboard...");
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}