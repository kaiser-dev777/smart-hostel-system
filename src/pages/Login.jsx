// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Login() {
  const navigate = useNavigate();
  
  // This single state handles Matric (Student), Staff Name (Porter), or Email (Admin)
  const [username, setUsername] = useState(''); 
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setErrorMsg('');

    // Search for the user where the universal username field AND password match
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('matric_number', username) 
      .eq('password', password)
      .single();

    if (error || !data) {
      setErrorMsg('Invalid Credentials. Please check your username and password.');
      setIsLoggingIn(false);
      return;
    }

    // Save the logged-in user's info to the browser
    localStorage.setItem('currentUser', JSON.stringify(data));

    // ROUTING LOGIC: Send them to the right Dashboard
    if (data.role === 'admin') {
      navigate('/admin');
    } else if (data.role === 'porter') {
      navigate('/porter');
    } else {
      navigate('/student');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 bg-white p-8 rounded-2xl shadow-2xl border border-gray-100">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-black text-gray-900 tracking-tight">Management System Login</h2>
        <p className="text-gray-500 font-medium">Identify yourself to continue</p>
      </div>

      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm font-bold border border-red-100">
          ⚠️ {errorMsg}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-5">
        <div>
          {/* Updated Label to include Admin Email */}
          <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">
            Matric No / Staff Name / Admin Email
          </label>
          <input 
            type="text" 
            placeholder="e.g. FCP/CSC/23..., Bala Porter, or admin@school.edu"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-xl focus:border-blue-500 focus:bg-white transition-all outline-none"
            required 
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 uppercase mb-2 ml-1">Password</label>
          <input 
            type="password" 
            placeholder="Enter your secure password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-4 bg-gray-50 border-2 border-transparent rounded-xl focus:border-blue-500 focus:bg-white transition-all outline-none"
            required 
          />
        </div>

        <button 
          type="submit" 
          disabled={isLoggingIn}
          className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-all shadow-lg active:scale-95 disabled:bg-gray-300"
        >
          {isLoggingIn ? 'Verifying...' : 'Login to Dashboard'}
        </button>
      </form>
    </div>
  );
}