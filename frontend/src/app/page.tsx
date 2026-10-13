"use client";

import { Loader2 } from "lucide-react";
import { AuthScreen } from "@/components/auth-screen";
import { Dashboard } from "@/components/dashboard";
import { useAuth } from "@/components/providers";

export default function Home() {
  const { loading, token } = useAuth();
  if (loading) return <main className="initial-loading"><Loader2 className="spin" size={24} /><span>Opening LeadFlow…</span></main>;
  return token ? <Dashboard /> : <AuthScreen />;
}
