// src/pages/PorterDashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Wrench, CheckCircle, Megaphone, ClipboardList, 
  Printer, XCircle, PackageOpen, RefreshCw,
  Bed, Wind, Archive, ShieldCheck, AlertTriangle, Clock
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function PorterDashboard() {
  const navigate = useNavigate();
  const [porterProfile, setPorterProfile] = useState(null);
  
  const [requests, setRequests] = useState([]);
  const [inventory, setInventory] = useState([]);
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
    fetchDashboardData();
  }, [navigate]);

  const fetchDashboardData = async () => {
    const { data: reqData } = await supabase
      .from('maintenance_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (reqData) setRequests(reqData);

    const { data: invData } = await supabase
      .from('inventory')
      .select('*')
      .order('room_number', { ascending: true });
    if (invData) setInventory(invData);
  };

  const handleUpdateStatus = async (id, newStatus) => {
    const { error } = await supabase
      .from('maintenance_requests')
      .update({ status: newStatus })
      .eq('id', id);
    if (!error) fetchDashboardData();
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
      alert("Announcement posted!");
      setAnnouncement({ title: '', message: '' });
    }
    setIsPosting(false);
  };

  const handlePrint = () => window.print();

  if (!porterProfile) return <div className="p-10 text-center font-bold">Loading Dashboard...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10">
      
      {/* HEADER */}
      <div className="flex justify-between items-end print:hidden">
        <div>
          <h2 className="text-3xl font-black text-gray-800">Porter Command Center</h2>
          <p className="text-gray-500 font-medium">Hostel Management & Safety Audit</p>
        </div>
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-md active:scale-95"
        >
          <Printer size={18} /> Generate Report
        </button>
      </div>

      {/* ANNOUNCEMENT BOX */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl text-white shadow-xl print:hidden">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Megaphone size={22} className="animate-bounce" /> Broadcast Notice
        </h3>
        <form onSubmit={postAnnouncement} className="space-y-4 text-gray-800">
          <input 
            type="text" 
            placeholder="Subject (e.g., Mandatory Room Inspection)"
            className="w-full p-3 rounded-xl border-none outline-none focus:ring-4 focus:ring-blue-300 transition-all"
            value={announcement.title}
            onChange={(e) => setAnnouncement({...announcement, title: e.target.value})}
            required
          />
          <textarea 
            placeholder="Detailed message..."
            className="w-full p-3 rounded-xl h-20 outline-none focus:ring-4 focus:ring-blue-300 resize-none transition-all"
            value={announcement.message}
            onChange={(e) => setAnnouncement({...announcement, message: e.target.value})}
            required
          />
          <button 
            disabled={isPosting}
            className="bg-white text-blue-700 font-black py-2.5 px-8 rounded-xl hover:bg-blue-50 transition-all disabled:opacity-50"
          >
            {isPosting ? 'Sending...' : 'Broadcast to All Students'}
          </button>
        </form>
      </div>

      {/* WORK ORDERS SECTION */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 print:hidden">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
            <ClipboardList size={24} />
          </div>
          <h3 className="text-xl font-bold text-gray-800">Maintenance Pipeline</h3>
        </div>
        
        <div className="grid grid-cols-1 gap-4">
          {requests.length === 0 ? (
            <p className="text-gray-400 italic text-center py-4">No active work orders.</p>
          ) : (
            requests.map((req) => (
              <div key={req.id} className={`group p-5 rounded-2xl border-2 flex flex-col md:flex-row justify-between md:items-center gap-4 transition-all hover:shadow-md ${
                req.status === 'Resolved' ? 'bg-green-50/50 border-green-100' : 
                req.status === 'Declined' ? 'bg-red-50/50 border-red-100' : 
                'bg-white border-gray-100'
              }`}>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-black text-gray-900 bg-gray-100 px-2 py-0.5 rounded text-sm uppercase">{req.room_number}</span>
                    <span className="text-gray-400 text-xs font-bold uppercase tracking-widest">{req.student_name}</span>
                  </div>
                  <p className="text-gray-800 font-semibold">{req.issue_type}</p>
                  <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold mt-2">
                    <Clock size={12} /> {new Date(req.created_at).toLocaleString()}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {req.status === 'Pending' ? (
                    <>
                      <button 
                        onClick={() => handleUpdateStatus(req.id, 'Declined')}
                        className="bg-white text-red-500 border-2 border-red-100 hover:bg-red-500 hover:text-white px-4 py-2 rounded-xl font-bold transition-all text-sm flex items-center gap-1"
                      >
                        <XCircle size={16} /> Decline
                      </button>
                      <button 
                        onClick={() => handleUpdateStatus(req.id, 'Resolved')}
                        className="bg-green-600 text-white hover:bg-green-700 px-5 py-2 rounded-xl font-bold transition-all text-sm flex items-center gap-1 shadow-lg shadow-green-100"
                      >
                        <CheckCircle size={16} /> Resolve
                      </button>
                    </>
                  ) : (
                    <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 ${
                      req.status === 'Resolved' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {req.status === 'Resolved' ? <ShieldCheck size={14} /> : <AlertTriangle size={14} />}
                      {req.status}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* --- DYNAMIC ROOM INVENTORY AUDIT MODULE --- */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 print:hidden">
         <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                <PackageOpen size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800">Hostel Assets Audit</h3>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-tight">Verified Property Status</p>
              </div>
            </div>
            <button onClick={fetchDashboardData} className="p-2 text-gray-400 hover:text-blue-600 transition-colors">
               <RefreshCw size={20} />
            </button>
         </div>
         
         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {inventory.length === 0 ? (
               <div className="col-span-full p-10 text-center border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 italic">
                  No inventory records linked to Supabase yet.
               </div>
            ) : (
               inventory.map((item) => (
                  <div key={item.id} className="relative bg-white border border-gray-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all group overflow-hidden">
                     {/* Condition Banner */}
                     <div className={`absolute top-0 right-0 px-4 py-1 rounded-bl-xl text-[10px] font-black uppercase tracking-widest ${
                        item.condition === 'Good' ? 'bg-green-100 text-green-700' :
                        item.condition === 'Fair' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                     }`}>
                        {item.condition}
                     </div>

                     <h4 className="text-lg font-black text-gray-900 mb-4">{item.room_number}</h4>
                     
                     <div className="grid grid-cols-3 gap-2">
                        {/* Bed Icon */}
                        <div className="flex flex-col items-center p-2 bg-gray-50 rounded-xl group-hover:bg-blue-50 transition-colors">
                           <Bed size={18} className="text-blue-500 mb-1" />
                           <span className="text-xs font-black text-gray-700">{item.beds}</span>
                           <span className="text-[9px] text-gray-400 font-bold uppercase">Beds</span>
                        </div>
                        {/* Fan Icon */}
                        <div className="flex flex-col items-center p-2 bg-gray-50 rounded-xl group-hover:bg-cyan-50 transition-colors">
                           <Wind size={18} className="text-cyan-500 mb-1" />
                           <span className="text-xs font-black text-gray-700">{item.fans}</span>
                           <span className="text-[9px] text-gray-400 font-bold uppercase">Fans</span>
                        </div>
                        {/* Locker Icon */}
                        <div className="flex flex-col items-center p-2 bg-gray-50 rounded-xl group-hover:bg-purple-50 transition-colors">
                           <Archive size={18} className="text-purple-500 mb-1" />
                           <span className="text-xs font-black text-gray-700">{item.lockers}</span>
                           <span className="text-[9px] text-gray-400 font-bold uppercase">Lockers</span>
                        </div>
                     </div>

                     <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
                        <span className="text-[10px] text-gray-400 font-bold">LATEST AUDIT</span>
                        <span className="text-[10px] text-gray-500 font-mono">{new Date(item.last_updated).toLocaleDateString()}</span>
                     </div>
                  </div>
               ))
            )}
         </div>
      </div>

      {/* PRINT VIEW */}
      <div className="hidden print:block space-y-6">
        <div className="text-center border-b-4 border-gray-900 pb-6">
          <h1 className="text-4xl font-black text-gray-900">HOSTEL AUDIT REPORT</h1>
          <p className="text-gray-600 font-bold mt-2 uppercase tracking-widest">Official Porter Records</p>
          <p className="text-gray-500 mt-1">Issued By: {porterProfile.full_name} | {new Date().toLocaleDateString()}</p>
        </div>
        
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3 border border-gray-300 font-bold text-sm">ROOM</th>
              <th className="p-3 border border-gray-300 font-bold text-sm">ISSUES</th>
              <th className="p-3 border border-gray-300 font-bold text-sm">DATE</th>
              <th className="p-3 border border-gray-300 font-bold text-sm">STATUS</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <tr key={req.id}>
                <td className="p-3 border border-gray-300 font-bold">{req.room_number}</td>
                <td className="p-3 border border-gray-300 text-sm">{req.issue_type}</td>
                <td className="p-3 border border-gray-300 text-sm">{new Date(req.created_at).toLocaleDateString()}</td>
                <td className="p-3 border border-gray-300 font-black text-xs uppercase">{req.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="mt-20 flex justify-around">
            <div className="w-56 border-t-2 border-gray-900 pt-3 text-center">
               <p className="font-black text-sm uppercase">Porter Signature</p>
            </div>
            <div className="w-56 border-t-2 border-gray-900 pt-3 text-center">
               <p className="font-black text-sm uppercase">Admin Seal</p>
            </div>
        </div>
      </div>

    </div>
  );
}