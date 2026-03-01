import { DashboardProvider } from "@/components/DashboardContext";
import EventsList from "@/components/EventsList";
import MemberDetailModal from "@/components/MemberDetailModal";
import NotificationManager from "@/components/NotificationManager";
import { createClient } from "@/utils/supabase/server";
import { CalendarDays } from "lucide-react";
import { cookies } from "next/headers";

export const metadata = {
  title: "Sự kiện gia phả",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Gia Phả OS",
  },
};

export default async function EventsPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  const { data: persons } = await supabase
    .from("persons")
    .select(
      "id, full_name, birth_year, birth_month, birth_day, death_year, death_month, death_day, is_deceased",
    );

  const { data: customEvents } = await supabase
    .from("custom_events")
    .select("*");

  return (
    <DashboardProvider>
      <div className="flex-1 w-full relative flex flex-col pb-12">
        <div className="w-full relative z-20 py-6 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-serif font-bold text-stone-800">
            Sự kiện gia phả
          </h1>
          <p className="text-stone-500 mt-1 text-sm">
            Sinh nhật (dương lịch), ngày giỗ (âm lịch) và các sự kiện khác
          </p>
        </div>

        <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1 space-y-8">
          <NotificationManager />
          
          <div className="bg-white/50 rounded-3xl p-6 border border-stone-200/50 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-blue-100 text-blue-600">
                  <CalendarDays className="size-5" />
                </div>
                <div>
                  <h3 className="font-serif font-bold text-stone-800">Đăng ký Lịch iPhone</h3>
                  <p className="text-xs text-stone-500">Tự động nhắc nhở trên ứng dụng Lịch</p>
                </div>
              </div>
              <a
                href="/api/events/calendar"
                className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-500 text-white hover:bg-blue-600 shadow-sm transition-all"
              >
                Tải file .ics
              </a>
            </div>
            <p className="text-[11px] text-stone-500 italic">
              * Mẹo: Bạn có thể sao chép liên kết này và dán vào phần &quot;Đăng ký lịch&quot; (Add Subscription Calendar) trong cài đặt Lịch của iPhone để tự động cập nhật sự kiện mới.
            </p>
          </div>

          <EventsList persons={persons ?? []} initialCustomEvents={customEvents ?? []} />
        </main>
      </div>

      {/* Modal for member details when clicking an event card */}
      <MemberDetailModal />
    </DashboardProvider>
  );
}
