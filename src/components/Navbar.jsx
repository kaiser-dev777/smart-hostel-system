// src/components/Navbar.jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, ShieldCheck } from 'lucide-react';
import { schoolConfig } from '../config';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  // Hide the Navbar if we are on the login screen
  if (location.pathname === '/') return null;

  const handleLogout = () => {
    // Clear the session
    localStorage.removeItem('currentUser');
    // Send them back to the login page
    navigate('/');
  };

  return (
    <nav className="bg-white border-b border-gray-100 py-4 px-6 mb-8 sticky top-0 z-50 shadow-sm">
      <div className="max-w-6xl mx-auto flex justify-between items-center">
        {/* Branding */}
        <div className="flex items-center gap-2">
  <div className="bg-blue-600 p-1.5 rounded-lg">
    <ShieldCheck className="text-white" size={20} />
  </div>
  <h1 className="font-black text-gray-900 tracking-tight hidden sm:block">
    SMART HOSTEL <span className="text-blue-600">SYSTEM</span>
  </h1>
</div>

        {/* Logout Button */}
        <button 
          onClick={handleLogout}
          className="flex items-center gap-2 bg-gray-50 hover:bg-red-50 text-gray-600 hover:text-red-600 font-bold py-2 px-4 rounded-xl transition-all border border-gray-200 hover:border-red-100 active:scale-95"
        >
          <LogOut size={18} />
          <span>Log Out</span>
        </button>
      </div>
    </nav>
  );
}