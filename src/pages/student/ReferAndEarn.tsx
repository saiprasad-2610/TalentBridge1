import React, { useState, useEffect } from "react";
import { Copy, Gift, Users, Award, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import api from "../../services/api.ts";
import { useAuth } from "../../context/AuthContext.tsx";
import { motion } from "motion/react";

interface Referral {
  id: number;
  referred_email: string;
  reward_given: number;
  created_at: string;
}

export function ReferAndEarn() {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [referralCode, setReferralCode] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchReferralData = async () => {
      try {
        setLoading(true);
        const [balanceRes, referralsRes] = await Promise.all([
          api.get("/xp/balance"),
          api.get("/xp/referrals")
        ]);

        if (balanceRes.data?.success && balanceRes.data?.balance) {
          setReferralCode(balanceRes.data.balance.referral_code || "TBRIDGE99");
        }
        if (referralsRes.data?.success && referralsRes.data?.referrals) {
          setReferrals(referralsRes.data.referrals);
        }
        setError(null);
      } catch (err: any) {
        console.error("Error loading referral data:", err);
        setError("Unable to load referral program details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchReferralData();
  }, [user?.id]);

  const copyToClipboard = () => {
    if (!referralCode) return;
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8 min-h-screen">
      {/* Top Hero Card */}
      <div className="relative bg-gradient-to-r from-[#0d1635] to-[#1a3170] rounded-3xl p-8 md:p-10 text-white overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-[80px]" />
        <div className="relative z-10 max-w-2xl space-y-4">
          <span className="p-1 px-3 bg-blue-500/20 text-blue-300 text-[10px] font-black uppercase tracking-widest rounded-full border border-blue-500/30">
            Referral Program
          </span>
          <h1 className="text-3xl font-black uppercase tracking-tight">
            Invite friends, earn passive XP merit!
          </h1>
          <p className="text-slate-300 text-xs md:text-sm leading-relaxed font-semibold">
            Share the TalentBridge power. When a developer registers with your referral code, you both instantly earn <span className="text-yellow-400 font-bold">250 XP bonus points</span> to redeem free mock interview assessment credits and premium resume revisions.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 space-y-4 bg-white rounded-3xl border border-slate-100 min-h-[300px]">
          <Loader2 className="animate-spin text-blue-600" size={32} />
          <p className="text-sm text-slate-500 font-bold uppercase tracking-wider">Syncing program metrics...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-100 rounded-3xl p-6 flex items-center gap-4 text-red-700">
          <AlertCircle size={24} className="flex-shrink-0" />
          <div>
            <h4 className="font-bold text-sm">System Latency Detected</h4>
            <p className="text-xs mt-1 text-red-600">{error}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Share Section (2 cols) */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
              <h3 className="font-bold text-slate-900 text-lg uppercase tracking-tight flex items-center gap-2">
                <Gift className="text-blue-600" size={20} /> Your Personal Referral Gateway
              </h3>
              
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Share Code</label>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-5 py-4 font-mono font-bold text-slate-700 tracking-wider text-lg select-all">
                    {referralCode}
                  </div>
                  <button
                    onClick={copyToClipboard}
                    className="p-4 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 active:scale-95 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer min-w-[120px]"
                  >
                    {copied ? (
                      <>
                        <CheckCircle size={18} /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={18} /> Copy Code
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-slate-50">
                <div className="flex items-start gap-3 p-4 bg-blue-50/40 rounded-2.5xl">
                  <span className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 font-black text-xs flex items-center justify-center border border-blue-100/50 flex-shrink-0">1</span>
                  <div>
                    <h5 className="text-[11px] font-black text-indigo-950 uppercase tracking-wide">Share Code</h5>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1">Send your unique code via WhatsApp, Twitter, or email.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-emerald-50/40 rounded-2.5xl">
                  <span className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 font-black text-xs flex items-center justify-center border border-emerald-100/50 flex-shrink-0">2</span>
                  <div>
                    <h5 className="text-[11px] font-black text-indigo-950 uppercase tracking-wide">They Register</h5>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1">Friends use your code in the signup flow to verify.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-4 bg-yellow-50/40 rounded-2.5xl">
                  <span className="w-8 h-8 rounded-full bg-yellow-50 text-yellow-600 font-black text-xs flex items-center justify-center border border-yellow-100/50 flex-shrink-0">3</span>
                  <div>
                    <h5 className="text-[11px] font-black text-indigo-950 uppercase tracking-wide">Both Get rewarded</h5>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1">250 XP gets auto-injected in your wallets instantly!</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Referrals table */}
            <div className="bg-white border border-slate-100 rounded-3xl p-6 md:p-8 shadow-sm space-y-6">
              <h3 className="font-bold text-slate-900 text-lg uppercase tracking-tight flex items-center gap-2">
                <Users className="text-blue-600" size={20} /> Successful Invitations ({referrals.length})
              </h3>

              {referrals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center space-y-2 border border-dashed border-slate-150 rounded-2xl">
                  <Gift className="text-slate-300" size={40} />
                  <p className="text-slate-650 font-bold text-sm">No referrals recorded yet</p>
                  <p className="text-slate-400 text-xs w-80 font-medium">Your successful invitations will show up here along with your rewards claim status.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100">
                        <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Referred User Email</th>
                        <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Signed Up On</th>
                        <th className="pb-3 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">XP Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {referrals.map((ref) => (
                        <tr key={ref.id} className="transition-all hover:bg-slate-50/50">
                          <td className="py-4 text-xs font-bold text-slate-800">{ref.referred_email}</td>
                          <td className="py-4 text-xs text-slate-400 font-extrabold">{new Date(ref.created_at).toLocaleDateString()}</td>
                          <td className="py-4 text-xs text-right">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[9px] font-black uppercase tracking-wider border border-emerald-100">
                              <CheckCircle size={10} /> +250 XP CREDITED
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Quick Info Sidebar */}
          <div className="space-y-6">
            <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
              <h4 className="font-black text-slate-950 text-xs uppercase tracking-widest flex items-center gap-2 pb-3 border-b border-slate-50">
                <Award className="text-yellow-500" size={16} /> Redeemable XP Utilities
              </h4>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 flex-shrink-0" />
                  <p className="text-[11px] text-slate-400 font-bold leading-normal">
                    <span className="text-slate-700">125 XP POINTS</span> required per AI Mock Interview session.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5 flex-shrink-0" />
                  <p className="text-[11px] text-slate-400 font-bold leading-normal">
                    <span className="text-slate-700">200 XP POINTS</span> needed for an automated high-tier ATS keywords optimization review.
                  </p>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 flex-shrink-0" />
                  <p className="text-[11px] text-slate-400 font-bold leading-normal">
                    <span className="text-slate-700">500 XP POINTS</span> unlocks global visibility to top premium corporate TPOs on the feed.
                  </p>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
