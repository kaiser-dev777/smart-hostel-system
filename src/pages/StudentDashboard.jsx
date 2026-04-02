// src/pages/StudentDashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wrench, BedDouble, Users, CheckCircle, Bell, PenLine, BellRing } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [studentProfile, setStudentProfile] = useState(null);
  const [myRequests, setMyRequests] = useState([]); 
  const [roommates, setRoommates] = useState([]); 
  const [notices, setNotices] = useState([]); // NEW: State for notices
  
  const [issueType, setIssueType] = useState('');
  const [customIssue, setCustomIssue] = useState(''); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    if (!savedUser) {
      navigate('/');
      return;
    }
    const user = JSON.parse(savedUser);
    setStudentProfile(user);

    async function fetchData() {
      // 1. Fetch Maintenance History
      const { data: reqData } = await supabase
        .from('maintenance_requests')
        .select('*')
        .eq('student_name', user.full_name)
        .order('created_at', { ascending: false });
      if (reqData) setMyRequests(reqData);

      // 2. Fetch Roommates
      if (user.room_number) {
        const { data: roommateData } = await supabase
          .from('profiles')
          .select('full_name, matric_number')
          .eq('room_number', user.room_number)
          .neq('id', user.id);
        if (roommateData) setRoommates(roommateData);
      }

      // 3. NEW: Fetch Announcements
      const { data: noticeData } = await supabase
        .from('announcements')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);
      if (noticeData) setNotices(noticeData);
    }
    
    fetchData();
  }, [navigate]);

  const handleSubmitReport = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    const finalIssueDescription = issueType === 'Other' ? `Other: ${customIssue}` : issueType;

    const { error } = await supabase
      .from('maintenance_requests')
      .insert([{ 
        student_name: studentProfile?.full_name || 'Anonymous', 
        room_number: studentProfile?.room_number || 'N/A', 
        issue_type: finalIssueDescription,
        status: 'Pending'
      }]);

    if (!error) {
      setShowSuccess(true);
      setIssueType('');
      setCustomIssue('');
      setTimeout(() => window.location.reload(), 1500); 
    } else {
      alert("Error: " + error.message);
    }
    setIsSubmitting(false);
  };

  if (!studentProfile) return <div className="p-10 text-center font-bold">Loading Profile...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-2">
        <div>
          <h2 className="text-3xl font-black text-gray-800">
            Welcome, {studentProfile.full_name.split(' ')[0]}! 👋
          </h2>
          <p className="text-gray-500 font-medium">Matric Number: {studentProfile.matric_number}</p>
        </div>
        <div className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm">
          {studentProfile.room_number || "Awaiting Allocation"}
        </div>
      </div>

      {/* NEW: NOTICE BOARD MODULE */}
      <div className="bg-white rounded-xl shadow-sm border border-indigo-100 overflow-hidden">
        <div className="bg-indigo-50 p-4 border-b border-indigo-100 flex items-center gap-2">
          <BellRing className="text-indigo-600" size={20} />
          <h3 className="font-bold text-indigo-900">Hostel Notice Board</h3>
        </div>
        <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {notices.length === 0 ? (
            <p className="text-sm text-gray-400 italic col-span-3">No new updates from the Porter.</p>
          ) : (
            notices.map((note) => (
              <div key={note.id} className="bg-white border border-gray-100 p-4 rounded-lg shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                <h4 className="font-black text-gray-800 text-sm mb-1">{note.title}</h4>
                <p className="text-xs text-gray-600 line-clamp-3 mb-3">{note.message}</p>
                <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-wide">
                  <span>{note.created_by}</span>
                  <span>{new Date(note.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Allocation Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
          <div className="flex items-center gap-3 mb-4">
            <BedDouble className="text-blue-500" size={28} />
            <h3 className="text-xl font-bold text-gray-800">Your Allocation</h3>
          </div>
          <div className="space-y-2 text-gray-600">
            <p>
              <strong className="text-gray-900">Room:</strong> 
              <span className="ml-2 font-mono bg-gray-100 px-2 py-1 rounded text-blue-700 font-bold">
                {studentProfile.room_number || 'Pending...'}
              </span>
            </p>
            <p><strong className="text-gray-900">Capacity:</strong> 6 Students Max</p>
          </div>
        </div>

        {/* Roommates Card */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Users className="text-green-500" size={28} />
              <h3 className="text-xl font-bold text-gray-800">Roommates</h3>
            </div>
            <span className="text-xs font-bold bg-green-50 text-green-700 px-2 py-1 rounded-full">
              {roommates.length} / 5 
            </span>
          </div>
          
          <div className="space-y-2">
            {!studentProfile.room_number ? (
              <p className="text-sm text-gray-500 italic">No room assigned yet.</p>
            ) : roommates.length === 0 ? (
              <p className="text-sm text-gray-500 italic">No other students in this room yet.</p>
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {roommates.map((mate, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                      {mate.full_name.charAt(0)}
                    </div>
                    <p className="text-sm font-bold text-gray-700">{mate.full_name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Maintenance Form */}
      <div className="bg-white p-6 rounded-xl shadow-sm border-t-4 border-red-500">
        <div className="flex items-center gap-3 mb-4">
          <Wrench className="text-red-500" size={28} />
          <h3 className="text-xl font-bold text-gray-800">Report a Hostel Issue</h3>
        </div>

        {showSuccess ? (
          <div className="bg-green-50 text-green-700 p-4 rounded-lg flex items-center gap-2 font-bold animate-pulse">
            <CheckCircle size={20} />
            <span>Report sent! Refreshing...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmitReport} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <select 
                required
                disabled={!studentProfile.room_number} 
                value={issueType}
                onChange={(e) => setIssueType(e.target.value)}
                className="flex-1 p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-red-500 bg-white"
              >
                <option value="">-- What is the problem? --</option>
                <option value="Plumbing (Leaking Pipe/Tap)">Plumbing Issue</option>
                <option value="Electrical (Socket/Light)">Electrical Issue</option>
                <option value="Carpentry (Door/Bed/Wardrobe)">Carpentry Issue</option>
                <option value="Other">Other (Specify below...)</option>
              </select>

              {!issueType.includes('Other') && (
                <button 
                  type="submit" 
                  disabled={isSubmitting || !studentProfile.room_number || !issueType}
                  className="bg-red-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-red-700 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Sending...' : 'Submit Report'}
                </button>
              )}
            </div>

            {issueType === 'Other' && (
              <div className="flex flex-col sm:flex-row gap-4 animate-in slide-in-from-top-2 duration-300">
                <div className="relative flex-1">
                  <PenLine className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input 
                    type="text"
                    required
                    placeholder="Describe the issue here (e.g. Broken window pane)"
                    value={customIssue}
                    onChange={(e) => setCustomIssue(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isSubmitting || !customIssue}
                  className="bg-red-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-red-700 transition-all"
                >
                  {isSubmitting ? 'Sending...' : 'Submit Custom Report'}
                </button>
              </div>
            )}
          </form>
        )}
      </div>

      {/* Track Reports */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-3 mb-6">
          <Bell className="text-yellow-500" size={28} />
          <h3 className="text-xl font-bold text-gray-800">Track My Reports</h3>
        </div>
        <div className="space-y-4">
          {myRequests.length === 0 ? (
            <p className="text-gray-500 text-sm italic">No reports found in your history.</p>
          ) : (
            myRequests.map((req) => (
              <div key={req.id} className={`p-4 rounded-lg border-l-4 flex flex-col sm:flex-row justify-between sm:items-center gap-2 ${
                req.status === 'Resolved' ? 'bg-green-50 border-green-500' : 'bg-orange-50 border-orange-400'
              }`}>
                <div>
                  <p className="font-bold text-gray-800">{req.issue_type}</p>
                  <p className="text-xs text-gray-500 italic">Reported on {new Date(req.created_at).toLocaleDateString()}</p>
                </div>
                <span className={`px-4 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                   req.status === 'Resolved' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700 animate-pulse'
                }`}>
                  {req.status}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}