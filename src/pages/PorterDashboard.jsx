// src/pages/PorterDashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Wrench, CheckCircle, Megaphone, ClipboardList, 
  Printer, XCircle, PackageOpen, RefreshCw 
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function PorterDashboard() {
  const navigate = useNavigate();
  const [porterProfile, setPorterProfile] = useState(null);
  
  // States
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
    // Fetch Work Orders
    const { data: reqData } = await supabase
      .from('maintenance_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (reqData) setRequests(reqData);

    // Fetch Inventory Data
    const { data: invData } = await supabase
      .from('inventory')
      .select('*')
      .order('room_number', { ascending: true });
    if (invData) setInventory(invData);
  };

  // NEW: Dual-Action Status Update (Resolve or Decline)
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
      alert("Announcement posted to all students!");
      setAnnouncement({ title: '', message: '' });
    }
    setIsPosting(false);
  };

  // Trigger browser print dialog
  const handlePrint = () => {
    window.print();
  };

  if (!porterProfile) return <div className="p-10 text-center font-bold">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* HEADER - Hidden when printing */}
      <div className="flex justify-between items-end print:hidden">
        <div>
          <h2 className="text-3xl font-black text-gray-800">Porter Command Center</h2>
          <p className="text-gray-500 font-medium">Welcome back, {porterProfile.full_name}</p>
        </div>
        <button 
          onClick={handlePrint}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg font-bold transition-all shadow-sm"
        >
          <Printer size={18} /> Print Work Orders
        </button>
      </div>

      {/* ANNOUNCEMENT MODULE - Hidden when printing */}
      <div className="bg-gradient-to-br from-indigo-600 to-blue-700 p-6 rounded-2xl text-white shadow-lg print:hidden">
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

      {/* LIVE WORK ORDERS - Regular UI (Hidden when printing) */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 print:hidden">
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
                req.status === 'Resolved' ? 'bg-green-50 border-green-500' : 
                req.status === 'Declined' ? 'bg-red-50 border-red-500' : 
                'bg-orange-50 border-orange-500'
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
                  <div className="flex items-center gap-2">
                    {/* NEW: DECLINE BUTTON */}
                    <button 
                      onClick={() => handleUpdateStatus(req.id, 'Declined')}
                      className="flex items-center gap-1 bg-red-100 text-red-700 hover:bg-red-200 px-3 py-2 rounded-lg font-bold transition-colors"
                    >
                      <XCircle size={16} /> Decline
                    </button>
                    {/* RESOLVE BUTTON */}
                    <button 
                      onClick={() => handleUpdateStatus(req.id, 'Resolved')}
                      className="flex items-center gap-1 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-bold transition-colors shadow-sm"
                    >
                      <CheckCircle size={16} /> Resolve
                    </button>
                  </div>
                ) : (
                  <div className={`flex items-center gap-2 font-bold px-4 py-2 rounded-lg ${
                    req.status === 'Resolved' ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'
                  }`}>
                    {req.status === 'Resolved' ? <CheckCircle size={18} /> : <XCircle size={18} />}
                    {req.status}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* MISSING INVENTORY MODULE RESTORED - Hidden when printing */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 print:hidden">
         <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <PackageOpen className="text-blue-500" size={28} />
              <h3 className="text-xl font-bold text-gray-800">Room Inventory Audit</h3>
            </div>
            <button onClick={fetchDashboardData} className="text-blue-600 hover:text-blue-800 p-2">
               <RefreshCw size={20} />
            </button>
         </div>
         
         <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-200">
                  <th className="p-4 font-bold">Room Number</th>
                  <th className="p-4 font-bold">Beds</th>
                  <th className="p-4 font-bold">Fans</th>
                  <th className="p-4 font-bold">Lockers</th>
                  <th className="p-4 font-bold">Condition</th>
                </tr>
              </thead>
              <tbody>
                {inventory.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-4 text-center text-gray-500 italic">No inventory data found.</td>
                  </tr>
                ) : (
                  inventory.map((item) => (
                    <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-black text-gray-800">{item.room_number}</td>
                      <td className="p-4 text-gray-600 font-mono">{item.beds}</td>
                      <td className="p-4 text-gray-600 font-mono">{item.fans}</td>
                      <td className="p-4 text-gray-600 font-mono">{item.lockers}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          item.condition === 'Good' ? 'bg-green-100 text-green-700' :
                          item.condition === 'Fair' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {item.condition}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
         </div>
      </div>

      {/* ========================================= */}
      {/* PRINT ONLY VIEW (Hidden on standard screen) */}
      {/* ========================================= */}
      <div className="hidden print:block space-y-6">
        <div className="text-center border-b-2 border-gray-800 pb-4">
          <h1 className="text-3xl font-black text-gray-900 uppercase">Hostel Maintenance Report</h1>
          <p className="text-gray-600 font-bold mt-2">Generated by: {porterProfile.full_name}</p>
          <p className="text-gray-500 text-sm">Date: {new Date().toLocaleDateString()}</p>
        </div>
        
        <table className="w-full text-left border-collapse border border-gray-300">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-3 border border-gray-300 font-bold">Room</th>
              <th className="p-3 border border-gray-300 font-bold">Student</th>
              <th className="p-3 border border-gray-300 font-bold">Issue Reported</th>
              <th className="p-3 border border-gray-300 font-bold">Date</th>
              <th className="p-3 border border-gray-300 font-bold">Status</th>
            </tr>
          </thead>
          <tbody>
            {requests.map((req) => (
              <tr key={req.id}>
                <td className="p-3 border border-gray-300 font-bold">{req.room_number}</td>
                <td className="p-3 border border-gray-300">{req.student_name}</td>
                <td className="p-3 border border-gray-300">{req.issue_type}</td>
                <td className="p-3 border border-gray-300 text-sm">{new Date(req.created_at).toLocaleDateString()}</td>
                <td className="p-3 border border-gray-300 font-bold uppercase">{req.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        <div className="mt-20 flex justify-between">
            <div className="w-48 border-t-2 border-gray-800 pt-2 text-center font-bold">Porter Signature</div>
            <div className="w-48 border-t-2 border-gray-800 pt-2 text-center font-bold">Super Admin Approval</div>
        </div>
      </div>

    </div>
  );
}