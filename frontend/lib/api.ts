export type Profile = {
  id: number; name: string; age: number; city: string; profession: string; education?: string;
  denomination: string; photo_url: string | null; verified: boolean; match: number | null;
  state?: string | null; marital_status?: string | null; photo_id?: number | null;
};
export type Plan = { name: string; price: number; period: string; features: string[]; excluded?: string[]; highlight: boolean };
export type Story = { quote: string; couple: string; city: string };

const SERVER_URL = process.env.API_URL ?? "http://localhost:8000";
const BROWSER_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** For server components. Returns fallback if the API is unreachable. */
export async function serverGet<T>(path: string, fallback: T): Promise<T> {
  try {
    const res = await fetch(`${SERVER_URL}${path}`, { next: { revalidate: 60 } });
    if (!res.ok) return fallback;
    return (await res.json()) as T;
  } catch {
    return fallback;
  }
}

export type MyProfile = {
  id: number; verified: boolean; registering_for: string;
  first_name: string | null; last_name: string | null; gender: string | null; date_of_birth: string | null;
  age: number | null; height_cm: number | null; marital_status: string | null; physical_status: string | null;
  mother_tongue: string | null; denomination: string | null; church_name: string | null; church_location: string | null;
  baptism_status: string | null; pastor_name: string | null; egf_member: string | null; egf_details: string | null; testimony: string | null;
  country: string | null; state: string | null; district: string | null; city: string | null;
  education: string | null; occupation: string | null; organization: string | null; annual_income: string | null;
  father_occupation: string | null; mother_occupation: string | null; siblings: number | null;
  eating_habit: string | null; smoking_habit: string | null; drinking_habit: string | null; about_me: string | null;
  hobbies: string | null; fitness: string | null; interests: string[];
  pref_age_min: number | null; pref_age_max: number | null; pref_education: string | null; pref_location: string | null; pref_qualities: string | null;
};
export type Me = {
  id: number; email: string; plan: string; is_verified: boolean; has_profile: boolean;
  phone: string | null; phone_verified: boolean;
};

/** For client components. Throws Error(message) on failure. */
export async function clientPost<T>(path: string, body?: unknown, auth = false, method = "POST"): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (auth) {
    const token = localStorage.getItem("cedar_token");
    if (!token) throw new Error("AUTH_REQUIRED");
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(`${BROWSER_URL}${path}`, {
    method, headers, body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) throw new Error("AUTH_REQUIRED");
    const d = data.detail;
    if (typeof d === "string") throw new Error(d);
    if (Array.isArray(d) && d[0]?.msg) throw new Error(String(d[0].msg).replace(/^Value error, /, ""));
    throw new Error("Something went wrong");
  }
  return data as T;
}

export const clientGet = <T>(path: string) => clientPost<T>(path, undefined, true, "GET");
export const clientPut = <T>(path: string, body: unknown) => clientPost<T>(path, body, true, "PUT");
export const clientPatch = <T>(path: string, body: unknown) => clientPost<T>(path, body, true, "PATCH");
export const clientDelete = <T>(path: string) => clientPost<T>(path, undefined, true, "DELETE");
export const clientPutEmpty = <T>(path: string) => clientPost<T>(path, undefined, true, "PUT");

export async function clientUpload<T>(path: string, file: File): Promise<T> {
  const token = localStorage.getItem("cedar_token");
  if (!token) throw new Error("AUTH_REQUIRED");
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(`${BROWSER_URL}${path}`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) throw new Error("AUTH_REQUIRED");
    throw new Error(typeof data.detail === "string" ? data.detail : "Upload failed");
  }
  return data as T;
}

// Photos are private, so <img src> cannot send the login token: fetch the bytes with it instead.
const photoCache = new Map<number, string>();
export async function fetchPhotoUrl(id: number): Promise<string> {
  const hit = photoCache.get(id);
  if (hit) return hit;
  const token = localStorage.getItem("cedar_token");
  const res = await fetch(`${BROWSER_URL}/api/photos/${id}/file`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error("photo");
  const url = URL.createObjectURL(await res.blob());
  photoCache.set(id, url);
  return url;
}
export function forgetPhoto(id: number) {
  const u = photoCache.get(id);
  if (u) { URL.revokeObjectURL(u); photoCache.delete(id); }
}

export type ProfileDetail = {
  id: number; name: string; age: number; gender: string; verified: boolean; photo_url: string | null; photo_ids: number[];
  match: number | null; is_me: boolean; shortlisted: boolean; interest_sent: boolean; about: string | null;
  city: string | null; state: string | null; district: string | null; country: string | null;
  height_cm: number | null; marital_status: string | null; physical_status: string | null; mother_tongue: string | null;
  denomination: string | null; church_name: string | null; church_location: string | null; baptism_status: string | null;
  pastor_name: string | null; egf_member: string | null; egf_details: string | null; testimony: string | null;
  education: string | null; profession: string | null; organization: string | null;
  father_occupation: string | null; mother_occupation: string | null; siblings: number | null;
  eating_habit: string | null; smoking_habit: string | null; drinking_habit: string | null;
  interest_status: string | null; they_interested: string | null; their_interest_id: number | null;
  hobbies: string | null; fitness: string | null; interests: string[];
  pref_age_min: number | null; pref_age_max: number | null; pref_education: string | null; pref_location: string | null; pref_qualities: string | null;
  gallery_urls: string[];
};

export type Conversation = { profile: Profile; last_message: string | null; last_at: string | null; unread: number };
export type ChatMessage = { id: number; mine: boolean; body: string; created_at: string };
export type Thread = { profile: Profile; messages: ChatMessage[]; can_reply: boolean };

export type InterestItem = { id: number; status: string; created_at: string; unseen: boolean; profile: Profile };
export type Summary = { pending_interests: number; accepted_unseen: number; unread_messages: number; total: number };
export type Completeness = { percent: number; missing: string[] };
