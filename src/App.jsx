// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import PorterDashboard from './pages/PorterDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Navbar from './components/Navbar'; // Import the new Navbar

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-[#F8FAFC]">
        {/* The Navbar will appear on every page EXCEPT the login page */}
        <Navbar /> 
        
        <main className="p-4 md:p-8">
          <Routes>
            <Route path="/" element={<Login />} />
            <Route path="/student" element={<StudentDashboard />} />
            <Route path="/porter" element={<PorterDashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;