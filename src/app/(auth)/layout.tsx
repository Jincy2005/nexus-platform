import Link from "next/link";
import { NexusLogo } from "@/components/brand/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8">
        <NexusLogo />
      </Link>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-sm">
        {children}
      </div>
    </div>
  );
}
