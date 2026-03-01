import MemberForm from "@/components/MemberForm";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function NewMemberPage() {
  const isAdmin = true;

  return (
    <div className="flex-1 w-full relative flex flex-col pb-8">
      {/* Decorative background blurs */}
      {/* <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-amber-100/40 rounded-full blur-[100px] pointer-events-none" /> */}
      {/* <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-stone-200/40 rounded-full blur-[100px] pointer-events-none" /> */}

      <div className="w-full relative z-20 py-4 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-serif font-bold text-stone-800">
          Thêm Thành Viên Mới
        </h1>
        <a
          href="/dashboard"
          className="px-4 py-2 bg-stone-100/80 text-stone-700 rounded-lg hover:bg-stone-200 hover:text-stone-900 font-medium text-sm transition-all shadow-sm"
        >
          Hủy
        </a>
      </div>

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 relative z-10 w-full flex-1">
        <MemberForm isAdmin={isAdmin} />
      </main>
    </div>
  );
}
