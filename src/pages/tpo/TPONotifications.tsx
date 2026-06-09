import React from 'react';
import { 
  Bell, 
  Building2, 
  User, 
  CheckCircle2, 
  AlertTriangle,
  Clock,
  MoreHorizontal
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

export default function TPONotifications() {
  const [notifications, setNotifications] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/notifications');
      if (res.data.success) setNotifications(res.data.data);
    } catch (error) {
      console.error('Error fetching notifications');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await api.post(`/notifications/mark-read/${id}`);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: 1 } : n));
    } catch (error) {}
  };

  const markAllAsRead = async () => {
    try {
      await api.post('/notifications/mark-all-read');
      setNotifications(prev => prev.map(n => ({ ...n, is_read: 1 })));
      toast.success('All notifications marked as read');
    } catch (error) {}
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-end">
        <button 
          onClick={markAllAsRead}
          className="text-xs font-black text-blue-600 uppercase tracking-widest hover:underline"
        >
          Mark all as read
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm divide-y divide-slate-50">
        {loading ? (
          <div className="p-10 text-center font-bold text-slate-400 uppercase tracking-widest italic">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="p-20 text-center">
             <Bell className="mx-auto text-slate-200 mb-4" size={48} />
             <h3 className="text-lg font-bold text-slate-900">No Notifications</h3>
             <p className="text-slate-500 mt-2">You're all caught up!</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div key={notif.id} className={`p-6 flex items-start gap-6 hover:bg-slate-50/50 transition-colors group cursor-pointer ${!notif.is_read ? 'bg-blue-50/20' : ''}`}>
              <div className={`p-3 rounded-xl shrink-0 ${!notif.is_read ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                <Bell size={20} />
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{notif.title}</h4>
                  <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase">
                    <Clock size={12} />
                    {new Date(notif.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-slate-500 font-medium mt-1 leading-relaxed">{notif.message}</p>
              </div>
              <div className="relative">
                 <button className="p-2 text-slate-300 hover:text-slate-600 rounded-lg">
                    <MoreHorizontal size={18} />
                 </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
