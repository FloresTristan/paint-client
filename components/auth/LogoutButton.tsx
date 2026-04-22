"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { logoutUser } from "@/lib/auth";

type LogoutButtonProps = {
  className?: string;
  redirectTo?: string;
  disabled?: boolean;
};

export default function LogoutButton({
  className = "",
  redirectTo = "/login",
  disabled: externalDisabled = false,
}: LogoutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogout = async () => {
    try {
      setLoading(true);
      await logoutUser();

      // optional: refresh app state and redirect
      router.replace(redirectTo);
      router.refresh();
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleLogout}
      disabled={loading || externalDisabled}
      className={`disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      type="button"
    >
      {loading ? "Logging out..." : "Logout"}
    </button>
  );
}