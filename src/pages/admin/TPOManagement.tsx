import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Building2, 
  Users, 
  Mail, 
  Phone, 
  Briefcase,
  Trash2,
  ExternalLink,
  ShieldCheck,
  ArrowRight,
  Upload,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';
import axios from 'axios';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

export default function TPOManagement() {
  const [colleges, setColleges] = useState<any[]>([]);
  const [tpos, setTpos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCollegeModal, setShowCollegeModal] = useState(false);
  const [showTPOModal, setShowTPOModal] = useState(false);

  // Standalone Batch Onboarding states
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [batchForm, setBatchForm] = useState({
    college_id: '',
    batch_name: '',
    studentsText: ''
  });
  const [batchParsedStudents, setBatchParsedStudents] = useState<{ name: string; email: string }[]>([]);
  const [onboardingProgress, setOnboardingProgress] = useState(false);

  // Form states
  const [collegeForm, setCollegeForm] = useState({
    college_name: '',
    college_code: '',
    university: '',
    address: '',
    district: '',
    state: '',
    website: '',
    contact_number: ''
  });

  const [tpoForm, setTpoForm] = useState({
    email: '',
    full_name: '',
    contact_number: '',
    designation: '',
    college_ids: [] as number[],
    batch_name: '',
    onboard_students: [] as { name: string; email: string }[]
  });

  const [tpoStudentsText, setTpoStudentsText] = useState('');
  const [tpoParsedStudents, setTpoParsedStudents] = useState<{ name: string; email: string }[]>([]);

  // Parser helper function
  const parseStudentsFromRawText = (text: string) => {
    const lines = text.split('\n');
    const list: { name: string; email: string }[] = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      // Split by comma, tab, semicolon or generic delimiter
      const parts = line.split(/[,\t;]+/);
      if (parts.length >= 2) {
        const emailIndex = parts.findIndex(part => part.includes('@'));
        if (emailIndex !== -1) {
          const email = parts[emailIndex].trim();
          const nameParts = parts.filter((_, idx) => idx !== emailIndex);
          const name = nameParts.join(' ').replace(/["']/g, '').trim();
          if (name && email) {
            list.push({ name, email });
          }
        } else {
          const name = parts[0].replace(/["']/g, '').trim();
          const email = parts[1].trim();
          if (name && email.includes('@')) {
            list.push({ name, email });
          }
        }
      } else if (parts.length === 1 && parts[0].includes('@')) {
        const email = parts[0].trim();
        const deducedName = email.split('@')[0].split(/[._+-]+/).map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
        list.push({ name: deducedName, email });
      }
    }
    return list;
  };

  const [collegeSuggestions, setCollegeSuggestions] = useState<string[]>([]);
  const [searchingCollege, setSearchingCollege] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [debounceTimeout, setDebounceTimeout] = useState<any>(null);

  const deduceCollegeDetails = (fullName: string) => {
    const nameUpper = fullName.toUpperCase();
    let state = 'Maharashtra';
    let district = 'Mumbai';
    let university = 'University of Mumbai';

    if (nameUpper.includes('MUMBAI') || nameUpper.includes('BOMBAY')) {
      district = 'Mumbai';
      state = 'Maharashtra';
      university = 'University of Mumbai';
    } else if (nameUpper.includes('PUNE') || nameUpper.includes('COEP') || nameUpper.includes('SYMBIOSIS')) {
      district = 'Pune';
      state = 'Maharashtra';
      university = 'Savitribai Phule Pune University';
    } else if (nameUpper.includes('SOLAPUR') || nameUpper.includes('WIT') || nameUpper.includes('ORCHID') || nameUpper.includes('BMIT')) {
      district = 'Solapur';
      state = 'Maharashtra';
      university = 'Punyashlok Ahilyadevi Holkar Solapur University';
    } else if (nameUpper.includes('VELLORE') || nameUpper.includes('VIT')) {
      district = 'Vellore';
      state = 'Tamil Nadu';
      university = 'VIT University';
    } else if (nameUpper.includes('CHENNAI') || nameUpper.includes('SRM') || nameUpper.includes('MADRAS')) {
      district = 'Chennai';
      state = 'Tamil Nadu';
      university = 'Anna University';
    } else if (nameUpper.includes('BENGALURU') || nameUpper.includes('BANGALORE') || nameUpper.includes('RV')) {
      district = 'Bengaluru';
      state = 'Karnataka';
      university = 'Visvesvaraya Technological University';
    } else if (nameUpper.includes('DELHI') || nameUpper.includes('IITD') || nameUpper.includes('DPS')) {
      district = 'New Delhi';
      state = 'Delhi';
      university = 'Delhi Technological University';
    } else if (nameUpper.includes('HYDERABAD') || nameUpper.includes('BITS')) {
      district = 'Hyderabad';
      state = 'Telangana';
      university = 'JNTU Hyderabad';
    } else if (nameUpper.includes('KOLKATA') || nameUpper.includes('JADAVPUR')) {
      district = 'Kolkata';
      state = 'West Bengal';
      university = 'Jadavpur University';
    }

    // Generate neat unique code
    let code = fullName
      .replace(/[()]/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim()
      .split(/\s+/)
      .slice(0, 3)
      .join('-')
      .toUpperCase();

    if (!code) {
      code = 'COLG-' + Math.floor(1000 + Math.random() * 9000);
    }

    return { district, state, university, code };
  };

  const handleCollegeNameChange = (val: string) => {
    setCollegeForm(prev => ({ ...prev, college_name: val }));
    
    if (debounceTimeout) clearTimeout(debounceTimeout);
    
    if (val.trim().length > 2) {
      setSearchingCollege(true);
      const timeout = setTimeout(async () => {
        try {
          const res = await api.get('/students/suggest-institutions', {
            params: { q: val, type: 'college' }
          });
          if (res.data && res.data.success) {
            setCollegeSuggestions(res.data.suggestions || []);
            setShowSuggestions(true);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setSearchingCollege(false);
        }
      }, 300);
      setDebounceTimeout(timeout);
    } else {
      setSearchingCollege(false);
      setCollegeSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectCollegeSuggestion = (s: string) => {
    const details = deduceCollegeDetails(s);
    setCollegeForm({
      college_name: s,
      college_code: details.code,
      university: details.university,
      address: s + ', India',
      district: details.district,
      state: details.state,
      website: `https://www.${s.toLowerCase().replace(/[^a-z0-9]/g, '')}.edu.in`,
      contact_number: '+91 98765 43210'
    });
    setCollegeSuggestions([]);
    setShowSuggestions(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [colRes, tpoRes] = await Promise.all([
        api.get('/admin/colleges'),
        api.get('/admin/tpos')
      ]);
      setColleges(colRes.data.data);
      setTpos(tpoRes.data.data);
    } catch (error) {
      toast.error('Failed to fetch data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCollege = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this college? This action cannot be undone.')) return;
    
    try {
      const res = await api.delete(`/admin/colleges/${id}`);
      if (res.data.success) {
        toast.success('College deleted successfully');
        fetchData();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error deleting college');
    }
  };

  const handleCreateCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin/colleges', collegeForm);
      if (res.data.success) {
        toast.success('College created successfully');
        setShowCollegeModal(false);
        fetchData();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error creating college');
    }
  };

  const handleCreateTPO = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...tpoForm,
        onboard_students: tpoParsedStudents
      };
      const res = await api.post('/admin/tpos', payload);
      if (res.data.success) {
        toast.success('TPO account created and credentials sent via email');
        if (tpoParsedStudents.length > 0) {
          toast.success(`Registered and onboarded ${tpoParsedStudents.length} students to batch '${tpoForm.batch_name}'!`);
        }
        setShowTPOModal(false);
        setTpoStudentsText('');
        setTpoParsedStudents([]);
        setTpoForm({
          email: '',
          full_name: '',
          contact_number: '',
          designation: '',
          college_ids: [],
          batch_name: '',
          onboard_students: []
        });
        fetchData();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error creating TPO');
    }
  };

  const handleOnboardStandaloneBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchForm.college_id || !batchForm.batch_name || batchParsedStudents.length === 0) {
      toast.error('Please select a college, name the batch, and provide at least one valid student record.');
      return;
    }
    setOnboardingProgress(true);
    try {
      const res = await api.post('/admin/onboard-batch', {
        college_id: parseInt(batchForm.college_id),
        batch_name: batchForm.batch_name,
        students: batchParsedStudents
      });
      if (res.data.success) {
        toast.success(res.data.message || 'Batch students onboarded and credential emails dispatched!');
        setShowBatchModal(false);
        setBatchForm({ college_id: '', batch_name: '', studentsText: '' });
        setBatchParsedStudents([]);
        fetchData();
      }
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error onboarding student batch');
    } finally {
      setOnboardingProgress(false);
    }
  };

  const seedSampleData = async () => {
    try {
      const res = await api.post('/admin/seed-tpo-data-v2');
      if (res.data.success) {
        toast.success('Production-grade mock data seeded successfully!');
        fetchData();
      }
    } catch (error) {
      toast.error('Seeding failed');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight italic">
            TPO & <span className="text-blue-600">College</span> Management
          </h1>
          <p className="text-slate-500 font-medium">Manage institutional accounts and placement officers</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={seedSampleData}
            className="flex items-center gap-2 px-6 py-3 bg-purple-600 rounded-2xl font-bold text-white shadow-lg shadow-purple-600/20 hover:bg-purple-700 transition-all text-sm"
          >
            <ArrowRight size={18} />
            Seed All Data
          </button>
          <button 
            onClick={() => setShowCollegeModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl font-bold text-slate-700 hover:bg-slate-50 transition-all text-sm"
          >
            <Building2 size={18} />
            Add College
          </button>
          <button 
            onClick={() => setShowBatchModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-emerald-600 rounded-2xl font-bold text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 transition-all text-sm"
          >
            <FileSpreadsheet size={18} />
            Onboard Student Batch
          </button>
          <button 
            onClick={() => setShowTPOModal(true)}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 rounded-2xl font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all text-sm"
          >
            <Plus size={18} />
            Create TPO
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Colleges List */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-black text-slate-900 uppercase tracking-tight">Colleges Master</h3>
            <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold">{colleges.length}</span>
          </div>
          <div className="divide-y divide-slate-100">
            {colleges.map((college) => (
              <div key={college.id} className="p-6 hover:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-slate-900">{college.college_name}</h4>
                    <p className="text-sm text-slate-500 font-medium">{college.college_code} • {college.university}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-slate-400 font-bold uppercase tracking-wider">
                      <span>{college.district}, {college.state}</span>
                      <a href={college.website} target="_blank" rel="noreferrer" className="text-blue-500 hover:underline">Website</a>
                    </div>
                  </div>
                  <button className="p-2 text-slate-400 hover:text-red-500 rounded-lg transition-all">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TPOs List */}
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center">
            <h3 className="font-black text-slate-900 uppercase tracking-tight">Placement Officers</h3>
            <span className="bg-blue-100 text-blue-600 px-3 py-1 rounded-full text-xs font-bold">{tpos.length}</span>
          </div>
          <div className="divide-y divide-slate-100">
            {tpos.map((tpo) => (
              <div key={tpo.id} className="p-6 hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 font-black">
                    {tpo.full_name[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between">
                      <h4 className="font-bold text-slate-900">{tpo.full_name}</h4>
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${tpo.user_status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {tpo.user_status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 font-medium">{tpo.designation}</p>
                    <p className="text-xs text-slate-400 font-bold mt-1">{tpo.email}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {tpo.assigned_colleges?.split(',').map((c: string, i: number) => (
                        <span key={i} className="bg-slate-100 text-slate-600 text-[10px] font-bold px-2 py-1 rounded-md">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* College Modal */}
      {showCollegeModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden relative">
            <div className="p-8 border-b border-slate-100 pb-4">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Add New College</h2>
              <p className="text-sm text-slate-500 font-medium">Search the master list of Indian colleges or enter a custom one</p>
            </div>
            <form onSubmit={handleCreateCollege} className="p-8 space-y-5 max-h-[80vh] overflow-y-auto">
              <div className="space-y-4">
                {/* College Search Autocomplete */}
                <div className="space-y-2 relative">
                  <label className="text-xs font-black text-slate-500 uppercase flex justify-between items-center">
                    <span>College Name</span>
                    {searchingCollege && <span className="text-blue-600 animate-pulse text-[10px] font-bold">Searching India Master...</span>}
                  </label>
                  <input 
                    required 
                    type="text" 
                    placeholder="Type to search colleges in India (e.g. IIT, WIT, COEP, VIT, Orchid...)"
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                    value={collegeForm.college_name} 
                    onChange={e => handleCollegeNameChange(e.target.value)} 
                  />
                  {showSuggestions && collegeSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-50 max-h-56 overflow-y-auto divide-y divide-slate-100">
                      {collegeSuggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 text-slate-800 text-sm font-bold transition-all flex items-center gap-2"
                          onClick={() => handleSelectCollegeSuggestion(suggestion)}
                        >
                          <Building2 size={16} className="text-blue-500 shrink-0" />
                          <span>{suggestion}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase">College Code (Unique ID)</label>
                    <input 
                      required 
                      type="text" 
                      placeholder="e.g. COEP-PUNE"
                      className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                      value={collegeForm.college_code} 
                      onChange={e => setCollegeForm({...collegeForm, college_code: e.target.value.toUpperCase()})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase">University Affiliation</label>
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. Savitribai Phule Pune University"
                      className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                      value={collegeForm.university} 
                      onChange={e => setCollegeForm({...collegeForm, university: e.target.value})} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase">District / City</label>
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. Solapur"
                      className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                      value={collegeForm.district} 
                      onChange={e => setCollegeForm({...collegeForm, district: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase">State</label>
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. Maharashtra"
                      className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                      value={collegeForm.state} 
                      onChange={e => setCollegeForm({...collegeForm, state: e.target.value})} 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase">Website</label>
                    <input 
                      required
                      type="url" 
                      placeholder="https://www.college.edu.in"
                      className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                      value={collegeForm.website} 
                      onChange={e => setCollegeForm({...collegeForm, website: e.target.value})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase">Contact Number</label>
                    <input 
                      required
                      type="text" 
                      placeholder="e.g. +91 217 2652402"
                      className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                      value={collegeForm.contact_number} 
                      onChange={e => setCollegeForm({...collegeForm, contact_number: e.target.value})} 
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase">Address</label>
                  <textarea 
                    required
                    placeholder="e.g. Post Box No. 947, Limbyee, Maharashtra, India"
                    rows={2}
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none" 
                    value={collegeForm.address} 
                    onChange={e => setCollegeForm({...collegeForm, address: e.target.value})} 
                  />
                </div>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowCollegeModal(false)} className="px-6 py-3 font-bold text-slate-500 hover:text-slate-900 transition-all">Cancel</button>
                <button type="submit" className="px-8 py-3 bg-blue-600 rounded-xl font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all">Create College</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TPO Modal */}
      {showTPOModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-100">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight">Create TPO Account</h2>
            </div>
            <form onSubmit={handleCreateTPO} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase">Full Name</label>
                  <input required type="text" className="w-full p-3 bg-slate-50 rounded-xl border-none font-medium focus:ring-2 focus:ring-blue-500" value={tpoForm.full_name} onChange={e => setTpoForm({...tpoForm, full_name: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase">Email Address</label>
                  <input required type="email" className="w-full p-3 bg-slate-50 rounded-xl border-none font-medium focus:ring-2 focus:ring-blue-500" value={tpoForm.email} onChange={e => setTpoForm({...tpoForm, email: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase">Designation</label>
                  <input required type="text" className="w-full p-3 bg-slate-50 rounded-xl border-none font-medium focus:ring-2 focus:ring-blue-500" value={tpoForm.designation} onChange={e => setTpoForm({...tpoForm, designation: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase">Assign Colleges</label>
                  {colleges.length > 0 ? (
                    <>
                      <select 
                        multiple 
                        className="w-full p-3 bg-slate-50 rounded-xl border-none font-medium focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                        value={tpoForm.college_ids.map(String)}
                        onChange={e => setTpoForm({...tpoForm, college_ids: Array.from(e.target.selectedOptions, option => parseInt(option.value))})}
                      >
                        {colleges.map(c => <option key={c.id} value={c.id}>{c.college_name}</option>)}
                      </select>
                      <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Hold Ctrl to select multiple</p>
                    </>
                  ) : (
                    <div className="p-4 bg-orange-50 border border-orange-100 rounded-xl">
                      <p className="text-xs text-orange-700 font-bold uppercase tracking-tight">
                        No colleges found. Please add a college first using the "Add College" button.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Optional Batch Student Onboarding Section */}
              <div className="border-t border-slate-100 pt-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
                    <FileSpreadsheet className="text-emerald-500" size={16} />
                    Optional Parallel Batch Student Onboarding
                  </h4>
                </div>
                <p className="text-xs text-slate-500">
                  Register all first-year or final-year students for the assigned college(s) immediately under a custom batch. Each student will receive their generated credentials automatically.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase">Batch Name</label>
                    <input 
                      type="text" 
                      placeholder="e.g. 2026 CS-A" 
                      className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      value={tpoForm.batch_name}
                      onChange={e => setTpoForm({...tpoForm, batch_name: e.target.value})}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-1.5">
                      Upload CSV / Excel Export
                      <span className="text-[9px] lowercase text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded">.csv or .txt</span>
                    </label>
                    <div className="relative flex items-center justify-center border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl bg-slate-50 p-2 text-center cursor-pointer transition-all">
                      <input 
                        type="file" 
                        accept=".csv,.txt"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            const text = event.target?.result as string;
                            setTpoStudentsText(text);
                            const parsed = parseStudentsFromRawText(text);
                            setTpoParsedStudents(parsed);
                            toast.success(`Loaded ${parsed.length} students from ${file.name}`);
                          };
                          reader.readAsText(file);
                        }}
                      />
                      <div className="flex items-center gap-2">
                        <Upload size={14} className="text-slate-400" />
                        <span className="text-xs font-bold text-slate-600">Choose File</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase">
                    Pasted Student List / Raw CSV Text
                  </label>
                  <textarea 
                    placeholder="Rahul Sharma, rahul@college.edu&#10;Sneha Patil, sneha@college.edu&#10;Amit Shinde, amit@college.edu"
                    rows={4}
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                    value={tpoStudentsText}
                    onChange={(e) => {
                      setTpoStudentsText(e.target.value);
                      const parsed = parseStudentsFromRawText(e.target.value);
                      setTpoParsedStudents(parsed);
                    }}
                  />
                  <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                    Paste student names and emails here from your Excel sheets (Name, Email format, or copy-paste directly).
                  </p>
                </div>

                {tpoParsedStudents.length > 0 && (
                  <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-xl space-y-2">
                    <div className="flex justify-between items-center text-emerald-800 font-bold text-xs uppercase tracking-wider">
                      <span>Detected Student list ({tpoParsedStudents.length})</span>
                      <span className="text-emerald-700 font-black">Ready</span>
                    </div>
                    <div className="max-h-[120px] overflow-y-auto divide-y divide-emerald-100 border border-emerald-100 rounded-lg bg-white text-xs">
                      {tpoParsedStudents.map((st, i) => (
                        <div key={i} className="px-3 py-1.5 flex justify-between font-medium">
                          <span className="text-slate-700 font-semibold">{st.name}</span>
                          <span className="text-slate-500 font-mono text-[11px]">{st.email}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 p-4 rounded-2xl flex items-start gap-3 border border-blue-100">
                <ShieldCheck className="text-blue-600 shrink-0" size={20} />
                <p className="text-xs text-blue-700 leading-relaxed font-medium">
                  Account will be created with a secure temporary password. Credentials and login instructions will be automatically emailed to the TPO.
                </p>
              </div>
              <div className="flex justify-end gap-4 border-t border-slate-100 pt-4">
                <button type="button" onClick={() => setShowTPOModal(false)} className="px-6 py-3 font-bold text-slate-500 hover:text-slate-900 transition-all">Cancel</button>
                <button type="submit" className="px-8 py-3 bg-blue-600 rounded-xl font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all">Create TPO Account</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Standalone Batch Modal */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-2">
                <FileSpreadsheet className="text-emerald-500" />
                Onboard Student Batch
              </h2>
              <button onClick={() => { setShowBatchModal(false); setBatchParsedStudents([]); setBatchForm({ college_id: '', batch_name: '', studentsText: '' }); }} className="text-slate-400 hover:text-slate-600 font-black">✕</button>
            </div>
            <form onSubmit={handleOnboardStandaloneBatch} className="p-8 space-y-6 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase">Target Institutional College</label>
                  {colleges.length > 0 ? (
                    <select 
                      required
                      className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      value={batchForm.college_id}
                      onChange={e => setBatchForm({...batchForm, college_id: e.target.value})}
                    >
                      <option value="">Select College...</option>
                      {colleges.map(c => <option key={c.id} value={c.id}>{c.college_name}</option>)}
                    </select>
                  ) : (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700 font-black">
                      No colleges registered. Please create a college first.
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase">Batch Name</label>
                  <input 
                    required 
                    type="text" 
                    placeholder="e.g. Batch of 2026 CS-B" 
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 font-medium focus:ring-2 focus:ring-emerald-500 focus:border-transparent-transparent" 
                    value={batchForm.batch_name} 
                    onChange={e => setBatchForm({...batchForm, batch_name: e.target.value})} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-100 pt-6">
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase flex items-center gap-1.5">
                    Option A: File Upload
                    <span className="text-[10px] text-slate-400 font-bold bg-slate-100 px-1.5 py-0.5 rounded">.csv or .txt</span>
                  </label>
                  <p className="text-[11px] text-slate-500 leading-tight">Select any Student Roster export of student names and emails.</p>
                  <div className="relative flex items-center justify-center border-2 border-dashed border-slate-200 hover:border-emerald-500 rounded-xl bg-slate-50/50 p-6 text-center cursor-pointer transition-all">
                    <input 
                      type="file" 
                      accept=".csv,.txt"
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (event) => {
                          const text = event.target?.result as string;
                          setBatchForm(p => ({ ...p, studentsText: text }));
                          const parsed = parseStudentsFromRawText(text);
                          setBatchParsedStudents(parsed);
                          toast.success(`Parsed ${parsed.length} students from file successfully`);
                        };
                        reader.readAsText(file);
                      }}
                    />
                    <div className="space-y-1">
                      <Upload size={24} className="text-slate-400 mx-auto" />
                      <p className="text-xs font-bold text-slate-600">Choose Student Roster File</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-500 uppercase">Option B: Copy-Paste Excel Sheet Rows</label>
                  <p className="text-[11px] text-slate-500 leading-tight">Directly copy-paste name and email columns.</p>
                  <textarea 
                    placeholder="Rahul Sharma, rahul@college.edu&#10;Sneha Patil, sneha@college.edu&#10;Amit Shinde, amit@college.edu"
                    rows={4}
                    className="w-full p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono text-xs focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                    value={batchForm.studentsText}
                    onChange={(e) => {
                      setBatchForm({...batchForm, studentsText: e.target.value});
                      const parsed = parseStudentsFromRawText(e.target.value);
                      setBatchParsedStudents(parsed);
                    }}
                  />
                </div>
              </div>

              {batchParsedStudents.length > 0 && (
                <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl space-y-3">
                  <div className="flex justify-between items-center text-emerald-800 font-black text-xs uppercase tracking-wider">
                    <span>Detected Roster list ({batchParsedStudents.length})</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded font-black uppercase">Valid Records</span>
                  </div>
                  <div className="max-h-[160px] overflow-y-auto divide-y divide-emerald-100 border border-emerald-100 rounded-xl bg-white text-xs">
                    {batchParsedStudents.map((st, i) => (
                      <div key={i} className="px-4 py-2 flex justify-between font-semibold">
                        <span className="text-slate-700">{st.name}</span>
                        <span className="text-slate-500 font-mono text-[11px]">{st.email}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-blue-50 p-4 border border-blue-100 rounded-2xl flex items-start gap-3">
                <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={18} />
                <p className="text-xs text-blue-700 leading-relaxed font-semibold">
                  Upon submission, each parsed student account is automatically registered, allocated a starter XP balance of 100, and is dispatched a personalized email notification containing their randomly generated account credential password.
                </p>
              </div>

              <div className="flex justify-end gap-4 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => { setShowBatchModal(false); setBatchParsedStudents([]); }} className="px-6 py-3 font-bold text-slate-500 hover:text-slate-900 transition-all">Cancel</button>
                <button 
                  type="submit" 
                  disabled={onboardingProgress || batchParsedStudents.length === 0}
                  className="px-8 py-3 bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-bold text-white shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all"
                >
                  {onboardingProgress ? 'Onboarding and Sending Emails...' : `Onboard ${batchParsedStudents.length} Students`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
