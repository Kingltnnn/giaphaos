import { computeEventsForYear } from "@/utils/eventHelpers";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import webpush from "web-push";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  
  // 1. Khởi tạo Supabase với Service Role Key để vượt qua RLS (chỉ dùng cho tác vụ hệ thống)
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 2. Xác thực: Cho phép nếu là Admin đang đăng nhập HOẶC có mã bí mật Cron
  let isAuthorized = false;

  // Kiểm tra mã bí mật (cho Vercel Cron)
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    isAuthorized = true;
  }

  // Nếu chưa có mã bí mật, kiểm tra xem có phải Admin đang nhấn nút thủ công không
  if (!isAuthorized) {
    try {
      const { createClient: createServerClient } = await import("@/utils/supabase/server");
      const cookieStore = await cookies();
      const supabase = createServerClient(cookieStore);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        if (profile?.role === "admin") {
          isAuthorized = true;
        }
      }
    } catch (e) {
      console.error("Auth check failed:", e);
    }
  }

  if (!isAuthorized && cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 3. Cấu hình VAPID
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
  const vapidSubject = process.env.VAPID_SUBJECT;

  if (!vapidPublicKey || !vapidPrivateKey || !vapidSubject) {
    return NextResponse.json({ error: "VAPID keys not configured" }, { status: 500 });
  }

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

  try {
    // 4. Lấy dữ liệu bằng supabaseAdmin (vượt qua RLS)
    const { data: persons } = await supabaseAdmin
      .from("persons")
      .select("id, full_name, birth_year, birth_month, birth_day, death_year, death_month, death_day, is_deceased");
    
    const { data: customEvents } = await supabaseAdmin.from("custom_events").select("*");

    // Lấy thời gian hiện tại theo múi giờ Việt Nam (UTC+7)
    const now = new Date();
    const vnTime = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Ho_Chi_Minh" }));
    const currentYear = vnTime.getFullYear();
    const currentMonth = vnTime.getMonth(); 
    const currentDate = vnTime.getDate();

    const events = computeEventsForYear(persons || [], customEvents || [], currentYear);

    // Lọc các sự kiện diễn ra hôm nay
    const todayEvents = events.filter(e => {
      const d = e.occurrence;
      return d.getDate() === currentDate && d.getMonth() === currentMonth;
    });

    console.log(`[Cron] VN Time: ${vnTime.toLocaleString()}`);
    console.log(`[Cron] Checking: ${currentDate}/${currentMonth + 1}`);
    console.log(`[Cron] Found ${todayEvents.length} events`);

    if (todayEvents.length === 0) {
      return NextResponse.json({ message: "No events today" });
    }

    // 5. Lấy danh sách đăng ký thông báo
    const { data: subscriptions } = await supabaseAdmin.from("push_subscriptions").select("*");
    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json({ message: "No subscribers found in database" });
    }

    // 6. Gửi thông báo
    const notifications = todayEvents.map(event => {
      const title = event.type === "birthday" ? "🎂 Sinh nhật" : event.type === "death_anniversary" ? "🕯️ Ngày giỗ" : "📅 Sự kiện gia tộc";
      const body = `${event.personName} — ${event.eventDateLabel}`;
      return { title, body, url: "/dashboard/events" };
    });

    const results = await Promise.allSettled(
      subscriptions.flatMap(sub => 
        notifications.map(async (notif) => {
          try {
            await webpush.sendNotification(sub.subscription, JSON.stringify(notif));
          } catch (err: unknown) {
            const error = err as { statusCode?: number };
            if (error.statusCode === 410 || error.statusCode === 404) {
              await supabaseAdmin.from("push_subscriptions").delete().eq("id", sub.id);
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
