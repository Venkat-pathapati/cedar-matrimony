"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import Header from "@/components/Header";
import PageDecor from "@/components/PageDecor";
import { clientPost } from "@/lib/api";
import { saveToken } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await clientPost<{ access_token: string }>("/api/auth/login", { email, password });
      saveToken(r.access_token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Header />
      <div className="form-wrap">
        <PageDecor few />
        <form className="form" onSubmit={submit}>
          <h1>Welcome back</h1>
          <label>Email<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <label>Password<input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></label>
          {error && <div className="error">{error}</div>}
          <button className="btn btn-green" disabled={busy}>{busy ? "Signing in…" : "Login"}</button>
          <div style={{ fontSize: 15 }}>New here? <Link href="/register" style={{ fontWeight: 700 }}>Create your profile</Link></div>
        </form>
      </div>
    </>
  );
}
