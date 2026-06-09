import React, { useState, useEffect } from 'react';
import {
  Calendar,
  Plus,
  MapPin,
  Clock,
  Users,
  Search,
  Filter,
  ArrowRight,
  MoreVertical,
  X
} from 'lucide-react';
import api from '../../services/api';
import { toast } from 'react-hot-toast';

export default function TPOEvents() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    event_type: 'PLACEMENT_DRIVE',
    start_date: '',
    college_id: ''
  });
  const [colleges, setColleges] = useState<any[]>([]);

  useEffect(() => {
    fetchEvents();
    fetchColleges();
  }, []);

  const fetchColleges = async () => {
    try {
      const res = await api.get('/tpo/colleges');
      if (res.data.success) setColleges(res.data.data);
    } catch (error) {
      console.error('Error fetching colleges');
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/tpo/events', newEvent);
      if (res.data.success) {
        toast.success('Event created successfully');
        setShowCreateModal(false);
        fetchEvents();
      }
    } catch (error) {
      toast.error('Failed to create event');
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await api.get('/tpo/events');
      if (res.data.success) {
        setEvents(res.data.data);
      }
    } catch (error) {
      toast.error('Failed to fetch events');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const styles: any = {
      UPCOMING: 'bg-blue-100 text-blue-700',
      ONGOING: 'bg-green-100 text-green-700',
      COMPLETED: 'bg-slate-100 text-slate-700',
      CANCELLED: 'bg-red-100 text-red-700'
    };
    return <span className={`${styles[status] || 'bg-slate-100'} px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider`}>{status}</span>;
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-end">
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 rounded-2xl font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
        >
          <Plus size={18} />
          Create Event
        </button>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by drive title or company..."
              className="w-full pl-12 pr-4 py-3 rounded-xl border-none bg-slate-50 focus:ring-2 focus:ring-blue-500 font-medium"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {['ALL', 'PLACEMENT_DRIVE', 'WORKSHOP'].map(type => (
              <button 
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${filterType === type ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-100 overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest italic">Create New Event</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Schedule a recruitment drive or workshop</p>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-white rounded-xl transition-all">
                <X size={20} className="text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleCreateEvent} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Event Title</label>
                <input 
                  required
                  type="text" 
                  className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                  placeholder="e.g. TCS Ninja Drive 2026"
                  value={newEvent.title}
                  onChange={e => setNewEvent({...newEvent, title: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Event Type</label>
                  <select 
                    className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm appearance-none"
                    value={newEvent.event_type}
                    onChange={e => setNewEvent({...newEvent, event_type: e.target.value})}
                  >
                    <option value="PLACEMENT_DRIVE">Placement Drive</option>
                    <option value="WORKSHOP">Workshop</option>
                    <option value="WEBINAR">Webinar</option>
                    <option value="INTERVIEW">Interview</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Start Date</label>
                  <input 
                    required
                    type="date" 
                    className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm"
                    value={newEvent.start_date}
                    onChange={e => setNewEvent({...newEvent, start_date: e.target.value})}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select College</label>
                <select 
                  required
                  className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm appearance-none"
                  value={newEvent.college_id}
                  onChange={e => setNewEvent({...newEvent, college_id: e.target.value})}
                >
                  <option value="">Select a college...</option>
                  {colleges.map(c => (
                    <option key={c.id} value={c.id}>{c.college_name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Description</label>
                <textarea 
                  className="w-full px-5 py-3.5 rounded-2xl bg-slate-50 border-none focus:ring-2 focus:ring-blue-500 font-bold text-sm min-h-[100px]"
                  placeholder="Details about the drive, eligibility, etc."
                  value={newEvent.description}
                  onChange={e => setNewEvent({...newEvent, description: e.target.value})}
                />
              </div>

              <button 
                type="submit"
                className="w-full py-4 bg-blue-600 rounded-2xl font-black text-white uppercase tracking-widest shadow-lg shadow-blue-600/20 hover:bg-blue-700 transition-all"
              >
                Create Event Now
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          <div className="h-64 flex items-center justify-center text-slate-400 font-bold uppercase tracking-widest text-sm">Loading events...</div>
        ) : events.length === 0 ? (
          <div className="bg-white p-12 rounded-3xl border border-slate-100 shadow-sm text-center">
            <Calendar size={48} className="mx-auto text-slate-200 mb-4" />
            <h3 className="text-lg font-bold text-slate-900">No Events Found</h3>
            <p className="text-slate-500 mt-2">Start by creating your first placement drive or workshop.</p>
          </div>
        ) : (
          events.map((event) => (
            <div key={event.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow group">
              <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8">
                <div className="w-full md:w-48 h-32 bg-slate-100 rounded-2xl shrink-0 flex flex-col items-center justify-center text-slate-400">
                   <p className="text-2xl font-black">{new Date(event.start_date).getDate()}</p>
                   <p className="text-xs font-black uppercase tracking-tighter">
                     {new Date(event.start_date).toLocaleString('default', { month: 'short', year: 'numeric' })}
                   </p>
                </div>
                
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusBadge(event.status)}
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{event.event_type}</span>
                      </div>
                      <h3 className="text-xl font-black text-slate-900 group-hover:text-blue-600 transition-colors">{event.title}</h3>
                      <p className="text-sm text-slate-500 mt-2 font-medium line-clamp-2">{event.description}</p>
                    </div>
                    <button className="p-2 text-slate-400 hover:text-slate-600 rounded-lg">
                      <MoreVertical size={20} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-6">
                    <div className="flex items-center gap-2 text-slate-500">
                      <MapPin size={16} />
                      <span className="text-xs font-bold">{event.location_or_link || 'TBD'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <Clock size={16} />
                      <span className="text-xs font-bold">{new Date(event.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <Users size={16} />
                      <span className="text-xs font-bold">{event.registration_count || 0} Registered</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <ArrowRight size={16} />
                      <span className="text-xs font-bold text-blue-600">View Details</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
