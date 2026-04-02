// src/pages/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, KeyRound } from 'lucide-react';
import { schoolConfig } from '../config';
import { supabase } from '../lib/supabase';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [dbUsers, setDbUsers] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [roomInput, setRoomInput] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  // --- THE BOUNCER (Security Check) ---
  useEffect(() => {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) {
      navigate('/'); 
      return;
    }
    const user = JSON.parse(userStr);
    if (user.role !== 'admin') {
      navigate('/'); 
    }
  }, [navigate]);

  const fetchUsers = async () => {
    const { data, error } = await supabase.from('profiles').select('*');
    if (error) console.error("Error fetching data:", error);
    else setDbUsers(data);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAllocateRoom = async (e) => {
    e.preventDefault();
    if (!selectedStudent || !roomInput) return alert("Please select a student and a room!");

    setIsAssigning(true);

    const { error } = await supabase
      .from('profiles')
      .update({ room_number: roomInput })
      .eq('id', selectedStudent);

    if (error) {
      alert("Error assigning room: " + error.message);
    } else {
      alert("Room assigned successfully!");
      setRoomInput('');
      setSelectedStudent('');
      fetchUsers(); 
    }
    
    setIsAssigning(false);
  };

  // 1. Find students who need a room
  const unassignedStudents = dbUsers.filter(
    (user) => user.role === 'student' && (!user.room_number || user.room_number.trim() === '')
  );

  // --- THE SMART MULTI-OCCUPANCY ROOM LOGIC ---
  const MAX_STUDENTS_PER_ROOM = 6;
  
  const allPossibleRooms = [
    'Block A - 10A', 'Block A - 10B', 'Block A - 15A', 'Block A - 15B', 
    'Block B - 23A', 'Block B - 25A', 'Block C - 101C', 'Block C - 102C'
  ]; 
  
  // 2. Count how many students are currently in each room
  const roomOccupancy = {};
  dbUsers.forEach(user => {
    if (user.role === 'student' && user.room_number) {
      roomOccupancy[user.room_number] = (roomOccupancy[user.room_number] || 0) + 1;
    }
  });

  // 3. Filter available rooms (Only show rooms with LESS than 6 students)
  const availableRooms = allPossibleRooms.filter(room => {
    const currentOccupants = roomOccupancy[room] || 0;
    return currentOccupants < MAX_STUDENTS_PER_ROOM;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 underline decoration-blue-500">Super Admin Command Center</h2>
          <p className="text-gray-500">Managing {schoolConfig.name} infrastructure</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-md border-t-4 border-blue-600">
        <div className="flex items-center gap-3 mb-4">
          <KeyRound className="text-blue-600" size={24} />
          <h3 className="text-xl font-bold text-gray-800">Assign Room to Student</h3>
        </div>
        
        <form onSubmit={handleAllocateRoom} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-bold text-gray-700 mb-1">Select Unassigned Student</label>
            <select 
              value={selectedStudent} 
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">-- Choose a Student --</option>
              {unassignedStudents.map(student => (
                <option key={student.id} value={student.id}>
                  {student.full_name} ({student.matric_number || 'No Matric Number'})
                </option>
              ))}
            </select>
          </div>

          <div className="w-full md:w-72">
            <label className="block text-sm font-bold text-gray-700 mb-1">Select Available Room</label>
            <select 
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">-- Choose Block & Room --</option>
              {availableRooms.map(room => {
                const count = roomOccupancy[room] || 0;
                return (
                  <option key={room} value={room}>
                    {room} ({count}/{MAX_STUDENTS_PER_ROOM} Assigned)
                  </option>
                );
              })}
            </select>
          </div>

          <button 
            type="submit" 
            disabled={isAssigning || unassignedStudents.length === 0}
            className="w-full md:w-auto bg-blue-600 text-white font-bold py-3 px-8 rounded-lg hover:bg-blue-700 transition disabled:bg-gray-400 shadow-md"
          >
            {isAssigning ? 'Assigning...' : 'Assign Room'}
          </button>
        </form>
        
        {unassignedStudents.length === 0 && dbUsers.filter(u => u.role === 'student').length > 0 && (
          <p className="text-sm text-green-600 mt-3 font-bold flex items-center gap-2">
            ✨ All registered students have been successfully allocated a room!
          </p>
        )}
      </div>

      <div className="bg-white overflow-hidden rounded-2xl shadow-sm border border-gray-100">
        <div className="p-4 bg-gray-50 border-b border-gray-100">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <Users size={20} className="text-blue-600" /> Live Users Directory
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-gray-600 uppercase text-xs font-bold">
              <tr>
                <th className="p-4">Full Name & Matric</th>
                <th className="p-4">Role</th>
                <th className="p-4">Room Number</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {dbUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 transition">
                  <td className="p-4">
                    <div className="font-bold text-gray-800">{user.full_name}</div>
                    <div className="text-xs text-gray-500">{user.matric_number || 'N/A'}</div>
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                      user.role === 'admin' ? 'bg-red-100 text-red-700' : 
                      user.role === 'porter' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="p-4">
                    {user.room_number ? (
                      <span className="font-bold text-gray-700">{user.room_number}</span>
                    ) : (
                      <span className="text-red-500 font-bold text-xs bg-red-50 px-2 py-1 rounded border border-red-100">Unassigned</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}