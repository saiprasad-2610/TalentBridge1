import React from 'react';
import { motion } from 'motion/react';
import { Bell, CheckCircle, Clock, AlertCircle, X } from 'lucide-react';

interface NotificationPanelProps {
  onClose: () => void;
}

export function NotificationPanel({ onClose }: NotificationPanelProps) {
  const notifications = [
    {
      id: 1,
      title: "New Application",
      desc: "Alice Johnson applied for Senior Backend Role",
      time: "2 mins ago",
      type: "success",
      icon: CheckCircle
    },
    {
      id: 2,
      title: "Interview Reminder",
      desc: "Technical interview with Bob Smith starts in 45 mins",
      time: "1 hour ago",
      type: "info",
      icon: Clock
    },
    {
      id: 3,
      title: "Deadline Alert",
      desc: "Fullstack Developer role expires in 2 days",
      time: "3 hours ago",
      type: "warning",
      icon: AlertCircle
    }
  ];

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <motion.div 
        initial={{ opacity: 0, y: 10, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        className="absolute top-20 right-10 w-96 bg-white rounded-[32px] shadow-2xl border border-slate-100 z-50 overflow-hidden"
      >
        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">Notifications</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">You have 3 unread messages</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white rounded-xl transition-all text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {notifications.map((n) => (
            <div key={n.id} className="p-5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 group cursor-pointer">
              <div className="flex gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  n.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
                  n.type === 'warning' ? 'bg-orange-50 text-orange-600' :
                  'bg-blue-50 text-blue-600'
                }`}>
                  <n.icon size={20} />
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
          ))}
        </div>

        <div className="p-4 bg-slate-50/50 text-center">
          <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">
            Mark all as read
          </button>
        </div>
      </motion.div>
    </>
  );
}
