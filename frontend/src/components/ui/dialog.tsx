"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTitle = DialogPrimitive.Title;
export const DialogDescription = DialogPrimitive.Description;
export const DialogClose = DialogPrimitive.Close;

export function DialogContent({ children, className, ...props }: ComponentProps<typeof DialogPrimitive.Content>) {
  return <DialogPrimitive.Portal>
    <DialogPrimitive.Overlay className="dialog-overlay" />
    <DialogPrimitive.Content className={cn("dialog-content", className)} {...props}>
      {children}
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>;
}

export function DialogHeader({ children }: { children: ReactNode }) {
  return <div className="dialog-header">
    <div className="min-w-0 flex-1">{children}</div>
    <DialogPrimitive.Close className="button button-ghost button-icon shrink-0" aria-label="Close dialog"><X size={19} /></DialogPrimitive.Close>
  </div>;
}
