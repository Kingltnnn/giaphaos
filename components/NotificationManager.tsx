'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Loader2, Info } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'
import { AnimatePresence, motion } from 'framer-motion'

export default function NotificationManager() {
  const [isSupported, setIsSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showPwaTip, setShowPwaTip] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true)
      setPermission(Notification.permission)
      checkSubscription()
    }
  }, [])

  const checkSubscription = async () => {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    setIsSubscribed(!!subscription)
  }

  const subscribe = async () => {
    setLoading(true)
    try {
      // Check if added to home screen (iOS requirement)
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
      
      if (isIOS && !isStandalone) {
        setShowPwaTip(true)
        setLoading(false)
        return
      }

      const registration = await navigator.serviceWorker.ready
      
      // Explicitly request permission for iOS
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        alert('Bạn cần cấp quyền thông báo trong cài đặt trình duyệt để tiếp tục.')
        setLoading(false)
        return
      }

      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

      if (!vapidPublicKey) {
        alert('VAPID Public Key is missing. Please check your environment variables.')
        setLoading(false)
        return
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidPublicKey
      })

      // Save to Supabase
      const { error } = await supabase.from('push_subscriptions').insert({
        subscription: subscription.toJSON(),
        user_agent: navigator.userAgent
      })

      if (error) throw error

      setIsSubscribed(true)
      setPermission(permission) // Use the permission we just got
      alert('Đã đăng ký nhận thông báo thành công!')
    } catch (error) {
      console.error('Push subscription error:', error)
      alert('Không thể đăng ký nhận thông báo. Hãy đảm bảo bạn đã cấp quyền.')
    } finally {
      setLoading(false)
    }
  }

  const unsubscribe = async () => {
    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await subscription.unsubscribe()
        
        // Remove from Supabase (optional, could also do by endpoint)
        await supabase.from('push_subscriptions').delete().match({
          'subscription->endpoint': subscription.endpoint
        })
      }
      setIsSubscribed(false)
    } catch (error) {
      console.error('Push unsubscription error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (!isSupported) {
    return (
      <div className="bg-stone-50 rounded-3xl p-6 border border-stone-200 border-dashed flex flex-col items-center justify-center text-center gap-3">
        <div className="p-2 rounded-xl bg-stone-100 text-stone-400">
          <BellOff className="size-5" />
        </div>
        <div>
          <h3 className="font-serif font-bold text-stone-800 text-sm">Thông báo không khả dụng</h3>
          <p className="text-[11px] text-stone-500 mt-1 max-w-[200px]">
            Trình duyệt hoặc phiên bản iOS của bạn quá cũ để hỗ trợ thông báo đẩy. (Yêu cầu iOS 16.4+)
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white/50 rounded-3xl p-6 border border-stone-200/50 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-xl ${isSubscribed ? 'bg-amber-100 text-amber-600' : 'bg-stone-100 text-stone-400'}`}>
            {isSubscribed ? <Bell className="size-5" /> : <BellOff className="size-5" />}
          </div>
          <div>
            <h3 className="font-serif font-bold text-stone-800">Thông báo đẩy</h3>
            <p className="text-xs text-stone-500">Nhận tin nhắn về các sự kiện sắp tới</p>
          </div>
        </div>
        <button
          onClick={isSubscribed ? unsubscribe : subscribe}
          disabled={loading}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            isSubscribed 
              ? 'bg-stone-100 text-stone-600 hover:bg-stone-200' 
              : 'bg-amber-500 text-white hover:bg-amber-600 shadow-sm'
          }`}
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : (isSubscribed ? 'Tắt thông báo' : 'Bật thông báo')}
        </button>
      </div>

      {isSubscribed && (
        <div className="pt-2 border-t border-stone-100 flex justify-end">
          <button
            onClick={async () => {
              try {
                const res = await fetch('/api/notifications/test', { method: 'POST' })
                if (res.ok) alert('Đã gửi thông báo thử nghiệm!')
                else alert('Gửi thất bại. Hãy kiểm tra cấu hình VAPID.')
              } catch (e) {
                alert('Lỗi kết nối server.')
              }
            }}
            className="text-[10px] font-bold text-stone-400 hover:text-amber-600 transition-colors"
          >
            Gửi thông báo thử nghiệm
          </button>
        </div>
      )}

      <AnimatePresence>
        {showPwaTip && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
              <Info className="size-5 text-blue-500 shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800 space-y-2">
                <p className="font-bold">Yêu cầu cài đặt trên iPhone</p>
                <p>Để nhận thông báo trên iPhone, bạn cần:</p>
                <ol className="list-decimal list-inside space-y-1 ml-1">
                  <li>Bấm vào biểu tượng <b>Chia sẻ</b> (ô vuông có mũi tên lên) ở dưới trình duyệt Safari.</li>
                  <li>Chọn <b>&quot;Thêm vào MH chính&quot;</b> (Add to Home Screen).</li>
                  <li>Mở ứng dụng từ màn hình chính và bật thông báo tại đây.</li>
                </ol>
                <button 
                  onClick={() => setShowPwaTip(false)}
                  className="text-xs font-bold text-blue-600 hover:underline pt-1"
                >
                  Đã hiểu
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {permission === 'denied' && (
        <p className="text-[11px] text-rose-500 font-medium flex items-center gap-1">
          <Info className="size-3" />
          Bạn đã chặn thông báo. Hãy bật lại trong cài đặt trình duyệt/điện thoại.
        </p>
      )}
    </div>
  )
}
