"use client";

import { format } from "date-fns";
import {
  ArrowRight,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  ListFilter,
  Loader2,
  LogOut,
  Plus,
  Search,
  Users,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useLeads } from "@/hooks/use-leads";
import { ApiError } from "@/lib/api";
import { groupLeads, isActive, isOverdue, isTodayFollowUp } from "@/lib/dates";
import { STATUSES, STATUS_LABELS } from "@/lib/types";
import { cn, initials } from "@/lib/utils";
import { AddLeadDialog } from "./add-lead-dialog";
import { Brand } from "./brand";
import { LeadCard } from "./lead-card";
import { LeadDialog } from "./lead-dialog";
import { useAuth } from "./providers";
import { Button } from "./ui/button";

export function Dashboard() {
  const { name, demo, signOut } = useAuth();
  const { data: leads = [], isPending, error, retry } = useLeads();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [adding, setAdding] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());
  const [accountMenu, setAccountMenu] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  const groups = groupLeads(leads, search, status, now);
  const activeCount = leads.filter(isActive).length;
  const todayCount = leads.filter((lead) => isTodayFollowUp(lead, now)).length;
  const overdueCount = leads.filter((lead) => isOverdue(lead, now)).length;
  const filtered = Boolean(search.trim()) || status !== "all";

  async function logout() {
    try {
      await signOut();
    } catch {
      toast.error("Unable to sign out. Please try again.");
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="header-inner">
          <Brand />
          <div className="header-actions">
            <Button onClick={() => setAdding(true)}>
              <Plus size={17} />
              <span>Add new lead</span>
            </Button>
            <div className="account-control">
              <button
                type="button"
                className="account-button"
                aria-label="Account menu"
                aria-expanded={accountMenu}
                onClick={() => setAccountMenu(!accountMenu)}
              >
                <span className="account-avatar">{initials(name)}</span>
                <ChevronDown size={13} />
              </button>
              {accountMenu && (
                <>
                  <button
                    className="menu-dismiss"
                    aria-label="Close account menu"
                    onClick={() => setAccountMenu(false)}
                  />
                  <div className="account-menu">
                    <strong>{name}</strong>
                    <span>
                      {demo
                        ? "Local preview workspace"
                        : "Your private workspace"}
                    </span>
                    <button type="button" onClick={logout}>
                      <LogOut size={14} />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>
      <main className="dashboard-main">
        {demo && (
          <div className="demo-banner">
            <span>
              <span className="demo-dot" />
              Local preview
            </span>
            <p>Sample workspace · changes are saved to your local database</p>
          </div>
        )}
        <div className="page-heading">
          <div>
            <div className="eyebrow">YOUR WORKSPACE</div>
            <h1>
              Your leads, in focus<span>.</span>
            </h1>
            <p>A clear view of your relationships and what comes next.</p>
          </div>
          <span className="today-date">
            <CalendarDays size={15} />
            {format(now, "EEE, MMM d")}
          </span>
        </div>
        <div className="pipeline-summary" aria-label="Pipeline summary">
          <div>
            <span className="summary-icon summary-blue">
              <Users size={18} />
            </span>
            <div>
              <span>Active leads</span>
              <strong>
                {isPending ? "—" : activeCount}
                <small>in your pipeline</small>
              </strong>
            </div>
          </div>
          <div>
            <span className="summary-icon summary-violet">
              <CalendarDays size={18} />
            </span>
            <div>
              <span>Due today</span>
              <strong>
                {isPending ? "—" : todayCount}
                <small>
                  {todayCount === 1
                    ? "conversation to catch up on"
                    : "conversations to catch up on"}
                </small>
              </strong>
            </div>
          </div>
          <div>
            <span
              className={cn(
                "summary-icon",
                overdueCount ? "summary-red" : "summary-green",
              )}
            >
              {overdueCount ? (
                <CircleAlert size={18} />
              ) : (
                <CheckCircle2 size={18} />
              )}
            </span>
            <div>
              <span>Overdue follow-ups</span>
              <strong>
                {isPending ? "—" : overdueCount}
                <small>
                  {overdueCount
                    ? "ready for your attention"
                    : "you’re all caught up"}
                </small>
              </strong>
            </div>
          </div>
        </div>
        <div className="list-controls">
          <div className="search-box">
            <Search size={16} />
            <input
              aria-label="Search leads by name"
              placeholder="Search leads by name…"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            {search && (
              <button
                type="button"
                aria-label="Clear search"
                onClick={() => setSearch("")}
              >
                <X size={14} />
              </button>
            )}
          </div>
          <span className="lead-count">
            {leads.length} {leads.length === 1 ? "lead" : "leads"} in your
            workspace
          </span>
        </div>
        <div className="status-filters" aria-label="Filter leads by status">
          <span className="filter-label">
            <ListFilter size={14} />
            Status
          </span>
          {["all", ...STATUSES].map((value) => (
            <button
              type="button"
              key={value}
              aria-pressed={status === value}
              className={cn(
                "filter-chip",
                status === value && "filter-chip-active",
              )}
              onClick={() => setStatus(value)}
            >
              {value === "all"
                ? "All leads"
                : STATUS_LABELS[value as keyof typeof STATUS_LABELS]}
            </button>
          ))}
        </div>
        {error ? (
          <div className="workspace-error" role="alert">
            <CircleAlert size={20} />
            <div>
              <strong>We couldn’t load your workspace</strong>
              <p>{error.message}</p>
            </div>
            <Button
              variant="secondary"
              onClick={() =>
                error instanceof ApiError && error.status === 401
                  ? logout()
                  : retry()
              }
            >
              {error instanceof ApiError && error.status === 401
                ? "Sign in again"
                : "Try again"}
            </Button>
          </div>
        ) : isPending ? (
          <div className="loading-workspace" aria-live="polite">
            <Loader2 size={21} className="spin" />
            <p>Connecting to your workspace…</p>
            <span>This may take a moment.</span>
            {[1, 2, 3].map((item) => (
              <div key={item} className="skeleton-card" />
            ))}
          </div>
        ) : (
          <>
            {groups.today.length > 0 && (
              <section
                className="lead-section today-section"
                aria-labelledby="today-title"
              >
                <div className="section-heading">
                  <h2 id="today-title">
                    <span className="section-icon">
                      <Bell size={14} />
                    </span>
                    Today’s follow-ups
                    <span className="section-count blue-count">
                      {groups.today.length}
                    </span>
                  </h2>
                  <span className="section-hint">A good day to reconnect</span>
                </div>
                <div className="lead-list">
                  {groups.today.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      pinned
                      now={now}
                      onOpen={() => setSelected(lead.id)}
                    />
                  ))}
                </div>
              </section>
            )}
            {groups.others.length > 0 && (
              <section className="lead-section" aria-labelledby="all-title">
                <div className="section-heading">
                  <h2 id="all-title">
                    {filtered ? "Matching leads" : "All leads"}
                    <span className="section-count">
                      {groups.others.length}
                    </span>
                  </h2>
                  <span className="section-hint">
                    {overdueCount && !filtered
                      ? "Overdue follow-ups shown first"
                      : "Click a lead to see its story"}
                  </span>
                </div>
                <div className="lead-list">
                  {groups.others.map((lead) => (
                    <LeadCard
                      key={lead.id}
                      lead={lead}
                      now={now}
                      onOpen={() => setSelected(lead.id)}
                    />
                  ))}
                </div>
              </section>
            )}
            {groups.count === 0 && (
              <div className="empty-state">
                <span>
                  <Search size={26} />
                </span>
                <h2>
                  {filtered
                    ? "No leads found"
                    : "Every relationship starts somewhere"}
                </h2>
                <p>
                  {filtered
                    ? "Try a different name or status to find who you’re looking for."
                    : "Add your first lead and keep the next conversation in sight."}
                </p>
                <Button
                  variant="secondary"
                  onClick={() =>
                    filtered
                      ? (setSearch(""), setStatus("all"))
                      : setAdding(true)
                  }
                >
                  {filtered ? "Clear filters" : "Add your first lead"}
                  <ArrowRight size={15} />
                </Button>
              </div>
            )}
            {groups.count > 0 && (
              <p className="list-footer">
                {filtered
                  ? `${groups.count} matching ${groups.count === 1 ? "lead" : "leads"}`
                  : "You’re seeing your complete pipeline"}
                <span>·</span>One conversation at a time.
              </p>
            )}
          </>
        )}
      </main>
      <footer className="app-footer">
        <Brand />
        <span>Thoughtful follow-ups. Stronger relationships.</span>
      </footer>
      <AddLeadDialog open={adding} onOpenChange={setAdding} />
      {selected && (
        <LeadDialog
          key={selected}
          id={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}
