import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import type { Trip, Contributor, Expense, MoneyHandler, Invitation, ParticipantRole, Profile } from '../types';
import { getTripById, deleteTrip, inviteUser, updateTripFinances, getUserEssentialStates, toggleUserEssential, getInvitations, updateInvitationRole, removeInvitation, getProfiles } from '../storage';
import { useAuth } from '../contexts/AuthContext';
import { MapPin, Calendar, Share2, Trash2, ArrowLeft, Clock, Loader2, UserPlus, CheckSquare, Square, Link as LinkIcon, ExternalLink, Edit2, IndianRupee, Users, AlertCircle, Save, X, Receipt, History, Shield, ShieldCheck, UserMinus, Search } from 'lucide-react';

export default function TripPreview() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<ParticipantRole>('participant');
  const [isInviting, setIsInviting] = useState(false);
  const [userEssentials, setUserEssentials] = useState<Record<string, boolean>>({});
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [userSearch, setUserSearch] = useState('');

  // Finance Edit Mode
  const [isEditingFinances, setIsEditingFinances] = useState(false);
  const [tempContributors, setTempContributors] = useState<Contributor[]>([]);
  const [tempHandlers, setTempHandlers] = useState<MoneyHandler[]>([]);
  const [tempExpenses, setTempExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    async function loadTrip() {
      if (id) {
        const found = await getTripById(id);
        if (found) {
          setTrip(found);
          setTempContributors(found.contributors || []);
          setTempHandlers(found.moneyHandlers || []);
          setTempExpenses(found.expenses || []);
          const states = await getUserEssentialStates(id);
          setUserEssentials(states);
          
          const invites = await getInvitations(id);
          setInvitations(invites);

          const isOwner = found.user_id === user?.id;
          const userInvite = invites.find(i => i.invited_email === user?.email);
          setIsAdmin(isOwner || userInvite?.role === 'admin');

          if (isOwner || (userInvite?.role === 'admin')) {
            const profiles = await getProfiles();
            setAllProfiles(profiles.filter(p => p.id !== user?.id));
          }
        }
      }
      setLoading(false);
    }
    loadTrip();
  }, [id, user]);

  const toggleEssential = async (essentialId: string) => {
    if (!trip) return;
    const currentStatus = !!userEssentials[essentialId];
    const newStatus = !currentStatus;
    setUserEssentials(prev => ({ ...prev, [essentialId]: newStatus }));
    try {
      await toggleUserEssential(trip.id, essentialId, newStatus);
    } catch {
      // Rollback optimistic update on failure
      setUserEssentials(prev => ({ ...prev, [essentialId]: currentStatus }));
    }
  };

  const handleSaveFinances = async () => {
    if (!trip) return;
    const totalSpent = tempExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
    try {
      await updateTripFinances(trip.id, totalSpent, tempContributors, tempHandlers, tempExpenses);
      setTrip({ ...trip, expenditure: totalSpent, contributors: tempContributors, moneyHandlers: tempHandlers, expenses: tempExpenses });
      setIsEditingFinances(false);
    } catch {
      alert('Failed to update finances.');
    }
  };

  const handleUpdateRole = async (inviteId: string, role: ParticipantRole) => {
    try {
      await updateInvitationRole(inviteId, role);
      setInvitations(invitations.map(i => i.id === inviteId ? { ...i, role } : i));
    } catch {
      alert('Failed to update role');
    }
  };

  const handleRemoveInvitation = async (inviteId: string) => {
    if (!confirm('Remove this participant?')) return;
    try {
      await removeInvitation(inviteId);
      setInvitations(invitations.filter(i => i.id !== inviteId));
    } catch {
      alert('Failed to remove participant');
    }
  };

  const handleQuickInvite = async (email: string) => {
    if (!trip) return;
    setIsInviting(true);
    try {
      await inviteUser(trip.id, email, 'participant');
      const updatedInvites = await getInvitations(trip.id);
      setInvitations(updatedInvites);
    } catch {
      alert('Failed to add user');
    }
    setIsInviting(false);
  };

  if (loading) return (
    <div className="container" style={{ textAlign: 'center', padding: '4rem' }}>
      <Loader2 className="animate-spin" size={40} style={{ margin: '0 auto' }} />
    </div>
  );

  if (!trip) return (
    <div className="container" style={{ textAlign: 'center', padding: '4rem' }}>
      <p>Trip not found or you don't have access.</p>
      <button onClick={() => navigate('/')} className="btn btn-primary" style={{ marginTop: '1rem' }}>Go Home</button>
    </div>
  );

  const isOwner = trip.user_id === user?.id;
  const totalCollectedAmount = trip.contributors.reduce((sum, c) => sum + (c.amount || 0), 0);
  const remainingBudget = (trip.totalBudget || 0) - (trip.expenditure || 0);

  // Helper to get handler balance
  const getHandlerBalance = (handlerId: string, initial: number) => {
    const spent = (trip.expenses || []).filter(e => e.handlerId === handlerId).reduce((sum, e) => sum + (e.amount || 0), 0);
    return initial - spent;
  };

  return (
    <div className="container">
      <div className="trip-preview-actions" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
        <button onClick={() => navigate('/')} className="btn btn-outline" style={{ alignSelf: 'flex-start' }}><ArrowLeft size={20} /> Back</button>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button onClick={() => { navigator.clipboard.writeText(window.location.href); alert('Link copied!'); }} className="btn btn-outline"><Share2 size={20} /> Share</button>
          {isAdmin && (
            <>
              <Link to={`/edit/${trip.id}`} className="btn btn-outline"><Edit2 size={20} /> Edit</Link>
              {isOwner && (
                <button onClick={async () => { if (confirm('Delete trip?')) { await deleteTrip(trip.id); navigate('/'); } }} className="btn btn-outline" style={{ color: '#ef4444' }}><Trash2 size={20} /></button>
              )}
            </>
          )}
        </div>
      </div>

      <style>{`
        @media (min-width: 640px) {
          .trip-preview-actions { flex-direction: row !important; justify-content: space-between !important; }
        }
        .trip-header-info { flex-direction: column; gap: 0.75rem; }
        @media (min-width: 640px) {
          .trip-header-info { flex-direction: row !important; gap: 2rem !important; }
        }
        .participant-item { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; background: var(--bg); border-radius: 8px; margin-bottom: 0.5rem; }
        .role-badge { display: flex; align-items: center; gap: 0.25rem; font-size: 0.75rem; padding: 0.25rem 0.5rem; border-radius: 4px; font-weight: 600; }
        .role-admin { background: #fee2e2; color: #ef4444; }
        .role-participant { background: #f3f4f6; color: #4b5563; }
      `}</style>

      <div className="grid" style={{ marginBottom: '1.5rem' }}>
        {isAdmin && (
          <div className="card" style={{ background: 'var(--bg)' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1rem' }}>Invite a friend</h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              if (!inviteEmail) return;
              setIsInviting(true);
              try {
                await inviteUser(trip.id, inviteEmail, inviteRole);
                const updatedInvites = await getInvitations(trip.id);
                setInvitations(updatedInvites);
                alert(`Invitation sent to ${inviteEmail}`);
                setInviteEmail('');
              } catch { alert('Failed'); }
              setIsInviting(false);
            }} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <input type="email" placeholder="friend@example.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as ParticipantRole)} style={{ flex: 1 }}>
                  <option value="participant">Participant (View only)</option>
                  <option value="admin">Admin (Can edit)</option>
                </select>
                <button type="submit" className="btn btn-primary" disabled={isInviting} style={{ flex: 1 }}><UserPlus size={18} /> {isInviting ? 'Inviting...' : 'Invite'}</button>
              </div>
            </form>
          </div>
        )}

        {isAdmin && allProfiles.length > 0 && (
          <div className="card" style={{ background: 'var(--bg)' }}>
            <h3 style={{ marginBottom: '1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Search size={20} /> Discover Users</h3>
            <div className="form-group" style={{ marginBottom: '0.75rem' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  placeholder="Search by name or email..." 
                  value={userSearch} 
                  onChange={(e) => setUserSearch(e.target.value)} 
                  style={{ paddingLeft: '35px', fontSize: '0.9rem' }}
                />
              </div>
            </div>
            <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {allProfiles
                .filter(p => {
                  const searchMatch = p.display_name.toLowerCase().includes(userSearch.toLowerCase()) || p.email.toLowerCase().includes(userSearch.toLowerCase());
                  const alreadyInvited = invitations.some(i => i.invited_email === p.email);
                  return searchMatch && !alreadyInvited;
                })
                .map(profile => (
                  <div key={profile.id} className="participant-item" style={{ marginBottom: 0, padding: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 600, fontSize: '0.8rem' }}>
                        {profile.display_name[0].toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{profile.display_name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{profile.email}</div>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleQuickInvite(profile.email)} 
                      className="btn btn-primary btn-sm" 
                      style={{ padding: '0.25rem 0.5rem' }}
                      disabled={isInviting}
                    >
                      <UserPlus size={14} /> Add
                    </button>
                  </div>
                ))}
            </div>
          </div>
        )}

        <div className="card" style={{ background: 'var(--bg)' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Users size={20} /> Participants</h3>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            <div className="participant-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>O</div>
                <div>
                  <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>Owner</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Trip Creator</div>
                </div>
              </div>
              <span className="role-badge role-admin"><ShieldCheck size={14} /> Admin</span>
            </div>
            
            {invitations.map(invite => (
              <div key={invite.id} className="participant-item">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#9ca3af', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                    {invite.invited_email[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 600, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{invite.invited_email}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Invited</div>
                  </div>
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {isOwner ? (
                    <select 
                      value={invite.role} 
                      onChange={(e) => handleUpdateRole(invite.id, e.target.value as ParticipantRole)}
                      style={{ padding: '0.2rem', fontSize: '0.75rem' }}
                    >
                      <option value="participant">Participant</option>
                      <option value="admin">Admin</option>
                    </select>
                  ) : (
                    <span className={`role-badge ${invite.role === 'admin' ? 'role-admin' : 'role-participant'}`}>
                      {invite.role === 'admin' ? <ShieldCheck size={14} /> : <Shield size={14} />}
                      {invite.role.charAt(0).toUpperCase() + invite.role.slice(1)}
                    </span>
                  )}
                  {isOwner && (
                    <button onClick={() => handleRemoveInvitation(invite.id)} style={{ color: '#ef4444', padding: '0.25rem' }}>
                      <UserMinus size={16} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={{ padding: 'clamp(1rem, 5vw, 2rem)' }}>
        <h1 style={{ fontSize: 'clamp(1.5rem, 8vw, 2.5rem)', marginBottom: '1rem', color: 'var(--text)' }}>{trip.title}</h1>
        <div className="trip-header-info" style={{ display: 'flex', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}><MapPin size={20} color="var(--primary)" /> {trip.destination}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)' }}>
            <Calendar size={20} color="var(--primary)" /> 
            {trip.startDate && trip.endDate ? `${new Date(trip.startDate).toLocaleDateString()} - ${new Date(trip.endDate).toLocaleDateString()}` : 'Dates not set'}
          </div>
        </div>
        
        {trip.description && <p style={{ fontSize: '1.1rem', color: 'var(--text-muted)', marginBottom: '2rem' }}>{trip.description}</p>}

        {/* Financial Dashboard */}
        <div style={{ marginBottom: '2.5rem', borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><IndianRupee size={22} /> Money Tracker</h3>
            {isAdmin && (
              !isEditingFinances ? (
                <button onClick={() => setIsEditingFinances(true)} className="btn btn-outline btn-sm"><Edit2 size={16} /> Update Tracker</button>
              ) : (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button onClick={handleSaveFinances} className="btn btn-primary btn-sm"><Save size={16} /> Save</button>
                  <button onClick={() => { setIsEditingFinances(false); }} className="btn btn-outline btn-sm"><X size={16} /></button>
                </div>
              )
            )}
          </div>

          {isEditingFinances ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {/* Contributions Edit */}
              <div className="card" style={{ background: 'var(--bg)' }}>
                <label style={{ fontWeight: 600, marginBottom: '1rem', display: 'block' }}>Money Received (Contributors)</label>
                {tempContributors.map((c, idx) => (
                  <div key={c.id} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input style={{ flex: 2 }} value={c.name} onChange={e => { const nc = [...tempContributors]; nc[idx].name = e.target.value; setTempContributors(nc); }} placeholder="Name" />
                    <input style={{ flex: 1 }} type="number" value={c.amount} onChange={e => { const nc = [...tempContributors]; nc[idx].amount = Number(e.target.value); setTempContributors(nc); }} placeholder="₹" />
                  </div>
                ))}
                <button type="button" onClick={() => setTempContributors([...tempContributors, { id: crypto.randomUUID(), name: '', amount: 0 }])} style={{ color: 'var(--primary)', fontSize: '0.8rem', marginTop: '0.5rem' }}>+ Add Person</button>
              </div>

              {/* Expenses tracking edit */}
              <div className="card" style={{ background: 'var(--bg)' }}>
                <label style={{ fontWeight: 600, marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Receipt size={18} /> Record New Expenses
                </label>
                {tempExpenses.map((e, idx) => (
                  <div key={e.id} className="card" style={{ marginBottom: '0.75rem', padding: '0.75rem', background: 'var(--card-bg)' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <input style={{ flex: 2 }} value={e.description} onChange={ev => { const ne = [...tempExpenses]; ne[idx].description = ev.target.value; setTempExpenses(ne); }} placeholder="Description (e.g. Dinner at hotel)" />
                      <input style={{ flex: 1 }} type="number" value={e.amount} onChange={ev => { const ne = [...tempExpenses]; ne[idx].amount = Number(ev.target.value); setTempExpenses(ne); }} placeholder="₹" />
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <select style={{ flex: 1, padding: '0.4rem' }} value={e.handlerId} onChange={ev => { const ne = [...tempExpenses]; ne[idx].handlerId = ev.target.value; setTempExpenses(ne); }}>
                        <option value="">Select Handler</option>
                        {tempHandlers.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                      </select>
                      <input type="date" style={{ flex: 1, padding: '0.4rem' }} value={e.date} onChange={ev => { const ne = [...tempExpenses]; ne[idx].date = ev.target.value; setTempExpenses(ne); }} />
                      <button onClick={() => setTempExpenses(tempExpenses.filter(item => item.id !== e.id))} style={{ color: '#ef4444' }}><Trash2 size={18} /></button>
                    </div>
                  </div>
                ))}
                <button type="button" onClick={() => setTempExpenses([...tempExpenses, { id: crypto.randomUUID(), description: '', amount: 0, handlerId: '', date: new Date().toISOString().split('T')[0] }])} style={{ color: 'var(--primary)', fontSize: '0.8rem', marginTop: '0.5rem' }}>+ Add Expense</button>
              </div>
            </div>
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid">
                <div className="card" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                  <div style={{ color: '#10b981', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Spent</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>₹ {trip.expenditure?.toLocaleString() || 0}</div>
                </div>
                <div className="card" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                  <div style={{ color: 'var(--primary)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Budget</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>₹ {trip.totalBudget?.toLocaleString() || 0}</div>
                </div>
                <div className="card" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
                  <div style={{ color: '#f59e0b', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Remaining</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>₹ {remainingBudget.toLocaleString()}</div>
                </div>
              </div>

              {/* Handlers and Expenses sections */}
              <div className="grid" style={{ marginTop: '1.5rem' }}>
                {/* Money Handlers Status */}
                <div className="card">
                  <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                    <Users size={18} /> Handler Balances
                  </h4>
                  {trip.moneyHandlers.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No handlers defined.</p> : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      {trip.moneyHandlers.map(h => {
                        const balance = getHandlerBalance(h.id, h.initialAmount);
                        return (
                          <div key={h.id} style={{ padding: '0.75rem', background: 'var(--bg)', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                              <span style={{ fontWeight: 600 }}>{h.name}</span>
                              <span style={{ color: balance < 0 ? '#ef4444' : '#10b981', fontWeight: 700 }}>₹ {balance.toLocaleString()}</span>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              Initial: ₹ {h.initialAmount.toLocaleString()}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Info Card */}
                <div className="card">
                  <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                    <AlertCircle size={18} /> Financial Details
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Total Collected:</span>
                      <span style={{ fontWeight: 600 }}>₹ {totalCollectedAmount.toLocaleString()}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Budget per person:</span>
                      <span style={{ fontWeight: 600 }}>₹ {trip.budgetPerPerson?.toLocaleString() || 0}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Money Handlers:</span>
                      <span style={{ fontWeight: 600 }}>{trip.moneyHandlers.length} Persons</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Expenses List - Separate section for visibility */}
              <div className="card" style={{ marginTop: '1.5rem' }}>
                <h4 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1rem' }}>
                  <History size={18} /> Expense History
                </h4>
                {trip.expenses.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No expenses recorded yet.</p> : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '400px', overflowY: 'auto' }}>
                    {trip.expenses.slice().reverse().map(e => {
                      const handler = trip.moneyHandlers.find(h => h.id === e.handlerId);
                      return (
                        <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                          <div>
                            <div style={{ fontWeight: 500 }}>{e.description}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{handler?.name || 'Unknown'} • {new Date(e.date).toLocaleDateString()}</div>
                          </div>
                          <div style={{ fontWeight: 600 }}>₹ {e.amount.toLocaleString()}</div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="grid" style={{ marginBottom: '2rem', alignItems: 'start' }}>
          <div className="card" style={{ background: 'var(--bg)' }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckSquare size={20} /> Essentials</h3>
            {trip.essentials.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No items added.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {trip.essentials.map(e => {
                  const isCompleted = !!userEssentials[e.id];
                  return (
                    <button key={e.id} onClick={() => toggleEssential(e.id)} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', textAlign: 'left', width: '100%', padding: '0.25rem 0' }}>
                      <div style={{ paddingTop: '2px', flexShrink: 0 }}>{isCompleted ? <CheckSquare size={20} color="var(--primary)" /> : <Square size={20} color="var(--text-muted)" />}</div>
                      <span style={{ textDecoration: isCompleted ? 'line-through' : 'none', color: isCompleted ? 'var(--text-muted)' : 'var(--text)', fontSize: '0.95rem', wordBreak: 'break-word' }}>{e.task}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card" style={{ background: 'var(--bg)' }}>
            <h3 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><LinkIcon size={20} /> Media Links</h3>
            {trip.mediaLinks.length === 0 ? <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No links added.</p> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {trip.mediaLinks.map(m => (
                  <a key={m.id} href={m.url} target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ justifyContent: 'space-between', fontSize: '0.9rem' }}>{m.title} <ExternalLink size={16} /></a>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '2rem' }}>
          <h2 style={{ marginBottom: '1.5rem' }}>Itinerary</h2>
          {trip.days.length === 0 ? <p style={{ color: 'var(--text-muted)' }}>No activities planned yet.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              {trip.days.map((day, idx) => (
                <div key={idx}>
                  <h3 style={{ marginBottom: '1rem', color: 'var(--primary)', borderBottom: '2px solid var(--primary)', display: 'inline-block' }}>{day.date || `Day ${idx + 1}`}</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                    {day.activities.map((activity) => (
                      <div key={activity.id} style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem', minWidth: '80px', paddingTop: '0.2rem' }}><Clock size={16} /> {activity.time || '--:--'}</div>
                        <div style={{ padding: '0.75rem 1rem', background: 'var(--bg)', borderRadius: '8px', flex: 1 }}>{activity.description}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
