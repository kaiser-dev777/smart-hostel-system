// src/pages/PorterDashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, CheckCircle, Megaphone, ClipboardList } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function PorterDashboard() {
  const navigate = useNavigate();
  const [porterProfile, setPorterProfile] = useState(null);
  const [requests, setRequests] = useState([]);
  const [announcement, setAnnouncement] = useState({ title: '', message: '' });
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) {
      navigate('/');
      return;
    }
    const user = JSON.parse(userStr);
    if (user.role !== 'porter') {
      navigate('/');
      return;
    }
    setPorterProfile(user);
    fetchRequests();
  }, [navigate]);

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from('maintenance_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setRequests(data);
  };

  const handleResolve = async (id) => {
    const { error } = await supabase
      .from('maintenance_requests')
      .update({ status: 'Resolved' })
      .eq('id', id);
    if (!error) fetchRequests();
  };

  const postAnnouncement = async (e) => {
    e.preventDefault();
    setIsPosting(true);
    const { error } = await supabase
      .from('announcements')
      .insert([{ 
        title: announcement.title, 
        message: announcement.message,
        created_by: porterProfile.full_name 
      }]);

    if (!error) {
      alert("Announcement posted to all students!");
      setAnnouncement({ title: '', message: '' });
    } else {
      alert("Error posting announcement: " + error.message);
    }
    setIsPosting(false);
  };

  if (!porterProfile) return <div className="p-10 text-center font-bold">Loading...</div>;

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <h2 className="text-3xl font-black text-gray-800">Porter Command Center</h2>
        <p className="text-gray-500 font-medium">Welcome back, {porterProfile.full_name}</p>
      </div>

      {/* ANNOUNCEMENT MODULE */}
      <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 rounded-2xl text-white shadow-lg">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Megaphone size={24} /> Post Public Announcement
        </h3>
        <form onSubmit={postAnnouncement} className="space-y-4 text-gray-800">
          <input 
            type="text" 
            placeholder="Title (e.g., Water Scarcity Notice)"
            className="w-full p-3 rounded-lg outline-none focus:ring-2 focus:ring-indigo-300"
            value={announcement.title}
            onChange={(e) => setAnnouncement({...announcement, title: e.target.value})}
            required
          />
          <textarea 
            placeholder="Type your message here..."
            className="w-full p-3 rounded-lg h-24 outline-none focus:ring-2 focus:ring-indigo-300 resize-none"
            value={announcement.message}
            onChange={(e) => setAnnouncement({...announcement, message: e.target.value})}
            required
          />
          <button 
            disabled={isPosting}
            className="bg-white text-indigo-700 font-black py-2 px-6 rounded-lg hover:bg-indigo-50 transition-all disabled:opacity-70 shadow-sm"
          >
            {isPosting ? 'Broadcasting...' : 'Broadcast Message'}
          </button>
        </form>
      </div>

      {/* MAINTENANCE MODULE */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center gap-3 mb-6">
          <ClipboardList className="text-orange-500" size={28} />
          <h3 className="text-xl font-bold text-gray-800">Live Work Orders</h3>
        </div>
        
        <div className="space-y-4">
          {requests.length === 0 ? (
            <p className="text-gray-500 italic">No maintenance requests at the moment.</p>
          ) : (
            requests.map((req) => (
              <div key={req.id} className={`p-4 rounded-xl border-l-4 flex flex-col md:flex-row justify-between md:items-center gap-4 ${
                req.status === 'Resolved' ? 'bg-green-50 border-green-500' : 'bg-orange-50 border-orange-500'
              }`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-gray-900">{req.room_number}</span>
                    <span className="text-gray-400 text-sm">•</span>
                    <span className="text-sm font-bold text-gray-600">{req.student_name}</span>
                  </div>
                  <p className="text-gray-800 font-medium mt-1">{req.issue_type}</p>
                  <p className="text-xs text-gray-500 mt-2">Reported: {new Date(req.created_at).toLocaleString()}</p>
                </div>
                
                {req.status === 'Pending' ? (
                  <button 
                    onClick={() => handleResolve(req.id)}
                    className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-sm"
                  >
                    <Wrench size={16} /> Mark Resolved
                  </button>
                ) : (
                  <div className="flex items-center gap-2 text-green-600 font-bold bg-green-100 px-4 py-2 rounded-lg">
                    <CheckCircle size={18} /> Resolved
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}