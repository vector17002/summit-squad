import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import type { Trip, DayPlan, Essential, MediaLink, Contributor, MoneyHandler, Expense } from '../types';
import { saveTrip, getTripById, checkIsAdmin } from '../storage';
import { Plus, Trash2, ArrowLeft, CheckSquare, Link as LinkIcon, Loader2, IndianRupee, Wallet } from 'lucide-react';

export default function TripForm() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(!!id);
  
  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'planned' | 'confirmed'>('confirmed');
  
  // Finances
  const [totalBudget, setTotalBudget] = useState<number | undefined>();
  const [budgetPerPerson, setBudgetPerPerson] = useState<number | undefined>();
  const [handlingAccounts, setHandlingAccounts] = useState<number | undefined>();
  const [expenditure, setExpenditure] = useState<number | undefined>();
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [moneyHandlers, setMoneyHandlers] = useState<MoneyHandler[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const [days, setDays] = useState<DayPlan[]>([]);
  const [essentials, setEssentials] = useState<Essential[]>([]);
  const [mediaLinks, setMediaLinks] = useState<MediaLink[]>([]);

  useEffect(() => {
    if (id) {
      async function loadTrip() {
        const isAdmin = await checkIsAdmin(id!);
        if (!isAdmin) {
          alert('You do not have permission to edit this trip.');
          navigate('/');
          return;
        }

        const trip = await getTripById(id!);
        if (trip) {
          setTitle(trip.title);
          setDestination(trip.destination);
          setStartDate(trip.startDate || '');
          setEndDate(trip.endDate || '');
          setDescription(trip.description);
          setStatus(trip.status || 'confirmed');
          setTotalBudget(trip.totalBudget);
          setBudgetPerPerson(trip.budgetPerPerson);
          setHandlingAccounts(trip.handlingAccounts);
          setExpenditure(trip.expenditure);
          setContributors(trip.contributors || []);
          setMoneyHandlers(trip.moneyHandlers || []);
          setExpenses(trip.expenses || []);
          setDays(trip.days);
          setEssentials(trip.essentials);
          setMediaLinks(trip.mediaLinks);
        }
        setLoading(false);
      }
      loadTrip();
    }
  }, [id, navigate]);

  const handleAddContributor = () => setContributors([...contributors, { id: crypto.randomUUID(), name: '', amount: 0 }]);
  const handleRemoveContributor = (cid: string) => setContributors(contributors.filter(c => c.id !== cid));

  const handleAddMoneyHandler = () => setMoneyHandlers([...moneyHandlers, { id: crypto.randomUUID(), name: '', initialAmount: 0 }]);
  const handleRemoveMoneyHandler = (mhid: string) => setMoneyHandlers(moneyHandlers.filter(mh => mh.id !== mhid));

  const handleAddDay = () => setDays([...days, { date: '', activities: [] }]);
  const handleAddActivity = (dayIndex: number) => {
    const newDays = [...days];
    newDays[dayIndex].activities.push({ id: crypto.randomUUID(), time: '', description: '' });
    setDays(newDays);
  };
  const handleRemoveActivity = (dayIndex: number, activityId: string) => {
    const newDays = [...days];
    newDays[dayIndex].activities = newDays[dayIndex].activities.filter(a => a.id !== activityId);
    setDays(newDays);
  };

  const handleAddEssential = () => setEssentials([...essentials, { id: crypto.randomUUID(), task: '', isCompleted: false }]);
  const handleRemoveEssential = (eid: string) => setEssentials(essentials.filter(e => e.id !== eid));

  const handleAddMediaLink = () => setMediaLinks([...mediaLinks, { id: crypto.randomUUID(), title: '', url: '' }]);
  const handleRemoveMediaLink = (mid: string) => setMediaLinks(mediaLinks.filter(m => m.id !== mid));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tripData: Trip = {
      id: id || crypto.randomUUID(),
      title,
      destination,
      startDate: status === 'confirmed' ? startDate : undefined,
      endDate: status === 'confirmed' ? endDate : undefined,
      description,
      status,
      totalBudget,
      budgetPerPerson,
      handlingAccounts,
      expenditure,
      contributors,
      moneyHandlers,
      expenses,
      days,
      essentials,
      mediaLinks,
    };
    try {
      await saveTrip(tripData);
      navigate(id ? `/trip/${id}` : '/');
    } catch (err) {
      alert('Failed to save trip. Please try again.');
      console.error(err);
    }
  };

  if (loading) return (
    <div className="container" style={{ textAlign: 'center', padding: '4rem' }}>
      <Loader2 className="animate-spin" size={40} color="var(--primary)" style={{ margin: '0 auto' }} />
    </div>
  );

  return (
    <div className="container">
      <button onClick={() => navigate(-1)} className="btn btn-outline" style={{ marginBottom: '1rem' }}>
        <ArrowLeft size={20} color="var(--primary)" /> Back
      </button>
      <h2 style={{ color: 'var(--text)' }}>{id ? 'Edit Trip' : 'Plan New Trip'}</h2>
      <form onSubmit={handleSubmit} className="card" style={{ marginTop: '1rem' }}>
        <div className="form-group">
          <label>Trip Title</label>
          <input value={title} onChange={ev => setTitle(ev.target.value)} placeholder="e.g. Summer in Tokyo" required />
        </div>
        <div className="grid">
          <div className="form-group">
            <label>Destination</label>
            <input value={destination} onChange={ev => setDestination(ev.target.value)} placeholder="e.g. Tokyo, Japan" required />
          </div>
          <div className="form-group">
            <label>Status</label>
            <select 
              value={status} 
              onChange={ev => setStatus(ev.target.value as 'planned' | 'confirmed')}
            >
              <option value="planned">Planned (Idea/Wishlist)</option>
              <option value="confirmed">Confirmed (Set Dates)</option>
            </select>
          </div>
        </div>

        {status === 'confirmed' && (
          <div className="grid">
            <div className="form-group">
              <label>Start Date</label>
              <input type="date" value={startDate} onChange={ev => setStartDate(ev.target.value)} required />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input type="date" value={endDate} onChange={ev => setEndDate(ev.target.value)} required />
            </div>
          </div>
        )}

        <div className="form-group">
          <label>Description</label>
          <textarea value={description} onChange={ev => setDescription(ev.target.value)} placeholder="Brief summary of your trip..." rows={3} />
        </div>

        {/* Finances Section */}
        <div style={{ marginBottom: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', color: 'var(--text)' }}>
            <IndianRupee size={20} color="var(--primary)" /> Finances
          </h3>
          <div className="grid">
            <div className="form-group">
              <label>Total Budget</label>
              <input type="number" value={totalBudget || ''} onChange={ev => setTotalBudget(Number(ev.target.value))} placeholder="₹ 0" />
            </div>
            <div className="form-group">
              <label>Budget Per Person</label>
              <input type="number" value={budgetPerPerson || ''} onChange={ev => setBudgetPerPerson(Number(ev.target.value))} placeholder="₹ 0" />
            </div>
          </div>
          
          {/* Money Handlers Sub-section */}
          <div style={{ marginTop: '1rem', background: 'var(--bg)', padding: '1rem', borderRadius: 'var(--radius)', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <label style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ffffff' }}>
                <Wallet size={18} color="var(--primary)" /> Money Handlers
              </label>
              <button type="button" onClick={handleAddMoneyHandler} className="btn btn-outline btn-sm">
                <Plus size={14} /> Add Handler
              </button>
            </div>
            {moneyHandlers.map((mh, idx) => (
              <div key={mh.id} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input style={{ flex: 2 }} value={mh.name} onChange={e => {
                  const nmh = [...moneyHandlers];
                  nmh[idx].name = e.target.value;
                  setMoneyHandlers(nmh);
                }} placeholder="Handler Name" />
                <input style={{ flex: 1 }} type="number" value={mh.initialAmount || ''} onChange={e => {
                  const nmh = [...moneyHandlers];
                  nmh[idx].initialAmount = Number(e.target.value);
                  setMoneyHandlers(nmh);
                }} placeholder="Amount Given" />
                <button type="button" onClick={() => handleRemoveMoneyHandler(mh.id)} style={{ color: '#ef4444' }}>
                  <Trash2 size={20} />
                </button>
              </div>
            ))}
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
              List people who are actually holding the cash or card.
            </p>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <label style={{ fontWeight: 500 }}>Money Received From (Contributors)</label>
              <button type="button" onClick={handleAddContributor} className="btn btn-outline btn-sm">
                <Plus size={16} /> Add Person
              </button>
            </div>
            {contributors.map((c, idx) => (
              <div key={c.id} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                <input style={{ flex: 2 }} value={c.name} onChange={ev => {
                    const newConts = [...contributors];
                    newConts[idx].name = ev.target.value;
                    setContributors(newConts);
                  }} placeholder="Name" />
                <input style={{ flex: 1 }} type="number" value={c.amount || ''} onChange={ev => {
                    const newConts = [...contributors];
                    newConts[idx].amount = Number(ev.target.value);
                    setContributors(newConts);
                  }} placeholder="Amount" />
                <button type="button" onClick={() => handleRemoveContributor(c.id)} style={{ color: '#ef4444' }}><Trash2 size={20} /></button>
              </div>
            ))}
          </div>
        </div>

        {/* Essentials Section */}
        <div style={{ marginBottom: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text)' }}><CheckSquare size={20} color="var(--primary)" /> Essentials</h3>
            <button type="button" onClick={handleAddEssential} className="btn btn-outline btn-sm">
              <Plus size={16} /> Add Item
            </button>
          </div>
          {essentials.map((e, idx) => (
            <div key={e.id} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input value={e.task} onChange={ev => {
                  const newEss = [...essentials];
                  newEss[idx].task = ev.target.value;
                  setEssentials(newEss);
                }} placeholder="e.g. Pack passport" />
              <button type="button" onClick={() => handleRemoveEssential(e.id)} style={{ color: '#ef4444' }}><Trash2 size={20} /></button>
            </div>
          ))}
        </div>

        {/* Media Links Section */}
        <div style={{ marginBottom: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#ffffff' }}><LinkIcon size={20} color="var(--primary)" /> Folder / Media Links</h3>
            <button type="button" onClick={handleAddMediaLink} className="btn btn-outline btn-sm"><Plus size={16} /> Add Link</button>
          </div>
          {mediaLinks.map((m, idx) => (
            <div key={m.id} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input style={{ flex: 1 }} value={m.title} onChange={ev => {
                  const newLinks = [...mediaLinks];
                  newLinks[idx].title = ev.target.value;
                  setMediaLinks(newLinks);
                }} placeholder="Title" />
              <input style={{ flex: 2 }} value={m.url} onChange={ev => {
                  const newLinks = [...mediaLinks];
                  newLinks[idx].url = ev.target.value;
                  setMediaLinks(newLinks);
                }} placeholder="URL" />
              <button type="button" onClick={() => handleRemoveMediaLink(m.id)} style={{ color: '#ef4444' }}><Trash2 size={20} /></button>
            </div>
          ))}
        </div>

        {/* Itinerary Section */}
        <div style={{ marginBottom: '2rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ color: '#ffffff' }}>Itinerary</h3>
            <button type="button" onClick={handleAddDay} className="btn btn-outline btn-sm"><Plus size={16} /> Add Day</button>
          </div>
          {days.map((day, dIdx) => (
            <div key={dIdx} className="card" style={{ marginBottom: '1rem', background: 'var(--bg)' }}>
              <div className="form-group">
                <label>Day Date</label>
                <input 
                  type="date" 
                  value={day.date} 
                  onChange={ev => {
                    const newDays = [...days];
                    newDays[dIdx].date = ev.target.value;
                    setDays(newDays);
                  }} 
                  required 
                />
              </div>
              {day.activities.map((activity) => (
                <div key={activity.id} style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <input style={{ width: '120px' }} type="time" value={activity.time} onChange={ev => {
                      const newDays = [...days];
                      const act = newDays[dIdx].activities.find(a => a.id === activity.id);
                      if (act) act.time = ev.target.value;
                      setDays(newDays);
                    }} />
                  <input value={activity.description} onChange={ev => {
                      const newDays = [...days];
                      const act = newDays[dIdx].activities.find(a => a.id === activity.id);
                      if (act) act.description = ev.target.value;
                      setDays(newDays);
                    }} placeholder="Activity description..." />
                  <button type="button" onClick={() => handleRemoveActivity(dIdx, activity.id)} style={{ color: '#ef4444' }}><Trash2 size={20} /></button>
                </div>
              ))}
              <button type="button" onClick={() => handleAddActivity(dIdx)} className="btn btn-outline" style={{ fontSize: '0.8rem' }}><Plus size={14} /> Add Activity</button>
            </div>
          ))}
        </div>

        <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
          {id ? 'Update Trip' : 'Save Trip'}
        </button>
      </form>
    </div>
  );
}
