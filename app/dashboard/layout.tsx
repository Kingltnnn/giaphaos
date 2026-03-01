import config from "@/app/config";
import DashboardHeader from "@/components/DashboardHeader";
import Footer from "@/components/Footer";
import React from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAdmin = true;
  const userEmail = "admin@example.com";

  return (
    <div className="min-h-screen bg-stone-50 text-stone-900 flex flex-col font-sans">
      <DashboardHeader isAdmin={isAdmin} userEmail={userEmail} />
      {children}
      <Footer
        className="mt-auto bg-white border-t border-stone-200"
        showDisclaimer={true}
      />
    </div>
  );
}
