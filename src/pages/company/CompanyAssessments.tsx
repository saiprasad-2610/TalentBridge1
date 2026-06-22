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
  Save, 
  Layout, 
  HelpCircle, 
  Check, 
  Play, 
  AlertCircle 
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

interface Question {
  id: string;
  type: 'MCQ' | 'CODING';
  questionText: string;
  options?: string[];
  correctOption?: number; // index 0-3
  starterCode?: string;
  testCases?: string;
  points: number;
}

interface Assessment {
  id: string;
  title: string;
  category: string;
  duration: number; // in minutes
  passScore: number; // percentage
  questions: Question[];
  createdAt: string;
}

export default function CompanyAssessments() {
  const [activeTab, setActiveTab] = useState<'list' | 'builder' | 'attempts'>('list');
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Sample assessment data for fallback / rich prototype experience
  const sampleAssessments: Assessment[] = [
    {
      id: 'asmt-1',
      title: 'Senior Frontend Developer Assessment',
      category: 'React & TypeScript',
      duration: 60,
      passScore: 75,
      createdAt: '2026-06-12',
      questions: [
        {
          id: 'q-1',
          type: 'MCQ',
          questionText: 'Which React hook can be used to perform side effects in functional components?',
          options: ['useState', 'useEffect', 'useContext', 'useReducer'],
          correctOption: 1,
          points: 10,
        },
        {
          id: 'q-2',
          type: 'MCQ',
          questionText: 'What is the purpose of React.memo?',
          options: [
            'To store global state',
            'To memoize highly CPU-intensive functions',
            'To prevent unnecessary re-renders of functional components when props are unchanged',
            'To automatically fetch remote API endpoints'
          ],
          correctOption: 2,
          points: 10,
        }
      ]
    },
    {
      id: 'asmt-2',
      title: 'Backend Systems & Database Engineer',
      category: 'NodeJS, MySQL & Redis',
      duration: 45,
      passScore: 70,
      createdAt: '2026-06-18',
      questions: [
        {
          id: 'q-3',
          type: 'MCQ',
          questionText: 'Which index type is best suited for high-cardinality exact matches in database tables?',
          options: ['B-Tree Index', 'GIST Index', 'Hash Index', 'Fulltext Index'],
          correctOption: 2,
          points: 10,
        }
      ]
    }
  ];

  // Candidates attempting mock data
  const sampleAttempts = [
    {
      id: 'att-1',
      candidateName: 'Aditya Shinde',
      assessmentTitle: 'Senior Frontend Developer Assessment',
      score: 90,
      passingScore: 75,
      completedAt: '2026-06-19 14:32',
      status: 'Passed'
    },
    {
      id: 'att-2',
      candidateName: 'Priya Deshmukh',
      assessmentTitle: 'Senior Frontend Developer Assessment',
      score: 60,
      passingScore: 75,
      completedAt: '2026-06-18 10:15',
      status: 'Failed'
    },
    {
      id: 'att-3',
      candidateName: 'Rahul Kulkarni',
      assessmentTitle: 'Backend Systems & Database Engineer',
      score: 80,
      passingScore: 70,
      completedAt: '2026-06-19 16:45',
      status: 'Passed'
    }
  ];

  const [attempts, setAttempts] = useState(sampleAttempts);

  // Form states for builder
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('React & TypeScript');
  const [duration, setDuration] = useState(60);
  const [passScore, setPassScore] = useState(70);
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: 'q-init-1',
      type: 'MCQ',
      questionText: '',
      options: ['', '', '', ''],
      correctOption: 0,
      points: 10
    }
  ]);

  // Load from local storage or backend if available
  useEffect(() => {
    const saved = localStorage.getItem('tb_company_assessments');
    if (saved) {
      try {
        setAssessments(JSON.parse(saved));
      } catch (e) {
        setAssessments(sampleAssessments);
      }
    } else {
      setAssessments(sampleAssessments);
      localStorage.setItem('tb_company_assessments', JSON.stringify(sampleAssessments));
    }
  }, []);

  const saveAssessmentsList = (list: Assessment[]) => {
    setAssessments(list);
    localStorage.setItem('tb_company_assessments', JSON.stringify(list));
  };

  const handleCreateAssessment = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Please enter an assessment title');
      return;
    }

    // Validate that questions have content
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].questionText.trim()) {
        toast.error(`Question ${i + 1} has empty text`);
        return;
      }
      if (questions[i].type === 'MCQ') {
        const hasEmptyOption = questions[i].options?.some(opt => !opt.trim());
        if (hasEmptyOption) {
          toast.error(`Question ${i + 1} contains empty choices/options`);
          return;
        }
      }
    }

    const newAssessment: Assessment = {
      id: `asmt-${Date.now()}`,
      title,
      category,
      duration,
      passScore,
      questions,
      createdAt: new Date().toISOString().split('T')[0]
    };

    const updated = [newAssessment, ...assessments];
    saveAssessmentsList(updated);
    toast.success('Assessment created and published!');

    // Reset Form
    setTitle('');
    setDuration(60);
    setPassScore(70);
    setQuestions([
      {
        id: `q-${Date.now()}`,
        type: 'MCQ',
        questionText: '',
        options: ['', '', '', ''],
        correctOption: 0,
        points: 10
      }
    ]);
    setActiveTab('list');
  };

  const deleteAssessment = (id: string) => {
    const updated = assessments.filter(a => a.id !== id);
    saveAssessmentsList(updated);
    toast.success('Assessment deleted successfully');
  };

  const addQuestionField = (type: 'MCQ' | 'CODING') => {
    const newQ: Question = type === 'MCQ' ? {
      id: `q-${Date.now()}`,
      type: 'MCQ',
      questionText: '',
      options: ['', '', '', ''],
      correctOption: 0,
      points: 10
    } : {
      id: `q-${Date.now()}`,
      type: 'CODING',
      questionText: '',
      starterCode: 'function solution(input) {\n  // Write your code here\n  return result;\n}',
      testCases: 'Input: 5 => Output: 10',
      points: 20
    };

    setQuestions([...questions, newQ]);
  };

  const removeQuestionField = (index: number) => {
    if (questions.length === 1) {
      toast.error('An assessment must have at least one question');
      return;
    }
    const updated = questions.filter((_, i) => i !== index);
    setQuestions(updated);
  };

  const updateQuestionText = (index: number, val: string) => {
    const updated = [...questions];
    updated[index].questionText = val;
    setQuestions(updated);
  };

  const updateMCQOption = (qIndex: number, optIndex: number, val: string) => {
    const updated = [...questions];
    if (updated[qIndex].options) {
      updated[qIndex].options![optIndex] = val;
    }
    setQuestions(updated);
  };

  const updateMCQCorrect = (qIndex: number, optIndex: number) => {
    const updated = [...questions];
    updated[qIndex].correctOption = optIndex;
    setQuestions(updated);
  };

  const updateQuestionPoints = (index: number, val: number) => {
    const updated = [...questions];
    updated[index].points = val;
    setQuestions(updated);
  };

  const filteredAssessments = assessments.filter(a => 
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6" id="company-assessments-container">
      {/* Header and KPI Badges */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight italic">
            Placement <span className="text-indigo-600">Assessments</span>
          </h1>
          <p className="text-slate-500 font-medium">Design automated assessment rules, coding evaluations, and track participant standings.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 rounded-xl font-bold transition-all text-sm ${activeTab === 'list' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
          >
            Manage Tests
          </button>
          <button
            onClick={() => setActiveTab('builder')}
            className={`px-4 py-2 rounded-xl font-bold transition-all text-sm flex items-center gap-1.5 ${activeTab === 'builder' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
          >
            <Plus size={16} />
            Create Test
          </button>
          <button
            onClick={() => setActiveTab('attempts')}
            className={`px-4 py-2 rounded-xl font-bold transition-all text-sm ${activeTab === 'attempts' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}
          >
            Attempts
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-orange-50 text-orange-600">
            <FileText size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Tests</p>
            <p className="text-2xl font-black text-slate-800">{assessments.length}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Active Evaluation</p>
            <p className="text-2xl font-black text-slate-800">2 Pools</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <Users size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Attempt Users</p>
            <p className="text-2xl font-black text-slate-800">{attempts.length}</p>
          </div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <Target size={24} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Evaluated Pass %</p>
            <p className="text-2xl font-black text-slate-800">
              {Math.round((attempts.filter(a => a.status === 'Passed').length / attempts.length) * 100)}%
            </p>
          </div>
        </div>
      </div>

      {activeTab === 'list' && (
        <div className="space-y-4">
          {/* Search bar & filter */}
          <div className="flex bg-white p-3 rounded-2xl border border-slate-100 shadow-sm items-center gap-3">
            <Search className="text-slate-400" size={20} />
            <input
              type="text"
              placeholder="Search assessment guidelines, templates, titles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-slate-800 font-medium text-sm placeholder-slate-400"
            />
          </div>

          {/* List layout */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredAssessments.length === 0 ? (
              <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
                <AlertCircle className="mx-auto text-slate-300 mb-2" size={48} />
                <h3 className="text-lg font-bold text-slate-800">No Assessments Matches</h3>
                <p className="text-slate-500 text-sm mt-1">Get started by creating your first automated challenge or custom MCQ quiz!</p>
              </div>
            ) : (
              filteredAssessments.map(item => (
                <div key={item.id} className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm flex flex-col justify-between hover:border-slate-200 transition-all">
                  <div>
                    <div className="flex justify-between items-start gap-4">
                      <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-full">
                        {item.category}
                      </span>
                      <button 
                        onClick={() => deleteAssessment(item.id)}
                        className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-slate-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mt-3 tracking-tight">{item.title}</h3>
                    <p className="text-xs text-slate-400 font-bold mt-1">Created on {item.createdAt}</p>

                    <div className="grid grid-cols-3 gap-2 mt-6 p-3 bg-slate-50 rounded-2xl text-center">
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase">Questions</p>
                        <p className="text-base font-black text-slate-800">{item.questions.length}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase">Time Limit</p>
                        <p className="text-base font-black text-slate-800">{item.duration}m</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-semibold uppercase">Pass Bar</p>
                        <p className="text-base font-black text-slate-800">{item.passScore}%</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-2 pt-4 border-t border-slate-50">
                    <button
                      onClick={() => {
                        toast.success('Successfully linked this assessment to active jobs!');
                      }}
                      className="flex-1 py-2 bg-indigo-50 text-indigo-600 font-bold rounded-xl text-xs hover:bg-indigo-100 transition-colors"
                    >
                      Assign to Active Jobs
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'builder' && (
        <form onSubmit={handleCreateAssessment} className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Assessment Protocol Builder</h2>
            <p className="text-xs text-slate-500 font-medium">Define parameters, MCQ tests, and coding standards.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Test Title</label>
              <input
                type="text"
                placeholder="e.g. TypeScript & Testing Assessment v2"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-semibold text-sm outline-none focus:border-indigo-500 transition-colors text-slate-800"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Category Focus</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-semibold text-sm outline-none focus:border-indigo-500 transition-colors text-slate-800"
              >
                <option value="React & TypeScript">React & TypeScript</option>
                <option value="NodeJS, MySQL & Redis">NodeJS, MySQL & Redis</option>
                <option value="System Design & Architecture">System Design & Architecture</option>
                <option value="Database Optimization & Querying">Database Optimization & Querying</option>
                <option value="General Aptitude & Problem Solving">General Aptitude & Problem Solving</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Duration (Minutes)</label>
              <input
                type="number"
                min={5}
                max={180}
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-semibold text-sm outline-none focus:border-indigo-500 transition-colors text-slate-800"
              />
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Passing Score (%)</label>
              <input
                type="number"
                min={20}
                max={100}
                value={passScore}
                onChange={(e) => setPassScore(parseInt(e.target.value) || 70)}
                className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 font-semibold text-sm outline-none focus:border-indigo-500 transition-colors text-slate-800"
              />
            </div>
          </div>

          {/* Questions Editor Header */}
          <div className="flex justify-between items-center pt-6 border-t border-slate-100">
            <div>
              <h3 className="text-base font-bold text-slate-800">Challenge & Questions Setup ({questions.length})</h3>
              <p className="text-xs text-slate-500">Provide direct MCQs or coding questions with corresponding weight points.</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => addQuestionField('MCQ')}
                className="px-3.5 py-1.5 bg-indigo-50 text-indigo-600 font-bold rounded-lg text-xs hover:bg-indigo-100 transition-colors flex items-center gap-1"
              >
                <Plus size={14} /> Add MCQ
              </button>
            </div>
          </div>

          {/* Questions Fields Map */}
          <div className="space-y-6">
            {questions.map((q, qIndex) => (
              <div key={q.id} className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-4">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-black uppercase text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                    Challenge #{qIndex + 1} ({q.type})
                  </span>
                  <button
                    type="button"
                    onClick={() => removeQuestionField(qIndex)}
                    className="text-slate-400 hover:text-red-500 transition-all p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Question or Challenge Statement</label>
                  <textarea
                    rows={2}
                    placeholder="e.g. What is the Big-O time complexity of search operations in balanced binary search trees?"
                    value={q.questionText}
                    onChange={(e) => updateQuestionText(qIndex, e.target.value)}
                    className="w-full bg-white border border-slate-100 rounded-xl px-4 py-3 font-medium text-sm outline-none focus:border-indigo-500 text-slate-800"
                  />
                </div>

                {q.type === 'MCQ' && q.options && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase block mb-1">Answer Selections / Options (Select the Radio Button corresponding to the Correct Answer)</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {q.options.map((opt, optIndex) => (
                        <div key={optIndex} className="flex items-center bg-white rounded-xl border border-slate-100 px-3 py-1.5 gap-2.5">
                          <input
                            type="radio"
                            name={`correct-for-q-${q.id}`}
                            checked={q.correctOption === optIndex}
                            onChange={() => updateMCQCorrect(qIndex, optIndex)}
                            className="text-indigo-600 cursor-pointer focus:ring-0 focus:outline-none"
                          />
                          <input
                            type="text"
                            placeholder={`Option ${String.fromCharCode(65 + optIndex)}`}
                            value={opt}
                            onChange={(e) => updateMCQOption(qIndex, optIndex, e.target.value)}
                            className="bg-transparent border-none outline-none w-full text-slate-800 text-xs font-semibold placeholder-slate-400 py-1"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase mb-1.5 block">Assigned Score Points</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={q.points}
                    onChange={(e) => updateQuestionPoints(qIndex, parseInt(e.target.value) || 10)}
                    className="w-32 bg-white border border-slate-100 rounded-xl px-4 py-2 font-semibold text-sm outline-none text-slate-800"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('list')}
              className="px-6 py-3 border border-slate-200 rounded-2xl font-bold text-slate-600 hover:bg-slate-50 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-600/20 transition-all flex items-center gap-2"
            >
              <Save size={18} /> Publish Assessment
            </button>
          </div>
        </form>
      )}

      {activeTab === 'attempts' && (
        <div className="bg-white rounded-3xl border border-slate-100 p-6 shadow-sm overflow-hidden space-y-4">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Evaluate Submissions</h2>
            <p className="text-xs text-slate-500 font-medium">Examine applicant code correctness, MCQ marks, and pass statuses.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="py-3 px-4 text-[10px] uppercase font-black text-slate-400 tracking-wider">Candidate</th>
                  <th className="py-3 px-4 text-[10px] uppercase font-black text-slate-400 tracking-wider">Assessment Challenge</th>
                  <th className="py-3 px-4 text-[10px] uppercase font-black text-slate-400 tracking-wider text-center">Score</th>
                  <th className="py-3 px-4 text-[10px] uppercase font-black text-slate-400 tracking-wider text-center">Outcome Status</th>
                  <th className="py-3 px-4 text-[10px] uppercase font-black text-slate-400 tracking-wider text-right">Completion DateTime</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {attempts.map(att => (
                  <tr key={att.id} className="hover:bg-slate-50/50">
                    <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">{att.candidateName}</td>
                    <td className="py-3.5 px-4 font-medium text-slate-600 text-sm">{att.assessmentTitle}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`font-mono font-bold text-sm ${att.score >= att.passingScore ? 'text-emerald-600' : 'text-red-500'}`}>
                        {att.score}%
                      </span>
                      <span className="text-[10px] text-slate-400 block">Passing: {att.passingScore}%</span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full ${att.status === 'Passed' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                        {att.status === 'Passed' ? <CheckCircle2 size={12} /> : <XCircle size={12} />}
                        {att.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right text-xs text-slate-400 font-bold">{att.completedAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
