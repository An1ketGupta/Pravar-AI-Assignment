import { ArrowUpRight, Bell, Clock3 } from "lucide-react";
import { followUpLabel, isActive, isOverdue, timeAgo } from "@/lib/dates";
import type { Lead } from "@/lib/types";
import { cn, initials } from "@/lib/utils";
import { StatusBadge } from "./status-badge";

export function LeadCard({
  lead,
  pinned,
  now,
  onOpen,
}: {
  lead: Lead;
  pinned?: boolean;
  now: Date;
  onOpen: () => void;
}) {
  const overdue = isOverdue(lead, now);
  const terminal = !isActive(lead);
  return (
    <button
      id={`lead-${lead.id}`}
      type="button"
      className={cn(
        "lead-card",
        pinned && "lead-card-pinned",
        overdue && "lead-card-overdue",
        terminal && "lead-card-closed",
      )}
      onClick={onOpen}
      aria-label={`Open ${lead.name}`}
    >
      <div className={cn("lead-avatar", `avatar-${lead.status}`)}>
        {initials(lead.name)}
      </div>
      <div className="lead-card-main">
        <div className="lead-title-line">
          <h3>{lead.name}</h3>
          {lead.company && <span className="lead-company">{lead.company}</span>}
        </div>
        <p className="lead-last-note">
          <span>Last note:</span>{" "}
          {lead.last_note || "No discussions yet. Start the conversation."}
        </p>
        <div className="lead-meta">
          {lead.last_discussion_at && (
            <span className="lead-time">
              <Clock3 size={12} />
              <time dateTime={lead.last_discussion_at}>
                {timeAgo(lead.last_discussion_at)}
              </time>
            </span>
          )}
          {lead.follow_up_at && !terminal && (
            <span
              className={cn(
                "follow-up-chip",
                overdue ? "follow-up-overdue" : "follow-up-upcoming",
              )}
            >
              <Bell size={12} />
              {overdue ? "Overdue · " : "Follow-up · "}
              {followUpLabel(lead.follow_up_at, now)}
            </span>
          )}
        </div>
      </div>
      <div className="lead-card-end">
        <StatusBadge status={lead.status} />
        <ArrowUpRight size={17} className="lead-open-arrow" />
      </div>
    </button>
  );
}
