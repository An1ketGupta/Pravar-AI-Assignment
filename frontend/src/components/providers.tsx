"use client";

import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { Toaster } from "sonner";
import { demoEnabled, getSupabase } from "@/lib/supabase";

interface AuthState {
  session: Session | null;
  loading: boolean;
  demo: boolean;
  token: string | null;
  userId: string | null;
  name: string;
  startDemo: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [demo, setDemo] = useState(false);

  useEffect(() => {
    let alive = true;
    if (demoEnabled && sessionStorage.getItem("leadflow-local-preview") === "true") setDemo(true);
    const supabase = getSupabase();
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      if (alive) { setSession(data.session); setLoading(false); }
    }).catch(() => { if (alive) setLoading(false); });
    // Keep this callback synchronous; awaiting auth calls here can deadlock Supabase.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (alive) { setSession(nextSession); setLoading(false); }
    });
    return () => { alive = false; subscription.unsubscribe(); };
  }, []);

  function startDemo() {
    if (!demoEnabled) return;
    queryClient.clear();
    sessionStorage.setItem("leadflow-local-preview", "true");
    setDemo(true);
  }

  async function signOut() {
    if (!demo) {
      const result = await getSupabase()?.auth.signOut();
      if (result?.error) throw result.error;
    }
    queryClient.clear();
    sessionStorage.removeItem("leadflow-local-preview");
    setDemo(false);
    setSession(null);
  }

  return <AuthContext.Provider value={{
    session, loading, demo,
    token: demo ? "local-demo" : session?.access_token ?? null,
    userId: demo ? "local-demo" : session?.user.id ?? null,
    name: demo ? "Alex Morgan" : session?.user.user_metadata?.full_name || session?.user.email?.split("@")[0] || "Your workspace",
    startDemo, signOut,
  }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside Providers");
  return value;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 }, mutations: { retry: false } },
  }));
  return <QueryClientProvider client={queryClient}>
    <AuthProvider>{children}</AuthProvider>
    <Toaster position="bottom-right" richColors closeButton />
  </QueryClientProvider>;
}
