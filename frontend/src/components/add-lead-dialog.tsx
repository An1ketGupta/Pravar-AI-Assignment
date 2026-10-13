"use client";

import { Loader2, Plus } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { useLeadMutations } from "@/hooks/use-leads";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

export function AddLeadDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (value: boolean) => void;
}) {
  const { create } = useLeadMutations();
  const [error, setError] = useState("");
  const nameInput = useRef<HTMLInputElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name")).trim();
    if (!name) {
      setError("Please enter a full name.");
      return;
    }
    setError("");
    try {
      await create.mutateAsync({
        name,
        company: String(data.get("company")).trim(),
        phone: String(data.get("phone")).trim(),
      });
      toast.success(`${name} added to your leads.`);
      onOpenChange(false);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to add this lead.",
      );
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!create.isPending) {
          setError("");
          onOpenChange(value);
        }
      }}
    >
      <DialogContent
        className="add-lead-dialog"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          nameInput.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>Add new lead</DialogTitle>
          <DialogDescription>
            A new relationship starts with a name.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit}>
          <div className="dialog-form-body">
            <label htmlFor="lead-name">
              Full name <span className="required-mark">*</span>
            </label>
            <input
              ref={nameInput}
              id="lead-name"
              name="name"
              placeholder="e.g., Sarah Connor"
              autoComplete="off"
              maxLength={120}
              required
              disabled={create.isPending}
            />
            <label htmlFor="lead-company">
              Company <span className="optional-mark">Optional</span>
            </label>
            <input
              id="lead-company"
              name="company"
              placeholder="e.g., Acme Corp"
              autoComplete="off"
              maxLength={160}
              disabled={create.isPending}
            />
            <label htmlFor="lead-phone">
              Phone <span className="optional-mark">Optional</span>
            </label>
            <input
              id="lead-phone"
              name="phone"
              type="tel"
              placeholder="e.g., +1 555 0199"
              autoComplete="off"
              maxLength={40}
              disabled={create.isPending}
            />
            <p className="new-status-note">
              <span className="status-dot" />
              Starts with a New status. Update it anytime.
            </p>
            {error && (
              <p className="form-error" role="alert">
                {error}
              </p>
            )}
          </div>
          <div className="dialog-footer">
            <DialogClose asChild>
              <Button variant="ghost" disabled={create.isPending}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? (
                <Loader2 size={16} className="spin" />
              ) : (
                <Plus size={16} />
              )}
              Save lead
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
