// src/pages/AdminDashboard.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import {
  Users, UserPlus, Home, ArrowRightLeft, CheckCircle, Shield,
  PlusCircle, Trash2, UserX, HardHat, Building2, DoorOpen
} from 'lucide-react';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [adminProfile, setAdminProfile] = useState(null);

  // ── Registration State ──────────────────────────────────────────────────────
  const [newStudent, setNewStudent] = useState({ fullName: '', matricNo: '' });
  const [isRegistering, setIsRegistering] = useState(false);

  // ── Allocation State ────────────────────────────────────────────────────────
  const [unallocatedStudents, setUnallocatedStudents] = useState([]);
  const [allocatedStudents, setAllocatedStudents] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [selectedRoom, setSelectedRoom] = useState('');
  const [isAllocating, setIsAllocating] = useState(false);

  // ── Add New Room State ──────────────────────────────────────────────────────
  const [newRoom, setNewRoom] = useState({ block: 'A', roomNumber: '' });
  const [isAddingRoom, setIsAddingRoom] = useState(false);

  // ── Revoke Allocation State ─────────────────────────────────────────────────
  const [revokingId, setRevokingId] = useState(null);

  // ── Assign Porter State ─────────────────────────────────────────────────────
  const [porterForm, setPorterForm] = useState({
    fullName: '',
    matricNo: '',
    phone: '',
    block: 'A',
  });
  const [isAssigningPorter, setIsAssigningPorter] = useState(false);
  const [porterAssignments, setPorterAssignments] = useState([]);

  // ── Bootstrap ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const userStr = localStorage.getItem('currentUser');
    if (!userStr) { navigate('/'); return; }
    const user = JSON.parse(userStr);
    if (user.role !== 'admin') { navigate('/'); return; }
    setAdminProfile(user);
    fetchData();
  }, [navigate]);

  const fetchData = async () => {
    // Students
    const { data: studentsData } = await supabase
      .from('students')
      .select('*')
      .order('created_at', { ascending: false });
    if (studentsData) {
      setUnallocatedStudents(studentsData.filter(s => !s.is_allocated));
      setAllocatedStudents(studentsData.filter(s => s.is_allocated));
    }

    // Rooms from inventory
    const { data: roomsData } = await supabase
      .from('inventory')
      .select('room_number')
      .order('room_number', { ascending: true });
    if (roomsData) setRooms(roomsData);

    // Porter assignments
    const { data: porterData } = await supabase
      .from('porters')
      .select('*')
      .order('created_at', { ascending: false });
    if (porterData) setPorterAssignments(porterData);
  };

  // ── 1. REGISTER NEW STUDENT ─────────────────────────────────────────────────
  const handleRegisterStudent = async (e) => {
    e.preventDefault();
    setIsRegistering(true);
    const { error } = await supabase.from('students').insert([{
      full_name: newStudent.fullName,
      matric_no: newStudent.matricNo,
    }]);
    if (!error) {
      alert(`Successfully registered ${newStudent.fullName}!`);
      setNewStudent({ fullName: '', matricNo: '' });
      fetchData();
    } else {
      alert('Registration failed. Ensure Matric No is unique. Error: ' + error.message);
    }
    setIsRegistering(false);
  };

  // ── 2. ASSIGN ROOM & ACTIVATE ───────────────────────────────────────────────
  const handleAllocateStudent = async (e) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedRoom) {
      alert('Please select both a student and a room.');
      return;
    }
    setIsAllocating(true);
    const { error } = await supabase
      .from('students')
      .update({
        room_assigned: selectedRoom,
        password: selectedRoom, // password = room block
        is_allocated: true,
      })
      .eq('id', selectedStudentId);
    if (!error) {
      alert(`Success! Student assigned to ${selectedRoom}. Their dashboard is now active.`);
      setSelectedStudentId('');
      setSelectedRoom('');
      fetchData();
    } else {
      alert('Allocation failed: ' + error.message);
    }
    setIsAllocating(false);
  };

  // ── 3. ADD NEW ROOM TO INVENTORY ────────────────────────────────────────────
  const handleAddRoom = async (e) => {
    e.preventDefault();
    if (!newRoom.roomNumber.trim()) {
      alert('Please enter a room number.');
      return;
    }
    setIsAddingRoom(true);

    // Compose full room identifier e.g. "A-101"
    const fullRoomId = `${newRoom.block}-${newRoom.roomNumber.trim().toUpperCase()}`;

    // Check for duplicate
    const { data: existing } = await supabase
      .from('inventory')
      .select('id')
      .eq('room_number', fullRoomId)
      .maybeSingle();

    if (existing) {
      alert(`Room ${fullRoomId} already exists in the inventory.`);
      setIsAddingRoom(false);
      return;
    }

    const { error } = await supabase.from('inventory').insert([{
      room_number: fullRoomId,
      beds_qty: 0,
      beds_condition: 'Good',
      fans_qty: 0,
      fans_condition: 'Good',
      lockers_qty: 0,
      lockers_condition: 'Good',
      remarks: 'Newly added room.',
      last_updated: new Date().toISOString(),
    }]);

    if (!error) {
      alert(`Room ${fullRoomId} added successfully!`);
      setNewRoom({ block: 'A', roomNumber: '' });
      fetchData();
    } else {
      alert('Failed to add room: ' + error.message);
    }
    setIsAddingRoom(false);
  };

  // ── 4. REVOKE ALLOCATION (CHECK-OUT) ────────────────────────────────────────
  const handleRevokeAllocation = async (student) => {
    const confirmed = window.confirm(
      `Revoke allocation for ${student.full_name}?\n\n` +
      `This will:\n• Clear their room assignment\n• Reset their password\n• Mark them as unallocated\n\n` +
      `Their room will immediately become available for re-assignment.`
    );
    if (!confirmed) return;

    setRevokingId(student.id);
    const { error } = await supabase
      .from('students')
      .update({
        room_assigned: null,
        password: null,
        is_allocated: false,
      })
      .eq('id', student.id);

    if (!error) {
      alert(`${student.full_name} has been checked out. Room ${student.room_assigned} is now free.`);
      fetchData();
    } else {
      alert('Revoke failed: ' + error.message);
    }
    setRevokingId(null);
  };

  // ── 5. ASSIGN PORTER TO BLOCK ───────────────────────────────────────────────
  const handleAssignPorter = async (e) => {
    e.preventDefault();
    if (!porterForm.fullName.trim() || !porterForm.matricNo.trim()) {
      alert('Full name and staff ID are required.');
      return;
    }
    setIsAssigningPorter(true);

    const { error } = await supabase.from('porters').insert([{
      full_name: porterForm.fullName.trim(),
      matric_no: porterForm.matricNo.trim(),   // staff / ID number
      phone: porterForm.phone.trim(),
      block_assigned: porterForm.block,
      password: porterForm.block,              // default password = block letter
      role: 'porter',
    }]);

    if (!error) {
      alert(`Porter ${porterForm.fullName} assigned to Block ${porterForm.block}!`);
      setPorterForm({ fullName: '', matricNo: '', phone: '', block: 'A' });
      fetchData();
    } else {
      alert('Failed to assign porter: ' + error.message);
    }
    setIsAssigningPorter(false);
  };

  if (!adminProfile) return <div className="p-10 text-center font-bold">Loading Admin...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-10">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div>
        <h2 className="text-3xl font-black text-gray-800 flex items-center gap-3">
          <Shield className="text-blue-600" size={32} /> Super Admin Control
        </h2>
        <p className="text-gray-500 font-medium mt-1">Smart Student Allocation & Registration</p>
      </div>

      {/* ── ROW 1: Register Student + Assign Room ──────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* MODULE 1 — Register Student */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600"><UserPlus size={24} /></div>
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
                onChange={(e) => setNewStudent({ ...newStudent, fullName: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Matriculation Number</label>
              <input
                type="text" required
                placeholder="e.g., CSC/2023/045"
                className="w-full p-3 mt-1 border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                value={newStudent.matricNo}
                onChange={(e) => setNewStudent({ ...newStudent, matricNo: e.target.value })}
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

        {/* MODULE 2 — Assign Room & Activate */}
        <div className="bg-gradient-to-br from-blue-600 to-cyan-700 p-6 rounded-2xl text-white shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-white/20 rounded-lg text-white"><ArrowRightLeft size={24} /></div>
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

      {/* ── ROW 2: Add New Room + Assign Porter ───────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* MODULE 3 — Add New Room / Block */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600"><PlusCircle size={24} /></div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">Add New Room</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-tight">Expand hostel inventory</p>
            </div>
          </div>
          <form onSubmit={handleAddRoom} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Select Block</label>
              <div className="flex gap-3 mt-2">
                {['A', 'B', 'C'].map(block => (
                  <button
                    key={block}
                    type="button"
                    onClick={() => setNewRoom({ ...newRoom, block })}
                    className={`flex-1 py-3 rounded-xl font-black text-lg transition-all border-2 ${
                      newRoom.block === block
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-emerald-300'
                    }`}
                  >
                    Block {block}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Room Number</label>
              <div className="flex items-center gap-2 mt-1">
                <span className="px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl font-black text-emerald-700 text-sm whitespace-nowrap">
                  {newRoom.block} -
                </span>
                <input
                  type="text" required
                  placeholder="e.g., 101"
                  className="flex-1 p-3 border rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  value={newRoom.roomNumber}
                  onChange={(e) => setNewRoom({ ...newRoom, roomNumber: e.target.value })}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1 font-medium">
                Will be saved as: <span className="font-black text-gray-600">{newRoom.block}-{newRoom.roomNumber.toUpperCase() || '???'}</span>
              </p>
            </div>
            <button
              type="submit" disabled={isAddingRoom}
              className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl hover:bg-emerald-700 transition-all shadow-md disabled:opacity-50"
            >
              {isAddingRoom ? 'Adding Room...' : `Add Room to Block ${newRoom.block}`}
            </button>
          </form>

          {/* Quick block summary */}
          {rooms.length > 0 && (
            <div className="mt-5 pt-4 border-t border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase mb-2">Current Inventory</p>
              <div className="flex gap-2 flex-wrap">
                {['A', 'B', 'C'].map(b => {
                  const count = rooms.filter(r => r.room_number.startsWith(`${b}-`)).length;
                  return (
                    <span key={b} className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-black">
                      Block {b}: {count} room{count !== 1 ? 's' : ''}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* MODULE 4 — Assign Porter to Block */}
        <div className="bg-gradient-to-br from-orange-500 to-amber-600 p-6 rounded-2xl text-white shadow-xl">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-white/20 rounded-lg text-white"><HardHat size={24} /></div>
            <div>
              <h3 className="text-xl font-bold">Assign Porter to Block</h3>
              <p className="text-xs text-orange-100 font-medium">Each block gets a dedicated porter</p>
            </div>
          </div>
          <form onSubmit={handleAssignPorter} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-orange-100 uppercase">Porter Full Name</label>
              <input
                type="text" required
                placeholder="e.g., John Adebisi"
                className="w-full p-3 mt-1 border-none rounded-xl bg-white text-gray-900 outline-none font-medium"
                value={porterForm.fullName}
                onChange={(e) => setPorterForm({ ...porterForm, fullName: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-orange-100 uppercase">Staff / ID Number</label>
              <input
                type="text" required
                placeholder="e.g., STF/2024/007"
                className="w-full p-3 mt-1 border-none rounded-xl bg-white text-gray-900 outline-none font-mono"
                value={porterForm.matricNo}
                onChange={(e) => setPorterForm({ ...porterForm, matricNo: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-orange-100 uppercase">Phone Number</label>
              <input
                type="tel"
                placeholder="e.g., 08012345678"
                className="w-full p-3 mt-1 border-none rounded-xl bg-white text-gray-900 outline-none font-medium"
                value={porterForm.phone}
                onChange={(e) => setPorterForm({ ...porterForm, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs font-bold text-orange-100 uppercase">Assign to Block</label>
              <div className="flex gap-3 mt-2">
                {['A', 'B', 'C'].map(block => (
                  <button
                    key={block}
                    type="button"
                    onClick={() => setPorterForm({ ...porterForm, block })}
                    className={`flex-1 py-3 rounded-xl font-black text-lg transition-all border-2 ${
                      porterForm.block === block
                        ? 'bg-white text-orange-600 border-white shadow-md'
                        : 'bg-white/20 text-white border-white/30 hover:bg-white/30'
                    }`}
                  >
                    Block {block}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="submit" disabled={isAssigningPorter}
              className="w-full bg-white text-orange-600 font-black py-3 rounded-xl hover:bg-orange-50 transition-all shadow-lg active:scale-95 disabled:opacity-50"
            >
              {isAssigningPorter ? 'Assigning...' : `Assign Porter to Block ${porterForm.block}`}
            </button>
          </form>
        </div>
      </div>

      {/* ── MODULE 5: PORTER ASSIGNMENTS TABLE ────────────────────────────── */}
      {porterAssignments.length > 0 && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-amber-100 rounded-lg text-amber-600"><Building2 size={24} /></div>
            <h3 className="text-xl font-bold text-gray-800">Block Porter Directory</h3>
            <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-black ml-auto">
              {porterAssignments.length} Porter{porterAssignments.length !== 1 ? 's' : ''} Assigned
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                  <th className="p-4 font-bold rounded-tl-xl">Porter Name</th>
                  <th className="p-4 font-bold">Staff ID</th>
                  <th className="p-4 font-bold">Phone</th>
                  <th className="p-4 font-bold rounded-tr-xl">Block</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {porterAssignments.map((porter) => (
                  <tr key={porter.id} className="hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-bold text-gray-800">{porter.full_name}</td>
                    <td className="p-4 font-mono text-sm text-gray-600">{porter.matric_no}</td>
                    <td className="p-4 text-sm text-gray-600">{porter.phone || '—'}</td>
                    <td className="p-4">
                      <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-md text-xs font-black">
                        Block {porter.block_assigned}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── MODULE 6: ACTIVE ALLOCATIONS LEDGER (with Revoke) ─────────────── */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg text-green-600"><CheckCircle size={24} /></div>
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
                <th className="p-4 font-bold rounded-tr-xl text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {allocatedStudents.length === 0 ? (
                <tr>
                  <td colSpan="4" className="p-8 text-center text-gray-400 italic">No students allocated yet.</td>
                </tr>
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
                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleRevokeAllocation(student)}
                        disabled={revokingId === student.id}
                        className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white px-4 py-2 rounded-lg text-xs font-black transition-all disabled:opacity-50 whitespace-nowrap"
                      >
                        {revokingId === student.id ? (
                          'Revoking...'
                        ) : (
                          <>
                            <DoorOpen size={14} /> Revoke Allocation
                          </>
                        )}
                      </button>
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
