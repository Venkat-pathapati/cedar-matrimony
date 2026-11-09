"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/providers";
import 'bootstrap/dist/css/bootstrap.min.css';

// Landing: signed-in admins go to the dashboard, everyone else to the admin login.
export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuth();
  useEffect(() => { if (!loading) router.replace(user?.role === "admin" ? "/admin" : "/login"); }, [user, loading, router]);
  return <p style={{ padding: 24 }}>Loading…</p>;
}
