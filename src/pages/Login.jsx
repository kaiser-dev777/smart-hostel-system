// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { User, Lock, LogIn, GraduationCap, ShieldCheck } from 'lucide-react';

export default function Login() {
  const navigate = useNavigate();
  
  // State
  const [matricNo, setMatricNo] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleStudentLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      // 1. Query the 'students' table we created in Step 1
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('matric_no', matricNo)
        .eq('password', password)
        .single();

      // 2. Check if student exists and password matches
      if (error || !data) {
        setErrorMsg("Invalid Matric Number or Room Password.");
        setIsLoading(false);
        return;
      }

      // 3. Check if they have actually been assigned a room yet
      if (!data.is_allocated) {
        setErrorMsg("Your allocation is pending. Please check back later.");
        setIsLoading(false);
        return;
      }

      // 4. Success! Save info and go to dashboard
      localStorage.setItem('currentUser', JSON.stringify({
        role: 'student',
        full_name: data.full_name,
        matric_no: data.matric_no,
        room_number: data.room_assigned
      }));
      
      navigate('/student-dashboard');

    } catch (err) {
      setErrorMsg("Connection error. Please try again.");
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        
        {/* Branding */}
        <div className="text-center mb-10">
          <div className="inline-flex p-4 bg-blue-600 rounded-3xl shadow-xl shadow-blue-100 mb-4">
            <GraduationCap className="text-white" size={40} />
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Student Portal</h1>
          <p className="text-gray-500 font-medium">Enter your credentials to access your room</p>
        </div>

        {/* Login Card */}
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <form onSubmit={handleStudentLogin} className="space-y-6">
            
            {/* Matric No Field */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Matriculation Number</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="text"
                  required
                  placeholder="e.g. CSC/2023/001"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-800 transition-all"
                  value={matricNo}
                  onChange={(e) => setMatricNo(e.target.value)}
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Room Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                <input 
                  type="password"
                  required
                  placeholder="Your Assigned Room & Block"
                  className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-gray-800 transition-all"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <p className="mt-3 text-[11px] text-gray-400 leading-relaxed px-1">
                <span className="font-bold text-blue-500 underline italic">Tip:</span> Your password is the exact name of the room you were assigned (e.g., "Block A - Room 10").
              </p>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-100 animate-pulse text-center">
                {errorMsg}
              </div>
            )}

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
            >
              {isLoading ? 'Verifying...' : 'Login to Dashboard'}
              <LogIn size={20} />
            </button>
          </form>
        </div>

        {/* Staff Shortcut - Just so you can still get to your Admin tools! */}
        <div className="mt-8 text-center">
          <button 
            onClick={() => navigate('/super-admin')} 
            className="inline-flex items-center gap-2 text-xs font-black text-gray-400 hover:text-blue-600 transition-colors uppercase tracking-widest"
          >
            <ShieldCheck size={14} /> Admin Access Point
          </button>
        </div>

      </div>
    </div>
  );
}