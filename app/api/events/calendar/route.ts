import { computeEventsForYear } from "@/utils/eventHelpers";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
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

  const currentYear = new Date().getFullYear();
  // Compute events for current and next year
  const events = [
    ...computeEventsForYear(persons ?? [], customEvents ?? [], currentYear),
    ...computeEventsForYear(persons ?? [], customEvents ?? [], currentYear + 1),
  ];

  let icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Gia Pha OS//Family Events//VI",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Sự kiện Gia Phả",
    "X-WR-TIMEZONE:Asia/Ho_Chi_Minh",
  ].join("\r\n") + "\r\n";

  events.forEach((event) => {
    const date = event.occurrence;
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const dateStr = `${year}${month}${day}`;

    const title = `${event.type === "birthday" ? "🎂 Sinh nhật" : event.type === "death_anniversary" ? "🕯️ Ngày giỗ" : "📅 Sự kiện"}: ${event.personName}`;
    
    icsContent += [
      "BEGIN:VEVENT",
      `UID:${event.id}-${year}@giapha-os`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
      `DTSTART;VALUE=DATE:${dateStr}`,
      `DTEND;VALUE=DATE:${dateStr}`,
      `SUMMARY:${title}`,
      `DESCRIPTION:Sự kiện từ ứng dụng Gia Phả OS. ${event.eventDateLabel}`,
      "TRANSP:TRANSPARENT",
      "END:VEVENT",
    ].join("\r\n") + "\r\n";
  });

  icsContent += "END:VCALENDAR";

  return new NextResponse(icsContent, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="family-events.ics"',
    },
  });
}
