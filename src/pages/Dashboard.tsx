import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Trip, Invitation } from '../types';
import { getTrips, getMyInvitations, joinTrip, leaveTrip } from '../storage';
import { Plus, MapPin, Calendar, Loader2, PlayCircle, Clock, CheckCircle, Lightbulb, Lock, Mail, UserPlus, LogIn, UserCheck, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const { user } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [myInvitations, setMyInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Auth form state for guests
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('signup');
  const [authLoading, setAuthLoading] = useState(false);
  const [authMessage, setAuthMessage] = useState('');

  const handleJoinTrip = async (tripId: string) => {
    if (!user) return;
    try {
      await joinTrip(tripId);
      const [tripsData, invitesData] = await Promise.all([getTrips(), getMyInvitations()]);
      setTrips(tripsData);
      setMyInvitations(invitesData);
    } catch (error) {
      alert('Failed to join trip: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleLeaveTrip = async (tripId: string) => {
    if (!confirm('Are you sure you want to leave this trip?')) return;
    try {
      await leaveTrip(tripId);
      const [tripsData, invitesData] = await Promise.all([getTrips(), getMyInvitations()]);
      setTrips(tripsData);
      setMyInvitations(invitesData);
    } catch (error) {
      alert('Failed to leave trip: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthMessage('');
    try {
      if (authMode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setAuthMessage('Check your email to confirm!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (error) {
      setAuthMessage(`Error: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setAuthLoading(false);
    }
  };

  useEffect(() => {
    async function loadData() {
      const [tripsData, invitesData] = await Promise.all([
        getTrips(),
        user ? getMyInvitations() : Promise.resolve([])
      ]);
      setTrips(tripsData);
      setMyInvitations(invitesData);
      setLoading(false);
    }
    loadData();
  }, [user]);

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '4rem' }}>
        <Loader2 className="animate-spin" size={40} style={{ margin: '0 auto' }} />
        <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading your trips...</p>
      </div>
    );
  }

  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const invitedTripIds = myInvitations.map(i => i.trip_id);
  const myTrips = trips.filter(t => t.user_id === user?.id || invitedTripIds.includes(t.id));
  
  // Trips that are either in the future or currently happening
  const upcomingTrips = myTrips.filter(t => (t.status === 'confirmed' || !t.status) && t.startDate && t.endDate && t.endDate >= today);
  const completedTrips = myTrips.filter(t => (t.status === 'confirmed' || !t.status) && t.endDate && t.endDate < today);
  const plannedTrips = myTrips.filter(t => t.status === 'planned');
  const communityTrips = trips.filter(t => t.status === 'planned' && t.user_id !== user?.id && !invitedTripIds.includes(t.id));

  const renderSection = (title: string, icon: React.ReactNode, tripList: Trip[]) => (
    <div style={{ marginBottom: '3rem' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', fontSize: '1.25rem' }}>
        {icon} {title} ({tripList.length})
      </h2>
      {tripList.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>No trips in this category.</p>
      ) : (
        <div className="grid">
          {tripList.map((trip) => {
            const isCompleted = title === 'Completed';
            const isCommunity = title === 'Community Trip Ideas';
            const isOwner = user && trip.user_id === user.id;
            const isInvited = invitedTripIds.includes(trip.id);
            const canOpen = isOwner || isInvited;
            const isClosed = isCompleted && !isOwner;
            const canClickCard = canOpen && !isClosed;

            // Find today's plan (direct match or Day X fallback)
            let todaysPlan = trip.days?.find(d => d.date === today);
            
            if (!todaysPlan && trip.startDate) {
              const start = new Date(trip.startDate + 'T00:00:00');
              const curr = new Date(today + 'T00:00:00');
              const diffTime = curr.getTime() - start.getTime();
              const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24)) + 1;
              if (diffDays >= 1) {
                todaysPlan = trip.days?.find(d => 
                  d.date?.toLowerCase() === `day ${diffDays}` || 
                  d.date?.toLowerCase() === `day${diffDays}`
                );
              }
            }

            return (
              <div
                key={trip.id}
                onClick={() => canClickCard ? navigate(`/trip/${trip.id}`) : null}
                className="card"
                style={{
                  transition: 'all 0.2s',
                  borderLeft: isClosed ? '4px solid var(--border)' : '1px solid var(--border)',
                  cursor: canClickCard ? 'pointer' : 'default',
                  position: 'relative',
                  opacity: canOpen ? 1 : 0.9,
                  display: 'flex',
                  flexDirection: 'column',
                  padding: isClosed ? '1rem' : '1.25rem'
                }}
              >
                {!canOpen && isCompleted && (
                  <div style={{ position: 'absolute', top: '1rem', right: '1rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem' }}>
                    <Lock size={14} /> Locked
                  </div>
                )}

                {user && isInvited && !isOwner && !isCommunity && !isCompleted && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLeaveTrip(trip.id);
                    }}
                    className="btn btn-outline btn-sm"
                    style={{ 
                      position: 'absolute', 
                      top: isClosed ? '0.75rem' : '1rem', 
                      right: '1rem', 
                      color: '#ef4444', 
                      borderColor: '#ef4444', 
                      fontSize: '0.7rem', 
                      padding: '0.2rem 0.5rem',
                      height: 'auto',
                      zIndex: 10
                    }}
                  >
                    <LogOut size={12} /> Leave
                  </button>
                )}
                
                <h3 style={{ 
                  marginBottom: '0.5rem', 
                  fontSize: isClosed ? '1rem' : '1.17rem',
                  paddingRight: ((!canOpen && isCompleted) || (user && isInvited && !isOwner && !isCommunity)) ? '5rem' : '0' 
                }}>{trip.title}</h3>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                  <MapPin size={16} color="var(--primary)" /> {trip.destination}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>
                  <Calendar size={16} color="var(--primary)" />
                  {trip.startDate && trip.endDate
                    ? `${new Date(trip.startDate).toLocaleDateString()} - ${new Date(trip.endDate).toLocaleDateString()}`
                    : 'Dates not set'}
                </div>

                {todaysPlan && todaysPlan.activities.length > 0 && (
                  <div style={{ 
                    background: 'var(--bg)', 
                    padding: '0.75rem', 
                    borderRadius: '8px', 
                    marginBottom: '1rem',
                    border: '1px solid var(--border)',
                    borderLeft: '3px solid var(--primary)'
                  }}>
                    <p style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Clock size={12} /> Today's Itinerary
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                      {todaysPlan.activities.map(act => (
                        <div key={act.id} style={{ fontSize: '0.8rem', display: 'flex', gap: '0.5rem' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>{act.time}</span>
                          <span style={{ color: 'var(--text-muted)' }}>{act.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {!isClosed && trip.description && (
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {trip.description}
                  </p>
                )}

                {trip.mediaLinks && trip.mediaLinks.length > 0 && (
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: isClosed ? '0' : '1rem' }}>
                    {trip.mediaLinks.map(link => (
                      <a
                        key={link.id}
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => {
                          e.stopPropagation();
                        }}
                        style={{
                          fontSize: '0.7rem',
                          background: 'var(--bg)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '4px',
                          color: 'var(--primary)',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.25rem',
                          textDecoration: 'none',
                          cursor: 'pointer'
                        }}
                      >
                        <PlayCircle size={10} /> {link.title}
                      </a>
                    ))}
                  </div>
                )}

                {!canOpen && isCommunity && (
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleJoinTrip(trip.id);
                    }}
                    className="btn btn-primary btn-sm"
                    style={{ marginTop: 'auto', width: '100%', justifyContent: 'center' }}
                  >
                    <UserCheck size={16} /> Join this Trip
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="container">
      <div className="dashboard-header" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '2rem', 
        marginBottom: '3rem', 
        marginTop: user ? '1rem' : '0',
        minHeight: user ? 'auto' : '70vh',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        {user && (
          <div style={{ flex: 1, width: '100%' }}>
            <h1 style={{ fontSize: 'clamp(2rem, 8vw, 2.5rem)', color: 'var(--text)', marginBottom: '0.5rem' }}>Trips Dashboard</h1>
            <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Plan, track, and share your adventures with <b>Trippaglu</b>.</p>
          </div>
        )}

        {!user && (
          <div className="card" style={{ maxWidth: '450px', width: '100%', background: 'var(--card-bg)', border: '2px solid var(--primary)', alignSelf: 'center' }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {authMode === 'signup' ? <UserPlus size={20} /> : <LogIn size={20} />} 
              {authMode === 'signup' ? 'Create an account to start planning' : 'Login to your account'}
            </h3>
            <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <div style={{ position: 'relative' }}>
                  <Mail size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={{ paddingLeft: '35px' }} />
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <div style={{ position: 'relative' }}>
                  <Lock size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} style={{ paddingLeft: '35px' }} />
                </div>
              </div>
              <button type="submit" className="btn btn-primary" disabled={authLoading} style={{ width: '100%', justifyContent: 'center' }}>
                {authLoading ? 'Please wait...' : (authMode === 'signup' ? 'Sign Up' : 'Login')}
              </button>
              <button type="button" onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')} style={{ fontSize: '0.85rem', color: 'var(--primary)', textAlign: 'center' }}>
                {authMode === 'signup' ? 'Already have an account? Login' : "Don't have an account? Sign Up"}
              </button>
            </form>
            {authMessage && (
              <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: authMessage.startsWith('Error') ? '#ef4444' : '#10b981', textAlign: 'center' }}>{authMessage}</p>
            )}
          </div>
        )}

        {user && (
          <Link to="/new" className="btn btn-primary btn-lg" style={{ alignSelf: 'flex-start' }}>
            <Plus size={24} /> New Trip Plan
          </Link>
        )}
      </div>

      <style>{`
        @media (min-width: 768px) {
          .dashboard-header {
            flex-direction: ${user ? 'row' : 'column'} !important;
            justify-content: ${user ? 'space-between' : 'center'} !important;
            align-items: ${user ? 'flex-start' : 'center'} !important;
          }
          .dashboard-header .card {
            align-self: ${user ? 'flex-start' : 'center'} !important;
            margin-top: ${user ? '-1rem' : '0'};
          }
        }
      `}</style>

      {user && (
        <>
          {renderSection('Upcoming & Ongoing', <Clock size={24} color="var(--primary)" />, upcomingTrips)}
          {renderSection('Completed', <CheckCircle size={24} color="var(--text-muted)" />, completedTrips)}
          {renderSection('My Planned Trips', <Lightbulb size={24} color="#f59e0b" />, plannedTrips)}
        </>
      )}

      {user && communityTrips.length > 0 && renderSection('Community Trip Ideas', <Lightbulb size={24} color="var(--primary)" />, communityTrips)}

      <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '3rem', opacity: 0.6 }}>
        Cooked 🧑🏻‍🍳 by Ansh
      </p>
    </div>
  );
}
