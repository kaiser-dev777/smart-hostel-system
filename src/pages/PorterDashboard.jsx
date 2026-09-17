// src/pages/PorterDashboard.jsx
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Wrench, CheckCircle, Megaphone, ClipboardList, 
  Printer, XCircle, PackageOpen, RefreshCw,
  Bed, Wind, Archive, ShieldCheck, AlertTriangle, Clock, Edit3, X, MessageSquare,
  BellRing, DoorOpen
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function PorterDashboard() {
  const navigate = useNavigate();
  const [porterProfile, setPorterProfile] = useState(null);
  
  const [requests, setRequests] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [announcement, setAnnouncement] = useState({ title: '', message: '' });
  const [isPosting, setIsPosting] = useState(false);

  // ── Notification State ──────────────────────────────────────────────────────
  // Each notification: { id, room_number, message, timestamp }
  const [notifications, setNotifications] = useState([]);

  // Audit Modal States
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isSubmittingAudit, setIsSubmittingAudit] = useState(false);
  const [auditForm, setAuditForm] = useState(null);

  // Keep a ref to porterProfile so the realtime callback can always read the
  // latest value without needing to re-subscribe every time the state changes.
  const porterProfileRef = useRef(null);

  useEffect(() => {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) { navigate('/'); return; }
    const user = JSON.parse(userStr);
    if (user.role !== 'porter') { navigate('/'); return; }

    porterProfileRef.current = user;
    setPorterProfile(user);
    fetchDashboardData(user);

    // ── Real-time subscription on the inventory table ─────────────────────────
    // Fires whenever a new row is INSERTed into inventory.
    // We filter client-side so we only care about rooms that belong to
    // this porter's block (e.g. block_assigned = 'A' → rooms starting with 'A-').
    const channel = supabase
      .channel('inventory-new-rooms')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'inventory' },
        (payload) => {
          const porter = porterProfileRef.current;
          if (!porter) return;

          const newRoom = payload.new;
          const roomBlock = newRoom.room_number?.split('-')[0]; // e.g. 'A' from 'A-101'

          // Only notify if this room belongs to the porter's block
          if (roomBlock !== porter.block_assigned) return;

          // Add the new room to inventory list immediately
          setInventory(prev => [...prev, newRoom].sort((a, b) =>
            a.room_number.localeCompare(b.room_number)
          ));

          // Push a notification banner
          const notif = {
            id: newRoom.id,
            room_number: newRoom.room_number,
            message: `Admin added new room ${newRoom.room_number} to Block ${roomBlock}. Audit form is ready.`,
            timestamp: new Date().toISOString(),
          };
          setNotifications(prev => [notif, ...prev]);

          // Also persist to porter_notifications table so it survives a refresh
          supabase.from('porter_notifications').insert([{
            porter_block: porter.block_assigned,
            room_number: newRoom.room_number,
            message: notif.message,
          }]).then(() => {});
        }
      )
      .subscribe();

    // Cleanup subscription on unmount
    return () => { supabase.removeChannel(channel); };
  }, [navigate]);

  // ── Fetch block-scoped data ─────────────────────────────────────────────────
  const fetchDashboardData = async (profile) => {
    const porter = profile || porterProfileRef.current;
    if (!porter) return;

    // 1. Fetch Maintenance Requests (all — porter handles all requests)
    const { data: reqData } = await supabase
      .from('maintenance_requests')
      .select('*')
      .order('created_at', { ascending: false });
    if (reqData) setRequests(reqData);

    // 2. Fetch ONLY rooms belonging to this porter's block
    //    Rooms are stored as 'A-101', 'B-205' etc. — filter by prefix.
    const { data: invData } = await supabase
      .from('inventory')
      .select('*')
      .like('room_number', `${porter.block_assigned}-%`)
      .order('room_number', { ascending: true });
    if (invData) setInventory(invData);

    // 3. Load any unread notifications for this block from the DB
    const { data: notifData } = await supabase
      .from('porter_notifications')
      .select('*')
      .eq('porter_block', porter.block_assigned)
      .eq('is_read', false)
      .order('created_at', { ascending: false });
    if (notifData) {
      setNotifications(notifData.map(n => ({
        id: n.id,
        room_number: n.room_number,
        message: n.message,
        timestamp: n.created_at,
      })));
    }
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
    const { error } = await supabase.from('announcements').insert([{ 
      title: announcement.title,
      message: announcement.message,
      created_by: porterProfile.full_name,
    }]);
    if (!error) {
      alert('Announcement posted!');
      setAnnouncement({ title: '', message: '' });
    }
    setIsPosting(false);
  };

  // ── Dismiss a single notification ──────────────────────────────────────────
  const dismissNotification = async (notifId) => {
    // Mark as read in DB
    await supabase
      .from('porter_notifications')
      .update({ is_read: true })
      .eq('id', notifId);
    setNotifications(prev => prev.filter(n => n.id !== notifId));
  };

  // ── Dismiss all notifications ───────────────────────────────────────────────
  const dismissAllNotifications = async () => {
    await supabase
      .from('porter_notifications')
      .update({ is_read: true })
      .eq('porter_block', porterProfile.block_assigned)
      .eq('is_read', false);
    setNotifications([]);
  };

  // ── Audit Functions ─────────────────────────────────────────────────────────
  const openAuditModal = (room) => {
    setAuditForm({ ...room });
    setIsAuditModalOpen(true);
  };

  const handleAuditSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingAudit(true);
    const { error } = await supabase
      .from('inventory')
      .update({
        beds_qty: auditForm.beds_qty,
        beds_condition: auditForm.beds_condition,
        fans_qty: auditForm.fans_qty,
        fans_condition: auditForm.fans_condition,
        lockers_qty: auditForm.lockers_qty,
        lockers_condition: auditForm.lockers_condition,
        remarks: auditForm.remarks,
        last_updated: new Date().toISOString(),
      })
      .eq('id', auditForm.id);

    if (!error) {
      alert('Monthly Audit Updated Successfully!');
      setIsAuditModalOpen(false);
      fetchDashboardData();
    } else {
      alert('Error saving audit: ' + error.message);
    }
    setIsSubmittingAudit(false);
  };

  const getStatusColor = (status) => {
    if (status === 'Good') return 'text-green-500 bg-green-50';
    if (status === 'Fair') return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const handlePrint = () => window.print();

  if (!porterProfile) return <div className="p-10 text-center font-bold">Loading Dashboard...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10 relative">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex justify-between items-end print:hidden">
        <div>
          <h2 className="text-3xl font-black text-gray-800">Porter Command Center</h2>
          <p className="text-gray-500 font-medium">
            Block <span className="font-black text-blue-600">{porterProfile.block_assigned}</span> — Hostel Management & Safety Audit
          </p>
        </div>
        <button
          onClick={handlePrint}
          className="flex items-center gap-2 bg-gray-800 hover:bg-gray-900 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-md active:scale-95"
        >
          <Printer size={18} /> Generate Report
        </button>
      </div>

      {/* ── NOTIFICATION BANNERS ────────────────────────────────────────────── */}
      {notifications.length > 0 && (
        <div className="space-y-3 print:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-700 font-black text-sm">
              <BellRing size={18} className="animate-bounce" />
              {notifications.length} New Room Notification{notifications.length > 1 ? 's' : ''}
            </div>
            <button
              onClick={dismissAllNotifications}
              className="text-xs font-bold text-gray-400 hover:text-red-500 transition-colors"
            >
              Dismiss All
            </button>
          </div>
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className="flex items-start justify-between gap-4 bg-amber-50 border-l-4 border-amber-400 rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <DoorOpen size={20} className="text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <p className="font-bold text-gray-800 text-sm">{notif.message}</p>
                  <p className="text-xs text-gray-400 mt-0.5 font-medium">
                    {new Date(notif.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
              <button
                onClick={() => dismissNotification(notif.id)}
                className="text-gray-400 hover:text-gray-700 transition-colors shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── ANNOUNCEMENT BOX ────────────────────────────────────────────────── */}
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl text-white shadow-xl print:hidden">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          <Megaphone size={22} className="animate-bounce" /> Broadcast Notice
        </h3>
        <form onSubmit={postAnnouncement} className="flex flex-col md:flex-row gap-4">
          <input
            type="text" placeholder="Subject"
            className="flex-1 p-3 rounded-xl border-none text-gray-800 outline-none"
            value={announcement.title}
            onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })}
            required
          />
          <input
            type="text" placeholder="Message..."
            className="flex-[2] p-3 rounded-xl border-none text-gray-800 outline-none"
            value={announcement.message}
            onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })}
            required
          />
          <button
            disabled={isPosting}
            className="bg-white text-blue-700 font-black py-3 px-8 rounded-xl hover:bg-blue-50 transition-all disabled:opacity-50"
          >
            {isPosting ? '...' : 'Send'}
          </button>
        </form>
      </div>

      {/* ── MAINTENANCE PIPELINE ────────────────────────────────────────────── */}
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
              <div
                key={req.id}
                className={`group p-5 rounded-2xl border-2 flex flex-col md:flex-row justify-between md:items-center gap-4 transition-all hover:shadow-md ${
                  req.status === 'Resolved' ? 'bg-green-50/50 border-green-100' :
                  req.status === 'Declined' ? 'bg-red-50/50 border-red-100' :
                  'bg-white border-gray-100'
                }`}
              >
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

      {/* ── HOSTEL ASSETS AUDIT (block-scoped) ──────────────────────────────── */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 print:hidden">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg text-blue-600"><PackageOpen size={24} /></div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">
                Block {porterProfile.block_assigned} — Hostel Assets Audit
              </h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-tight">
                Showing {inventory.length} room{inventory.length !== 1 ? 's' : ''} in your block
              </p>
            </div>
          </div>
          <button
            onClick={() => fetchDashboardData()}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
          >
            <RefreshCw size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {inventory.length === 0 ? (
            <div className="col-span-full p-10 text-center border-2 border-dashed border-gray-200 rounded-2xl text-gray-400 italic">
              No rooms found for Block {porterProfile.block_assigned}. Ask admin to add rooms.
            </div>
          ) : (
            inventory.map((item) => (
              <div
                key={item.id}
                className="relative bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-lg transition-all group flex flex-col"
              >
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-xl font-black text-gray-900">{item.room_number}</h4>
                  <button
                    onClick={() => openAuditModal(item)}
                    className="p-2 bg-gray-50 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all flex items-center gap-1 text-xs font-bold"
                  >
                    <Edit3 size={14} /> Edit Audit
                  </button>
                </div>

                <div className="space-y-3 flex-1">
                  <div className="flex justify-between items-center p-2 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Bed size={16} className="text-blue-500" />
                      <span className="text-sm font-bold text-gray-700">Beds ({item.beds_qty})</span>
                    </div>
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${getStatusColor(item.beds_condition)}`}>
                      {item.beds_condition}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Wind size={16} className="text-cyan-500" />
                      <span className="text-sm font-bold text-gray-700">Fans ({item.fans_qty})</span>
                    </div>
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${getStatusColor(item.fans_condition)}`}>
                      {item.fans_condition}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2">
                      <Archive size={16} className="text-purple-500" />
                      <span className="text-sm font-bold text-gray-700">Lockers ({item.lockers_qty})</span>
                    </div>
                    <span className={`text-[10px] font-black uppercase px-2 py-1 rounded-md ${getStatusColor(item.lockers_condition)}`}>
                      {item.lockers_condition}
                    </span>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100">
                  <div className="flex items-start gap-2 mb-2">
                    <MessageSquare size={14} className="text-gray-400 mt-0.5" />
                    <p className="text-xs text-gray-600 line-clamp-2 italic">"{item.remarks}"</p>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px] text-gray-400 font-bold uppercase">Last Updated</span>
                    <span className="text-[10px] text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded">
                      {new Date(item.last_updated).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── AUDIT MODAL ─────────────────────────────────────────────────────── */}
      {isAuditModalOpen && auditForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="bg-gray-900 text-white p-5 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black">Monthly Audit Update</h3>
                <p className="text-gray-400 text-sm">{auditForm.room_number}</p>
              </div>
              <button onClick={() => setIsAuditModalOpen(false)} className="text-gray-400 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleAuditSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2 bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                  <label className="flex items-center gap-2 font-bold text-gray-800 text-sm mb-3">
                    <Bed size={16} className="text-blue-500" /> Beds
                  </label>
                  <div>
                    <span className="text-xs text-gray-500 uppercase font-bold">Quantity</span>
                    <input type="number" min="0" required className="w-full p-2 mt-1 border rounded-lg"
                      value={auditForm.beds_qty}
                      onChange={(e) => setAuditForm({ ...auditForm, beds_qty: e.target.value })} />
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase font-bold">Condition</span>
                    <select className="w-full p-2 mt-1 border rounded-lg font-medium"
                      value={auditForm.beds_condition}
                      onChange={(e) => setAuditForm({ ...auditForm, beds_condition: e.target.value })}>
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Needs Repair">Needs Repair</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2 bg-cyan-50/50 p-4 rounded-xl border border-cyan-100">
                  <label className="flex items-center gap-2 font-bold text-gray-800 text-sm mb-3">
                    <Wind size={16} className="text-cyan-500" /> Fans
                  </label>
                  <div>
                    <span className="text-xs text-gray-500 uppercase font-bold">Quantity</span>
                    <input type="number" min="0" required className="w-full p-2 mt-1 border rounded-lg"
                      value={auditForm.fans_qty}
                      onChange={(e) => setAuditForm({ ...auditForm, fans_qty: e.target.value })} />
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase font-bold">Condition</span>
                    <select className="w-full p-2 mt-1 border rounded-lg font-medium"
                      value={auditForm.fans_condition}
                      onChange={(e) => setAuditForm({ ...auditForm, fans_condition: e.target.value })}>
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Needs Repair">Needs Repair</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2 bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                  <label className="flex items-center gap-2 font-bold text-gray-800 text-sm mb-3">
                    <Archive size={16} className="text-purple-500" /> Lockers
                  </label>
                  <div>
                    <span className="text-xs text-gray-500 uppercase font-bold">Quantity</span>
                    <input type="number" min="0" required className="w-full p-2 mt-1 border rounded-lg"
                      value={auditForm.lockers_qty}
                      onChange={(e) => setAuditForm({ ...auditForm, lockers_qty: e.target.value })} />
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 uppercase font-bold">Condition</span>
                    <select className="w-full p-2 mt-1 border rounded-lg font-medium"
                      value={auditForm.lockers_condition}
                      onChange={(e) => setAuditForm({ ...auditForm, lockers_condition: e.target.value })}>
                      <option value="Good">Good</option>
                      <option value="Fair">Fair</option>
                      <option value="Needs Repair">Needs Repair</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <label className="flex items-center gap-2 font-bold text-gray-800 text-sm mb-2">
                  <MessageSquare size={16} className="text-gray-500" /> Porter Remarks / Observations
                </label>
                <textarea
                  required
                  placeholder="e.g., Room is clean. Fan #2 makes a weird noise, might need fixing soon."
                  className="w-full p-3 border rounded-lg h-24 resize-none outline-none focus:ring-2 focus:ring-blue-500"
                  value={auditForm.remarks}
                  onChange={(e) => setAuditForm({ ...auditForm, remarks: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setIsAuditModalOpen(false)}
                  className="px-6 py-2.5 rounded-lg font-bold text-gray-600 hover:bg-gray-100 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={isSubmittingAudit}
                  className="px-6 py-2.5 rounded-lg font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 disabled:opacity-50">
                  {isSubmittingAudit ? 'Saving Audit...' : 'Save Monthly Audit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── PRINT VIEW ──────────────────────────────────────────────────────── */}
      <div className="hidden print:block space-y-6">
        <div className="text-center border-b-4 border-gray-900 pb-6">
          <h1 className="text-4xl font-black text-gray-900">HOSTEL AUDIT REPORT</h1>
          <p className="text-gray-600 font-bold mt-2 uppercase tracking-widest">
            Block {porterProfile.block_assigned} — Official Porter Records
          </p>
          <p className="text-gray-500 mt-1">
            Issued By: {porterProfile.full_name} | {new Date().toLocaleDateString()}
          </p>
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
