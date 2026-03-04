import { computeEventsForYear } from "@/utils/eventHelpers";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import webpush from "web-push";
import { Solar } from "lunar-javascript";

/**
 * CRON JOB: Gửi thông báo đẩy cho các sự kiện diễn ra trong vòng 7 ngày tới.
 * Có thể được gọi bởi Vercel Cron hoặc một dịch vụ bên thứ ba hàng ngày.
 */
export async function GET(request: Request) {
  // Xác thực đơn giản bằng API Key trong header để tránh bị gọi trái phép
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  // 1. Kiểm tra session để cho phép Admin chạy thủ công từ giao diện
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  
  let isAdmin = false;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    if (profile?.role === "admin") {
      isAdmin = true;
    }
  }

  // 2. Xác thực: Nếu không phải Admin thì bắt buộc phải có CRON_SECRET (cho Vercel Cron)
  if (!isAdmin && cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Lấy cấu hình VAPID
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;

  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  try {
    // 2. Lấy danh sách sự kiện
    const { data: persons } = await supabase
      .from("persons")
      .select("id, full_name, birth_year, birth_month, birth_day, death_year, death_month, death_day, is_deceased");
    
    const { data: customEvents } = await supabase.from("custom_events").select("*");

    // Lấy thời gian hiện tại theo múi giờ Việt Nam (UTC+7)
    const now = new Date();
    const vnTime = new Date(now.getTime() + (7 * 60 * 60 * 1000));
    const currentYear = vnTime.getUTCFullYear();
    const currentMonth = vnTime.getUTCMonth(); // 0-11
    const currentDate = vnTime.getUTCDate();
    
    // Tạo đối tượng Date chỉ có ngày tháng năm của hôm nay để tính khoảng cách
    const todayDateOnly = new Date(Date.UTC(currentYear, currentMonth, currentDate));

    const events = computeEventsForYear(persons || [], customEvents || [], currentYear);

    // Lọc các sự kiện diễn ra trong vòng 7 ngày tới
    const upcomingEvents = events.map(e => {
      const eventDateOnly = new Date(Date.UTC(e.occurrence.getFullYear(), e.occurrence.getMonth(), e.occurrence.getDate()));
      const diffTime = eventDateOnly.getTime() - todayDateOnly.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      return { ...e, diffDays };
    }).filter(e => e.diffDays >= 0 && e.diffDays <= 7);

    console.log(`Cron triggered at ${vnTime.toISOString()} (VN Time)`);
    console.log(`Checking events for Date: ${currentDate}/${currentMonth + 1}/${currentYear}`);
    console.log(`Total upcoming events found (0-7 days): ${upcomingEvents.length}`);

    if (upcomingEvents.length === 0) {
      return NextResponse.json({ message: "No upcoming events in the next 7 days" });
    }

    // 3. Lấy danh sách đăng ký thông báo
    const { data: subscriptions } = await supabase.from("push_subscriptions").select("*");
    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: "No subscribers" });
    }

    // 4. Gửi thông báo cho từng sự kiện
    const notifications = upcomingEvents.map(event => {
      const diffDays = event.diffDays;
      const timeRemaining = diffDays === 0 ? "Hôm nay" : `Còn ${diffDays} ngày`;
      
      const solarDateStr = `${event.occurrence.getDate().toString().padStart(2, '0')}/${(event.occurrence.getMonth() + 1).toString().padStart(2, '0')}/${event.occurrence.getFullYear()}`;
      
      const solar = Solar.fromYmd(event.occurrence.getFullYear(), event.occurrence.getMonth() + 1, event.occurrence.getDate());
      const lunar = solar.getLunar();
      const lunarDateStr = `${lunar.getDay().toString().padStart(2, '0')}/${lunar.getMonth().toString().padStart(2, '0')} ÂL`;
      
      let eventName = "";
      let icon = "";
      if (event.type === "birthday") {
        eventName = `Sinh nhật ${event.personName}`;
        icon = "🎂";
      } else if (event.type === "death_anniversary") {
        eventName = `Ngày giỗ ${event.personName}`;
        icon = "🕯️";
      } else {
        eventName = `Sự kiện: ${event.personName}`;
        icon = "📅";
      }
      
      const title = `${icon} Sắp tới: ${eventName}`;
      const body = `Tên sự kiện: ${eventName}\nNgày dương: ${solarDateStr}\nNgày âm: ${lunarDateStr}\nThời gian còn: ${timeRemaining}`;
      
      return { title, body, url: "/dashboard/events" };
    });

    const results = await Promise.allSettled(
      subscriptions.flatMap(sub => 
        notifications.map(async (notif) => {
          try {
            await webpush.sendNotification(
              sub.subscription,
              JSON.stringify(notif)
            );
          } catch (err: unknown) {
            const error = err as { statusCode?: number };
            if (error.statusCode === 410 || error.statusCode === 404) {
              await supabase.from("push_subscriptions").delete().eq("id", sub.id);
            }
            throw err;
          }
        })
      )
    );

    return NextResponse.json({ 
      message: `Sent ${notifications.length} notifications to ${subscriptions.length} subscribers`,
      results 
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
