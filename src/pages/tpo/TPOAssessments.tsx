import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  FileText, 
  Clock, 
  Target, 
  ChevronRight, 
  Trash2, 
  Users,
  Search,
  CheckCircle2,
  XCircle,
  Save
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

export default function TPOAssessments() {
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [colleges, setColleges] = useState<any[]>([]);

  // Form State
  const [testForm, setTestForm] = useState({
    title: '',
    duration: 60,
    total_marks: 100,
    college_id: '',
    questions: [
      { question: '', options: ['', '', '', ''], correct: 0, weight: 1 }
    ]
  });

  useEffect(() => {
    fetchTests();
    fetchColleges();
  }, []);

  const fetchTests = async () => {
    try {
      const res = await api.get('/tpo/tests');
      if (res.data.success) setTests(res.data.data);
    } catch (error) {
      toast.error('Failed to fetch tests');
    } finally {
      setLoading(false);
    }
  };

  const fetchColleges = async () => {
    try {
      const res = await api.get('/tpo/colleges');
      if (res.data.success) setColleges(res.data.data);
    } catch (e) {}
  };

  const handleAddQuestion = () => {
    setTestForm({
      ...testForm,
      questions: [...testForm.questions, { question: '', options: ['', '', '', ''], correct: 0, weight: 1 }]
    });
  };

  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testForm.college_id) return toast.error('Please select a college');
    
    try {
      const res = await api.post('/tpo/tests', testForm);
      if (res.data.success) {
        toast.success('Assessment published successfully!');
        setShowCreateModal(false);
        fetchTests();
      }
    } catch (error) {
      toast.error('Failed to create test');
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 rounded-2xl font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
        >
          <Plus size={18} />
          Create New Test
        </button>
      </div>

      {/* Tests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full h-64 flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-sm italic">Initializing Engine...</div>
        ) : tests.length === 0 ? (
          <div className="col-span-full bg-white p-12 rounded-3xl border border-slate-100 shadow-sm text-center">
            <FileText size={48} className="mx-auto text-slate-200 mb-4" />
            <h3 className="text-lg font-bold text-slate-900">No Tests Created</h3>
            <p className="text-slate-500 mt-2">Start building your first cohort assessment.</p>
          </div>
        ) : (
          tests.map((test) => (
            <div key={test.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                  <FileText size={24} />
                </div>
                <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider">{test.status}</span>
              </div>
              <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight group-hover:text-blue-600 transition-colors">{test.title}</h3>
              <p className="text-xs text-slate-400 font-bold uppercase mt-1">{test.college_name}</p>
              
              <div className="grid grid-cols-2 gap-4 mt-6">
                <div className="flex items-center gap-2 text-slate-500">
                  <Clock size={14} />
                  <span className="text-xs font-bold">{test.duration_minutes} Mins</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <Target size={14} />
                  <span className="text-xs font-bold">{test.total_marks} Marks</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <Users size={14} />
                  <span className="text-xs font-bold">{test.submission_count} Taken</span>
                </div>
              </div>

              <button className="mt-6 w-full flex items-center justify-center gap-2 py-3 bg-slate-50 text-slate-600 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-600 hover:text-white transition-all">
                View Analytics <ChevronRight size={14} />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Create Test Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[40px] w-full max-w-4xl shadow-2xl my-8">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight italic">Design <span className="text-blue-600">Assessment</span></h2>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><XCircle size={24} className="text-slate-400" /></button>
            </div>
            
            <form onSubmit={handleCreateTest} className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Test Title</label>
                  <input required type="text" className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-700 focus:ring-2 focus:ring-blue-500" placeholder="e.g. Java Fundamentals Q1" value={testForm.title} onChange={e => setTestForm({...testForm, title: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Target College</label>
                  <select required className="w-full p-4 bg-slate-50 rounded-2xl border-none font-bold text-slate-700 focus:ring-2 focus:ring-blue-500" value={testForm.college_id} onChange={e => setTestForm({...testForm, college_id: e.target.value})}>
                    <option value="">Select College</option>
                    {colleges.map(c => <option key={c.id} value={c.id}>{c.college_name}</option>)}
                  </select>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="font-black text-slate-900 uppercase tracking-tight text-sm italic">Question Bank ({testForm.questions.length})</h3>
                  <button type="button" onClick={handleAddQuestion} className="text-xs font-black text-blue-600 uppercase tracking-widest hover:underline">+ Add Question</button>
                </div>

                <div className="space-y-6 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                  {testForm.questions.map((q, qIdx) => (
                    <div key={qIdx} className="p-6 bg-slate-50 rounded-3xl border border-slate-100 space-y-4">
                      <div className="flex gap-4">
                        <span className="w-8 h-8 bg-blue-600 text-white rounded-lg flex items-center justify-center font-black shrink-0">{qIdx + 1}</span>
                        <input required type="text" className="w-full bg-transparent border-none font-bold text-slate-700 focus:ring-0 p-0" placeholder="Enter your question here..." value={q.question} onChange={e => {
                          const newQ = [...testForm.questions];
                          newQ[qIdx].question = e.target.value;
                          setTestForm({...testForm, questions: newQ});
                        }} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center gap-3">
                            <input type="radio" checked={q.correct === oIdx} onChange={() => {
                              const newQ = [...testForm.questions];
                              newQ[qIdx].correct = oIdx;
                              setTestForm({...testForm, questions: newQ});
                            }} className="text-blue-600 focus:ring-blue-500 h-4 w-4" />
                            <input required type="text" className="w-full bg-white p-2.5 rounded-xl border-none text-xs font-bold text-slate-600" placeholder={`Option ${oIdx + 1}`} value={opt} onChange={e => {
                              const newQ = [...testForm.questions];
                              newQ[qIdx].options[oIdx] = e.target.value;
                              setTestForm({...testForm, questions: newQ});
                            }} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-4">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-8 py-4 font-black text-slate-400 uppercase tracking-widest text-xs hover:text-slate-900 transition-all">Discard</button>
                <button type="submit" className="px-10 py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-blue-600/20 hover:bg-blue-700 transition-all flex items-center gap-2">
                  <Save size={16} />
                  Publish Test
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
