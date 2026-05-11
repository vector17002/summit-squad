import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import TripForm from './pages/TripForm';
import TripPreview from './pages/TripPreview';
import Login from './pages/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider, useTheme } from './contexts/ThemeContext';
import { Plane, LogOut, Moon, Sun } from 'lucide-react';

function AppContent() {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  return (
    <Router>
      <header>
        <div className="header-content">
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plane size={24} color="var(--primary)" />
            <h1>Trippaglu</h1>
          </Link>
          <nav style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button 
              onClick={toggleTheme} 
              className="btn btn-outline" 
              style={{ padding: '0.5rem', borderRadius: '50%' }}
              title="Toggle Theme"
            >
              {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
            </button>
            {user ? (
              <>
                <span className="nav-user-email" style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{user.email}</span>
                <Link to="/" className="btn btn-outline">My Trips</Link>
                <button onClick={signOut} className="btn btn-outline" title="Sign Out">
                  <LogOut size={20} />
                </button>
              </>
            ) : (
              <Link to="/login" className="btn btn-primary">Login</Link>
            )}
          </nav>
        </div>
      </header>

      <main>
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route path="/" element={<Dashboard />} />
          <Route path="/new" element={user ? <TripForm /> : <Navigate to="/login" />} />
          <Route path="/edit/:id" element={user ? <TripForm /> : <Navigate to="/login" />} />
          <Route path="/trip/:id" element={user ? <TripPreview /> : <Navigate to="/login" />} />
        </Routes>
      </main>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </AuthProvider>
  );
}

export default App;
