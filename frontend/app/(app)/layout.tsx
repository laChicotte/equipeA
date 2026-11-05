"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useStore } from "@/lib/store";
import { AppShell } from "@/components/shell";
import { LogoMark } from "@/components/ui";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { ready, me } = useStore();
  const router = useRouter();

  useEffect(() => {
    if (ready && !me) router.replace("/connexion");
  }, [ready, me, router]);

  if (!ready || !me) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <LogoMark className="h-12 w-12 animate-pulse" pageColor="#202B3C" />
      </div>
    );
  }

  return <AppShell>{children}</AppShell>;
}
