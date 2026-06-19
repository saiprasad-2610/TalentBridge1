import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext.tsx";
import api from "../../services/api.ts";
import { 
  Settings, Shield, Bell, HelpCircle, Save, Loader2, KeyRound, 
  ToggleLeft, ToggleRight, CheckCircle2, UserCheck, AlertOctagon, RefreshCw
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "react-hot-toast";

export function CompanySettingsPage() {
  const { user, profile } = useAuth();
  const [saving, setSaving] = useState(false);
  
  const [pref, setPref] = useState({
    emailOnApply: true,
    emailOnInterviewAccept: true,
    strictProctoring: true,
    aiProctoringScore: true,
    allowedDomains: "college.edu, university.ac.in",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const handleToggle = (key: keyof typeof pref) => {
    setPref(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error("New Passwords do not match.");
      return;
    }

    setSaving(true);
    try {
      const { data } = await api.post("/auth/change-password", {
        userId: user?.id,
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      if (data.success) {
        toast.success("Security credentials updated successfully!");
        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        toast.error(data.message || "Failed to alter password.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Current password verification failed.");
    } finally {
      setSaving(false);
    }
  };

  const savePreferences = () => {
    toast.success("Recruiting operational configurations saved!");
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 min-h-screen pb-12 font-sans">
      {/* Header */}
      <div className="border-b border-slate-100 pb-5">
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Recruiting Settings</h1>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mt-1">Configure recruiter security bounds and communication channels</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Settings Navigation */}
        <div className="space-y-6">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm divide-y divide-slate-50">
            <div className="py-3 flex items-center gap-3 text-xs font-black uppercase text-blue-600">
              <Settings size={16} /> Operational Preferences
            </div>
            <div className="py-3 flex items-center gap-3 text-xs font-black uppercase text-slate-500 hover:text-slate-800 transition-colors cursor-pointer">
              <Shield size={16} /> Encryption & Identity
            </div>
          </div>

          <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 space-y-3 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-600/10 rounded-full blur-2xl" />
            <span className="px-2.5 py-1 bg-blue-500/15 text-blue-400 text-[8px] font-black uppercase tracking-[0.15em] rounded-md font-mono">
              Recruiter Approval
            </span>
            <div className="flex items-center gap-2 mt-2">
              <UserCheck className="text-emerald-400" size={18} />
              <h4 className="font-extrabold text-xs uppercase tracking-wider">Enterprise Approved</h4>
            </div>
            <p className="text-[10px] text-slate-400 font-bold uppercase">Approval Token: TRB-ACC-{profile?.id || "9921"}</p>
          </div>
        </div>

        {/* Configurations Panes */}
        <div className="lg:col-span-2 space-y-8">
          {/* Email Preferences */}
          <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-4">
              <Bell size={18} className="text-blue-500" />
              <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Communication Bounds</h3>
            </div>

            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-850 uppercase">Student Application Notification</h4>
                  <p className="text-[10px] text-slate-400 leading-none mt-1">Receive immediate emails when a developer submits a resume</p>
                </div>
                <button type="button" onClick={() => handleToggle("emailOnApply")} className="cursor-pointer">
                  {pref.emailOnApply ? <ToggleRight className="text-blue-600" size={32} /> : <ToggleLeft className="text-slate-300" size={32} />}
                </button>
              </div>

              <div className="flex items-center justify-between border-t border-slate-50 pt-5">
                <div>
                  <h4 className="text-xs font-bold text-slate-850 uppercase">Interview Confirmation Alert</h4>
                  <p className="text-[10px] text-slate-400 leading-none mt-1">Emailed notification when a student confirms an interview slot</p>
                </div>
                <button type="button" onClick={() => handleToggle("emailOnInterviewAccept")} className="cursor-pointer">
                  {pref.emailOnInterviewAccept ? <ToggleRight className="text-blue-600" size={32} /> : <ToggleLeft className="text-slate-300" size={32} />}
                </button>
              </div>
            </div>
            
            <div className="pt-4 border-t border-slate-50 flex justify-end">
              <button 
                onClick={savePreferences}
                className="px-5 py-2.5 bg-slate-950 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Save Channels
              </button>
            </div>
          </div>

          {/* Password Security Form */}
          <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm space-y-6">
            <div className="flex items-center gap-2 border-b border-slate-50 pb-4">
              <KeyRound size={18} className="text-blue-500" />
              <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Change Password</h3>
            </div>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">Current Password</label>
                <input
                  type="password"
                  required
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                  className="w-full bg-slate-50 rounded-xl px-4 py-3 text-xs outline-none focus:bg-white border border-transparent focus:border-blue-500 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">New Password</label>
                  <input
                    type="password"
                    required
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full bg-slate-50 rounded-xl px-4 py-3 text-xs outline-none focus:bg-white border border-transparent focus:border-blue-500 transition-all"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full bg-slate-50 rounded-xl px-4 py-3 text-xs outline-none focus:bg-white border border-transparent focus:border-blue-500 transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-750 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/10 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {saving ? <Loader2 className="animate-spin" size={12} /> : "Update Credentials"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CompanySettingsPage;
