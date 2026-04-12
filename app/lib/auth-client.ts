"use client";

import { createAuthClient } from "better-auth/react";

const authBaseUrl =
  typeof window === "undefined"
    ? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
    : window.location.origin;

export const authClient = createAuthClient({
  baseURL: authBaseUrl,
});

export const { useSession, signIn, signUp, signOut } = authClient;
