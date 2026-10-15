import type { QueryClient } from "@tanstack/react-query";
import type { Lead, LeadDetail } from "./types";

export async function syncLeadCaches(
  cache: QueryClient,
  userId: string | null,
  lead: LeadDetail,
) {
  // Older reads must settle before publishing the committed mutation response.
  await Promise.all([
    cache.cancelQueries({ queryKey: ["leads", userId], exact: true }),
    cache.cancelQueries({ queryKey: ["lead", userId, lead.id], exact: true }),
  ]);
  cache.setQueryData(["lead", userId, lead.id], lead);
  const { discussions: _discussions, ...summary } = lead;
  cache.setQueryData<Lead[]>(["leads", userId], (old = []) =>
    [summary, ...old.filter((item) => item.id !== lead.id)].sort(
      (a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
    ),
  );
}
