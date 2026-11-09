"use client";

import { useLoggedIn } from "@/lib/auth";

/** Renders its children (the payment plans) only for logged-in / registered users. */
export default function PlansGate({ children }: { children: React.ReactNode }) {
  const loggedIn = useLoggedIn();
  return loggedIn ? <>{children}</> : null;
}
