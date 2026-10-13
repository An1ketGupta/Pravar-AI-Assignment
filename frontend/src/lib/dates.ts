import { format, formatDistanceToNowStrict, isSameDay } from "date-fns";
import type { Lead } from "./types";

export function isActive(lead: Lead) {
  return lead.status !== "won" && lead.status !== "lost";
}

export function isTodayFollowUp(lead: Lead, now = new Date()) {
  return isActive(lead) && Boolean(lead.follow_up_at && isSameDay(new Date(lead.follow_up_at), now));
}

export function isOverdue(lead: Lead, now = new Date()) {
  return isActive(lead) && Boolean(lead.follow_up_at && new Date(lead.follow_up_at) < now);
}

export function followUpLabel(timestamp: string, now = new Date()) {
  const date = new Date(timestamp);
  return isSameDay(date, now) ? `Today at ${format(date, "h:mm a")}` : format(date, "MMM d, h:mm a");
}

export function timeAgo(timestamp: string) {
  return formatDistanceToNowStrict(new Date(timestamp), { addSuffix: true });
}

export function toUtcFollowUp(date: string, time: string): string {
  const local = new Date(`${date}T${time}`);
  // Round-trip validation catches invalid dates and daylight-saving gaps.
  if (!date || !time || Number.isNaN(local.getTime()) || format(local, "yyyy-MM-dd'T'HH:mm") !== `${date}T${time}`) {
    throw new Error("Choose a valid follow-up date and time.");
  }
  return local.toISOString();
}

export function groupLeads(leads: Lead[], search: string, status: string, now = new Date()) {
  const matching = leads.filter((lead) =>
    lead.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()) &&
    (status === "all" || lead.status === status),
  );
  const today = matching.filter((lead) => isTodayFollowUp(lead, now)).sort((a, b) =>
    new Date(a.follow_up_at!).getTime() - new Date(b.follow_up_at!).getTime(),
  );
  const others = matching.filter((lead) => !isTodayFollowUp(lead, now)).sort((a, b) => {
    const overdueDifference = Number(isOverdue(b, now)) - Number(isOverdue(a, now));
    return overdueDifference || new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });
  return { today, others, count: matching.length };
}
