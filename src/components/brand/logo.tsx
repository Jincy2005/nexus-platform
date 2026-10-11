import { cn } from "@/lib/utils";

export function NexusMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("h-8 w-8", className)}
      aria-hidden="true"
    >
      <rect width="32" height="32" rx="9" className="fill-primary" />
      <circle cx="10" cy="11" r="2.2" className="fill-primary-foreground" />
      <circle cx="22" cy="10" r="2.2" className="fill-primary-foreground" />
      <circle cx="16" cy="21" r="2.4" className="fill-primary-foreground" />
      <path
        d="M11.8 12.4 20.4 11.2M12.1 12.8 14.8 19.2M21.2 12.1 17.4 19.1"
        className="stroke-primary-foreground"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function NexusLogo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", className)}>
      <NexusMark />
      <span>Nexus</span>
    </span>
  );
}
