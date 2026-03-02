import { computeEventsForYear } from "@/utils/eventHelpers";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import webpush from "web-push";

/**
 * CRON JOB: Gửi thông báo đẩy cho các sự kiện diễn ra trong ngày hôm nay.
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
    // 2. Lấy danh sách sự kiện hôm nay
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

    const events = computeEventsForYear(persons || [], customEvents || [], currentYear);

    // Lọc các sự kiện diễn ra hôm nay (theo giờ VN)
    const todayEvents = events.filter(e => {
      const d = e.occurrence;
      // So sánh ngày và tháng (occurrence được tạo bởi new Date(y, m, d) trong eventHelpers)
      // Trên Vercel, new Date() mặc định là UTC
      return d.getUTCDate() === currentDate && d.getUTCMonth() === currentMonth;
    });

    console.log(`Cron triggered at ${vnTime.toISOString()} (VN Time)`);
    console.log(`Checking events for Date: ${currentDate}/${currentMonth + 1}/${currentYear}`);
    console.log(`Total events found today: ${todayEvents.length}`);

    if (todayEvents.length === 0) {
      return NextResponse.json({ message: "No events today" });
    }

    // 3. Lấy danh sách đăng ký thông báo
    const { data: subscriptions } = await supabase.from("push_subscriptions").select("*");
    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: "No subscribers" });
    }

    // 4. Gửi thông báo cho từng sự kiện
    const notifications = todayEvents.map(event => {
      const title = event.type === "birthday" ? "🎂 Sinh nhật" : event.type === "death_anniversary" ? "🕯️ Ngày giỗ" : "📅 Sự kiện gia tộc";
      const body = `${event.personName} — ${event.eventDateLabel}`;
      
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
