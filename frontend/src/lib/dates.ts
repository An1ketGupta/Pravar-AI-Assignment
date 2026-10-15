import { format, formatDistanceToNowStrict, isSameDay } from "date-fns";
import type { Lead } from "./types";

export function isActive(lead: Lead) {
  return lead.status !== "won" && lead.status !== "lost";
}

export function isTodayFollowUp(lead: Lead, now = new Date()) {
  return (
    isActive(lead) &&
    Boolean(lead.follow_up_at && isSameDay(new Date(lead.follow_up_at), now))
  );
}

export function isOverdue(lead: Lead, now = new Date()) {
  return (
    isActive(lead) &&
    Boolean(lead.follow_up_at && new Date(lead.follow_up_at) < now)
  );
}

export function followUpLabel(timestamp: string, now = new Date()) {
  const date = new Date(timestamp);
  return isSameDay(date, now)
    ? `Today at ${format(date, "h:mm a")}`
    : format(date, "MMM d, h:mm a");
}

export function timeAgo(timestamp: string) {
  return formatDistanceToNowStrict(new Date(timestamp), { addSuffix: true });
}

export function toUtcFollowUp(date: string, time: string): string {
  const local = new Date(`${date}T${time}`);
  // Round-trip validation catches invalid dates and daylight-saving gaps.
  if (
    !date ||
    !time ||
    Number.isNaN(local.getTime()) ||
    format(local, "yyyy-MM-dd'T'HH:mm") !== `${date}T${time}`
  ) {
    throw new Error("Choose a valid follow-up date and time.");
  }
  return local.toISOString();
}

export function groupLeads(
  leads: Lead[],
  search: string,
  status: string,
  now = new Date(),
) {
  const query = search.trim().toLocaleLowerCase();
  const today: Lead[] = [];
  const others: Lead[] = [];
  let activeCount = 0;
  let todayCount = 0;
  let overdueCount = 0;

  for (const lead of leads) {
    const dueToday = isTodayFollowUp(lead, now);
    activeCount += Number(isActive(lead));
    todayCount += Number(dueToday);
    overdueCount += Number(isOverdue(lead, now));
    if (
      (status === "all" || lead.status === status) &&
      lead.name.toLocaleLowerCase().includes(query)
    ) {
      (dueToday ? today : others).push(lead);
    }
  }

  today.sort(
    (a, b) =>
      new Date(a.follow_up_at!).getTime() - new Date(b.follow_up_at!).getTime(),
  );
  others.sort((a, b) => {
    const overdueDifference =
      Number(isOverdue(b, now)) - Number(isOverdue(a, now));
    return (
      overdueDifference ||
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  });
  return {
    today,
    others,
    count: today.length + others.length,
    activeCount,
    todayCount,
    overdueCount,
  };
}
