import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { Trip } from '../types';
import { getTrips } from '../storage';
import { Plus, MapPin, Calendar, Loader2, PlayCircle, Clock, CheckCircle, Lightbulb } from 'lucide-react';

export default function Dashboard() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadTrips() {
      const data = await getTrips();
      setTrips(data);
      setLoading(false);
    }
    loadTrips();
  }, []);

  if (loading) {
    return (
      <div className="container" style={{ textAlign: 'center', padding: '4rem' }}>
        <Loader2 className="animate-spin" size={40} style={{ margin: '0 auto' }} />
        <p style={{ marginTop: '1rem', color: 'var(--text-muted)' }}>Loading your trips...</p>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  const upcomingTrips = trips.filter(t => (t.status === 'confirmed' || !t.status) && t.startDate && t.startDate > today);
  const completedTrips = trips.filter(t => (t.status === 'confirmed' || !t.status) && t.endDate && t.endDate < today);
  const plannedTrips = trips.filter(t => t.status === 'planned');

  const renderSection = (title: string, icon: React.ReactNode, tripList: Trip[]) => (
    <div style={{ marginBottom: '3rem' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem', fontSize: '1.25rem' }}>
        {icon} {title} ({tripList.length})
      </h2>
      {tripList.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', fontStyle: 'italic' }}>No trips in this category.</p>
      ) : (
        <div className="grid">
          {tripList.map((trip) => (
            <div
              key={trip.id}
              onClick={() => navigate(`/trip/${trip.id}`)}
              className="card"
              style={{
                transition: 'transform 0.2s',
                borderLeft: '1px solid var(--border)',
                cursor: 'pointer'
              }}
            >
              <h3 style={{ marginBottom: '0.5rem' }}>{trip.title}</h3>

              {title !== 'Completed' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                  <MapPin size={16} color="var(--primary)" /> {trip.destination}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: title === 'Completed' ? '0.75rem' : '0' }}>
                <Calendar size={16} color="var(--primary)" />
                {trip.startDate && trip.endDate
                  ? `${new Date(trip.startDate).toLocaleDateString()} - ${new Date(trip.endDate).toLocaleDateString()}`
                  : 'Dates not set'}
              </div>

              {title === 'Completed' && (
                <>
                  {trip.description && (
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {trip.description}
                    </p>
                  )}
                  {trip.mediaLinks && trip.mediaLinks.length > 0 && (
                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                      {trip.mediaLinks.map(link => (
                        <a
                          key={link.id}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
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
                            textDecoration: 'none'
                          }}
                        >
                          <PlayCircle size={10} /> {link.title}
                        </a>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="container">
      <div className="dashboard-header" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2.5rem' }}>
        <div style={{ flex: 1 }}>
          <h1 style={{ fontSize: '2rem', color: 'var(--text)' }}>Trips Dashboard</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage your trips and <i>bhakchodis</i> with the <b>Trippaglu</b>.</p>
        </div>
        <Link to="/new" className="btn btn-primary" style={{ alignSelf: 'flex-start' }}>
          <Plus size={20} /> New Trip
        </Link>
      </div>

      <style>{`
        @media (min-width: 640px) {
          .dashboard-header {
            flex-direction: row !important;
            justify-content: space-between !important;
            align-items: center !important;
          }
          .dashboard-header .btn {
            align-self: center !important;
          }
        }
      `}</style>

      {trips.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '1.1rem' }}>Your travel map is empty!</p>
          <Link to="/new" className="btn btn-primary btn-lg">Start Planning Your First Trip</Link>
        </div>
      ) : (
        <>
          {renderSection('Upcoming', <Clock size={24} color="var(--primary)" />, upcomingTrips)}
          {renderSection('Completed', <CheckCircle size={24} color="var(--text-muted)" />, completedTrips)}
          {renderSection('Planned (Ideas)', <Lightbulb size={24} color="#f59e0b" />, plannedTrips)}
        </>
      )}
      <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '3rem', opacity: 0.6 }}>
        Cooked 🧑🏻‍🍳 by Ansh
      </p>
    </div>
  );
}
