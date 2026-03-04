/**
 * Получить payload из JWT токена
 * @returns {Object|null} decoded payload или null
 */
export function getTokenPayload() {
  const token = localStorage.getItem("accessToken");
  
  if (!token) {
    return null;
  }

  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch (error) {
    console.error("❌ Token decode error:", error);
    return null;
  }
}

/**
 * Получить tenantId из токена
 * @returns {number|null} tenantId или null
 */
export function getTenantId() {
  const payload = getTokenPayload();
  return payload?.tenantId || null;
}

/**
 * Получить queue из токена (номер очереди пользователя)
 * @returns {string|null} queue или null
 */
export function getUserQueue() {
  const payload = getTokenPayload();
  // Возвращаем queue из токена (например: "110001")
  return payload?.queue || payload?.tenantId?.toString() || null;
}
