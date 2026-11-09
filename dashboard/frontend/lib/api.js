export const BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";
export const SITE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
// Sample members keep their photos on the public website (e.g. /profiles/anusha.jpg).
export const siteUrl = (p) => (!p ? null : /^https?:/.test(p) ? p : `${SITE}${p}`);
export const WS_URL = BASE.replace(/^http/, "ws") + "/api/v1/chat/ws";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

export const getToken = () => (typeof window === "undefined" ? null : localStorage.getItem("token"));
export const setToken = (t) => {
  if (t) localStorage.setItem("token", t);
  else localStorage.removeItem("token");
};

export async function api(path, { method = "GET", body, params } = {}) {
  const url = new URL(`${BASE}/api/v1${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v !== "" && v != null) url.searchParams.set(k, v);
    });
  }
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const isForm = typeof FormData !== "undefined" && body instanceof FormData;
  if (body && !isForm) headers["Content-Type"] = "application/json";

  let res;
  try {
    res = await fetch(url, { method, headers, body: body ? (isForm ? body : JSON.stringify(body)) : undefined });
  } catch {
    throw new ApiError("Cannot reach the server. Is the backend running?", 0);
  }
  let data = null;
  try {
    data = await res.json();
  } catch {}
  if (!res.ok) {
    let msg = data?.detail;
    if (Array.isArray(msg)) msg = msg.map((e) => `${(e.loc || []).slice(1).join(".")}: ${e.msg}`).join("; ");
    throw new ApiError(msg || `Error ${res.status}`, res.status);
  }
  return data;
}

// Photos are private, so <img src> cannot carry the login token. Fetch the bytes with the token instead.
const blobCache = new Map();
export async function fetchPhotoUrl(id) {
  if (blobCache.has(id)) return blobCache.get(id);
  const res = await fetch(`${BASE}/api/v1/photos/${id}/file`, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (!res.ok) throw new ApiError("Photo unavailable", res.status);
  const url = URL.createObjectURL(await res.blob());
  blobCache.set(id, url);
  return url;
}
export const forgetPhoto = (id) => blobCache.delete(id);
