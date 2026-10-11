"use client";

import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn, getInitials } from "@/lib/utils";

export function Avatar({
  className,
  name,
  src,
}: {
  className?: string;
  name?: string | null;
  src?: string | null;
}) {
  return (
    <AvatarPrimitive.Root
      className={cn(
        "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full bg-muted",
        className,
      )}
    >
      {src ? <AvatarPrimitive.Image src={src} alt={name ?? ""} className="h-full w-full object-cover" /> : null}
      <AvatarPrimitive.Fallback className="flex h-full w-full items-center justify-center text-xs font-medium">
        {getInitials(name)}
      </AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
