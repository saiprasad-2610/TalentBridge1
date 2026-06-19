import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext.tsx";
import api from "../../services/api.ts";
import { 
  ArrowLeft, Save, Briefcase, MapPin, Sparkles, Plus, Trash2, 
  Loader2, AlertCircle, Calendar, DollarSign, ListTodo, GraduationCap, CheckCircle
} from "lucide-react";
import { motion } from "motion/react";
import { toast } from "react-hot-toast";

export function JobPostingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [companyId, setCompanyId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "Remote",
    jobType: "FULL_TIME",
    experienceLevel: "Entry Level",
    salaryRange: "",
    educationRequirement: "",
    responsibilities: "",
    qualifications: "",
    additionalNotes: "",
    startDate: new Date().toISOString().split("T")[0],
    deadline: "",
    skillsInput: "",
  });

  const [stages, setStages] = useState<any[]>([
    { name: "Application Screening", type: "APPLICATION", description: "Review of student credentials and tech stacks" },
    { name: "Technical Fit Test", type: "TEST", description: "Standardized cognitive skill evaluation round" },
    { name: "Live Video Interview", type: "INTERVIEW", description: "Secure WebRTC visual coding assessment" }
  ]);

  useEffect(() => {
    const fetchCompanyProfile = async () => {
      if (!user) return;
      try {
        const { data } = await api.get(`/companies/profile/${user.id}`);
        if (data.success && data.data) {
          setCompanyId(data.data.id);
        } else {
          toast.error("Company verification status required.");
        }
      } catch (err) {
        console.error("Error fetching company details:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCompanyProfile();
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const addStage = () => {
    setStages(prev => [...prev, { name: "New Stage", type: "APPLICATION", description: "Standard applicant review track" }]);
  };

  const removeStage = (index: number) => {
    if (stages.length <= 1) {
      toast.error("At least one stage is required.");
      return;
    }
    setStages(prev => prev.filter((_, i) => i !== index));
  };

  const updateStage = (index: number, field: string, value: string) => {
    setStages(prev => prev.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyId) {
      toast.error("Company profile is missing. Please complete setup in profile first.");
      return;
    }

    if (!formData.title || !formData.description) {
      toast.error("Position Title and Description are required.");
      return;
    }

    setSaving(true);
    try {
      const skills = formData.skillsInput
        .split(",")
        .map(s => s.trim())
        .filter(s => s.length > 0);

      const payload = {
        companyId,
        title: formData.title,
        description: formData.description,
        skills,
        location: formData.location,
        jobType: formData.jobType,
        experienceLevel: formData.experienceLevel,
        salaryRange: formData.salaryRange,
        educationRequirement: formData.educationRequirement,
        responsibilities: formData.responsibilities,
        qualifications: formData.qualifications,
        additionalNotes: formData.additionalNotes,
        startDate: formData.startDate,
        deadline: formData.deadline || null,
        stages
      };

      const { data } = await api.post("/jobs", payload);
      if (data.success) {
        toast.success("Job posting published successfully!");
        navigate("/company/jobs");
      } else {
        toast.error(data.message || "Failed to post job.");
      }
    } catch (err: any) {
      console.error("Job posting error:", err);
      toast.error(err.response?.data?.message || "Server rejected posting parameters.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-blue-600" size={36} />
        <p className="text-xs font-mono text-slate-500 uppercase tracking-widest">Assembling Entry Forms...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 min-h-screen pb-12 font-sans">
      {/* Header */}
      <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
        <button 
          onClick={() => navigate("/company/jobs")}
          className="p-3 bg-white border border-slate-100 hover:border-slate-200 text-slate-600 rounded-2xl hover:scale-105 active:scale-95 transition-all cursor-pointer"
        >
          <ArrowLeft size={16} />
        </button>
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight">Post New Position</h1>
          <p className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mt-1">Design cognitive assessment flows and requirements</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Core details */}
        <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-4">
            <Briefcase size={18} className="text-blue-500" />
            <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Position Specs</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Job Title *</label>
              <input
                type="text"
                name="title"
                required
                placeholder="Product Software Developer, QA Analyst etc."
                value={formData.title}
                onChange={handleChange}
                className="w-full bg-slate-50 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest outline-none border border-transparent focus:border-blue-505 focus:bg-white transition-all placeholder:text-slate-300"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Position Overview *</label>
              <textarea
                name="description"
                required
                rows={4}
                placeholder="Detail high-priority role expectations and deliverables..."
                value={formData.description}
                onChange={handleChange}
                className="w-full bg-slate-50 rounded-xl px-4 py-3 text-xs font-bold outline-none border border-transparent focus:border-blue-505 focus:bg-white transition-all placeholder:text-slate-300"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</label>
              <input
                type="text"
                name="location"
                placeholder="Mumbai, Bangalore or 'Remote'"
                value={formData.location}
                onChange={handleChange}
                className="w-full bg-slate-50 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest outline-none border border-transparent focus:border-blue-505 focus:bg-white transition-all placeholder:text-slate-300"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Position Type</label>
              <select
                name="jobType"
                value={formData.jobType}
                onChange={handleChange}
                className="w-full bg-slate-50 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="FULL_TIME">Full-Time Placement</option>
                <option value="INTERNSHIP">Internship Track</option>
                <option value="CONTRACT">Contract Work</option>
                <option value="PART_TIME">Part-Time</option>
                <option value="REMOTE">Remote Exclusive</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Required Skills (Comma separated)</label>
              <input
                type="text"
                name="skillsInput"
                placeholder="React, TypeScript, Node.js, SQLite"
                value={formData.skillsInput}
                onChange={handleChange}
                className="w-full bg-slate-50 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest outline-none border border-transparent focus:border-blue-505 focus:bg-white transition-all placeholder:text-slate-300"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Salary Allocation</label>
              <input
                type="text"
                name="salaryRange"
                placeholder="e.g. 12-16 LPA or $90k-$110k"
                value={formData.salaryRange}
                onChange={handleChange}
                className="w-full bg-slate-50 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest outline-none border border-transparent focus:border-blue-505 focus:bg-white transition-all placeholder:text-slate-300"
              />
            </div>
          </div>
        </div>

        {/* Requirements */}
        <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="flex items-center gap-2 border-b border-slate-50 pb-4">
            <GraduationCap size={18} className="text-blue-500" />
            <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Candidate Filters</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Experience Range</label>
              <select
                name="experienceLevel"
                value={formData.experienceLevel}
                onChange={handleChange}
                className="w-full bg-slate-50 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="Entry Level">Entry Level (0-1 yrs)</option>
                <option value="Mid Level">Mid Level (2-4 yrs)</option>
                <option value="Senior">Senior Professional (5+ yrs)</option>
                <option value="Graduate Trainee">Graduate Trainee / Fresher</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Application Deadline</label>
              <input
                type="date"
                name="deadline"
                value={formData.deadline}
                onChange={handleChange}
                className="w-full bg-slate-50 rounded-xl px-4 py-3 text-xs font-black outline-none border border-transparent focus:border-blue-505 focus:bg-white transition-all text-slate-650"
              />
            </div>

            <div className="col-span-2 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Education Track</label>
              <input
                type="text"
                name="educationRequirement"
                placeholder="B.Tech Computer Science, MCA, Bachelor's in STEM etc."
                value={formData.educationRequirement}
                onChange={handleChange}
                className="w-full bg-slate-50 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-widest outline-none border border-transparent focus:border-blue-505 focus:bg-white transition-all placeholder:text-slate-300"
              />
            </div>
          </div>
        </div>

        {/* Evaluation Stages */}
        <div className="bg-white border border-slate-100 rounded-3xl p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4">
            <div className="flex items-center gap-2">
              <ListTodo size={18} className="text-blue-500" />
              <h3 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Evaluation Board Stages</h3>
            </div>
            <button
              type="button"
              onClick={addStage}
              className="text-xs font-black uppercase text-blue-600 hover:text-blue-700 tracking-wider flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Plus size={14} /> Add custom stage
            </button>
          </div>

          <div className="space-y-4">
            {stages.map((stage, idx) => (
              <div key={idx} className="bg-slate-50/50 border border-slate-100 p-5 rounded-2xl flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex-1 space-y-3 w-full">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      value={stage.name}
                      placeholder={`Stage ${idx + 1} Name`}
                      onChange={(e) => updateStage(idx, "name", e.target.value)}
                      className="flex-1 bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-bold"
                    />
                    <select
                      value={stage.type}
                      onChange={(e) => updateStage(idx, "type", e.target.value)}
                      className="bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest"
                    >
                      <option value="APPLICATION">Resume Application</option>
                      <option value="TEST">Cognitive test round</option>
                      <option value="INTERVIEW">Live WebRTC Camera Interview</option>
                      <option value="SHORTLIST">Review Shortlist</option>
                    </select>
                  </div>
                  <input
                    type="text"
                    value={stage.description}
                    placeholder="Brief objective of this hiring phase..."
                    onChange={(e) => updateStage(idx, "description", e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs"
                  />
                </div>
                
                <button
                  type="button"
                  onClick={() => removeStage(idx)}
                  className="p-3 text-red-500 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            onClick={() => navigate("/company/jobs")}
            className="px-6 py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-[20px] text-xs font-black uppercase tracking-widest transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-8 py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-[20px] text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {saving ? (
              <>
                <Loader2 className="animate-spin" size={16} /> Publishing...
              </>
            ) : (
              <>
                <Save size={16} /> Launch Opportunity
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default JobPostingPage;
