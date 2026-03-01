"use client";

import { motion } from "framer-motion";
import { ArrowLeft, Info, Mail, ShieldAlert } from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fafaf9] selection:bg-amber-200 selection:text-amber-900 relative">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-size-[24px_24px] pointer-events-none"></div>

      <Link
        href="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-stone-500 hover:text-stone-900 font-semibold text-sm transition-all duration-300 group bg-white/60 px-5 py-2.5 rounded-full shadow-sm border border-stone-200 hover:border-stone-300 hover:shadow-md z-20"
      >
        <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
        Trang chủ
      </Link>

      <div className="flex-1 flex flex-col justify-center items-center px-4 py-20 relative z-10 w-full mb-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="max-w-3xl w-full"
        >
          <div className="bg-white rounded-3xl p-8 sm:p-12 shadow-sm border border-stone-200 mb-8 mt-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-amber-100/50 text-amber-700 rounded-2xl">
                <Info className="size-6" />
              </div>
              <h1 className="text-3xl font-serif font-bold text-stone-900">
                Giới thiệu dự án
              </h1>
            </div>

            <div className="max-w-none">
              <p className="text-stone-600 leading-relaxed text-[15px] mb-8">
                <strong className="text-stone-800">Gia Phả Họ Lê</strong> là một
                giải pháp được thiết kế giúp dòng họ Lê
                tự xây dựng và quản lý cây phả hệ của riêng mình. Dự án giúp bảo
                tồn và truyền đạt lại thông tin cội nguồn một cách trực quan,
                hiện đại, và đặc biệt là an toàn.
              </p>

              <div className="mt-8 mb-4 border-t border-stone-100 pt-8 flex items-center gap-3">
                <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
                  <ShieldAlert className="size-5" />
                </div>
                <h2 className="text-xl font-bold text-stone-900">
                  Thông tin dự án & Quyền riêng tư
                </h2>
              </div>

              <div className="bg-stone-50 border border-stone-200/60 rounded-2xl p-6 text-[14.5px] leading-relaxed">
                <p className="font-bold text-stone-800 mb-4 bg-white py-2 px-3 rounded-lg border border-stone-200 shadow-sm inline-block">
                  Dự án được soạn thảo và quản lý bởi Lê Tú Nam (01/03/2026).
                </p>

                <ul className="space-y-4 text-stone-600 list-disc pl-5">
                  <li>
                    <strong className="text-stone-800">
                      Mục đích:
                    </strong>{" "}
                    Gìn giữ và lưu truyền những giá trị, cội nguồn và truyền thống tốt
                    đẹp của dòng họ Lê cho các thế hệ mai sau.
                  </li>
                  <li>
                    <strong className="text-stone-800">
                      Bảo mật dữ liệu:
                    </strong>{" "}
                    Toàn bộ dữ liệu gia phả (tên, ngày sinh, quan hệ, thông tin liên hệ...) được lưu trữ 
                    bảo mật trên hệ thống đám mây riêng của dòng họ.
                  </li>
                  <li>
                    <strong className="text-stone-800">
                      Quyền hạn:
                    </strong>{" "}
                    Chỉ những thành viên được cấp quyền mới có thể xem và chỉnh sửa thông tin nhạy cảm.
                  </li>
                </ul>
              </div>

              <div className="mt-8 mb-4 border-t border-stone-100 pt-8 flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                  <Mail className="size-5" />
                </div>
                <h2 className="text-xl font-bold text-stone-900">
                  Liên hệ & Đóng góp
                </h2>
              </div>

              <p className="text-stone-600 leading-relaxed text-[15px] mb-8">
                Nếu bạn có bất kỳ thắc mắc, thông tin cần cập nhật hoặc đóng góp ý kiến cho gia phả dòng họ, 
                vui lòng liên hệ trực tiếp với quản trị viên qua email:
                <br />
                <a
                  href="namdigital49@gmail.com"
                  className="font-semibold text-amber-700 hover:text-amber-600 transition-colors inline-flex items-center gap-1.5 mt-2"
                >
                  namdigital49@gmail.com
                </a>
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
