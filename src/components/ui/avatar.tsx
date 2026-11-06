import { cn, fullName, initials } from "@/lib/utils";

interface AvatarProps {
  person: { firstName: string; lastName: string };
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = {
  sm: "h-7 w-7 text-[11px]",
  md: "h-9 w-9 text-xs",
  lg: "h-12 w-12 text-sm",
};

/** Initials avatar — deterministic color by name, no external images. */
export function Avatar({ person, size = "md", className }: AvatarProps) {
  const palette = [
    "bg-teal-100 text-teal-800",
    "bg-sky-100 text-sky-800",
    "bg-indigo-100 text-indigo-800",
    "bg-amber-100 text-amber-800",
    "bg-rose-100 text-rose-800",
    "bg-emerald-100 text-emerald-800",
  ];
  const idx = (fullName(person).charCodeAt(0) + person.lastName.charCodeAt(0)) % palette.length;
  return (
    <span
      aria-hidden
      className={cn("inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold", palette[idx], SIZES[size], className)}
    >
      {initials(person)}
    </span>
  );
}
