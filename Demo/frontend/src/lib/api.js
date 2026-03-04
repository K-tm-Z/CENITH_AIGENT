// src/lib/api.js
const API_BASE = import.meta.env.VITE_API_BASE_URL || ""; 
// If you proxy in Vite, keep this "" and use "/api/..." paths.
// If backend is separate, set VITE_API_BASE_URL="http://localhost:4001"

function getToken() {
  // Adjust to your storage key
  return localStorage.getItem("accessToken") || "";
}

export async function apiJson(path, { method = "GET", body, token } = {}) {
  const auth = token ?? getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = text ? safeJsonParse(text) : null;

  if (!res.ok) {
    const msg =
      (data && (data.detail || data.message)) ||
      text ||
      `Request failed (${res.status})`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data;
}

export async function apiFormData(path, { method = "POST", formData, token } = {}) {
  const auth = token ?? getToken();
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
      // DO NOT set Content-Type for FormData; browser sets boundary
    },
    body: formData,
  });

  const text = await res.text();
  const data = text ? safeJsonParse(text) : null;

  if (!res.ok) {
    const msg =
      (data && (data.detail || data.message)) ||
      text ||
      `Request failed (${res.status})`;
    throw new Error(typeof msg === "string" ? msg : JSON.stringify(msg));
  }
  return data;
}

function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}