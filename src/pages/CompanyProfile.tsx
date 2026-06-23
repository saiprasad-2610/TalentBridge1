import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext.tsx";
import api from "../services/api.ts";
import { 
  ArrowLeft, Save, Building2, Globe, Mail, Phone, 
  MapPin, Linkedin, Github, CheckCircle2, AlertCircle, 
  Upload, FileText, ChevronRight, ChevronLeft, LayoutGrid, 
  Factory, Users, Calendar, ShieldCheck, Briefcase, FileCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";

export function CompanyProfile() {
  const { user, profile, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState({
    company_name: "",
    logo_url: "",
    website: "",
    company_email: "",
    contact_number: "",
    company_type: "",
    industry: "",
    company_size: "",
    year_established: "" as any,
    business_name: "",
    gst_no: "",
    cin_no: "",
    pan_no: "",
    address: "",
    operating_address: "",
    country: "India",
    state: "",
    city: "",
    about: "",
    services: "",
    linkedin_url: "",
    github_url: ""
  });

  const [documents, setDocuments] = useState<any[]>([]);
  const [completeness, setCompleteness] = useState(0);

  useEffect(() => {
    fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    try {
      const { data } = await api.get(`/companies/profile/${user.id}`);
      if (data.success && data.data) {
        const p = data.data;
        setFormData({
          company_name: p.company_name || "",
          logo_url: p.logo_url || "",
          website: p.website || "",
          company_email: p.company_email || "",
          contact_number: p.contact_number || "",
          company_type: p.company_type || "",
          industry: p.industry || "",
          company_size: p.company_size || "",
          year_established: p.year_established || "",
          business_name: p.business_name || "",
          gst_no: p.gst_no || "",
          cin_no: p.cin_no || "",
          pan_no: p.pan_no || "",
          address: p.address || "",
          operating_address: p.operating_address || "",
          country: p.country || "India",
          state: p.state || "",
          city: p.city || "",
          about: p.about || "",
          services: p.services || "",
          linkedin_url: p.linkedin_url || "",
          github_url: p.github_url || ""
        });
        setDocuments(p.documents || []);
        setCompleteness(p.completeness_score || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateDynamicCompleteness = () => {
    let score = 0;
    
    // 1. Basic Identity (20%)
    if (formData.company_name) score += 5;
    if (formData.logo_url) score += 5;
    if (formData.website) score += 5;
    if (formData.company_email && formData.contact_number) score += 5;

    // 2. Business & Legal Details (30%)
    if (formData.business_name) score += 5;
    if (formData.gst_no) score += 10;
    if (formData.cin_no || formData.pan_no) score += 5;
    if (formData.address && formData.city) score += 10;

    // 3. Verification Documents (30%)
    const hasGst = documents.some(d => d.doc_type === 'GST Certificate');
    const hasReg = documents.some(d => d.doc_type === 'Business Registration Certificate');
    const hasPan = documents.some(d => d.doc_type === 'PAN Card');
    
    if (hasGst) score += 10;
    if (hasReg) score += 10;
    if (hasPan) score += 10;

    // 4. Company Narrative & Social (20%)
    if (formData.about && formData.about.length > 200) score += 10;
    else if (formData.about && formData.about.length > 50) score += 5;
    
    if (formData.linkedin_url || formData.github_url) score += 10;

    return Math.min(100, score);
  };

  useEffect(() => {
    setCompleteness(calculateDynamicCompleteness());
  }, [formData, documents]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      if (type === 'logo') {
        setFormData(prev => ({ ...prev, logo_url: base64 }));
      } else {
        try {
          const { data } = await api.post(`/companies/profile/${user?.id}/documents`, {
            doc_type: type,
            doc_url: base64
          });
          if (data.success) {
            setDocuments(prev => {
              const others = prev.filter(d => d.doc_type !== type);
              return [...others, { doc_type: type, status: 'PENDING' }];
            });
            setCompleteness(data.score);
          }
        } catch (err) {
          alert("Failed to upload document");
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async (silent = false) => {
    setSaving(true);
    try {
      const { data } = await api.put(`/companies/profile/${user?.id}`, formData);
      if (data.success) {
        if (!silent) alert("Progress saved!");
        const updated = { ...profile, ...formData, completeness_score: data.score };
        updateProfile(updated);
      }
    } catch (err) {
      console.error(err);
      if (!silent) alert("Failed to save progress");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitVerification = async () => {
    if (completeness < 80) {
      alert("Please complete at least 80% of your profile including mandatory documents to submit for verification.");
      return;
    }
    setSaving(true);
    try {
      const { data } = await api.post(`/companies/profile/${user?.id}/submit`);
      if (data.success) {
        alert("Profile submitted successfully! Admin will review your details.");
        updateProfile({ ...profile, status: 'PENDING', is_submitted: 1 });
      }
    } catch (err: any) {
      alert(err.response?.data?.message || "Submission failed");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              <ArrowLeft size={20} className="text-slate-600" />
            </button>
            <div>
               <h1 className="text-lg font-black text-slate-800 uppercase tracking-tight">Company Hub</h1>
               <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div animate={{ width: `${completeness}%` }} className="h-full bg-blue-600" />
                  </div>
                  <span className="text-[10px] font-black text-blue-600 uppercase">{completeness}% Complete</span>
               </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button 
               onClick={() => handleSave()}
               disabled={saving}
               className="px-6 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-50 transition-all disabled:opacity-50"
             >
               Save Progress
             </button>
             {completeness >= 80 && profile?.status !== 'PENDING' && profile?.status !== 'APPROVED' && (
               <button 
                onClick={handleSubmitVerification}
                className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold text-sm shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all"
               >
                 Submit for Verification
               </button>
             )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 mt-12">
        {/* Verification Status Banner */}
        {profile?.status !== 'APPROVED' && (
          <div className="mb-8 p-6 bg-amber-50/70 border border-amber-200/60 rounded-3xl backdrop-blur-sm shadow-sm flex items-start gap-4">
            <div className="p-3 bg-amber-500 text-white rounded-2xl shrink-0">
              <ShieldCheck size={24} className="animate-pulse" />
            </div>
            <div className="space-y-1">
              {profile?.status === 'PENDING' ? (
                <>
                  <h3 className="text-sm font-black text-amber-900 uppercase tracking-wider">Verification in Progress</h3>
                  <p className="text-xs text-amber-700 font-medium leading-relaxed">
                    Your company profile has been submitted and is currently being reviewed by our administrative board. We are validating your GST details, corporate registry (CIN), and physical workspace details. During this period, other workspace dashboards remain locked.
                  </p>
                </>
              ) : profile?.status === 'REJECTED' ? (
                <div className="space-y-1.5">
                  <h3 className="text-sm font-black text-red-800 uppercase tracking-wider">Verification Rejected</h3>
                  <p className="text-xs text-red-600 font-medium leading-relaxed">
                    Our administrative team has rejected your verification request. Please review and update your credentials and submit again.
                  </p>
                  {profile?.rejection_reason && (
                    <div className="mt-2 p-3 bg-red-100/50 border border-red-200 rounded-xl">
                      <p className="text-xs font-mono font-bold text-red-700">Reason: {profile.rejection_reason}</p>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Account Locked • Verification Required</h3>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                    To activate your brand's recruiter workspace and build premium pipelines, please complete your profile details to at least <strong className="text-blue-600">80% progress</strong> (representing GST registration, business address, and required verification stamps), and click <strong className="text-slate-900">"Submit for Verification"</strong> in the header controls.
                  </p>
                </>
              )}
            </div>
          </div>
        )}

        <div className="mb-12 flex justify-between relative bg-white/40 p-4 rounded-2xl backdrop-blur">
           <div className="absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 -translate-y-1/2 -z-10" />
           {[1, 2, 3, 4, 5].map((s) => (
             <div 
               key={s} 
               onClick={() => setStep(s)}
               className={`w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition-all border-4 ${step === s ? 'bg-blue-600 text-white border-blue-100 scale-125' : s < step ? 'bg-emerald-500 text-white border-emerald-100' : 'bg-white text-slate-400 border-slate-50'}`}
             >
               {s < step ? <CheckCircle2 size={20} /> : <span className="font-black text-sm">{s}</span>}
             </div>
           ))}
        </div>

        <div className="bg-white rounded-[40px] border border-slate-200 shadow-xl shadow-slate-200/50 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="p-12"
            >
              {step === 1 && (
                <div className="space-y-8">
                   <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                         <Building2 size={32} />
                      </div>
                      <div>
                         <h2 className="text-3xl font-black text-slate-800 tracking-tight">Basic Information</h2>
                         <p className="text-slate-500 text-sm">Tell us the public details about your organization.</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="md:col-span-2 flex items-center gap-8 p-6 bg-slate-50 rounded-3xl border border-slate-100">
                         <div className="relative group">
                            <div className="w-24 h-24 bg-white rounded-3xl overflow-hidden border-2 border-slate-200 shadow-sm flex items-center justify-center">
                               {formData.logo_url ? <img src={formData.logo_url} className="w-full h-full object-contain" /> : <Building2 size={32} className="text-slate-300" />}
                            </div>
                            <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-blue-600 text-white rounded-xl flex items-center justify-center cursor-pointer hover:scale-110 transition-transform">
                               <Upload size={14} />
                               <input type="file" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e, 'logo')} />
                            </label>
                         </div>
                         <div>
                            <h3 className="font-black text-slate-800 text-lg">Company Logo</h3>
                            <p className="text-xs text-slate-500">SVG, PNG, or JPG (max 2MB)</p>
                         </div>
                      </div>

                      <Input label="Company Name" placeholder="e.g. Acme Innovations" value={formData.company_name} onChange={v => setFormData({...formData, company_name: v})} icon={<Building2 size={16} />} />
                      <Input label="Official Website" placeholder="https://acme.com" value={formData.website} onChange={v => setFormData({...formData, website: v})} icon={<Globe size={16} />} />
                      <Input label="Official Email" placeholder="hr@acme.com" value={formData.company_email} onChange={v => setFormData({...formData, company_email: v})} icon={<Mail size={16} />} />
                      <Input label="Contact Number" placeholder="+91 XXXXX XXXXX" value={formData.contact_number} onChange={v => setFormData({...formData, contact_number: v})} icon={<Phone size={16} />} />
                      
                      <Select 
                        label="Company Type" 
                        value={formData.company_type} 
                        onChange={v => setFormData({...formData, company_type: v})}
                        options={['Startup', 'MNC', 'SME', 'Government', 'Agency']}
                        icon={<LayoutGrid size={16} />}
                      />
                      <Select 
                        label="Industry" 
                        value={formData.industry} 
                        onChange={v => setFormData({...formData, industry: v})}
                        options={['IT & Software', 'Finance', 'Healthcare', 'Education', 'Manufacturing', 'Retail']}
                        icon={<Factory size={16} />}
                      />
                      <Select 
                        label="Company Size" 
                        value={formData.company_size} 
                        onChange={v => setFormData({...formData, company_size: v})}
                        options={['1-10', '10-50', '50-200', '200-500', '500+']}
                        icon={<Users size={16} />}
                      />
                      <Input label="Year Established" placeholder="e.g. 2015" value={formData.year_established} onChange={v => setFormData({...formData, year_established: v})} icon={<Calendar size={16} />} />
                   </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-8">
                   <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl">
                         <ShieldCheck size={32} />
                      </div>
                      <div>
                         <h2 className="text-3xl font-black text-slate-800 tracking-tight">Business Details</h2>
                         <p className="text-slate-500 text-sm">Required for tax and verification purposes.</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <Input label="Registered Business Name" placeholder="As per GST/PAN" value={formData.business_name} onChange={v => setFormData({...formData, business_name: v})} icon={<Building2 size={16} />} />
                      <Input label="GST Number" placeholder="22AAAAA0000A1Z5" value={formData.gst_no} onChange={v => setFormData({...formData, gst_no: v})} icon={<ShieldCheck size={16} />} />
                      <Input label="CIN Number (Optional)" placeholder="U72200MH2021PTC..." value={formData.cin_no} onChange={v => setFormData({...formData, cin_no: v})} icon={<ShieldCheck size={16} />} />
                      <Input label="PAN Number" placeholder="ABCDE1234F" value={formData.pan_no} onChange={v => setFormData({...formData, pan_no: v})} icon={<ShieldCheck size={16} />} />
                      
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Registered Address</label>
                        <textarea 
                          rows={3} 
                          value={formData.address}
                          onChange={e => setFormData({...formData, address: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-4 outline-none focus:ring-4 focus:ring-blue-50 text-sm font-medium resize-none transition-all"
                          placeholder="Full registered office address..."
                        />
                      </div>

                      <Input label="City" placeholder="Mumbai" value={formData.city} onChange={v => setFormData({...formData, city: v})} icon={<MapPin size={16} />} />
                      <Input label="State" placeholder="Maharashtra" value={formData.state} onChange={v => setFormData({...formData, state: v})} icon={<MapPin size={16} />} />
                   </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-8">
                   <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl">
                         <FileText size={32} />
                      </div>
                      <div>
                         <h2 className="text-3xl font-black text-slate-800 tracking-tight">Company Story</h2>
                         <p className="text-slate-500 text-sm">Tell potential employees why they should join you.</p>
                      </div>
                   </div>

                   <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex justify-between">
                          <span>About Company</span>
                          <span className={formData.about?.length >= 200 ? 'text-emerald-500' : 'text-slate-400'}>
                             {Math.min(100, Math.round((formData.about?.length || 0) / 2))}% towards goal
                          </span>
                        </label>
                        <textarea 
                          rows={8} 
                          value={formData.about}
                          onChange={e => setFormData({...formData, about: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-6 py-6 outline-none focus:ring-4 focus:ring-blue-50 text-sm font-medium leading-relaxed transition-all"
                          placeholder="Describe your company values, history, and mission... (Min 100 words/500 characters recommended)"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Products & Services</label>
                        <textarea 
                          rows={4} 
                          value={formData.services}
                          onChange={e => setFormData({...formData, services: e.target.value})}
                          className="w-full bg-slate-50 border border-slate-200 rounded-3xl px-6 py-6 outline-none focus:ring-4 focus:ring-blue-50 text-sm font-medium resize-none transition-all"
                          placeholder="What does your company build or provide?"
                        />
                      </div>
                   </div>
                </div>
              )}

              {step === 4 && (
                <div className="space-y-8">
                   <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-slate-100 text-slate-600 rounded-2xl">
                         <LayoutGrid size={32} />
                      </div>
                      <div>
                         <h2 className="text-3xl font-black text-slate-800 tracking-tight">Online Presence</h2>
                         <p className="text-slate-500 text-sm">Help us verify your authenticity via social channels.</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <Input label="LinkedIn Page" placeholder="linkedin.com/company/acme" value={formData.linkedin_url} onChange={v => setFormData({...formData, linkedin_url: v})} icon={<Linkedin size={16} />} />
                      <Input label="GitHub Organization" placeholder="github.com/acme" value={formData.github_url} onChange={v => setFormData({...formData, github_url: v})} icon={<Github size={16} />} />
                   </div>
                </div>
              )}

              {step === 5 && (
                <div className="space-y-8">
                   <div className="flex items-center gap-4 mb-4">
                      <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl">
                         <FileCheck size={32} />
                      </div>
                      <div>
                         <h2 className="text-3xl font-black text-slate-800 tracking-tight">Verification Documents</h2>
                         <p className="text-slate-500 text-sm">Upload official certificates for quick approval.</p>
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <DocUpload 
                        label="GST Certificate" 
                        required 
                        active={documents.some(d => d.doc_type === 'GST Certificate')} 
                        onUpload={(e) => handleFileChange(e, 'GST Certificate')}
                      />
                      <DocUpload 
                        label="Registration Cert" 
                        required 
                        active={documents.some(d => d.doc_type === 'Business Registration Certificate')} 
                        onUpload={(e) => handleFileChange(e, 'Business Registration Certificate')}
                      />
                      <DocUpload 
                        label="PAN Card Copy" 
                        active={documents.some(d => d.doc_type === 'PAN Card')} 
                        onUpload={(e) => handleFileChange(e, 'PAN Card')}
                      />
                      <DocUpload 
                        label="Incorporation Cert" 
                        active={documents.some(d => d.doc_type === 'Incorporation Certificate')} 
                        onUpload={(e) => handleFileChange(e, 'Incorporation Certificate')}
                      />
                   </div>
                   
                   <div className="p-6 bg-amber-50 border border-amber-100 rounded-3xl flex gap-4">
                      <AlertCircle className="text-amber-500 shrink-0" size={24} />
                      <div className="space-y-1">
                         <h4 className="font-bold text-amber-900 text-sm uppercase tracking-tight">Important Note</h4>
                         <p className="text-xs text-amber-700 leading-relaxed">
                            Upload documents in PDF format only. Maximum file size allowed is 5MB. Clear, original scans ensure 2x faster verification. Self-attested copies are preferred.
                         </p>
                      </div>
                   </div>
                </div>
              )}

              <div className="mt-12 pt-12 border-t border-slate-100 flex items-center justify-between">
                 <button 
                   disabled={step === 1}
                   onClick={() => setStep(step - 1)}
                   className="flex items-center gap-2 text-slate-400 hover:text-slate-600 font-bold uppercase tracking-widest text-xs disabled:opacity-0 transition-all"
                 >
                   <ChevronLeft size={16} /> Back
                 </button>
                 
                 {step < 5 ? (
                   <button 
                     onClick={() => setStep(step + 1)}
                     className="flex items-center gap-3 bg-blue-600 text-white px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-500/20 hover:bg-blue-700 transition-all"
                   >
                     Continue <ChevronRight size={16} />
                   </button>
                 ) : (
                   <button 
                     onClick={handleSubmitVerification}
                     className="flex items-center gap-3 bg-slate-900 text-white px-8 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-slate-900/20 hover:bg-slate-800 transition-all"
                   >
                     Submit to Admin <CheckCircle2 size={16} />
                   </button>
                 ) }
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

function Input({ label, placeholder, value, onChange, icon, type = "text" }: any) {
  return (
    <div className="space-y-2 group">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{label}</label>
      <div className="relative">
         <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors">
            {icon}
         </div>
         <input 
           type={type}
           value={value}
           onChange={e => onChange(e.target.value)}
           placeholder={placeholder}
           className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-5 py-4 outline-none focus:ring-4 focus:ring-blue-50 text-sm font-medium transition-all hover:border-slate-300"
         />
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options, icon }: any) {
  return (
    <div className="space-y-2 group">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{label}</label>
      <div className="relative">
         <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors pointer-events-none">
            {icon}
         </div>
         <select 
           value={value}
           onChange={e => onChange(e.target.value)}
           className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-12 pr-5 py-4 outline-none focus:ring-4 focus:ring-blue-50 text-sm font-medium transition-all hover:border-slate-300 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236B7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem_1.25rem] bg-[right_1.25rem_center] bg-no-repeat cursor-pointer"
         >
           <option value="">Select {label}</option>
           {options.map((o: any) => <option key={o} value={o}>{o}</option>)}
         </select>
      </div>
    </div>
  );
}

function DocUpload({ label, required, active, onUpload }: any) {
  return (
    <div className={`p-6 rounded-3xl border-2 transition-all group ${active ? 'bg-emerald-50/50 border-emerald-200' : 'bg-slate-50 border-slate-100 hover:border-blue-400 hover:bg-white border-dashed'}`}>
       <div className="flex items-center justify-between mb-4">
          <div className={`p-2 rounded-xl ${active ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
             <FileText size={20} />
          </div>
          {required && <span className="text-[9px] font-black uppercase text-red-500 bg-red-50 px-2 py-0.5 rounded">Required</span>}
       </div>
       <h4 className="font-bold text-slate-800 text-sm">{label}</h4>
       {active ? (
         <div className="mt-3 flex items-center gap-1.5 text-emerald-600 font-bold text-[10px] uppercase">
            <CheckCircle2 size={12} /> Uploaded Successfully
         </div>
       ) : (
         <label className="mt-3 block text-[10px] font-black text-blue-600 uppercase tracking-widest cursor-pointer hover:underline">
            Click to upload PDF
            <input type="file" className="hidden" accept=".pdf" onChange={onUpload} />
         </label>
       )}
    </div>
  );
}