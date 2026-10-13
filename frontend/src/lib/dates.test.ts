import { describe, expect, it } from "vitest";
import { groupLeads, isOverdue, isTodayFollowUp, toUtcFollowUp } from "./dates";
import type { Lead } from "./types";

function lead(id: string, follow_up_at: string | null, status: Lead["status"] = "new"): Lead {
  return {
    id, name: id, company: null, phone: null, status, follow_up_at,
    created_at: "2030-05-01T08:00:00Z", updated_at: "2030-05-01T08:00:00Z",
    last_note: "A conversation", last_discussion_at: "2030-05-01T08:00:00Z",
  };
}

describe("follow-ups in the user's timezone", () => {
  const now = new Date("2030-05-07T04:00:00Z");
  it("pins a reminder on today's local date even when its UTC date is yesterday", () => {
    const early = lead("early", "2030-05-06T20:00:00Z");
    expect(isTodayFollowUp(early, now)).toBe(true);
    expect(isOverdue(early, now)).toBe(true);
    expect(isTodayFollowUp(lead("tomorrow", "2030-05-07T20:00:00Z"), now)).toBe(false);
  });
  it("does not duplicate pinned leads and excludes closed leads from active reminders", () => {
    const records = [
      lead("early", "2030-05-06T20:00:00Z"), lead("later", "2030-05-07T08:00:00Z"),
      lead("yesterday", "2030-05-06T10:00:00Z"), lead("won", "2030-05-07T08:00:00Z", "won"),
    ];
    const grouped = groupLeads(records, "", "all", now);
    expect(grouped.today.map((item) => item.id)).toEqual(["early", "later"]);
    expect(grouped.others.map((item) => item.id)).toEqual(["yesterday", "won"]);
    expect(new Set([...grouped.today, ...grouped.others].map((item) => item.id)).size).toBe(4);
    expect(isOverdue(records[3], new Date("2030-06-01T00:00:00Z"))).toBe(false);
  });
  it("applies search and status to both sections", () => {
    const records = [lead("Sarah", "2030-05-07T08:00:00Z", "qualified"), lead("Sam", null), lead("Bill", null)];
    expect(groupLeads(records, " SA ", "qualified", now).today.map((item) => item.name)).toEqual(["Sarah"]);
    expect(groupLeads(records, "SA", "new", now).others.map((item) => item.name)).toEqual(["Sam"]);
    expect(groupLeads(records, "missing", "all", now).count).toBe(0);
  });
  it("converts a local form input to UTC without silently accepting invalid values", () => {
    expect(toUtcFollowUp("2030-05-07", "14:00")).toBe("2030-05-07T08:30:00.000Z");
    expect(() => toUtcFollowUp("", "14:00")).toThrow("valid follow-up");
    expect(() => toUtcFollowUp("2030-02-30", "14:00")).toThrow("valid follow-up");
  });
});
