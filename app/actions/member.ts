"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function deleteMemberProfile(memberId: string) {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);

  // 2. Check for existing relationships
  const { data: relationships, error: relationshipError } = await supabase
    .from("relationships")
    .select("id")
    .or(`person_a.eq.${memberId},person_b.eq.${memberId}`)
    .limit(1);

  if (relationshipError) {
    console.error("Error checking relationships:", relationshipError);
    return { error: "Lỗi kiểm tra mối quan hệ gia đình." };
  }

  if (relationships && relationships.length > 0) {
    return {
      error:
        "Không thể xoá. Vui lòng xoá hết các mối quan hệ gia đình của người này trước.",
    };
  }

  // 3. Delete the member
  const { error: deleteError } = await supabase
    .from("persons")
    .delete()
    .eq("id", memberId);

  if (deleteError) {
    console.error("Error deleting person:", deleteError);
    return { error: "Đã xảy ra lỗi khi xoá hồ sơ." };
  }

  // 4. Revalidate and redirect
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/members");
  redirect("/dashboard");
}
