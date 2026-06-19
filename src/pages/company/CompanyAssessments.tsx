import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import api from '../../services/api.ts';
import { 
  Plus, 
  Trash2, 
  Save, 
  ClipboardCheck, 
  Search, 
  HelpCircle, 
  CheckCircle, 
  AlertCircle,
  Briefcase
} from 'lucide-react';
import { toast } from 'react-hot-toast';

interface Question {
  question: string;
  options: string[];
  correctAnswer: number;
}

export default function CompanyAssessments() {
  const { profile } = useAuth();
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const res = await api.get('/jobs');
      const filteredJobs = (res.data.data || []).filter((j: any) => j.company_id === profile?.id);
      setJobs(filteredJobs);
    } catch (e) {
      console.error(e);
      toast.error('Failed to load company jobs');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectJob = async (job: any) => {
    setSelectedJob(job);
    setQuestions([]);
    try {
      const res = await api.get(`/companies/tests/${job.id}`);
      if (res.data.success && res.data.data && res.data.data.length > 0) {
        // Map backend test questions if available
        const loadedQs = res.data.data.map((q: any) => {
          let opts = [];
          if (typeof q.options_json === 'string') {
            try {
              opts = JSON.parse(q.options_json);
            } catch (err) {
              opts = [];
            }
          } else if (Array.isArray(q.options_json)) {
            opts = q.options_json;
          } else if (Array.isArray(q.options)) {
            opts = q.options;
          }

          let correctIdx = 0;
          if (typeof q.correct_answer === 'number') {
            correctIdx = q.correct_answer;
          } else if (typeof q.correctAnswer === 'number') {
            correctIdx = q.correctAnswer;
          } else if (typeof q.correct_answer === 'string') {
            const idx = opts.indexOf(q.correct_answer);
            if (idx !== -1) correctIdx = idx;
          }

          return {
            question: q.question_text || q.question || '',
            options: opts.length > 0 ? opts : ['', '', '', ''],
            correctAnswer: correctIdx
          };
        });
        setQuestions(loadedQs);
      } else {
        // Initialize with one empty question
        setQuestions([{ question: '', options: ['', '', '', ''], correctAnswer: 0 }]);
      }
    } catch (e) {
      console.error(e);
      toast.error('Failed to load existing assessments');
      setQuestions([{ question: '', options: ['', '', '', ''], correctAnswer: 0 }]);
    }
  };

  const handleAddQuestion = () => {
    setQuestions([...questions, { question: '', options: ['', '', '', ''], correctAnswer: 0 }]);
  };

  const handleRemoveQuestion = (index: number) => {
    const updated = [...questions];
    updated.splice(index, 1);
    setQuestions(updated);
  };

  const handleQuestionChange = (index: number, val: string) => {
    const updated = [...questions];
    updated[index].question = val;
    setQuestions(updated);
  };

  const handleOptionChange = (qIndex: number, optIndex: number, val: string) => {
    const updated = [...questions];
    updated[qIndex].options[optIndex] = val;
    setQuestions(updated);
  };

  const handleCorrectAnswerChange = (qIndex: number, optIndex: number) => {
    const updated = [...questions];
    updated[qIndex].correctAnswer = optIndex;
    setQuestions(updated);
  };

  const handleSaveTest = async () => {
    if (!selectedJob) return;

    // Validate
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      if (!q.question.trim()) {
        toast.error(`Question ${i + 1} text cannot be empty`);
        return;
      }
      for (let o = 0; o < q.options.length; o++) {
        if (!q.options[o].trim()) {
          toast.error(`Option ${o + 1} in Question ${i + 1} cannot be empty`);
          return;
        }
      }
    }

    try {
      setSaving(true);
      const res = await api.post('/companies/tests', {
        jobId: selectedJob.id,
        questions: questions.map(q => ({
          question: q.question,
          options: q.options,
          correctAnswer: q.correctAnswer,
          correct_answer: q.options[q.correctAnswer]
        }))
      });

      if (res.data.success) {
        toast.success('Assessment created and configured successfully!');
        // Keep selected tab but update status
        handleSelectJob(selectedJob);
      } else {
        toast.error(res.data.message || 'Failed to save assessment');
      }
    } catch (e) {
      console.error(e);
      toast.error('Error saving assessment');
    } finally {
      setSaving(false);
    }
  };

  const filteredJobs = jobs.filter(job =>
    job.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    job.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-10">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight">Assessment Engine</h1>
          <p className="text-slate-500 font-medium text-sm italic mt-1">Configure online pre-screening MCQ tests for your job vacancies.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left column: List of Jobs */}
        <div className="bg-white rounded-[32px] border border-slate-100/80 p-6 shadow-sm space-y-6">
          <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
            <Briefcase size={20} className="text-blue-600" /> Select Job Post
          </h2>
          
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-600 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Filter roles..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl pl-11 pr-4 py-3 text-xs font-semibold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-600/20 transition-all"
            />
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto scrollbar-hide pr-1">
            {filteredJobs.map((job) => {
              const works = job.id === selectedJob?.id;
              return (
                <button
                  key={job.id}
                  onClick={() => handleSelectJob(job)}
                  className={`w-full text-left p-4 rounded-[20px] border transition-all duration-300 ${
                    works 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/15'
                      : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <p className="font-extrabold text-sm tracking-tight leading-snug">{job.title}</p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <p className={`text-[10px] font-black uppercase tracking-wider ${works ? 'text-blue-100' : 'text-slate-400'}`}>
                      {job.location || 'Remote'} • {job.job_type || 'Full-time'}
                    </p>
                  </div>
                </button>
              );
            })}

            {filteredJobs.length === 0 && !loading && (
              <div className="text-center py-10">
                <AlertCircle size={32} className="mx-auto text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">No matching jobs found</p>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Test configuration form */}
        <div className="lg:col-span-2">
          {selectedJob ? (
            <div className="bg-white rounded-[32px] border border-slate-100/80 p-8 shadow-sm space-y-8">
              <div className="flex justify-between items-center border-b border-slate-100 pb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase tracking-wider rounded-lg">Active Configuration</span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mt-1">
                    {selectedJob.title} Assessment
                  </h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Configure multiple-choice pre-screening questions.</p>
                </div>
                
                <button
                  onClick={handleSaveTest}
                  disabled={saving}
                  className="flex items-center gap-2 bg-slate-900 border border-slate-900 text-white px-6 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-850 active:scale-95 transition-all disabled:opacity-50"
                >
                  <Save size={16} /> {saving ? 'Saving...' : 'Save Assessment'}
                </button>
              </div>

              {/* Questions List */}
              <div className="space-y-8">
                {questions.map((q, qIdx) => (
                  <div key={qIdx} className="p-6 bg-slate-50/50 rounded-3xl border border-slate-100 relative group">
                    {/* Header */}
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-xs font-black text-blue-600 uppercase tracking-wider">Question #{qIdx + 1}</span>
                      {questions.length > 1 && (
                        <button
                          onClick={() => handleRemoveQuestion(qIdx)}
                          className="text-slate-400 hover:text-red-500 hover:scale-110 active:scale-95 transition-all p-1.5 bg-white border border-slate-100 rounded-xl shadow-sm"
                          title="Remove Question"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    {/* Question Input */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Question Text</label>
                        <input
                          type="text"
                          value={q.question}
                          onChange={(e) => handleQuestionChange(qIdx, e.target.value)}
                          placeholder="e.g., Which of the following is not a javascript primitive?"
                          className="w-full bg-white border border-slate-100 rounded-2xl px-5 py-3 text-xs font-semibold outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-600/20 transition-all placeholder:text-slate-300"
                        />
                      </div>

                      {/* Options Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {q.options.map((opt, optIdx) => (
                          <div key={optIdx} className="space-y-1.5">
                            <label className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-slate-400">
                              <span>Option {String.fromCharCode(65 + optIdx)}</span>
                              <button
                                type="button"
                                onClick={() => handleCorrectAnswerChange(qIdx, optIdx)}
                                className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                                  q.correctAnswer === optIdx
                                    ? 'bg-emerald-500 text-white'
                                    : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100'
                                }`}
                              >
                                {q.correctAnswer === optIdx ? 'Correct Answer' : 'Mark Correct'}
                              </button>
                            </label>
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => handleOptionChange(qIdx, optIdx, e.target.value)}
                              placeholder={`Option ${String.fromCharCode(65 + optIdx)}...`}
                              className={`w-full bg-white border rounded-2xl px-5 py-3 text-xs font-semibold outline-none focus:ring-4 focus:ring-blue-500/5 transition-all ${
                                q.correctAnswer === optIdx
                                  ? 'border-emerald-300 ring-4 ring-emerald-500/5 focus:border-emerald-500/20'
                                  : 'border-slate-100 focus:border-blue-600/20'
                              }`}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add Question Button */}
              <button
                type="button"
                onClick={handleAddQuestion}
                className="w-full py-4 border-2 border-dashed border-slate-200 hover:border-blue-500/50 hover:bg-blue-50/10 text-slate-500 hover:text-blue-600 rounded-[24px] text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              >
                <Plus size={16} strokeWidth={3} /> Add Question
              </button>

              {/* Bottom Actions banner */}
              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  onClick={handleSaveTest}
                  disabled={saving}
                  className="flex items-center gap-3 bg-blue-600 text-white px-8 py-4 rounded-[20px] font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Save size={18} /> {saving ? 'Saving...' : 'Save Assessment'}
                </button>
              </div>
            </div>
          ) : (
            <div className="py-24 text-center bg-white rounded-[40px] border border-slate-100 px-6">
              <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-300 mx-auto mb-6">
                 <ClipboardCheck size={40} />
              </div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Ready to Assess?</h3>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-2 max-w-sm mx-auto leading-relaxed">
                Choose one of your active job listings on the left to create, customize, or review its qualification assessments.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
