// src/pages/Login.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { User, Lock, LogIn, Shield, HardHat, GraduationCap, Info } from 'lucide-react';

// ─── Per-role credential rules ────────────────────────────────────────────────
// Students   → students table  (matric_no, password, is_allocated)
// Porter/Admin → profiles table (matric_number column stores the identifier)
const ROLE_CONFIG = {
  student: {
    identifierLabel: 'Matriculation Number',
    identifierType: 'text',
    identifierPlaceholder: 'e.g. FCP/CSC/22/1097',
    // Accept any non-empty matric — formats vary (FAC/DEPT/YY/NUM)
    identifierPattern: /^.{3,}$/,
    identifierHint: 'Your matriculation number as registered by Admin',
    passwordLabel: 'Room Password',
    passwordPlaceholder: 'e.g. Block B - Room 1',
    // Password is whatever the admin set — could be room name, short code, etc.
    passwordPattern: /^.{1,}$/,
    passwordHint: 'Your assigned room code (given by Admin)',
  },
  porter: {
    identifierLabel: 'Staff Identifier',
    identifierType: 'text',
    identifierPlaceholder: 'e.g. Bala Porter',
    identifierPattern: /^.{2,}$/,
    identifierHint: 'Your name or ID as registered by Admin',
    passwordLabel: 'Password',
    passwordPlaceholder: '••••••••',
    passwordPattern: /^.{4,}$/,
    passwordHint: 'Password assigned to you by Admin',
  },
  admin: {
    identifierLabel: 'Admin Identifier',
    identifierType: 'text',
    identifierPlaceholder: 'e.g. kaiser@university.edu.ng',
    identifierPattern: /^.{2,}$/,
    identifierHint: 'Your email or ID as registered in the system',
    passwordLabel: 'Password',
    passwordPlaceholder: '••••••••',
    passwordPattern: /^.{4,}$/,
    passwordHint: 'Password assigned to you by the system',
  },
};

export default function Login() {
  const navigate = useNavigate();

  const [role, setRole] = useState('student');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [identifierTouched, setIdentifierTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const config = ROLE_CONFIG[role];

  // ─── Switch role and reset all state ─────────────────────────────────────────
  const switchRole = (r) => {
    setRole(r);
    setIdentifier('');
    setPassword('');
    setErrorMsg('');
    setIdentifierTouched(false);
    setPasswordTouched(false);
  };

  const identifierInvalid =
    identifierTouched && identifier !== '' && !config.identifierPattern.test(identifier);
  const passwordInvalid =
    passwordTouched && password !== '' && !config.passwordPattern.test(password);

  // ─── Submit handler ───────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!config.identifierPattern.test(identifier)) {
      setErrorMsg(`Invalid ${config.identifierLabel}. ${config.identifierHint}`);
      setIdentifierTouched(true);
      return;
    }
    if (!config.passwordPattern.test(password)) {
      setErrorMsg(`Invalid password. ${config.passwordHint}`);
      setPasswordTouched(true);
      return;
    }

    setIsLoading(true);

    try {
      // ── 1. STUDENT LOGIN — queries the 'students' table ───────────────────────
      if (role === 'student') {
        const { data, error } = await supabase
          .from('students')
          .select('*')
          .eq('matric_no', identifier)
          .eq('password', password)
          .single();

        if (error || !data) {
          setErrorMsg('Invalid Matric Number or Room Password. Please check and try again.');
          setIsLoading(false);
          return;
        }

        if (!data.is_allocated) {
          setErrorMsg('Your room allocation is pending. Please see the Admin.');
          setIsLoading(false);
          return;
        }

        localStorage.setItem('currentUser', JSON.stringify({ ...data, role: 'student' }));
        navigate('/student-dashboard');

      // ── 2. PORTER LOGIN — queries the 'porters' table ────────────────────────
      } else if (role === 'porter') {
        const { data, error } = await supabase
          .from('porters')
          .select('*')
          .eq('matric_no', identifier)
          .eq('password', password)
          .single();

        if (error || !data) {
          setErrorMsg('Invalid porter credentials. Please check your Staff ID and password.');
          setIsLoading(false);
          return;
        }

        localStorage.setItem('currentUser', JSON.stringify({ ...data, role: 'porter' }));
        navigate('/porter-dashboard');

      // ── 3. ADMIN LOGIN — queries the 'profiles' table ─────────────────────────
      } else {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('matric_number', identifier)
          .eq('password', password)
          .eq('role', 'admin')
          .single();

        if (error || !data) {
          setErrorMsg('Invalid admin credentials. Please check your identifier and password.');
          setIsLoading(false);
          return;
        }

        localStorage.setItem('currentUser', JSON.stringify(data));
        navigate('/super-admin');
      }
    } catch (err) {
      setErrorMsg('A system error occurred. Please try again.');
    }

    setIsLoading(false);
  };

  // ─── Render ───────────────────────────────────────────────────────────────────
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

          {/* ── ROLE SELECTOR TABS ── */}
          <div className="flex bg-gray-100 p-1 rounded-xl mb-8">
            {['student', 'porter', 'admin'].map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => switchRole(r)}
                className={`flex-1 flex justify-center items-center gap-2 py-2 text-sm font-bold rounded-lg transition-all ${
                  role === r ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {r === 'student' && <GraduationCap size={16} />}
                {r === 'porter' && <HardHat size={16} />}
                {r === 'admin' && <Shield size={16} />}
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>

          {/* ── FORMAT HINT BANNER ── */}
          <div className="mb-6 bg-blue-50 border border-blue-100 rounded-xl p-3 flex gap-2 items-start">
            <Info size={16} className="text-blue-500 mt-0.5 shrink-0" />
            <div className="text-xs text-blue-700 space-y-1">
              <p><span className="font-bold">{config.identifierLabel}:</span> {config.identifierHint}</p>
              <p><span className="font-bold">Password:</span> {config.passwordHint}</p>
            </div>
          </div>

          <form className="space-y-6" onSubmit={handleLogin}>

            {/* ── IDENTIFIER FIELD ── */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                {config.identifierLabel}
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type={config.identifierType}
                  required
                  className={`block w-full pl-10 pr-3 py-4 bg-gray-50 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all sm:text-sm font-bold text-gray-800 ${
                    identifierInvalid ? 'border-red-400 bg-red-50' : 'border-transparent'
                  }`}
                  placeholder={config.identifierPlaceholder}
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  onBlur={() => setIdentifierTouched(true)}
                />
              </div>
              {identifierInvalid && (
                <p className="mt-1 text-xs text-red-500 font-semibold pl-1">{config.identifierHint}</p>
              )}
            </div>

            {/* ── PASSWORD FIELD ── */}
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
                {config.passwordLabel}
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  type="password"
                  required
                  className={`block w-full pl-10 pr-3 py-4 bg-gray-50 border rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all sm:text-sm font-bold text-gray-800 ${
                    passwordInvalid ? 'border-red-400 bg-red-50' : 'border-transparent'
                  }`}
                  placeholder={config.passwordPlaceholder}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onBlur={() => setPasswordTouched(true)}
                />
              </div>
              {passwordInvalid && (
                <p className="mt-1 text-xs text-red-500 font-semibold pl-1">{config.passwordHint}</p>
              )}
            </div>

            {/* ── ERROR MESSAGE ── */}
            {errorMsg && (
              <div className="bg-red-50 text-red-600 text-sm font-bold p-4 rounded-xl border border-red-100 text-center">
                {errorMsg}
              </div>
            )}

            {/* ── SUBMIT ── */}
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
