import { useState } from "react";
import { useAuth } from "../../context/AuthContext.tsx";
import api from "../../services/api.ts";
import { 
  Plus, X, Calendar, MapPin, Sparkles, ChevronLeft, LayoutGrid, CheckCircle, Clock, ShieldCheck, 
  BrainCircuit, Briefcase, GraduationCap, Target, Settings, Zap, ArrowRight, Copy, Save
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

export function JobPostingPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState<string | null>(null);
  const [questionEditorStage, setQuestionEditorStage] = useState<number | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    location: "Remote",
    jobType: "Full-time",
    experienceLevel: "Entry Level",
    skills: [] as string[],
    skillInput: "",
    description: "",
    responsibilities: "",
    qualifications: "",
    additionalNotes: "",
    startDate: new Date().toISOString().split('T')[0],
    deadline: "",
    salaryRange: "",
    aiMatchCutoff: 60, // AI Screening Cutoff
    autoReject: false
  });

  // Hiring Stages State
  const [stages, setStages] = useState([
    { id: 1, name: "Applied", description: "Initial resume screening via AI", type: "APPLICATION", canDelete: false, config: {}, questions: [] },
    { id: 2, name: "Technical Assessment", description: "Coding & Logic round", type: "TEST", canDelete: true, config: { duration: 45, passScore: 70 }, questions: [] },
    { id: 3, name: "Technical Interview", description: "Live face-to-face evaluation", type: "INTERVIEW_ONLINE", canDelete: true, config: {}, questions: [] },
    { id: 4, name: "HR Interview", description: "Cultural fit & package discussion", type: "INTERVIEW_ONLINE", canDelete: true, config: {}, questions: [] },
    { id: 5, name: "Offer & Selected", description: "Final hiring decision", type: "APPLICATION", canDelete: false, config: {}, questions: [] }
  ]);

  const handleAddSkill = (e: any) => {
    e.preventDefault();
    if (formData.skillInput.trim() && !formData.skills.includes(formData.skillInput.trim())) {
      setFormData({
        ...formData,
        skills: [...formData.skills, formData.skillInput.trim()],
        skillInput: ""
      });
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({ ...formData, skills: formData.skills.filter(s => s !== skill) });
  };

  const addStage = () => {
    const newStage = { id: Date.now(), name: "New Round", description: "", type: "APPLICATION", canDelete: true, config: {}, questions: [] };
    const selectedIdx = stages.findIndex(s => s.name.includes("Selected") || !s.canDelete && s.id !== 1);
    const newStages = [...stages];
    if (selectedIdx !== -1) {
       newStages.splice(selectedIdx, 0, newStage);
    } else {
       newStages.push(newStage);
    }
    setStages(newStages);
  };

  const generateWithAI = async (field: 'description' | 'responsibilities' | 'qualifications') => {
    if (!formData.title) {
       toast.error("Please enter a Job Title first for AI context.");
       return;
    }
    setIsGeneratingAI(field);
    
    // Simulate AI generation delay
    await new Promise(r => setTimeout(r, 2000));
    
    let generated = "";
    if (field === 'description') {
       generated = `We are seeking an exceptional ${formData.title} to join our dynamic team. You will play a crucial role in shaping our core product experience, working alongside a talented cross-functional team of engineers and designers to build scalable, high-performance solutions. If you are passionate about innovation and user-centric problem solving, this is the perfect opportunity.`;
    } else if (field === 'responsibilities') {
       generated = `• Architect, build, and maintain highly scalable web applications.\n• Collaborate with cross-functional teams to define and launch new features.\n• Ensure the technical feasibility of UI/UX designs.\n• Optimize application for maximum speed and scalability.\n• Participate in code reviews and mentor junior developers.`;
    } else if (field === 'qualifications') {
       generated = `• Proven experience working as a ${formData.title} or similar role.\n• Deep understanding of modern web architectures and frameworks.\n• Strong problem resolution skills and algorithmic thinking.\n• Excellent communication skills and ability to work in a fast-paced agile environment.\n• BS/MS in Computer Science or relevant real-world experience.`;
    }
    
    setFormData(prev => ({ ...prev, [field]: generated }));
    setIsGeneratingAI(null);
    toast.success(`AI Generated ${field} successfully!`);
  };

  const autoSuggestSkills = () => {
     if (!formData.title) return toast.error("Enter a job title first");
     const role = formData.title.toLowerCase();
     let suggestions = ['Communication', 'Teamwork', 'Agile'];
     if (role.includes('react') || role.includes('frontend')) suggestions = [...suggestions, 'React.js', 'TypeScript', 'Tailwind CSS', 'Redux'];
     if (role.includes('node') || role.includes('backend')) suggestions = [...suggestions, 'Node.js', 'Express', 'MongoDB', 'PostgreSQL'];
     if (role.includes('data')) suggestions = [...suggestions, 'Python', 'SQL', 'Machine Learning', 'Pandas'];
     
     const newSkills = [...new Set([...formData.skills, ...suggestions])];
     setFormData(prev => ({...prev, skills: newSkills}));
     toast.success("AI suggested skills added!");
  };

  const loadWorkflowTemplate = (type: string) => {
     if(type === 'engineering') {
        setStages([
           { id: 1, name: "Applied", description: "AI Match Screening", type: "APPLICATION", canDelete: false, config: {}, questions: [] },
           { id: 2, name: "Take-home Assessment", description: "Algorithm & System Design", type: "TEST", canDelete: true, config: { duration: 90, passScore: 75 }, questions: [] },
           { id: 3, name: "Technical Deep Dive", description: "1-on-1 with Staff Engineer", type: "INTERVIEW_ONLINE", canDelete: true, config: {}, questions: [] },
           { id: 4, name: "Culture Fit", description: "HR & Founder chat", type: "INTERVIEW_ONLINE", canDelete: true, config: {}, questions: [] },
           { id: 5, name: "Offer", description: "Final decision", type: "APPLICATION", canDelete: false, config: {}, questions: [] }
        ]);
     } else if (type === 'campus') {
        setStages([
           { id: 1, name: "Applied", description: "Initial screening", type: "APPLICATION", canDelete: false, config: {}, questions: [] },
           { id: 2, name: "Aptitude & Logic", description: "Basic problem solving test", type: "TEST", canDelete: true, config: { duration: 45, passScore: 60 }, questions: [] },
           { id: 3, name: "Group Discussion", description: "Communication assessment", type: "INTERVIEW_OFFLINE", canDelete: true, config: {}, questions: [] },
           { id: 4, name: "Technical Interview", description: "Core concepts", type: "INTERVIEW_OFFLINE", canDelete: true, config: {}, questions: [] },
           { id: 5, name: "Selected", description: "Final decision", type: "APPLICATION", canDelete: false, config: {}, questions: [] }
        ]);
     }
     toast.success(`${type.toUpperCase()} Template applied!`);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.deadline || stages.length < 2) {
      toast.error("Please complete all mandatory fields and stages.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/jobs", {
        ...formData,
        companyId: profile?.id,
        stages: stages.map(s => ({ 
          name: s.name, description: s.description, type: s.type, config: s.config, questions: s.questions
        }))
      });
      toast.success("Job Opportunity published successfully!");
      navigate("/company/jobs");
    } catch (err) {
      toast.error("Failed to post job.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      <div className="max-w-[1200px] mx-auto px-6 py-10">
        
        {/* Header Navigation */}
        <header className="flex justify-between items-center mb-8 bg-white p-4 px-6 rounded-2xl border border-slate-200 shadow-sm sticky top-4 z-40">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-slate-500 hover:text-slate-900 transition-all font-black text-[11px] uppercase tracking-widest">
            <ChevronLeft size={16} /> Back to Dashboard
          </button>
          <div className="flex gap-2.5 items-center">
            {[1, 2, 3].map(s => (
              <div key={s} className="flex items-center">
                 <div className={`h-8 px-4 rounded-xl flex items-center justify-center font-bold text-xs transition-all ${step === s ? 'bg-indigo-600 text-white shadow-md' : step > s ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'}`}>
                    {s === 1 ? 'Details' : s === 2 ? 'Pipeline' : 'Rules & Publish'}
                 </div>
                 {s < 3 && <div className={`w-6 h-px mx-1 ${step > s ? 'bg-indigo-300' : 'bg-slate-200'}`} />}
              </div>
            ))}
          </div>
        </header>

        <div className="flex gap-8 items-start">
           
           {/* Main Content Area */}
           <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="flex-1 bg-white rounded-[32px] border border-slate-200 shadow-2xl shadow-indigo-900/5 overflow-hidden"
           >
             <div className="p-10 border-b border-slate-100 bg-gradient-to-br from-indigo-50/50 to-white relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 opacity-10"><BrainCircuit size={180} className="text-indigo-600" /></div>
               <div className="relative z-10 flex gap-5 items-center">
                   <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
                      <Sparkles size={32} />
                   </div>
                   <div>
                       <h1 className="text-2xl font-black text-slate-900 tracking-tight mb-1">Create Job Requisition</h1>
                       <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">AI-Powered Job Creation & ATS Setup</p>
                   </div>
               </div>
             </div>

             <div className="p-10 py-8">
               <AnimatePresence mode="wait">
                 {/* STEP 1: Basic Details & AI Generation */}
                 {step === 1 && (
                   <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <FormGroup label="Job Title" required>
                           <input className="form-input text-lg font-bold" placeholder="e.g. Senior Frontend Engineer" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                        </FormGroup>
                        <FormGroup label="Location & Workplace" required>
                           <div className="relative">
                             <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                             <input className="form-input pl-12" placeholder="City, State or Remote" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
                           </div>
                        </FormGroup>
                        <div className="flex gap-4">
                            <FormGroup label="Job Type" className="flex-1">
                               <select className="form-input appearance-none bg-slate-50" value={formData.jobType} onChange={e => setFormData({ ...formData, jobType: e.target.value })}>
                                 <option>Full-time</option><option>Internship</option><option>Contract</option>
                               </select>
                            </FormGroup>
                            <FormGroup label="Experience" className="flex-1">
                               <select className="form-input appearance-none bg-slate-50" value={formData.experienceLevel} onChange={e => setFormData({ ...formData, experienceLevel: e.target.value })}>
                                 <option>Fresher (0 yrs)</option><option>Entry (1-3 yrs)</option><option>Mid (3-5 yrs)</option><option>Senior (5+ yrs)</option>
                               </select>
                            </FormGroup>
                        </div>
                        <FormGroup label="Salary Range">
                           <input className="form-input" placeholder="e.g. $80k - $100k / Year" value={formData.salaryRange} onChange={e => setFormData({ ...formData, salaryRange: e.target.value })} />
                        </FormGroup>
                      </div>

                      <div className="h-px bg-slate-100 my-8" />

                      <FormGroup label="Required Skills & Tech Stack">
                         <div className="flex gap-3 mb-4">
                           <input className="form-input flex-1" placeholder="Type skill and press enter..." value={formData.skillInput} onChange={e => setFormData({ ...formData, skillInput: e.target.value })} onKeyDown={e => e.key === 'Enter' && handleAddSkill(e)} />
                           <button onClick={handleAddSkill} className="px-6 bg-slate-100 text-slate-700 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-slate-200 transition-all border border-slate-200 shadow-sm">Add</button>
                           <button onClick={autoSuggestSkills} className="px-6 bg-indigo-50 text-indigo-700 rounded-xl font-black text-[11px] uppercase tracking-widest hover:bg-indigo-100 transition-all border border-indigo-200 shadow-sm flex items-center gap-2">
                               <Sparkles size={14}/> AI Suggest
                           </button>
                         </div>
                         <div className="flex flex-wrap gap-2">
                           {formData.skills.map(s => (
                             <span key={s} className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm">
                               {s} <button onClick={() => removeSkill(s)} className="text-slate-400 hover:text-white"><X size={14} /></button>
                             </span>
                           ))}
                           {formData.skills.length === 0 && <span className="text-xs text-slate-400 font-bold px-2 py-1">No skills added yet.</span>}
                         </div>
                      </FormGroup>

                      {/* AI Enhanced Text Areas */}
                      {[
                         { id: 'description', label: 'Job Description', icon: Briefcase },
                         { id: 'responsibilities', label: 'Key Responsibilities', icon: Target },
                         { id: 'qualifications', label: 'Qualifications', icon: GraduationCap },
                      ].map(field => (
                          <div key={field.id} className="relative group">
                              <div className="flex justify-between items-end mb-2">
                                 <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <field.icon size={12}/> {field.label}
                                 </label>
                                 <button 
                                    onClick={() => generateWithAI(field.id as any)}
                                    disabled={!!isGeneratingAI}
                                    className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors border border-indigo-100 disabled:opacity-50"
                                 >
                                    {isGeneratingAI === field.id ? <><BrainCircuit size={12} className="animate-pulse" /> Generating...</> : <><Sparkles size={12} /> Auto-Draft with AI</>}
                                 </button>
                              </div>
                              <textarea 
                                className="form-input h-36 resize-none py-4 text-sm leading-relaxed"
                                placeholder={`Enter ${field.label.toLowerCase()}...`}
                                value={(formData as any)[field.id]}
                                onChange={e => setFormData({ ...formData, [field.id]: e.target.value })}
                              />
                          </div>
                      ))}

                      <div className="flex justify-end pt-4">
                         <button onClick={() => setStep(2)} className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all flex items-center gap-2">
                           Continue to ATS Workflow <ArrowRight size={16} />
                         </button>
                      </div>
                   </motion.div>
                 )}

                 {/* STEP 2: Pipeline Workflow Builder */}
                 {step === 2 && (
                   <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                      <div className="flex justify-between items-center bg-slate-900 rounded-[20px] p-6 text-white shadow-xl mb-8">
                         <div>
                            <h3 className="text-lg font-black tracking-tight flex items-center gap-2">Custom Hiring Pipeline <LayoutGrid size={18} className="text-indigo-400"/></h3>
                            <p className="text-xs text-slate-400 mt-1">Design the stages applicants will move through.</p>
                         </div>
                         <div className="flex gap-2">
                            <button onClick={() => loadWorkflowTemplate('engineering')} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl border border-slate-700 transition-colors">Engineering Template</button>
                            <button onClick={() => loadWorkflowTemplate('campus')} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-xl border border-slate-700 transition-colors">Campus Template</button>
                         </div>
                      </div>
                      
                      <div className="space-y-4">
                        {stages.map((stage, index) => (
                          <div key={index} className="flex gap-5 items-start group">
                            <div className="flex flex-col items-center mt-2 relative z-10">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shadow-md ${stage.name.includes('Selected') ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-white border-2 border-slate-200 text-slate-500'}`}>
                                {index + 1}
                              </div>
                              {index < stages.length - 1 && <div className="absolute top-8 bottom-[-40px] w-[2px] bg-slate-200 -z-10" />}
                            </div>
                            
                            <div className={`flex-1 bg-white p-5 rounded-[20px] border shadow-sm transition-all ${stage.name.includes('Selected') ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-200 hover:border-indigo-300'}`}>
                               <div className="flex justify-between items-start mb-3">
                                  <div className="flex-1 w-full">
                                    <input 
                                      className="bg-transparent border-none outline-none font-black text-slate-800 uppercase tracking-tight text-sm w-full mb-1 p-0 focus:ring-0"
                                      value={stage.name}
                                      disabled={!stage.canDelete}
                                      onChange={e => {
                                         const newStages = [...stages];
                                         newStages[index].name = e.target.value;
                                         setStages(newStages);
                                      }}
                                    />
                                    <div className="mt-1">
                                       <select 
                                         className="bg-slate-100 border border-slate-200 outline-none text-[9px] font-black uppercase text-slate-600 rounded px-2 py-1 cursor-pointer focus:ring-2 focus:ring-indigo-500/20"
                                         value={stage.type}
                                         onChange={e => {
                                            const newStages = [...stages];
                                            newStages[index].type = e.target.value;
                                            setStages(newStages);
                                         }}
                                         disabled={!stage.canDelete}
                                       >
                                         <option value="APPLICATION">Resume Review</option>
                                         <option value="TEST">Skill Assessment</option>
                                         <option value="INTERVIEW_ONLINE">Video Interview</option>
                                         <option value="INTERVIEW_OFFLINE">In-Person Interview</option>
                                       </select>
                                    </div>
                                  </div>
                                  {stage.canDelete && (
                                    <button onClick={() => setStages(stages.filter((_, i) => i !== index))} className="w-8 h-8 rounded-full bg-slate-50 hover:bg-rose-50 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-colors">
                                      <X size={14} />
                                    </button>
                                  )}
                               </div>
                               
                               <input 
                                  className="w-full bg-slate-50 border border-slate-200 outline-none text-xs text-slate-600 px-3 py-2 rounded-xl focus:bg-white focus:border-indigo-300 transition-colors"
                                  placeholder="Stage instructions or description for recruiters..."
                                  value={stage.description}
                                  onChange={e => {
                                     const newStages = [...stages];
                                     newStages[index].description = e.target.value;
                                     setStages(newStages);
                                  }}
                               />

                               {stage.type === 'TEST' && (
                                 <div className="mt-4 bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex justify-between items-center">
                                     <div className="flex gap-6">
                                        <div>
                                           <span className="block text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Duration</span>
                                           <input type="number" className="w-20 bg-white border border-indigo-200 rounded-lg px-3 py-1.5 text-xs font-bold text-indigo-900" value={stage.config.duration} onChange={e => { const s=[...stages]; s[index].config.duration=Number(e.target.value); setStages(s); }} />
                                        </div>
                                        <div>
                                           <span className="block text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">Pass Score %</span>
                                           <input type="number" className="w-20 bg-white border border-indigo-200 rounded-lg px-3 py-1.5 text-xs font-bold text-indigo-900" value={stage.config.passScore} onChange={e => { const s=[...stages]; s[index].config.passScore=Number(e.target.value); setStages(s); }} />
                                        </div>
                                     </div>
                                     <button onClick={() => setQuestionEditorStage(stage.id)} className="px-4 py-2 bg-white text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-lg border border-indigo-200 shadow-sm hover:bg-indigo-600 hover:text-white transition-colors">
                                        Configure Test ({stage.questions?.length || 0} Qs)
                                     </button>
                                 </div>
                               )}
                            </div>
                          </div>
                        ))}
                        
                        <div className="pl-12 pt-2">
                           <button onClick={addStage} className="w-full py-4 border-2 border-dashed border-slate-300 rounded-[20px] text-slate-500 flex items-center justify-center gap-2 hover:bg-slate-50 hover:border-indigo-300 hover:text-indigo-600 transition-all font-black uppercase text-[10px] tracking-widest">
                             <Plus size={16} /> Add Pipeline Stage
                           </button>
                        </div>
                      </div>

                      <div className="flex justify-between pt-6 border-t border-slate-100">
                         <button onClick={() => setStep(1)} className="px-8 py-3.5 bg-slate-100 text-slate-600 rounded-xl font-black uppercase text-[11px] tracking-widest hover:bg-slate-200 transition-all">Back</button>
                         <button onClick={() => setStep(3)} className="px-10 py-3.5 bg-indigo-600 text-white rounded-xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 hover:-translate-y-0.5 transition-all flex items-center gap-2">
                           Smart Rules & Publish <ArrowRight size={16} />
                         </button>
                      </div>
                   </motion.div>
                 )}

                 {/* STEP 3: Smart Rules & Publish */}
                 {step === 3 && (
                   <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-8">
                      
                      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-[24px] p-8 text-white relative overflow-hidden shadow-xl">
                         <div className="absolute right-0 top-0 opacity-10"><Zap size={200} /></div>
                         <div className="relative z-10">
                            <h3 className="text-xl font-black uppercase tracking-tight mb-2 flex items-center gap-2"><BrainCircuit className="text-indigo-400" /> AI Applicant Screening Rules</h3>
                            <p className="text-sm text-indigo-200/80 max-w-lg leading-relaxed mb-6">
                               Set criteria for applicants. The AI Hiring Copilot will automatically analyze incoming resumes against these metrics and auto-evaluate candidates.
                            </p>

                            <div className="bg-white/10 p-6 rounded-2xl border border-white/10 backdrop-blur-md">
                               <div className="flex items-center justify-between mb-4">
                                  <div>
                                     <span className="block text-sm font-bold text-white mb-1">Minimum AI Match Score required</span>
                                     <span className="text-xs text-indigo-300">Candidates scoring below this will be flagged as low-match.</span>
                                  </div>
                                  <div className="w-20 bg-indigo-950 px-4 py-2 rounded-xl text-center font-black text-xl text-indigo-300 border border-indigo-800">{formData.aiMatchCutoff}%</div>
                               </div>
                               <input type="range" min="0" max="100" step="5" value={formData.aiMatchCutoff} onChange={e=>setFormData({...formData, aiMatchCutoff: Number(e.target.value)})} className="w-full accent-indigo-500 mb-6" />

                               <label className="flex items-center gap-3 cursor-pointer group">
                                  <div className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${formData.autoReject ? 'bg-indigo-500' : 'bg-slate-700/50 border border-slate-600 group-hover:border-indigo-400'}`}>
                                     {formData.autoReject && <CheckCircle size={14} className="text-white" />}
                                  </div>
                                  <div>
                                     <span className="block text-sm font-bold text-white">Auto-Reject Low Matches</span>
                                     <span className="text-xs text-slate-400">Automatically move candidates below {formData.aiMatchCutoff}% to Rejected stage.</span>
                                  </div>
                                  <input type="checkbox" className="hidden" checked={formData.autoReject} onChange={(e) => setFormData({...formData, autoReject: e.target.checked})} />
                               </label>
                            </div>
                         </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <FormGroup label="Start Accepting Applications">
                           <div className="relative">
                             <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                             <input type="date" className="form-input pl-12" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} />
                           </div>
                        </FormGroup>
                        <FormGroup label="Application End Deadline" required>
                           <div className="relative">
                             <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-rose-400" size={16} />
                             <input type="date" className="form-input pl-12 border-rose-200 bg-rose-50/30 text-rose-900 focus:ring-rose-100" value={formData.deadline} onChange={e => setFormData({ ...formData, deadline: e.target.value })} />
                           </div>
                        </FormGroup>
                      </div>

                      <div className="p-6 bg-slate-50 border border-slate-200 rounded-[20px]">
                         <FormGroup label="Internal Recruiter Notes (Private)">
                            <textarea className="form-input bg-white h-24 resize-none py-4 text-sm" placeholder="Budget info, fast-track rules, or internal memos..." value={formData.additionalNotes} onChange={e => setFormData({ ...formData, additionalNotes: e.target.value })} />
                         </FormGroup>
                      </div>

                      <div className="flex justify-between pt-6 border-t border-slate-100">
                         <button onClick={() => setStep(2)} className="px-8 py-3.5 bg-slate-100 text-slate-600 rounded-xl font-black uppercase text-[11px] tracking-widest hover:bg-slate-200 transition-all">Back</button>
                         <button 
                           onClick={handleSubmit} 
                           disabled={loading}
                           className="px-12 py-3.5 bg-emerald-600 text-white rounded-xl font-black uppercase text-[11px] tracking-widest shadow-xl shadow-emerald-500/20 hover:bg-emerald-700 hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:bg-slate-300 disabled:shadow-none"
                         >
                           {loading ? 'Publishing...' : 'Publish Job & Go Live'} <CheckCircle size={16} />
                         </button>
                      </div>

                   </motion.div>
                 )}
               </AnimatePresence>
             </div>
           </motion.div>
           
           {/* Summary Side Panel */}
           <div className="w-[320px] shrink-0 sticky top-28 space-y-6 hidden lg:block">
              <div className="bg-white rounded-[24px] border border-slate-200 p-6 shadow-sm">
                 <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4 border-b border-slate-100 pb-2">Draft Summary</h4>
                 <div className="space-y-4">
                    <div>
                        <span className="text-xs text-slate-500 block mb-0.5">Job Title</span>
                        <span className="text-sm font-bold text-slate-900 tracking-tight">{formData.title || 'Not specified'}</span>
                    </div>
                    <div>
                        <span className="text-xs text-slate-500 block mb-0.5">Location</span>
                        <span className="text-sm font-bold text-slate-900 flex items-center gap-1.5"><MapPin size={14} className="text-slate-400"/> {formData.location}</span>
                    </div>
                    <div>
                        <span className="text-xs text-slate-500 block mb-0.5">Pipeline Stages</span>
                        <span className="text-sm font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">{stages.length} Stages</span>
                    </div>
                 </div>
              </div>

              <div className="bg-indigo-50 border border-indigo-100 rounded-[24px] p-6 text-indigo-900">
                 <div className="flex gap-3 mb-3 text-indigo-600">
                    <ShieldCheck size={24} />
                    <h4 className="font-black text-sm uppercase tracking-tight mt-1">Enterprise Grade ATS</h4>
                 </div>
                 <p className="text-xs font-medium leading-relaxed opacity-80 mb-4">
                    You are publishing to TalentBridge's premium network. Automatic AI screening and candidate matching will be active upon launch.
                 </p>
                 <div className="flex items-center gap-2 text-[10px] font-black uppercase text-indigo-500 tracking-widest bg-white/60 px-3 py-2 rounded-lg border border-indigo-200">
                    STATUS: {profile?.status === 'APPROVED' ? 'READY' : 'PENDING'}
                 </div>
              </div>
           </div>
        </div>

      </div>

      {questionEditorStage !== null && (
         <QuestionEditor 
            stage={stages.find(s => s.id === questionEditorStage)!}
            onClose={() => setQuestionEditorStage(null)}
            onSave={(questions) => {
               const newStages = [...stages];
               const idx = newStages.findIndex(s => s.id === questionEditorStage);
               newStages[idx].questions = questions;
               setStages(newStages);
               setQuestionEditorStage(null);
            }}
         />
      )}

      <style>{`
        .form-input {
          @apply w-full bg-slate-50 border border-slate-200 rounded-[14px] px-4 py-3.5 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-300 text-sm font-bold text-slate-800 transition-all hover:bg-slate-100/50;
        }
        .form-input::placeholder {
          @apply text-slate-400 font-medium;
        }
      `}</style>
    </div>
  );
}

function QuestionEditor({ stage, onClose, onSave }: { stage: any, onClose: () => void, onSave: (q: any[]) => void }) {
  const [questions, setQuestions] = useState<any[]>(stage.questions || []);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
       <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" onClick={onClose} />
       <motion.div 
         initial={{ opacity: 0, scale: 0.95, y: 20 }}
         animate={{ opacity: 1, scale: 1, y: 0 }}
         exit={{ opacity: 0, scale: 0.95, y: 20 }}
         className="relative w-full max-w-3xl bg-slate-50 rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
       >
         <div className="p-8 bg-white border-b border-slate-200 flex justify-between items-center shrink-0">
            <div>
               <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Assessment Builder</h2>
               <p className="text-xs font-bold text-slate-400 tracking-widest uppercase mt-1">For Step: {stage.name}</p>
            </div>
            <button onClick={onClose} className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"><X size={18}/></button>
         </div>

         <div className="p-8 overflow-y-auto flex-1 space-y-6">
            {questions.map((q, qIdx) => (
               <div key={qIdx} className="bg-white p-6 rounded-[24px] border border-slate-200 shadow-sm relative group">
                  <button onClick={() => setQuestions(questions.filter((_, i) => i !== qIdx))} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-50 hover:bg-rose-50 flex items-center justify-center text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"><X size={14} /></button>
                  <label className="text-[10px] font-black uppercase text-indigo-500 mb-2 block tracking-widest">Question {qIdx + 1}</label>
                  <input className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 mb-4 focus:ring-2 focus:ring-indigo-100 outline-none" value={q.text} onChange={e => {const n=[...questions]; n[qIdx].text=e.target.value; setQuestions(n);}} placeholder="What is..." />
                  
                  <div className="grid grid-cols-2 gap-3">
                     {q.options.map((opt: string, oIdx: number) => (
                        <div key={oIdx} className={`p-3 rounded-xl border flex items-center gap-3 transition-colors ${q.correctAnswer === opt && opt ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200 focus-within:border-indigo-300'}`}>
                           <input type="radio" name={`correct-${qIdx}`} className="accent-emerald-500 w-4 h-4" checked={q.correctAnswer === opt && opt !== ""} onChange={() => {const n=[...questions]; n[qIdx].correctAnswer=opt; setQuestions(n);}} />
                           <input className="bg-transparent border-none outline-none font-bold text-sm w-full" value={opt} onChange={e => {const n=[...questions]; n[qIdx].options[oIdx]=e.target.value; setQuestions(n);}} placeholder={`Option ${oIdx + 1}`} />
                        </div>
                     ))}
                  </div>
               </div>
            ))}
            
            <button onClick={() => setQuestions([...questions, { text: "", options: ["", "", "", ""], correctAnswer: "" }])} className="w-full py-4 border-2 border-dashed border-indigo-200 rounded-[24px] text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50 transition-colors font-black uppercase text-xs tracking-widest flex justify-center items-center gap-2">
               <Plus size={16}/> Add Question
            </button>
         </div>

         <div className="p-6 bg-white border-t border-slate-200 flex justify-end gap-3 shrink-0">
            <button onClick={onClose} className="px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 transition-colors">Cancel</button>
            <button onClick={() => onSave(questions)} className="px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2">
               <Save size={14}/> Save {questions.length} Questions
            </button>
         </div>
       </motion.div>
    </div>
  );
}

function FormGroup({ label, children, required, className = "" }: any) {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
        {label} {required && <span className="text-rose-500 text-lg leading-none">*</span>}
      </label>
      {children}
    </div>
  );
}
