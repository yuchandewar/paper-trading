"use client";

import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  return (
    <button
      onClick={() => signOut({ callbackUrl: "/login" })}
      className="p-2 text-gray-400 hover:text-gray-500 rounded-full hover:bg-gray-100"
      title="Logout"
    >
      <LogOut className="h-5 w-5" />
    </button>
  );
}
