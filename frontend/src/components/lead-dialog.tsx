"use client";

import { format } from "date-fns";
import {
  Bell,
  CalendarDays,
  Check,
  Loader2,
  MessageSquare,
  Phone,
  Send,
} from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useLead, useLeadMutations } from "@/hooks/use-leads";
import {
  followUpLabel,
  isActive,
  isOverdue,
  timeAgo,
  toUtcFollowUp,
} from "@/lib/dates";
import { STATUS_LABELS, STATUSES, type LeadStatus } from "@/lib/types";
import { cn, initials } from "@/lib/utils";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

export function LeadDialog({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const { data: lead, isPending, error: loadError, refetch } = useLead(id);
  const { update, discuss } = useLeadMutations();
  const [content, setContent] = useState("");
  const [reminder, setReminder] = useState(false);
  const [date, setDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [time, setTime] = useState("14:00");
  const [error, setError] = useState("");
  const busy = discuss.isPending || update.isPending;

  async function changeStatus(status: LeadStatus) {
    setError("");
    try {
      await update.mutateAsync({ id, status });
      toast.success(`Status updated to ${STATUS_LABELS[status]}.`);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to update status.",
      );
    }
  }

  async function completeReminder() {
    setError("");
    try {
      await update.mutateAsync({ id, follow_up_at: null });
      toast.success("Follow-up marked complete.");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to complete this follow-up.",
      );
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!content.trim()) {
      setError("Write a discussion note before saving.");
      return;
    }
    setError("");
    try {
      await discuss.mutateAsync({
        id,
        content: content.trim(),
        ...(reminder ? { follow_up_at: toUtcFollowUp(date, time) } : {}),
      });
      setContent("");
      setReminder(false);
      toast.success(
        reminder
          ? "Discussion saved and follow-up scheduled."
          : "Discussion saved.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to save this discussion.",
      );
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="timeline-dialog">
        <DialogHeader>
          <div className="timeline-heading">
            <span className="lead-avatar">
              {lead ? initials(lead.name) : <MessageSquare size={19} />}
            </span>
            <div>
              <DialogTitle>{lead?.name || "Lead timeline"}</DialogTitle>
              <DialogDescription>
                {lead?.company || "Your conversation history"}
              </DialogDescription>
              {lead?.phone && (
                <a
                  className="lead-phone"
                  href={`tel:${lead.phone.replace(/[^+\d]/g, "")}`}
                >
                  <Phone size={12} />
                  {lead.phone}
                </a>
              )}
            </div>
          </div>
        </DialogHeader>
        {isPending ? (
          <div className="dialog-loading">
            <Loader2 className="spin" size={23} />
            <p>Loading your conversations…</p>
          </div>
        ) : loadError ? (
          <div className="dialog-loading">
            <p role="alert">{loadError.message}</p>
            <Button variant="secondary" onClick={() => refetch()}>
              Try again
            </Button>
          </div>
        ) : (
          lead && (
            <>
              <div className="timeline-toolbar">
                <span>
                  <MessageSquare size={14} />
                  {
                    lead.discussions.filter((note) => !note.is_creation).length
                  }{" "}
                  discussions
                </span>
                <label htmlFor="lead-status">
                  Status
                  <select
                    id="lead-status"
                    aria-label="Status"
                    value={lead.status}
                    onChange={(event) =>
                      changeStatus(event.target.value as LeadStatus)
                    }
                    disabled={busy}
                  >
                    {STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {STATUS_LABELS[status]}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              {lead.follow_up_at && isActive(lead) && (
                <div
                  className={cn(
                    "current-reminder",
                    isOverdue(lead) && "current-reminder-overdue",
                  )}
                >
                  <span>
                    <Bell size={14} />
                    {isOverdue(lead) ? "Overdue · " : "Next follow-up · "}
                    {followUpLabel(lead.follow_up_at)}
                  </span>
                  <Button
                    variant="ghost"
                    size="small"
                    disabled={busy}
                    onClick={completeReminder}
                  >
                    <Check size={13} />
                    Mark complete
                  </Button>
                </div>
              )}
              <div className="timeline-history" aria-label="Discussion history">
                <ol>
                  {lead.discussions.map((note, index) => (
                    <li
                      key={note.id}
                      className={cn(
                        "timeline-entry",
                        index === 0 && "timeline-entry-latest",
                      )}
                    >
                      <span className="timeline-dot" />
                      <div className="timeline-date">
                        <time dateTime={note.created_at}>
                          {format(
                            new Date(note.created_at),
                            "MMM d, yyyy · h:mm a",
                          )}
                        </time>
                        <span>{timeAgo(note.created_at)}</span>
                      </div>
                      <div
                        className={cn(
                          "timeline-note",
                          note.is_creation && "timeline-creation",
                        )}
                      >
                        <p>{note.content}</p>
                        {note.follow_up_at && (
                          <span className="timeline-follow-up">
                            <CalendarDays size={12} />
                            Follow-up set for{" "}
                            {format(
                              new Date(note.follow_up_at),
                              "MMM d, h:mm a",
                            )}
                          </span>
                        )}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
              <form onSubmit={submit} className="discussion-form">
                <label htmlFor="discussion-content" className="composer-label">
                  Keep the conversation going
                </label>
                <textarea
                  id="discussion-content"
                  placeholder="What did you discuss? Capture the important details…"
                  value={content}
                  onChange={(event) => setContent(event.target.value)}
                  maxLength={5000}
                  required
                  disabled={busy}
                  rows={3}
                />
                <div className="composer-footer">
                  <div className="reminder-fields">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={reminder}
                        onChange={(event) => setReminder(event.target.checked)}
                        disabled={busy}
                      />
                      Set follow-up
                    </label>
                    {reminder && (
                      <div className="reminder-date-time">
                        <input
                          type="date"
                          aria-label="Follow-up date"
                          value={date}
                          onChange={(event) => setDate(event.target.value)}
                          required
                          disabled={busy}
                        />
                        <input
                          type="time"
                          aria-label="Follow-up time"
                          value={time}
                          onChange={(event) => setTime(event.target.value)}
                          required
                          disabled={busy}
                        />
                      </div>
                    )}
                  </div>
                  <Button
                    type="submit"
                    variant="dark"
                    disabled={busy || !content.trim()}
                  >
                    {discuss.isPending ? (
                      <Loader2 className="spin" size={15} />
                    ) : (
                      <Send size={14} />
                    )}
                    Save note
                  </Button>
                </div>
                {reminder && (
                  <p className="timezone-hint">
                    Times use your timezone:{" "}
                    {Intl.DateTimeFormat()
                      .resolvedOptions()
                      .timeZone.replace(/_/g, " ")}
                  </p>
                )}
                {error && (
                  <p className="form-error" role="alert">
                    {error}
                  </p>
                )}
              </form>
            </>
          )
        )}
      </DialogContent>
    </Dialog>
  );
}
