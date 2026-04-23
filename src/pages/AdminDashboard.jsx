// src/pages/SuperAdminDashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Users, UserPlus, Home, ArrowRightLeft, CheckCircle, Shield } from 'lucide-react';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [adminProfile, setAdminProfile] = useState(null);
  
  // Registration State
  const [newStudent, setNewStudent] = useState({ fullName: '', matricNo: '' });
  const [isRegistering, setIsRegistering] = useState(false);

  // Allocation State
  const [unallocatedStudents, setUnallocatedStudents] = useState([]);
  const [allocatedStudents, setAllocatedStudents] = useState([]);
  const [rooms, setRooms] = useState([]);
  
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [isAllocating, setIsAllocating] = useState(false);

  useEffect(() => {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) {
      navigate('/');
      return;
    }
    const user = JSON.parse(userStr);
    if (user.role !== 'admin') {
      navigate('/');
      return;
    }
    setAdminProfile(user);
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    // Fetch Students
    const { data: studentsData } = await supabase.from('students').select('*').order('created_at', { ascending: false });
    if (studentsData) {
      setUnallocatedStudents(studentsData.filter(s => !s.is_allocated));
      setAllocatedStudents(studentsData.filter(s => s.is_allocated));
    }

    // Fetch Rooms from the inventory table we created earlier
    const { data: roomsData } = await supabase.from('inventory').select('room_number').order('room_number', { ascending: true });
    if (roomsData) {
      setRooms(roomsData);
    }
  };

  // 1. REGISTER NEW STUDENT
  const handleRegisterStudent = async (e) => {
    e.preventDefault();
    setIsRegistering(true);

    const { error } = await supabase.from('students').insert([{
      full_name: newStudent.fullName,
      matric_no: newStudent.matricNo
    }]);

    if (!error) {
      alert(`Successfully registered ${newStudent.fullName}!`);
      setNewStudent({ fullName: '', matricNo: '' });
      fetchData(); // Refresh lists
    } else {
      alert("Registration failed. Ensure Matric No is unique. Error: " + error.message);
    }
    setIsRegistering(false);
  };

  // 2. ASSIGN ROOM & GENERATE PASSWORD
  const handleAllocateStudent = async (e) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedRoom) {
      alert("Please select both a student and a room.");
      return;
    }
    setIsAllocating(true);

    // This is the "Magic" update. It sets the room AND creates the password
    const { error } = await supabase
      .from('students')
      .update({
        room_assigned: selectedRoom,
        password: selectedRoom, // The password is now the room block!
        is_allocated: true
      })
      .eq('id', selectedStudentId);

    if (!error) {
      alert(`Success! Student assigned to ${selectedRoom}. Their dashboard is now active.`);
      setSelectedStudentId('');
      setSelectedRoom('');
      fetchData();
    } else {
      alert("Allocation failed: " + error.message);
    }
    setIsAllocating(false);
  };

  if (!adminProfile) return <div className="p-10 text-center font-bold">Loading Admin...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10">
      
      {/* HEADER */}
      <div>
        <h2 className="text-3xl font-black text-gray-800 flex items-center gap-3">
          <Shield className="text-blue-600" size={32} /> Super Admin Control
        </h2>
        <p className="text-gray-500 font-medium mt-1">Smart Student Allocation & Registration</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* --- MODULE 1: REGISTER STUDENT --- */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600">
              <UserPlus size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-800">Register Student Info</h3>
          </div>
          
          <form onSubmit={handleRegisterStudent} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Full Name</label>
              <input 
                type="text" required
                placeholder="e.g., Emmanuel Joseph"
                className="w-full p-3 mt-1 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                value={newStudent.fullName}
                onChange={(e) => setNewStudent({...newStudent, fullName: e.target.value})}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Matriculation Number</label>
              <input 
                type="text" required
                placeholder="e.g., CSC/2023/045"
                className="w-full p-3 mt-1 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                value={newStudent.matricNo}
                onChange={(e) => setNewStudent({...newStudent, matricNo: e.target.value})}
              />
            </div>
            <button 
              type="submit" disabled={isRegistering}
              className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 transition-all shadow-md disabled:opacity-50"
            >
              {isRegistering ? 'Registering...' : 'Add Student to Database'}
            </button>
          </form>
        </div>

        {/* --- MODULE 2: SMART ALLOCATION --- */}
        <div className="bg-gradient-to-br from-blue-600 to-cyan-700 p-6 rounded-2xl text-white shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-white/20 rounded-lg text-white">
              <ArrowRightLeft size={24} />
            </div>
            <div>
              <h3 className="text-xl font-bold">Assign Room & Activate Dashboard</h3>
              <p className="text-xs text-blue-100 font-medium">Auto-generates login credentials</p>
            </div>
          </div>

          <form onSubmit={handleAllocateStudent} className="space-y-5">
            <div>
              <label className="text-xs font-bold text-blue-100 uppercase">Select Unallocated Student</label>
              <select 
                required
                className="w-full p-3 mt-1 border-none rounded-xl bg-white text-gray-900 outline-none font-medium"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
              >
                <option value="" disabled>-- Choose a Student --</option>
                {unallocatedStudents.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.full_name} ({student.matric_no})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-bold text-blue-100 uppercase">Select Available Room</label>
              <select 
                required
                className="w-full p-3 mt-1 border-none rounded-xl bg-white text-gray-900 outline-none font-medium"
                value={selectedRoom}
                onChange={(e) => setSelectedRoom(e.target.value)}
              >
                <option value="" disabled>-- Choose a Room --</option>
                {rooms.map(room => (
                  <option key={room.room_number} value={room.room_number}>
                    {room.room_number}
                  </option>
                ))}
              </select>
            </div>

            <button 
              type="submit" disabled={isAllocating}
              className="w-full bg-white text-blue-700 font-black py-3 rounded-xl hover:bg-blue-50 transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isAllocating ? 'Allocating...' : 'Assign Room & Activate Login'}
            </button>
          </form>
        </div>

      </div>

      {/* --- MODULE 3: ACTIVE ALLOCATIONS LEDGER --- */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg text-green-600">
              <CheckCircle size={24} />
            </div>
            <h3 className="text-xl font-bold text-gray-800">Active Allocations Ledger</h3>
          </div>
          <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-black">
            {allocatedStudents.length} Students Assigned
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="p-4 font-bold rounded-tl-xl">Student Name</th>
                <th className="p-4 font-bold">Matric No (Username)</th>
                <th className="p-4 font-bold">Room & Block (Password)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {allocatedStudents.length === 0 ? (
                <tr><td colSpan="3" className="p-8 text-center text-gray-400 italic">No students allocated yet.</td></tr>
              ) : (
                allocatedStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-bold text-gray-800">{student.full_name}</td>
                    <td className="p-4 font-mono text-sm text-gray-600">{student.matric_no}</td>
                    <td className="p-4">
                      <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-md text-xs font-black whitespace-nowrap">
                        {student.room_assigned}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}