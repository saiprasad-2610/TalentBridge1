import { useState } from "react";
import { useAuth } from "../../context/AuthContext.tsx";
import api from "../../services/api.ts";
import { 
  Plus, X, GripVertical, Calendar, MapPin, 
  Briefcase, GraduationCap, FileText, Sparkles,
  ChevronLeft, LayoutGrid, CheckCircle, Clock, ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";

export function JobPostingPage() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [questionEditorStage, setQuestionEditorStage] = useState<number | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    title: "",
    location: "Remote",
    jobType: "Full-time",
    experienceLevel: "Entry Level",
    educationRequirement: "",
    skills: [] as string[],
    skillInput: "",
    description: "",
    responsibilities: "",
    qualifications: "",
    additionalNotes: "",
    startDate: "",
    deadline: ""
  });

  // Hiring Stages State
  const [stages, setStages] = useState([
    { id: 1, name: "Applied", description: "Initial review", type: "APPLICATION", canDelete: false, config: {}, questions: [] },
    { id: 2, name: "Aptitude Test", description: "Logical reasoning assessment", type: "TEST", canDelete: true, config: { duration: 30, passScore: 60 }, questions: [
      { text: "If a project takes 3 weeks with 2 developers, how long with 3?", options: ["2 weeks", "1 week", "2.5 weeks", "4 weeks"], correctAnswer: "2 weeks" },
      { text: "Which language is primarily used for React?", options: ["Python", "Java", "JavaScript/TS", "C++"], correctAnswer: "JavaScript/TS" }
    ] },
    { id: 3, name: "Technical Interview", description: "Face to face online", type: "INTERVIEW_ONLINE", canDelete: true, config: {}, questions: [] },
    { id: 4, name: "Selected", description: "Hiring decision", type: "APPLICATION", canDelete: false, config: {}, questions: [] }
  ]);

  const handleAddSkill = (e: any) => {
    e.preventDefault();
    if (formData.skillInput && !formData.skills.includes(formData.skillInput)) {
      setFormData({
        ...formData,
        skills: [...formData.skills, formData.skillInput],
        skillInput: ""
      });
    }
  };

  const removeSkill = (skill: string) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter(s => s !== skill)
    });
  };

  const addStage = () => {
    const newStage = {
      id: Date.now(),
      name: "New Round",
      description: "",
      type: "APPLICATION",
      canDelete: true,
      config: {},
      questions: []
    };
    // Insert before "Selected"
    const selectedIdx = stages.findIndex(s => s.name === "Selected");
    const newStages = [...stages];
    newStages.splice(selectedIdx, 0, newStage);
    setStages(newStages);
  };

  const removeStage = (id: number) => {
    setStages(stages.filter(s => s.id !== id));
  };

  const updateStage = (id: number, field: string, value: string) => {
    setStages(stages.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const handleSubmit = async () => {
    if (profile?.status !== 'APPROVED') {
       alert("Your company must be APPROVED to post jobs.");
       return;
    }

    if (!formData.title || !formData.deadline || stages.length < 2) {
      alert("Please complete all mandatory fields and stages.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/jobs", {
        ...formData,
        companyId: profile?.id,
        stages: stages.map(s => ({ 
          name: s.name, 
          description: s.description,
          type: s.type,
          config: s.config,
          questions: s.questions
        }))
      });
      alert("Job Opportunity published successfully!");
      navigate("/company");
    } catch (err) {
      console.error(err);
      alert("Failed to post job");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20">
      <div className="max-w-4xl mx-auto px-6 py-12">
        
        {/* Header */}
        <header className="flex justify-between items-center mb-12">
          <button 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-slate-400 hover:text-slate-600 transition-all font-black text-[10px] uppercase tracking-widest"
          >
            <ChevronLeft size={16} /> Dashboard
          </button>
          <div className="flex gap-2">
            {[1, 2, 3].map(s => (
              <div key={s} className={`h-1.5 w-12 rounded-full transition-all ${step >= s ? 'bg-indigo-600' : 'bg-slate-200'}`} />
            ))}
          </div>
        </header>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[40px] border border-slate-200 shadow-2xl shadow-indigo-500/5 overflow-hidden"
        >
          <div className="p-12 border-b border-slate-50">
            <h1 className="text-3xl font-black text-slate-800 tracking-tight uppercase flex items-center gap-4">
               <div className="p-3 bg-indigo-600 text-white rounded-2xl">
                  <Plus size={24} />
               </div>
               Post New Opportunity
            </h1>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-2 ml-16">
              Create a structured hiring process for {profile?.company_name}
            </p>
          </div>

          <div className="p-12">
            <AnimatePresence mode="wait">
              {step === 1 && (
                <motion.div 
                  key="step1"
                  initial={{ opacity: 0, x: 20 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <FormGroup label="Job Title" required>
                        <input 
                           className="form-input" 
                           placeholder="e.g. Senior Frontend Engineer"
                           value={formData.title}
                           onChange={e => setFormData({ ...formData, title: e.target.value })}
                        />
                     </FormGroup>
                     <FormGroup label="Location" required>
                        <div className="relative">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                          <input 
                             className="form-input pl-11" 
                             placeholder="City, State or Remote"
                             value={formData.location}
                             onChange={e => setFormData({ ...formData, location: e.target.value })}
                          />
                        </div>
                     </FormGroup>
                     <FormGroup label="Job Type">
                        <select 
                          className="form-input appearance-none"
                          value={formData.jobType}
                          onChange={e => setFormData({ ...formData, jobType: e.target.value })}
                        >
                          <option>Full-time</option>
                          <option>Internship</option>
                          <option>Part-time</option>
                          <option>Remote Contract</option>
                        </select>
                     </FormGroup>
                     <FormGroup label="Experience Level">
                        <select 
                          className="form-input appearance-none"
                          value={formData.experienceLevel}
                          onChange={e => setFormData({ ...formData, experienceLevel: e.target.value })}
                        >
                          <option>Entry Level</option>
                          <option>Mid-Senior Level</option>
                          <option>Senior Level</option>
                          <option>Director/VP</option>
                        </select>
                     </FormGroup>
                   </div>

                   <FormGroup label="Skills & Requirements">
                      <div className="flex gap-2 mb-4">
                        <input 
                           className="form-input" 
                           placeholder="Enter skill and press apply"
                           value={formData.skillInput}
                           onChange={e => setFormData({ ...formData, skillInput: e.target.value })}
                           onKeyDown={e => e.key === 'Enter' && handleAddSkill(e)}
                        />
                        <button onClick={handleAddSkill} className="px-6 bg-slate-100 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">Add</button>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {formData.skills.map(s => (
                          <span key={s} className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-xs font-bold flex items-center gap-2">
                            {s} <button onClick={() => removeSkill(s)}><X size={14} /></button>
                          </span>
                        ))}
                      </div>
                   </FormGroup>

                   <FormGroup label="Detailed Description" required>
                      <textarea 
                        className="form-input h-32 resize-none py-4"
                        placeholder="Core role objectives and daily duties..."
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                      />
                   </FormGroup>

                   <div className="flex justify-end">
                      <button 
                        onClick={() => setStep(2)}
                        className="px-12 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center gap-2"
                      >
                        Next: Workflow Builder <Sparkles size={16} />
                      </button>
                   </div>
                </motion.div>
              )}

              {step === 2 && (
                <motion.div 
                  key="step2"
                  initial={{ opacity: 0, x: 20 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                   <div className="p-8 bg-slate-50 rounded-[32px] border border-slate-100 mb-8">
                      <div className="flex items-center gap-4 mb-6">
                        <div className="p-2 bg-white rounded-xl text-indigo-600">
                          <LayoutGrid size={20} />
                        </div>
                        <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Hiring Workflow Pipeline</h3>
                      </div>
                      
                      <div className="space-y-4">
                        {stages.map((stage, index) => (
                          <div key={index} className="flex gap-4 items-start group">
                            <div className="flex flex-col items-center">
                              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm z-10 ${stage.name === 'Selected' ? 'bg-emerald-500 text-white' : 'bg-white border-2 border-indigo-100 text-indigo-600 ring-4 ring-indigo-50/50'}`}>
                                {index + 1}
                              </div>
                              {index < stages.length - 1 && <div className="w-0.5 h-12 bg-indigo-100 -my-1" />}
                            </div>
                            <div className="flex-1 bg-white p-6 rounded-[24px] border border-indigo-100 shadow-sm relative group-hover:border-indigo-300 transition-all">
                               <div className="flex justify-between items-center mb-4">
                                  <div className="flex-1">
                                    <input 
                                      className="bg-transparent border-none outline-none font-black text-slate-800 uppercase tracking-tight text-sm w-full mb-1"
                                      value={stage.name}
                                      disabled={!stage.canDelete}
                                      onChange={e => updateStage(stage.id, "name", e.target.value)}
                                    />
                                    <div className="flex gap-2">
                                       <select 
                                         className="bg-slate-50 border-none outline-none text-[9px] font-black uppercase text-indigo-500 rounded px-2 py-1 cursor-pointer"
                                         value={stage.type}
                                         onChange={e => updateStage(stage.id, "type", e.target.value)}
                                         disabled={!stage.canDelete}
                                       >
                                         <option value="APPLICATION">Standard Stage</option>
                                         <option value="TEST">Interactive Test</option>
                                         <option value="INTERVIEW_ONLINE">Online Interview</option>
                                         <option value="INTERVIEW_OFFLINE">Offline Interview</option>
                                       </select>
                                    </div>
                                  </div>
                                  {stage.canDelete && (
                                    <button onClick={() => removeStage(stage.id)} className="text-slate-200 hover:text-red-500 transition-colors">
                                      <X size={18} />
                                    </button>
                                  )}
                               </div>
                               <input 
                                  className="bg-transparent border-none outline-none text-xs font-medium text-slate-400 w-full mb-4"
                                  placeholder="Brief description of this stage..."
                                  value={stage.description}
                                  onChange={e => updateStage(stage.id, "description", e.target.value)}
                               />

                               {stage.type === 'TEST' && (
                                 <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                                    <p className="text-[9px] font-black uppercase text-indigo-600 mb-2">Test Settings</p>
                                    <div className="grid grid-cols-2 gap-4">
                                       <div>
                                          <label className="text-[8px] font-bold text-slate-400 uppercase">Duration (mins)</label>
                                          <input type="number" className="w-full bg-white border border-indigo-100 rounded-lg px-2 py-1 text-xs" value={stage.config.duration} onChange={e => {
                                             const newStages = [...stages];
                                             const idx = newStages.findIndex(s => s.id === stage.id);
                                             newStages[idx].config.duration = parseInt(e.target.value);
                                             setStages(newStages);
                                          }} />
                                       </div>
                                       <div>
                                          <label className="text-[8px] font-bold text-slate-400 uppercase">Pass Score (%)</label>
                                          <input type="number" className="w-full bg-white border border-indigo-100 rounded-lg px-2 py-1 text-xs" value={stage.config.passScore} onChange={e => {
                                             const newStages = [...stages];
                                             const idx = newStages.findIndex(s => s.id === stage.id);
                                             newStages[idx].config.passScore = parseInt(e.target.value);
                                             setStages(newStages);
                                          }} />
                                       </div>
                                    </div>
                                     <div className="mt-3 pt-3 border-t border-indigo-100 flex justify-between items-center">
                                       <p className="text-[8px] font-bold text-slate-400 uppercase mb-0">Questions: {stage.questions?.length || 0}</p>
                                       <button 
                                          onClick={() => setQuestionEditorStage(stage.id)}
                                          className="text-[9px] font-black text-indigo-600 uppercase hover:underline"
                                       >
                                          Manage Questions
                                       </button>
                                    </div>
                                 </div>
                               )}
                            </div>
                          </div>
                        ))}
                        
                        <button 
                          onClick={addStage}
                          className="w-full py-4 border-2 border-dashed border-indigo-100 rounded-[24px] text-indigo-500 flex items-center justify-center gap-2 hover:bg-indigo-50 hover:border-indigo-200 transition-all font-black uppercase text-[10px] tracking-widest"
                        >
                          <Plus size={16} /> Insert Evaluation Round
                        </button>
                      </div>
                   </div>

                   <AnimatePresence>
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
                   </AnimatePresence>

                   <div className="flex justify-between">
                      <button onClick={() => setStep(1)} className="px-10 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Back</button>
                      <button 
                        onClick={() => setStep(3)}
                        className="px-12 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center gap-2"
                      >
                        Next: Deadlines & Finish <Calendar size={16} />
                      </button>
                   </div>
                </motion.div>
              )}

              {step === 3 && (
                <motion.div 
                  key="step3"
                  initial={{ opacity: 0, x: 20 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-8"
                >
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <FormGroup label="Application Start Date">
                        <input 
                           type="date"
                           className="form-input" 
                           value={formData.startDate}
                           onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                        />
                     </FormGroup>
                     <FormGroup label="Application Deadline" required>
                        <input 
                           type="date"
                           className="form-input border-indigo-200 bg-indigo-50/20" 
                           value={formData.deadline}
                           onChange={e => setFormData({ ...formData, deadline: e.target.value })}
                        />
                     </FormGroup>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <FormGroup label="Responsibilities (Optional)">
                        <textarea 
                           className="form-input h-32 resize-none py-4"
                           placeholder="List key responsibilities..."
                           value={formData.responsibilities}
                           onChange={e => setFormData({ ...formData, responsibilities: e.target.value })}
                        />
                     </FormGroup>
                     <FormGroup label="Qualifications (Optional)">
                        <textarea 
                           className="form-input h-32 resize-none py-4"
                           placeholder="Mention specific degree or certs..."
                           value={formData.qualifications}
                           onChange={e => setFormData({ ...formData, qualifications: e.target.value })}
                        />
                     </FormGroup>
                   </div>

                   <FormGroup label="Company Notes (Internal)">
                      <textarea 
                        className="form-input h-24 resize-none py-4"
                        placeholder="Interview focus points, budget range, etc..."
                        value={formData.additionalNotes}
                        onChange={e => setFormData({ ...formData, additionalNotes: e.target.value })}
                      />
                   </FormGroup>

                   <div className="p-8 bg-zinc-900 rounded-[32px] text-white">
                      <div className="flex justify-between items-center mb-6">
                        <div className="flex items-center gap-3">
                          <ShieldCheck className="text-indigo-400" size={24} />
                          <h3 className="text-lg font-black uppercase tracking-tight">Final Summary</h3>
                        </div>
                        <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${profile?.status === 'APPROVED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                          {profile?.status === 'APPROVED' ? 'Ready to Publish' : 'Needs Verification'}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-[10px] font-bold uppercase tracking-widest opacity-60">
                        <div className="flex items-center gap-2"><CheckCircle size={14} className="text-indigo-400" /> {stages.length} Hiring Stages</div>
                        <div className="flex items-center gap-2"><Clock size={14} className="text-indigo-400" /> Deadline: {formData.deadline || 'Not set'}</div>
                      </div>
                   </div>

                   <div className="flex justify-between">
                      <button onClick={() => setStep(2)} className="px-10 py-4 bg-slate-100 text-slate-600 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-slate-200 transition-all">Back</button>
                      <button 
                        disabled={loading || profile?.status !== 'APPROVED'}
                        onClick={handleSubmit}
                        className="px-12 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-500/20 hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50"
                      >
                        {loading ? "Publishing..." : "Publish Job Opportunity"} <CheckCircle size={16} />
                      </button>
                   </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>

      <style>{`
        .form-input {
          @apply w-full bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4.5 outline-none focus:ring-4 focus:ring-indigo-100 text-sm font-medium transition-all hover:bg-white;
        }
      `}</style>
    </div>
  );
}

function QuestionEditor({ stage, onClose, onSave }: { stage: any, onClose: () => void, onSave: (q: any[]) => void }) {
  const [questions, setQuestions] = useState<any[]>(stage.questions || []);

  const addQuestion = () => {
    setQuestions([...questions, { text: "", options: ["", "", "", ""], correctAnswer: "" }]);
  };

  const updateQuestion = (idx: number, field: string, value: any) => {
    const newQuestions = [...questions];
    newQuestions[idx][field] = value;
    setQuestions(newQuestions);
  };

  const updateOption = (qIdx: number, oIdx: number, value: string) => {
    const newQuestions = [...questions];
    newQuestions[qIdx].options[oIdx] = value;
    setQuestions(newQuestions);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
       <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
       <motion.div 
         initial={{ opacity: 0, scale: 0.95, y: 20 }}
         animate={{ opacity: 1, scale: 1, y: 0 }}
         exit={{ opacity: 0, scale: 0.95, y: 20 }}
         className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl overflow-hidden"
       >
         <div className="p-10 max-h-[80vh] overflow-y-auto">
            <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-8">Test Question Builder</h2>
            
            <div className="space-y-8">
               {questions.map((q, qIdx) => (
                  <div key={qIdx} className="p-8 bg-slate-50 rounded-[32px] border border-slate-100 relative">
                     <button onClick={() => setQuestions(questions.filter((_, i) => i !== qIdx))} className="absolute top-6 right-6 text-slate-300 hover:text-red-500 transition-colors"><X size={20} /></button>
                     <FormGroup label={`Question ${qIdx + 1}`}>
                        <input className="form-input bg-white" value={q.text} onChange={e => updateQuestion(qIdx, "text", e.target.value)} placeholder="Enter question text..." />
                     </FormGroup>
                     
                     <div className="grid grid-cols-2 gap-4 mt-6">
                        {q.options.map((opt: string, oIdx: number) => (
                           <div key={oIdx}>
                              <label className="text-[8px] font-bold text-slate-400 uppercase mb-1 flex items-center gap-2">
                                 Option {oIdx + 1}
                                 <input type="radio" name={`correct-${qIdx}`} checked={q.correctAnswer === opt && opt !== ""} onChange={() => updateQuestion(qIdx, "correctAnswer", opt)} />
                              </label>
                              <input className="form-input bg-white py-2 text-xs" value={opt} onChange={e => updateOption(qIdx, oIdx, e.target.value)} placeholder={`Option ${oIdx + 1}`} />
                           </div>
                        ))}
                     </div>
                  </div>
               ))}
            </div>

            <button onClick={addQuestion} className="w-full mt-8 py-4 border-2 border-dashed border-indigo-100 rounded-[24px] text-indigo-500 flex items-center justify-center gap-2 hover:bg-indigo-50 transition-all font-black uppercase text-[10px] tracking-widest">
               <Plus size={16} /> Add New Question
            </button>
         </div>
         <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
            <button onClick={onClose} className="flex-1 py-4 text-slate-400 font-black uppercase text-[10px] tracking-widest">Cancel</button>
            <button onClick={() => onSave(questions)} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-500/20">Save Questions</button>
         </div>
       </motion.div>
    </div>
  );
}

function FormGroup({ label, children, required }: any) {
  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
    </div>
  );
}