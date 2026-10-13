"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Lead, LeadDetail, LeadStatus } from "@/lib/types";
import { useAuth } from "@/components/providers";

export function useLeads() {
  const { token, userId } = useAuth();
  const bootstrap = useQuery({
    queryKey: ["bootstrap", userId],
    queryFn: () => api<{ created: boolean }>("/account/bootstrap", token!, {
      method: "POST", body: JSON.stringify({ timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
    }),
    enabled: Boolean(token), staleTime: Infinity,
  });
  const leads = useQuery({
    queryKey: ["leads", userId],
    queryFn: () => api<Lead[]>("/leads", token!),
    enabled: Boolean(token) && bootstrap.isSuccess,
  });
  return { ...leads, isPending: bootstrap.isPending || leads.isPending, error: bootstrap.error || leads.error, retry: () => bootstrap.isError ? bootstrap.refetch() : leads.refetch() };
}

export function useLead(id: string) {
  const { token, userId } = useAuth();
  return useQuery({ queryKey: ["lead", userId, id], queryFn: () => api<LeadDetail>(`/leads/${id}`, token!) });
}

export function useLeadMutations() {
  const { token, userId } = useAuth();
  const cache = useQueryClient();

  function syncLead(lead: LeadDetail) {
    // Use the committed server response to update the list and dialog immediately.
    cache.setQueryData(["lead", userId, lead.id], lead);
    cache.setQueryData<Lead[]>(["leads", userId], (old = []) =>
      [lead, ...old.filter((item) => item.id !== lead.id)].sort((a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
      ),
    );
  }

  const create = useMutation({
    mutationFn: (payload: { name: string; company?: string; phone?: string }) => api<LeadDetail>("/leads", token!, { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: syncLead,
  });
  const update = useMutation({
    mutationFn: ({ id, ...payload }: { id: string; status?: LeadStatus; follow_up_at?: string | null }) => api<LeadDetail>(`/leads/${id}`, token!, { method: "PATCH", body: JSON.stringify(payload) }),
    onSuccess: syncLead,
  });
  const discuss = useMutation({
    mutationFn: ({ id, ...payload }: { id: string; content: string; follow_up_at?: string }) => api<LeadDetail>(`/leads/${id}/discussions`, token!, { method: "POST", body: JSON.stringify(payload) }),
    onSuccess: syncLead,
  });
  return { create, update, discuss };
}
