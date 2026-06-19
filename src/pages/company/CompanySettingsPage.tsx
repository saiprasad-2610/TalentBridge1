import React, { useState } from 'react';
import { Settings, Shield, Bell, Key, Briefcase, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.tsx';

export function CompanySettingsPage() {
  const [activeTab, setActiveTab] = useState('account');
  const { user } = useAuth();

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Organization Settings</h1>
          <p className="text-slate-500 font-medium text-sm italic mt-1">Manage notifications, billing, and team access.</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-10">
        <div className="w-full md:w-64 shrink-0 flex flex-col gap-2">
          {[
            { id: 'account', icon: Briefcase, label: 'Account Info' },
            { id: 'security', icon: Shield, label: 'Security' },
            { id: 'notifications', icon: Bell, label: 'Notifications' },
            { id: 'billing', icon: Key, label: 'Billing & Plans' },
            { id: 'team', icon: Mail, label: 'Team Members' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-6 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all ${
                activeTab === tab.id
                  ? 'bg-slate-900 text-white shadow-xl shadow-slate-900/10'
                  : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50 hover:border-slate-200'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 bg-white rounded-[40px] border border-slate-100 p-10 shadow-sm relative overflow-hidden">
          {activeTab === 'account' && (
             <div className="space-y-8 relative z-10">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Account Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Primary Email</label>
                     <input type="email" disabled value={user?.email || ''} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-medium text-slate-500 cursor-not-allowed" />
                   </div>
                   <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Timezone</label>
                     <select className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-5 py-3.5 text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/5 transition-all">
                        <option>Asia/Kolkata (IST)</option>
                        <option>America/New_York (EST)</option>
                        <option>Europe/London (GMT)</option>
                     </select>
                   </div>
                </div>
                <div className="pt-6 border-t border-slate-50">
                   <button className="bg-red-50 text-red-600 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-100 transition-colors">
                      Deactivate Account
                   </button>
                </div>
             </div>
          )}

          {activeTab === 'notifications' && (
             <div className="space-y-8 relative z-10">
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Email Notifications</h2>
                
                <div className="space-y-6">
                   {[
                      { title: 'New Applications', desc: 'Receive an email when a new candidate applies.' },
                      { title: 'Interview Reminders', desc: 'Get reminded 24 hours before a scheduled interview.' },
                      { title: 'Weekly Analytics', desc: 'Receive a weekly digest of your hiring performance.' }
                   ].map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-6 border border-slate-100 rounded-3xl bg-slate-50/50">
                         <div>
                            <h3 className="text-sm font-black text-slate-800 uppercase">{item.title}</h3>
                            <p className="text-xs text-slate-500 font-medium mt-1">{item.desc}</p>
                         </div>
                         <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" className="sr-only peer" defaultChecked />
                            <div className="w-14 h-7 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
                         </label>
                      </div>
                   ))}
                </div>
             </div>
          )}

          {activeTab !== 'account' && activeTab !== 'notifications' && (
            <div className="h-64 flex flex-col items-center justify-center text-center space-y-4">
              <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300">
                <Settings size={32} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Coming Soon</h3>
                <p className="text-slate-400 text-sm font-medium mt-1">This settings panel is currently under development.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
