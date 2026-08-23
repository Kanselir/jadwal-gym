import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import CollegeSchedule from './pages/CollegeSchedule';
import Study from './pages/Study';
import History from './pages/History';
import Settings from './pages/Settings';
import Login from './components/Login';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(
    sessionStorage.getItem('isLoggedIn') === 'true'
  );

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('isLoggedIn');
    setIsLoggedIn(false);
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Router>
      <Navbar onLogout={handleLogout} />
      <main className="app-container">
        <Routes>
          <Route path="/" element={<Navigate to="/workout" replace />} />
          <Route path="/workout" element={<Dashboard />} />
          <Route path="/college" element={<CollegeSchedule />} />
          <Route path="/study" element={<Study />} />
          <Route path="/history" element={<History />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
