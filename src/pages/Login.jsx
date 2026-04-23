// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { User, Lock, LogIn, Shield, HardHat, GraduationCap } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  
  const [role, setRole] = useState('student'); 
  const [identifier, setIdentifier] = useState(''); 
  const [password, setPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      // ==========================================
      // 1. STUDENT LOGIN (Uses the New Database Logic)
      // ==========================================
      if (role === 'student') {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .eq('matric_no', identifier)
          .eq('password', password)
          .single();

        if (error || !data) {
          setErrorMsg("Invalid Matric Number or Room Password.");
          setIsLoading(false);
          return;
        }

        if (!data.is_allocated) {
          setErrorMsg("You have not been assigned a room yet. Please see the Admin.");
          setIsLoading(false);
          return;
        }

        localStorage.setItem('currentUser', JSON.stringify({
          role: 'student',
          full_name: data.full_name,
          matric_no: data.matric_no,
          room_number: data.room_assigned
        }));
        
        navigate('/student-dashboard');
      } 
      
      // ==========================================
      // 2. TEMPORARY ADMIN LOGIN (Hardcoded)
      // ==========================================
      else if (role === 'admin') {
        if (identifier === 'admin' && password === 'admin') {
          localStorage.setItem('currentUser', JSON.stringify({
            role: 'admin',
            full_name: 'Super Admin'
          }));
          navigate('/super-admin');
        } else {
          setErrorMsg("Invalid Admin Credentials. (Hint: use admin / admin)");
        }
      }

      // ==========================================
      // 3. TEMPORARY PORTER LOGIN (Hardcoded)
      // ==========================================
      else if (role === 'porter') {
        if (identifier === 'porter' && password === 'porter') {
          localStorage.setItem('currentUser', JSON.stringify({
            role: 'porter',
            full_name: 'Chief Porter'
          }));
          navigate('/porter-dashboard');
        } else {
          setErrorMsg("Invalid Porter Credentials. (Hint: use porter / porter)");
        }
      }

    } catch (err) {
      setErrorMsg("A system error occurred. Please try again.");
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto h-16 w-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg mb-4">
          <Shield className="text-white" size={32} />
        </div>
        <h2 className="text-3xl font-black text-gray-900">Hostel Command</h2>
        <p className="mt-2 text-sm text-gray-600 font-medium">Smart Allocation & Management System</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl sm:rounded-3xl sm:px-10 border border-gray-100">
          
          {/* ROLE SELECTOR TABS */}
          <div className="flex bg-gray-100 p-1 rounded-xl mb-8">
            <button
              type="button"
              onClick={() => { setRole('student'); setIdentifier(''); setPassword(''); setErrorMsg(''); }}
              className={`flex-1 flex justify-center items-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${role === 'student' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <GraduationCap size={16} /> Student
            </button>
            <button
              type="button"
              onClick={() => { setRole('porter'); setIdentifier(''); setPassword(''); setErrorMsg(''); }}
              className={`flex-1 flex justify-center items-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${role === 'porter' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <HardHat size={16} /> Porter
            </button>
            <button
              type="button"
              onClick={() => { setRole('admin'); setIdentifier(''); setPassword(''); setErrorMsg(''); }}
              className={`flex-1 flex justify-center items-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${role === 'admin' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Shield size={16} /> Admin
            </button>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            
            {/* IDENTIFIER INPUT */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                {role === 'student' ? 'Matriculation Number' : 'Username'}
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  className="block w-full pl-10 pr-3 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all sm:text-sm font-bold text-gray-800"
                  placeholder={role === 'student' ? 'e.g. CSC/2023/045' : `Enter ${role} username`}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>
            </div>

            {/* PASSWORD INPUT */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                {role === 'student' ? 'Assigned Room (Password)' : 'Password'}
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  required
                  className="block w-full pl-10 pr-3 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all sm:text-sm font-bold text-gray-800"
                  placeholder={role === 'student' ? 'e.g. Block A - Room 12' : '••••••••'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              {role === 'student' && (
                 <p className="mt-2 text-[11px] text-gray-500 font-medium px-1">
                   <span className="font-bold text-blue-500 underline">Tip:</span> Your password is the exact name of the room you were assigned.
                 </p>
              )}
            </div>

            {/* ERROR MESSAGE DISPLAY */}
            {errorMsg && (
              <div className="bg-red-50 text-red-600 text-sm font-bold p-4 rounded-xl border border-red-100 text-center animate-pulse">
                {errorMsg}
              </div>
            )}

            {/* SUBMIT BUTTON */}
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-2xl shadow-lg shadow-blue-100 text-sm font-black text-white bg-blue-600 hover:bg-blue-700 transition-all disabled:opacity-50 active:scale-95"
              >
                {isLoading ? 'Authenticating...' : `Login as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
                {!isLoading && <LogIn size={18} />}
              </button>
            </div>
          </form>

        </div>
      </div>
    </div>
  );
}