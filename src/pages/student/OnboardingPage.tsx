import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.tsx';
import api from '../../services/api.ts';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, CheckCircle2, ChevronRight, ChevronLeft, 
  Target, Briefcase, Search, Globe, Lightbulb, 
  User, Star, Check, Award
} from 'lucide-react';
import { toast } from 'react-hot-toast';

export function OnboardingPage() {
  const { user, profile, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 5;

  // Onboarding Wizard states
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [industry, setIndustry] = useState('Technology');
  const [status, setStatus] = useState('actively_looking');
  const [source, setSource] = useState('College Placement Cell');
  const [helpActions, setHelpActions] = useState<string[]>(['interview_prep']);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleHelpAction = (actionId: string) => {
    if (helpActions.includes(actionId)) {
      setHelpActions(helpActions.filter(a => a !== actionId));
    } else {
      setHelpActions([...helpActions, actionId]);
    }
  };

  const nextStep = () => {
    if (currentStep === 1 && !fullName.trim()) {
      toast.error("Please enter your full name to proceed.");
      return;
    }
    setCurrentStep((prev) => Math.min(prev + 1, totalSteps));
  };

  const prevStep = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const handleCompleteOnboarding = async () => {
    if (!user || !profile) return;
    setIsSubmitting(true);
    try {
      // 1. Submit the core onboarding metrics
      const { data } = await api.put(`/students/profile/${user.id}/section/onboarding`, {
        onboardingCompleted: true,
        onboardingIndustry: industry,
        onboardingStatus: status,
        onboardingSource: source,
        onboardingHelpActions: helpActions,
      });

      // 2. Also submit personal name / basic info to sync the full_name
      await api.put(`/students/profile/${user.id}/section/personal`, {
        fullName: fullName.trim(),
        headline: profile.headline || 'Student at TalentBridge',
        dob: profile.dob,
        gender: profile.gender || 'Other',
        address: profile.address || '',
        location: profile.location || '',
        contact: profile.contact || '',
        profilePhotoUrl: profile.profile_photo_url || '',
      });

      // 3. Fetch latest profile data to keep state in sync
      const resProfile = await api.get(`/students/profile/${user.id}`);
      if (resProfile.data?.success) {
        updateProfile(resProfile.data.data);
        toast.success("Welcome aboard! Onboarding successfully completed.");
        navigate('/student');
      } else {
        toast.error("Error updates; please try again.");
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e.response?.data?.message || "Failed to complete onboarding.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const stepVariants = {
    hidden: { opacity: 0, x: 50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, x: -50, transition: { duration: 0.2 } }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between py-10 px-4">
      {/* Upper header logo */}
      <div className="max-w-4xl mx-auto w-full text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-extrabold shadow-md">
            TB
          </div>
          <span className="text-2xl font-black text-slate-800 tracking-tight uppercase">
            Talent<span className="text-indigo-600">Bridge</span>
          </span>
        </div>
        <p className="text-xs text-slate-400 uppercase tracking-widest font-black">Autonomous Onboarding Journey</p>
      </div>

      <div className="max-w-xl mx-auto w-full bg-white border border-slate-200/80 rounded-3xl shadow-xl overflow-hidden flex flex-col p-8 md:p-10 relative">
        
        {/* Step indicator header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <span className="text-xs font-black uppercase tracking-widest text-indigo-600">Step {currentStep} of {totalSteps}</span>
            <div className="h-1 w-32 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
              <div 
                className="h-full bg-indigo-600 transition-all duration-300 rounded-full" 
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
          </div>
          <div className="flex items-center gap-1.5 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100">
            <Sparkles className="text-indigo-600" size={14} />
            <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700">AI Enabled Session</span>
          </div>
        </div>

        {/* Wizard content */}
        <div className="flex-1 min-h-[300px]">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div 
                key="step1"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                    Let's get started <span className="text-indigo-600">👋</span>
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">Please confirm your full name so companies can identify you during video interviews.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                    <User size={14} /> Full Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name (e.g. John Doe)"
                    className="w-full px-4 py-3.5 rounded-2xl border border-slate-200 font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all text-sm shadow-sm"
                  />
                </div>

                <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 text-xs text-indigo-700 leading-relaxed">
                  <span className="font-bold uppercase tracking-wider block mb-1">💡 What is TalentBridge?</span>
                  TalentBridge is an advanced interview-focused platform featuring real-time video proctoring, mock sessions, AI skill evaluation, and verified recruiter drops.
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div 
                key="step2"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                    Current job-search <span className="text-indigo-600">Status</span>
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">Customize your visibility. This tells recruiters if you are currently open to new roles.</p>
                </div>

                <div className="space-y-3">
                  {[
                    { id: 'actively_looking', title: 'Actively Looking', desc: 'Actively looking and eager for job placements and on-platform interviews', color: 'border-emerald-500 bg-emerald-50/40 text-emerald-700' },
                    { id: 'open', title: 'Open to Offers', desc: 'Not actively scouting but willing to receive invites and mock feedback', color: 'border-indigo-500 bg-indigo-50/40 text-indigo-700' },
                    { id: 'closed', title: 'Closed to Offers', desc: 'Currently unavailable of search opportunities and only learning', color: 'border-slate-300 bg-slate-50/40 text-slate-600' }
                  ].map((opt) => {
                    const isSelected = status === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setStatus(opt.id)}
                        className={`w-full text-left p-4 rounded-2xl border transition-all flex items-start gap-3.5 cursor-pointer ${
                          isSelected ? `${opt.color} ring-2 ring-indigo-500/10 border-indigo-500 shadow-md` : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className={`mt-0.5 w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                          isSelected ? 'border-current bg-current' : 'border-slate-300'
                        }`}>
                          {isSelected && <Check className="text-white" size={12} />}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-800 text-sm">{opt.title}</h4>
                          <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{opt.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div 
                key="step3"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                    Your target <span className="text-indigo-600">Industry</span>
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">This guides the mock questionnaires, automated AI models, and matching criteria.</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'Technology', title: 'Software & Tech', icon: Briefcase },
                    { id: 'Finance', title: 'Finance & Banking', icon: Star },
                    { id: 'Healthcare', title: 'Healthcare', icon: Target },
                    { id: 'Consulting', title: 'Consulting', icon: Globe },
                    { id: 'Education', title: 'Education', icon: Lightbulb },
                    { id: 'Other', title: 'Other sectors', icon: User }
                  ].map((opt) => {
                    const isSelected = industry === opt.id;
                    const Icon = opt.icon;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setIndustry(opt.id)}
                        className={`p-4 rounded-2xl border text-left flex flex-col justify-between h-28 transition-all cursor-pointer ${
                          isSelected ? 'border-indigo-600 bg-indigo-50/40 text-indigo-700 shadow-sm ring-2 ring-indigo-500/5' : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className={`p-2.5 rounded-xl shrink-0 ${isSelected ? 'bg-indigo-150 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                          <Icon size={18} />
                        </div>
                        <span className="text-xs font-black uppercase tracking-wider text-slate-700 mt-2">{opt.title}</span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {currentStep === 4 && (
              <motion.div 
                key="step4"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6"
              >
                <div>
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                    What are your <span className="text-indigo-600">Goals?</span>
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">Choose one or more platforms targets to customized your student sidebar view.</p>
                </div>

                <div className="space-y-3">
                  {[
                    { id: 'interview_prep', label: 'AI Interactive Video Interviews', desc: 'Secure real-time audio/video calls with comprehensive proctoring analytics' },
                    { id: 'job_apply', label: 'Apply to Verified Placements', desc: 'Submit dossiers to top companies and receive real-time updates' },
                    { id: 'career_insight', label: 'AI Resume & Career Analyzer', desc: 'Pinpoint gaps in experience, education, and receive career tips' },
                    { id: 'improve_skills', label: 'Student Challenges & IQ Tests', desc: 'Take skill challenges, earn XP points, and climb the leaderboard' }
                  ].map((action) => {
                    const isChecked = helpActions.includes(action.id);
                    return (
                      <div
                        key={action.id}
                        onClick={() => toggleHelpAction(action.id)}
                        className={`w-full text-left p-4 rounded-2xl border transition-all flex items-center gap-3.5 cursor-pointer ${
                          isChecked ? 'border-indigo-600 bg-indigo-50/40 text-indigo-700 shadow-sm' : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${
                          isChecked ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300'
                        }`}>
                          {isChecked && <Check size={14} className="stroke-[3]" />}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-800 text-xs font-black uppercase tracking-wider">{action.label}</h4>
                          <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{action.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {currentStep === 5 && (
              <motion.div 
                key="step5"
                variants={stepVariants}
                initial="hidden"
                animate="visible"
                exit="exit"
                className="space-y-6"
              >
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-emerald-50 rounded-full border border-emerald-100 text-emerald-500 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle2 size={36} className="animate-pulse" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">
                    Onboarding <span className="text-emerald-500">Completed!</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-black">All preferences are ready for submission</p>
                </div>

                <div className="p-5 bg-slate-50 rounded-2xl border border-slate-150 space-y-3.5 text-xs">
                  <span className="font-black text-slate-400 uppercase tracking-widest block mb-1">Configuration Dossier</span>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-400 font-medium">Candidate Name:</span>
                    <span className="font-bold text-slate-800">{fullName}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-400 font-medium">Job hunt Status:</span>
                    <span className="font-bold text-slate-700 capitalize">{status.replace('_', ' ')}</span>
                  </div>
                  <div className="flex justify-between border-b border-slate-100 pb-2">
                    <span className="text-slate-400 font-medium">Domain:</span>
                    <span className="font-bold text-slate-700">{industry}</span>
                  </div>
                  <div className="flex justify-between pb-1">
                    <span className="text-slate-400 font-medium">Platform Tracks:</span>
                    <span className="font-bold text-indigo-600 block text-right max-w-[200px] truncate">{helpActions.length} segments selected</span>
                  </div>
                </div>

                <div className="p-4 bg-indigo-50 border border-indigo-100 text-[11px] text-indigo-700 leading-relaxed rounded-2xl flex gap-2.5 items-start">
                  <Award size={18} className="text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block uppercase tracking-wide">🏆 500 XP Points Credited</span>
                    By initiating your TalentBridge student onboarding profile, we have safely credited your account with standard 500 XP base points!
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation bottom buttons */}
        <div className="flex items-center justify-between border-t border-slate-100 pt-6 mt-8">
          <button
            onClick={prevStep}
            disabled={currentStep === 1 || isSubmitting}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-xl transition-all ${
              currentStep === 1 
                ? 'opacity-0 cursor-default' 
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <ChevronLeft size={16} /> Back
          </button>

          {currentStep < totalSteps ? (
            <button
              onClick={nextStep}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-200 transition-all cursor-pointer"
            >
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleCompleteOnboarding}
              disabled={isSubmitting}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest rounded-xl flex items-center gap-1.5 shadow-md shadow-emerald-200 transition-all cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? "Saving Preferences..." : "Complete Session"} <CheckCircle2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Under footer text */}
      <p className="text-[10px] text-slate-400 text-center mt-6">
        Autonomous Talent & Placement Platform. Dynamic OAuth & Proctored Video Call compliant.
      </p>
    </div>
  );
}
