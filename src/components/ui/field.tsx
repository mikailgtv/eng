import { forwardRef } from "react";
import { cn } from "@/lib/utils";

/* Form primitives: Label, Input, Select, Textarea, FieldError, FormField.
   Every control is label-associated (accessibility) and shows inline
   validation messages coming from the shared zod schemas. */

export function Label({ htmlFor, children, hint }: { htmlFor?: string; children: React.ReactNode; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-1.5 block text-[13px] font-medium text-foreground">
      {children}
      {hint && <span className="ml-1 font-normal text-muted">{hint}</span>}
    </label>
  );
}

const controlClasses = (error?: boolean) =>
  cn(
    "w-full rounded-lg border bg-surface px-3 py-2 text-sm text-foreground shadow-sm transition-colors",
    "placeholder:text-muted/70",
    "focus:outline-none focus:ring-2 focus:ring-primary/30",
    error ? "border-danger/60 focus:border-danger focus:ring-danger/20" : "border-border focus:border-primary"
  );

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, error, ...props }, ref) {
  return <input ref={ref} className={cn(controlClasses(error), className)} aria-invalid={error || undefined} {...props} />;
});

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  error?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ className, error, children, ...props }, ref) {
  return (
    <select ref={ref} className={cn(controlClasses(error), "appearance-none bg-[position:right_0.6rem_center] pr-9", className)}
      style={{
        backgroundImage:
          "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23718191' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundRepeat: "no-repeat",
      }}
      aria-invalid={error || undefined}
      {...props}
    >
      {children}
    </select>
  );
});

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ className, error, ...props }, ref) {
  return <textarea ref={ref} rows={3} className={cn(controlClasses(error), "resize-y")} aria-invalid={error || undefined} {...props} />;
});

export function FieldError({ id, messages }: { id?: string; messages?: string[] }) {
  if (!messages || messages.length === 0) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-[13px] text-danger">
      {messages[0]}
    </p>
  );
}

interface FormFieldProps {
  label: string;
  htmlFor: string;
  error?: string[];
  hint?: string;
  optional?: boolean;
  children: React.ReactNode;
}

/** Label + control + inline error, correctly wired with aria-describedby. */
export function FormField({ label, htmlFor, error, hint, optional, children }: FormFieldProps) {
  return (
    <div>
      <Label htmlFor={htmlFor} hint={hint}>
        {label}
        {optional && <span className="ml-1 font-normal text-muted">(optional)</span>}
      </Label>
      {children}
      <FieldError id={`${htmlFor}-error`} messages={error} />
    </div>
  );
}

/** One-line summary for general (form-level) errors. */
export function FormError({ message }: { message?: string | null }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-lg border border-danger/30 bg-danger-subtle px-3 py-2 text-[13px] text-danger">
      {message}
    </div>
  );
}
