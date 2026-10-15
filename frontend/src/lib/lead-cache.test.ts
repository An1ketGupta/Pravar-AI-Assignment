import { QueryClient } from "@tanstack/react-query";
import { expect, it } from "vitest";
import { syncLeadCaches } from "./lead-cache";
import type { LeadDetail } from "./types";

it("prevents stale list and detail reads from replacing a committed save", async () => {
  const cache = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const saved: LeadDetail = {
    id: "lead-1",
    name: "Ada",
    company: null,
    phone: null,
    status: "qualified",
    follow_up_at: null,
    created_at: "2030-05-01T08:00:00Z",
    updated_at: "2030-05-07T08:00:00Z",
    last_note: "Saved note",
    last_discussion_at: "2030-05-07T08:00:00Z",
    discussions: [],
  };
  const stale = { ...saved, status: "new" as const, last_note: "Old note" };
  const listKey = ["leads", "user-1"];
  const detailKey = ["lead", "user-1", saved.id];
  cache.setQueryData(listKey, [stale]);
  cache.setQueryData(detailKey, stale);
  cache.setQueryData(["leads", "user-2"], [stale]);
  const signals: AbortSignal[] = [];
  let finishList!: (value: LeadDetail[]) => void;
  let finishDetail!: (value: LeadDetail) => void;
  const listRead = cache
    .fetchQuery({
      queryKey: listKey,
      queryFn: ({ signal }) => {
        signals.push(signal);
        return new Promise<LeadDetail[]>((resolve) => {
          finishList = resolve;
        });
      },
    })
    .catch((error: unknown) => error);
  const detailRead = cache
    .fetchQuery({
      queryKey: detailKey,
      queryFn: ({ signal }) => {
        signals.push(signal);
        return new Promise<LeadDetail>((resolve) => {
          finishDetail = resolve;
        });
      },
    })
    .catch((error: unknown) => error);

  try {
    await syncLeadCaches(cache, "user-1", saved);
    expect(signals).toHaveLength(2);
    expect(signals.every((signal) => signal.aborted)).toBe(true);
    finishList([stale]);
    finishDetail(stale);
    await Promise.all([listRead, detailRead]);
    expect(cache.getQueryData(detailKey)).toEqual(saved);
    const { discussions: _discussions, ...summary } = saved;
    expect(cache.getQueryData(listKey)).toEqual([summary]);
    expect(cache.getQueryData(["leads", "user-2"])).toEqual([stale]);
  } finally {
    cache.clear();
  }
});
