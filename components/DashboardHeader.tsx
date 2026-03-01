import config from "@/app/config";
import HeaderMenu from "@/components/HeaderMenu";
import Link from "next/link";
import React from "react";

interface DashboardHeaderProps {
  isAdmin: boolean;
  userEmail?: string;
  children?: React.ReactNode;
}

export default function DashboardHeader({
  isAdmin,
  userEmail,
  children,
}: DashboardHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/80 border-b border-stone-200 shadow-sm transition-all duration-200 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between relative">
        <div className="flex items-center gap-4">
          {/* Left side empty or for back button if needed */}
        </div>
        
        <div className="absolute left-1/2 -translate-x-1/2">
          <Link href="/dashboard" className="group flex items-center gap-2">
            <h1 className="text-base font-serif font-bold text-stone-800 group-hover:text-amber-700 transition-colors">
              {config.siteName}
            </h1>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          {children}
          <HeaderMenu isAdmin={isAdmin} userEmail={userEmail} />
        </div>
      </div>
    </header>
  );
}
