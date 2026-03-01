"use client";

import { computeEventsForYear, FamilyEvent, CustomEvent } from "@/utils/eventHelpers";
import { createClient } from "@/utils/supabase/client";
import { AnimatePresence, motion } from "framer-motion";
import { Cake, CalendarDays, Clock, Flower, Plus, Trash2, X } from "lucide-react";
import { useMemo, useState, useEffect, useRef } from "react";
import { useDashboard } from "./DashboardContext";

interface EventsListProps {
  persons: {
    id: string;
    full_name: string;
    birth_year: number | null;
    birth_month: number | null;
    birth_day: number | null;
    death_year: number | null;
    death_month: number | null;
    death_day: number | null;
    is_deceased: boolean;
  }[];
  initialCustomEvents: CustomEvent[];
}

function daysUntilLabel(days: number): string {
  if (days === 0) return "Hôm nay";
  if (days === 1) return "Ngày mai";
  if (days < 0) return "Đã qua";
  if (days <= 30) return `${days} ngày nữa`;
  if (days <= 60) return `${Math.ceil(days / 7)} tuần nữa`;
  return `${Math.ceil(days / 30)} tháng nữa`;
}

function EventCard({ event, index, onDelete }: { event: FamilyEvent; index: number; onDelete?: (id: string) => void }) {
  const isBirthday = event.type === "birthday";
  const isCustom = event.type === "custom";
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const daysUntil = Math.round((event.occurrence.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const isToday = daysUntil === 0;
  const isSoon = daysUntil > 0 && daysUntil <= 7;
  const isPast = daysUntil < 0;

  const { setMemberModalId } = useDashboard();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      className={`w-full text-left flex items-center gap-4 p-4 rounded-2xl border transition-all hover:shadow-md group ${
        isToday
          ? "bg-amber-50 border-amber-300 shadow-sm"
          : isBirthday
            ? "bg-white/80 border-stone-200/60 hover:border-blue-200"
            : isCustom
              ? "bg-white/80 border-stone-200/60 hover:border-emerald-200"
              : "bg-white/80 border-stone-200/60 hover:border-rose-200"
      } ${isPast ? "opacity-60" : ""}`}
    >
      {/* Icon */}
      <div
        className={`shrink-0 size-11 flex items-center justify-center rounded-xl ${
          isToday
            ? "bg-amber-100 text-amber-600"
            : isBirthday
              ? "bg-blue-50 text-blue-500"
              : isCustom
                ? "bg-emerald-50 text-emerald-500"
                : "bg-rose-50 text-rose-500"
        }`}
      >
        {isBirthday ? (
          <Cake className="size-5" />
        ) : isCustom ? (
          <CalendarDays className="size-5" />
        ) : (
          <Flower className="size-5" />
        )}
      </div>

      {/* Info */}
      <div 
        className={`flex-1 min-w-0 ${!isCustom && event.personId ? "cursor-pointer" : ""}`}
        onClick={() => {
          if (!isCustom && event.personId) {
            setMemberModalId(event.personId);
          }
        }}
      >
        <p className={`font-semibold text-stone-800 truncate transition-colors ${!isCustom && event.personId ? "group-hover:text-amber-700" : ""}`}>
          {event.personName}
        </p>
        <p className="text-sm text-stone-500 flex items-center gap-1.5 mt-0.5">
          <CalendarDays className="size-3.5 shrink-0" />
          {isBirthday ? "Sinh nhật" : isCustom ? "Sự kiện" : "Ngày giỗ"} —{" "}
          <span className="font-medium text-stone-600">
            {event.eventDateLabel}
          </span>
          {event.originYear && (
            <span className="text-stone-400">({event.originYear})</span>
          )}
        </p>
      </div>

      {/* Actions / Days badge */}
      <div className="shrink-0 flex flex-col items-end gap-2">
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold ${
            isToday
              ? "bg-amber-400 text-white"
              : isSoon
                ? "bg-red-100 text-red-600"
                : isPast
                  ? "bg-stone-200 text-stone-500"
                  : "bg-stone-100 text-stone-500"
          }`}
        >
          <Clock className="size-3" />
          {daysUntilLabel(daysUntil)}
        </div>
        {isCustom && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(event.id);
            }}
            className="text-stone-400 hover:text-rose-500 transition-colors p-1"
            title="Xóa sự kiện"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
}

export default function EventsList({ persons, initialCustomEvents }: EventsListProps) {
  const [customEvents, setCustomEvents] = useState<CustomEvent[]>(initialCustomEvents);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState("");
  const [newEventDay, setNewEventDay] = useState<number | "">("");
  const [newEventMonth, setNewEventMonth] = useState<number | "">(new Date().getMonth() + 1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const supabase = createClient();
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll to current month on mount
  useEffect(() => {
    if (scrollContainerRef.current) {
      const activeBtn = scrollContainerRef.current.querySelector(`[data-month="${selectedMonth}"]`);
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
      }
    }
  }, []);

  const allEvents = useMemo(() => computeEventsForYear(persons, customEvents, currentYear), [persons, customEvents, currentYear]);

  const filteredEvents = useMemo(() => {
    return allEvents.filter((e) => e.occurrence.getMonth() + 1 === selectedMonth);
  }, [allEvents, selectedMonth]);

  const handleDeleteCustomEvent = async (id: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa sự kiện này?")) return;
    try {
      const { error } = await supabase.from("custom_events").delete().eq("id", id);
      if (error) throw error;
      setCustomEvents((prev) => prev.filter((e) => e.id !== id));
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("Đã xảy ra lỗi khi xóa sự kiện.");
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventTitle || !newEventDay || !newEventMonth) return;
    
    setIsSubmitting(true);
    try {
      const newEvent = {
        title: newEventTitle,
        event_day: Number(newEventDay),
        event_month: Number(newEventMonth),
      };
      
      const { data, error } = await supabase
        .from("custom_events")
        .insert(newEvent)
        .select()
        .single();
        
      if (error) throw error;
      
      setCustomEvents((prev) => [...prev, data]);
      setIsAddingEvent(false);
      setNewEventTitle("");
      setNewEventDay("");
    } catch (error) {
      console.error("Error adding event:", error);
      alert("Đã xảy ra lỗi khi thêm sự kiện.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 relative pb-20">
      {/* Month Selector */}
      <div className="relative -mx-4 sm:mx-0">
        <div 
          ref={scrollContainerRef}
          className="flex overflow-x-auto hide-scrollbar gap-2 px-4 sm:px-0 py-2 snap-x"
        >
          {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
            <button
              key={month}
              data-month={month}
              onClick={() => setSelectedMonth(month)}
              className={`shrink-0 snap-center px-5 py-2.5 rounded-2xl text-sm font-semibold transition-all whitespace-nowrap ${
                selectedMonth === month
                  ? "bg-stone-800 text-white shadow-md scale-105"
                  : "bg-white text-stone-500 border border-stone-200 hover:border-stone-300 hover:bg-stone-50"
              }`}
            >
              Tháng {month}
            </button>
          ))}
        </div>
        {/* Gradient fades for scroll indication */}
        <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-stone-50 to-transparent pointer-events-none sm:hidden" />
        <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-stone-50 to-transparent pointer-events-none sm:hidden" />
      </div>

      {/* Event list */}
      <div className="bg-white/50 rounded-3xl p-2 sm:p-4 border border-stone-200/50 min-h-[400px]">
        <div className="flex justify-between items-center mb-4 px-2">
          <h2 className="text-lg font-serif font-bold text-stone-800">
            Sự kiện tháng {selectedMonth}
          </h2>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setCurrentYear(y => y - 1)}
              className="p-1 text-stone-400 hover:text-stone-800 transition-colors"
            >
              &larr;
            </button>
            <span className="text-sm font-medium text-stone-600 w-12 text-center">{currentYear}</span>
            <button 
              onClick={() => setCurrentYear(y => y + 1)}
              className="p-1 text-stone-400 hover:text-stone-800 transition-colors"
            >
              &rarr;
            </button>
          </div>
        </div>

        {filteredEvents.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <CalendarDays className="size-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Không có sự kiện nào trong tháng này</p>
            <p className="text-sm mt-1">
              Hãy thêm sự kiện mới bằng nút + bên dưới
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredEvents.map((event, i) => (
              <EventCard
                key={`${event.id}-${event.type}`}
                event={event}
                index={i}
                onDelete={handleDeleteCustomEvent}
              />
            ))}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <button
        onClick={() => setIsAddingEvent(true)}
        className="fixed bottom-6 right-6 sm:bottom-10 sm:right-10 size-14 bg-amber-500 hover:bg-amber-600 text-white rounded-full shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center z-40"
      >
        <Plus className="size-6" />
      </button>

      {/* Add Event Modal */}
      <AnimatePresence>
        {isAddingEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/60 p-4 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-3xl overflow-hidden w-full max-w-md shadow-2xl"
            >
              <div className="p-5 border-b border-stone-100 flex justify-between items-center">
                <h3 className="font-serif font-bold text-xl text-stone-800">Thêm sự kiện</h3>
                <button
                  onClick={() => setIsAddingEvent(false)}
                  className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>
              <form onSubmit={handleAddEvent} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                    Tên sự kiện <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newEventTitle}
                    onChange={(e) => setNewEventTitle(e.target.value)}
                    placeholder="Ví dụ: Lễ mừng thọ ông nội"
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                      Ngày <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="31"
                      value={newEventDay}
                      onChange={(e) => setNewEventDay(e.target.value ? Number(e.target.value) : "")}
                      placeholder="Ngày"
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-stone-700 mb-1.5">
                      Tháng <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="12"
                      value={newEventMonth}
                      onChange={(e) => setNewEventMonth(e.target.value ? Number(e.target.value) : "")}
                      placeholder="Tháng"
                      className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all"
                    />
                  </div>
                </div>
                <p className="text-xs text-stone-500 italic">
                  * Sự kiện sẽ được lặp lại hàng năm vào ngày dương lịch này.
                </p>
                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddingEvent(false)}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold text-stone-600 hover:bg-stone-100 transition-colors"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? "Đang lưu..." : "Lưu sự kiện"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
