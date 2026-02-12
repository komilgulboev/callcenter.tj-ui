const API_BASE = "http://localhost:8080"; // 🔥 ВОТ ЗДЕСЬ

export async function apiPost(path, body) {
  const token = localStorage.getItem("accessToken");

  const res = await fetch(API_BASE + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.status);
  }

  return res.json().catch(() => null);
}
