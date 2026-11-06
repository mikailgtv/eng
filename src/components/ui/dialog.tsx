"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Render the close (X) button in the corner. */
  dismissible?: boolean;
}

/**
 * Accessible modal dialog: portal rendering, Escape to close, click on
 * backdrop to dismiss, focus moved into the panel, body scroll locked,
 * labelled via aria-labelledby / aria-describedby.
 */
export function Dialog({ open, onClose, title, description, children, footer, dismissible = true }: DialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dismissible) onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, dismissible]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div
        className="fixed inset-0 bg-slate-900/45"
        aria-hidden
        onClick={dismissible ? onClose : undefined}
      />
      <div className="flex min-h-full items-end justify-center p-4 sm:items-center">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby="dialog-title"
          aria-describedby={description ? "dialog-description" : undefined}
          tabIndex={-1}
          className={cn(
            "relative w-full max-w-lg rounded-xl border border-border bg-surface p-5 shadow-panel",
            "max-h-[90vh] overflow-y-auto"
          )}
        >
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <h2 id="dialog-title" className="text-base font-semibold text-foreground">
                {title}
              </h2>
              {description && (
                <p id="dialog-description" className="mt-0.5 text-[13px] text-muted">
                  {description}
                </p>
              )}
            </div>
            {dismissible && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="rounded-md p-1 text-muted transition-colors hover:bg-muted/10 hover:text-foreground"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            )}
          </div>
          {children}
          {footer && <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{footer}</div>}
        </div>
      </div>
    </div>,
    document.body
  );
}

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  busy?: boolean;
}

/** Confirmation for destructive / significant actions (deactivate, role change, removal). */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  busy = false,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={busy ? () => undefined : onClose}
      title={title}
      dismissible={!busy}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex h-10 items-center justify-center rounded-lg border border-border bg-surface px-4 text-sm font-medium hover:bg-muted/10 disabled:opacity-55"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={cn(
              "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium text-white shadow-sm transition-colors disabled:pointer-events-none disabled:opacity-60",
              danger ? "bg-danger hover:bg-danger/90" : "bg-primary hover:bg-primary-hover"
            )}
          >
            {busy && (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
                <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
            )}
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="text-sm leading-6 text-muted">{message}</div>
    </Dialog>
  );
}
