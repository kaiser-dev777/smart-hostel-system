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
      // 1. STUDENT LOGIN (New Smart Allocation Logic)
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
          setErrorMsg("Your allocation is pending. Please see the Admin.");
          setIsLoading(false);
          return;
        }

        // Save student info to localStorage
        localStorage.setItem('currentUser', JSON.stringify({
          ...data,
          role: 'student'
        }));
        
        navigate('/student-dashboard');
      } 
      
      // ==========================================
      // 2. ADMIN & PORTER LOGIN (Using original PROFILES table)
      // ==========================================
      else {
        // Query your original 'profiles' table for staff
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', identifier) // Staff usually use email to login
          .eq('password', password)
          .eq('role', role)
          .single();

        if (error || !data) {
          setErrorMsg(`Invalid ${role} credentials. Please check your email and password.`);
          setIsLoading(false);
          return;
        }

        // Success! Save the FULL profile to localStorage so dashboards aren't blank
        localStorage.setItem('currentUser', JSON.stringify(data));

        if (role === 'admin') navigate('/super-admin');
        if (role === 'porter') navigate('/porter-dashboard');
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
            {['student', 'porter', 'admin'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => { setRole(r); setIdentifier(''); setPassword(''); setErrorMsg(''); }}
                className={`flex-1 flex justify-center items-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${role === r ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                {r === 'student' && <GraduationCap size={16} />}
                {r === 'porter' && <HardHat size={16} />}
                {r === 'admin' && <Shield size={16} />}
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                {role === 'student' ? 'Matriculation Number' : 'Email Address'}
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={role === 'student' ? 'text' : 'email'}
                  required
                  className="block w-full pl-10 pr-3 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all sm:text-sm font-bold text-gray-800"
                  placeholder={role === 'student' ? 'e.g. CSC/2023/045' : 'your@email.com'}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                />
              </div>
            </div>

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
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            {errorMsg && (
              <div className="bg-red-50 text-red-600 text-sm font-bold p-4 rounded-xl border border-red-100 text-center">
                {errorMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center items-center gap-2 py-4 px-4 border border-transparent rounded-2xl shadow-lg text-sm font-black text-white bg-blue-600 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
            >
              {isLoading ? 'Authenticating...' : `Login as ${role.charAt(0).toUpperCase() + role.slice(1)}`}
              {!isLoading && <LogIn size={18} />}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}