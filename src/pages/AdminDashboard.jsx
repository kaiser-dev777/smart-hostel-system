// src/pages/SuperAdminDashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, Users, PlusCircle, Building, 
  CheckCircle, ShieldAlert 
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [adminProfile, setAdminProfile] = useState(null);
  
  // States
  const [roomStats, setRoomStats] = useState([]);
  const [unallocatedStudents, setUnallocatedStudents] = useState([]);
  
  // Add Room States
  const [showAddRoomForm, setShowAddRoomForm] = useState(false);
  const [newRoom, setNewRoom] = useState({ name: '', capacity: 6 });
  const [isSubmittingRoom, setIsSubmittingRoom] = useState(false);

  // Allocation States
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
    fetchDashboardData();
  }, [navigate]);

  const fetchDashboardData = async () => {
    fetchRoomOccupancy();
    fetchUnallocatedStudents();
  };

  // 1. Fetch Dynamic Room Occupancy
  const fetchRoomOccupancy = async () => {
    const { data: dbRooms } = await supabase.from('rooms').select('*');
    const { data: profiles } = await supabase
      .from('profiles')
      .select('room_number')
      .not('room_number', 'is', null);

    if (dbRooms && profiles) {
      const counts = profiles.reduce((acc, user) => {
        acc[user.room_number] = (acc[user.room_number] || 0) + 1;
        return acc;
      }, {});

      const stats = dbRooms.map(room => ({
        name: room.room_name,
        capacity: room.capacity,
        occupancy: counts[room.room_name] || 0,
        isFull: (counts[room.room_name] || 0) >= room.capacity
      }));

      stats.sort((a, b) => a.name.localeCompare(b.name));
      setRoomStats(stats);
    }
  };

  // 2. Fetch Students Needing Rooms
  const fetchUnallocatedStudents = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student')
      .is('room_number', null);
    if (data) setUnallocatedStudents(data);
  };

  // 3. Handle Adding a New Room to the Database
  const handleAddRoom = async (e) => {
    e.preventDefault();
    setIsSubmittingRoom(true);
    const formattedName = newRoom.name.trim();

    const { error } = await supabase
      .from('rooms')
      .insert([{ 
        room_name: formattedName, 
        capacity: parseInt(newRoom.capacity) 
      }]);

    if (!error) {
      alert(`Successfully added ${formattedName} to the system!`);
      setNewRoom({ name: '', capacity: 6 });
      setShowAddRoomForm(false);
      fetchRoomOccupancy();
    } else {
      if (error.code === '23505') {
        alert("Error: This room already exists in the system.");
      } else {
        alert("Error adding room: " + error.message);
      }
    }
    setIsSubmittingRoom(false);
  };

  // 4. Handle Allocating a Student to a Room
  const handleAllocateStudent = async (e) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedRoom) return;
    setIsAllocating(true);

    const { error } = await supabase
      .from('profiles')
      .update({ room_number: selectedRoom })
      .eq('id', selectedStudentId);

    if (!error) {
      alert("Student successfully allocated!");
      setSelectedStudentId('');
      setSelectedRoom('');
      fetchDashboardData(); // Refresh everything
    } else {
      alert("Error allocating student: " + error.message);
    }
    setIsAllocating(false);
  };

  if (!adminProfile) return <div className="p-10 text-center font-bold">Loading Admin...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* HEADER */}
      <div className="flex justify-between items-end border-b pb-4">
        <div>
          <h2 className="text-3xl font-black text-gray-800 flex items-center gap-2">
            <ShieldAlert className="text-purple-600" size={32} />
            Super Admin Command Center
          </h2>
          <p className="text-gray-500 font-medium">System overview and allocation management</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Controls */}
        <div className="col-span-1 lg:col-span-2 space-y-8">
          
          {/* --- MANUAL ROOM ADD MODULE --- */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Building className="text-blue-500" size={24} />
                System Room Inventory
              </h3>
              <button 
                onClick={() => setShowAddRoomForm(!showAddRoomForm)}
                className="bg-gray-800 hover:bg-gray-900 text-white px-4 py-2 rounded-lg font-bold transition-all text-sm flex items-center gap-2"
              >
                {showAddRoomForm ? 'Cancel' : <><PlusCircle size={16}/> Open New Room</>}
              </button>
            </div>

            {showAddRoomForm && (
              <form onSubmit={handleAddRoom} className="bg-blue-50 p-4 rounded-xl border border-blue-100 flex flex-col md:flex-row gap-4 items-end animate-in fade-in slide-in-from-top-4 mb-4">
                <div className="flex-1 w-full">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Room Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="e.g., Block C - Room 10"
                    className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    value={newRoom.name}
                    onChange={(e) => setNewRoom({...newRoom, name: e.target.value})}
                  />
                </div>
                <div className="w-full md:w-32">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Capacity</label>
                  <input 
                    type="number" 
                    required min="1" max="12"
                    className="w-full p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    value={newRoom.capacity}
                    onChange={(e) => setNewRoom({...newRoom, capacity: e.target.value})}
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={isSubmittingRoom}
                  className="w-full md:w-auto bg-blue-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-blue-700 transition-all disabled:opacity-70"
                >
                  {isSubmittingRoom ? 'Saving...' : 'Save Room'}
                </button>
              </form>
            )}

            {/* Smart Allocation Form */}
            <div className="mt-6 border-t pt-6">
              <h4 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Users className="text-green-500" size={20} /> Smart Student Allocation
              </h4>
              <form onSubmit={handleAllocateStudent} className="flex flex-col md:flex-row gap-4">
                <select 
                  required
                  className="flex-1 p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                >
                  <option value="">-- Select Unallocated Student --</option>
                  {unallocatedStudents.map(student => (
                    <option key={student.id} value={student.id}>
                      {student.full_name} ({student.matric_number})
                    </option>
                  ))}
                </select>

                {/* THE SMART DROPDOWN - Only shows rooms that are not full */}
                <select 
                  required
                  className="flex-1 p-3 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-purple-500"
                  value={selectedRoom}
                  onChange={(e) => setSelectedRoom(e.target.value)}
                >
                  <option value="">-- Select Available Room --</option>
                  {roomStats
                    .filter(room => !room.isFull) 
                    .map((room) => (
                      <option key={room.name} value={room.name}>
                        {room.name} ({room.capacity - room.occupancy} beds left)
                      </option>
                  ))}
                </select>

                <button 
                  type="submit" 
                  disabled={isAllocating || !selectedStudentId || !selectedRoom}
                  className="bg-purple-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-purple-700 transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {isAllocating ? 'Assigning...' : <><CheckCircle size={18}/> Assign</>}
                </button>
              </form>
              {unallocatedStudents.length === 0 && (
                <p className="text-sm text-green-600 mt-2 font-bold flex items-center gap-1">
                  <CheckCircle size={16} /> All registered students have been assigned a room!
                </p>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Room Status Grid */}
        <div className="col-span-1">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 h-full">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2 mb-4">
              <LayoutDashboard className="text-indigo-500" size={24} />
              Live Room Status
            </h3>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
              {roomStats.length === 0 ? (
                <p className="text-gray-500 text-sm italic">No rooms in database. Add a room to start.</p>
              ) : (
                roomStats.map((room, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border flex justify-between items-center ${
                    room.isFull ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                  }`}>
                    <div>
                      <p className="font-bold text-gray-800 text-sm">{room.name}</p>
                      <p className={`text-xs font-bold ${room.isFull ? 'text-red-600' : 'text-green-600'}`}>
                        {room.occupancy} / {room.capacity} Students
                      </p>
                    </div>
                    {room.isFull && (
                      <span className="bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded uppercase tracking-wider">
                        Full
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}