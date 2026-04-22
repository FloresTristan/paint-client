"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function checkAuth() {
      try {
        const data = await getCurrentUser();
        if (!mounted) return;

        if (data?.authenticated) {
          setAllowed(true);
        } else {
          router.replace("/login");
        }
      } catch {
        if (mounted) {
          router.replace("/login");
        }
      } finally {
        if (mounted) setChecking(false);
      }
    }

    checkAuth();

    return () => {
      mounted = false;
    };
  }, [router]);

  if (checking) {
    return <div className="p-6 w-full h-screen flex items-center justify-center">Checking session...</div>;
  }

  if (!allowed) return null;

  return <>{children}</>;
}