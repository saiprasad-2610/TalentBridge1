import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Bell, CheckCircle, Clock, AlertCircle, X, Loader2 } from 'lucide-react';
import api from "../../services/api.ts";

interface NotificationPanelProps {
  userId?: number;
  onClose: () => void;
}

export function NotificationPanel({ userId, onClose }: NotificationPanelProps) {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRecruiterNotifications = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const { data } = await api.get(`/students/notifications/${userId}`);
      if (data && data.success) {
        setNotifications(data.data || []);
      }
    } catch (e) {
      console.error("Failed to load recruiter notifications", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecruiterNotifications();
  }, [userId]);

  const handleMarkAllRead = async () => {
    if (!userId) return;
    try {
      await api.post(`/students/notifications/read-all/${userId}`);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
    } catch (e) {
      console.error("Failed to mark recruiter notifications as read", e);
    }
  };

  const handleMarkOneRead = async (id: number) => {
    try {
      await api.post(`/students/notifications/read/${id}`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (e) {
      console.error("Failed to clear notification", e);
    }
  };

  // Merge database notifications with some default placeholder prompts if table is dry
  const liveList = notifications.length > 0 
    ? notifications.map(n => ({
        id: n.id,
        title: n.title || "Interview System Alert",
        desc: n.message || "No message content",
        time: n.created_at ? new Date(n.created_at).toLocaleTimeString() : "Just now",
        is_read: n.is_read,
        type: n.title?.includes("Scheduled") ? "info" : "success",
        icon: n.title?.includes("Scheduled") ? Clock : CheckCircle
      }))
    : [
        {
          id: -1,
          title: "New Application",
          desc: "Alice Johnson applied for Senior Backend Role",
          time: "2 mins ago",
          is_read: 0,
          type: "success",
          icon: CheckCircle
        },
        {
          id: -2,
          title: "Interview Scheduled",
          desc: "You can schedule upcoming mock or active candidate panels from Interviews section.",
          time: "1 hour ago",
          is_read: 1,
          type: "info",
          icon: Clock
        },
        {
          id: -3,
          title: "Setup Standard Completed",
          desc: "Recruiter verification passed. Interview rooms are fully functional.",
          time: "1 day ago",
          is_read: 1,
          type: "warning",
          icon: AlertCircle
        }
      ];

  const unreadCount = liveList.filter(n => !n.is_read).length;

  return (
    <>
      <div className="fixed inset-0 z-45" onClick={onClose} />
      <motion.div 
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        className="absolute top-20 right-10 w-96 bg-white rounded-[32px] shadow-2xl border border-slate-100 z-50 overflow-hidden"
      >
        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Notifications Log</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
              {unreadCount > 0 ? `You have ${unreadCount} unread action items` : "Inbox up to date"}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-slate-600 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {loading && notifications.length === 0 ? (
            <div className="p-8 flex justify-center items-center gap-2 text-slate-400 font-mono text-xs uppercase">
              <Loader2 className="animate-spin text-blue-600" size={16} /> Loading alerts...
            </div>
          ) : (
            liveList.map((n) => (
              <div 
                key={n.id} 
                onClick={() => n.id > 0 && handleMarkOneRead(n.id)}
                className={`p-5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 group cursor-pointer ${
                  n.is_read ? 'opacity-65' : 'bg-blue-50/15 font-semibold'
                }`}
              >
                <div className="flex gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 relative ${
                    n.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
                    n.type === 'warning' ? 'bg-orange-50 text-orange-600' :
                    'bg-blue-50 text-blue-600'
                  }`}>
                    <n.icon size={20} />
                    {!n.is_read && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-white animate-pulse" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">{n.title}</h4>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">{n.time}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium mt-1 leading-relaxed">{n.desc}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {unreadCount > 0 && (
          <div className="p-4 bg-slate-50/50 text-center border-t border-slate-50">
            <button 
              onClick={handleMarkAllRead} 
              className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline cursor-pointer"
            >
              Mark all as read
            </button>
          </div>
        )}
      </motion.div>
    </>
  );
}
