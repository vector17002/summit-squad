import { supabase } from './lib/supabase';
import type { Trip } from './types';

export const getTrips = async (): Promise<Trip[]> => {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching trips:', error);
    return [];
  }
  return (data || []).map(trip => ({
    ...trip,
    startDate: trip.start_date,
    endDate: trip.end_date,
    totalBudget: trip.total_budget,
    budgetPerPerson: trip.budget_per_person,
    handlingAccounts: trip.handling_accounts,
    moneyHandlers: trip.money_handlers || [],
    expenses: trip.expenses || [],
    contributors: trip.contributors || [],
    essentials: trip.essentials || [],
    mediaLinks: trip.media_links || []
  }));
};

export const saveTrip = async (trip: Trip) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const existing = await getTripById(trip.id);

  const payload: any = {
    id: trip.id,
    title: trip.title,
    destination: trip.destination,
    start_date: trip.startDate,
    end_date: trip.endDate,
    description: trip.description,
    status: trip.status,
    total_budget: trip.totalBudget,
    budget_per_person: trip.budgetPerPerson,
    handling_accounts: trip.handlingAccounts,
    expenditure: trip.expenditure,
    contributors: trip.contributors,
    money_handlers: trip.moneyHandlers,
    expenses: trip.expenses,
    days: trip.days,
    essentials: trip.essentials,
    media_links: trip.mediaLinks,
    updated_at: new Date().toISOString(),
  };

  payload.user_id = existing ? existing.user_id : user.id;

  const { error } = await supabase
    .from('trips')
    .upsert(payload);

  if (error) throw error;
};

export const updateTripFinances = async (tripId: string, expenditure: number, contributors: any[], moneyHandlers: any[], expenses: any[]) => {
  const { error } = await supabase
    .from('trips')
    .update({
      expenditure,
      contributors,
      money_handlers: moneyHandlers,
      expenses: expenses,
      updated_at: new Date().toISOString()
    })
    .eq('id', tripId);

  if (error) throw error;
};

export const deleteTrip = async (id: string) => {
  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

export const getTripById = async (id: string): Promise<Trip | undefined> => {
  const { data, error } = await supabase
    .from('trips')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching trip:', error);
    return undefined;
  }
  return data ? {
    ...data,
    startDate: data.start_date,
    endDate: data.end_date,
    totalBudget: data.total_budget,
    budgetPerPerson: data.budget_per_person,
    handlingAccounts: data.handling_accounts,
    moneyHandlers: data.money_handlers || [],
    expenses: data.expenses || [],
    contributors: data.contributors || [],
    essentials: data.essentials || [],
    mediaLinks: data.media_links || []
  } : undefined;
};

export const inviteUser = async (tripId: string, email: string, role: string = 'participant') => {
  const { error } = await supabase
    .from('invitations')
    .insert({
      trip_id: tripId,
      invited_email: email,
      role
    });
  
  if (error) throw error;
};

export const getInvitations = async (tripId: string): Promise<any[]> => {
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('trip_id', tripId);

  if (error) {
    console.error('Error fetching invitations:', error);
    return [];
  }
  return data || [];
};

export const updateInvitationRole = async (invitationId: string, role: string) => {
  const { error } = await supabase
    .from('invitations')
    .update({ role })
    .eq('id', invitationId);

  if (error) throw error;
};

export const removeInvitation = async (invitationId: string) => {
  const { error } = await supabase
    .from('invitations')
    .delete()
    .eq('id', invitationId);

  if (error) throw error;
};

export const isUserInvited = async (tripId: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data, error } = await supabase
    .from('invitations')
    .select('id')
    .eq('trip_id', tripId)
    .eq('invited_email', user.email)
    .single();

  return !!data && !error;
};

export const checkIsAdmin = async (tripId: string): Promise<boolean> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const trip = await getTripById(tripId);
  if (!trip) return false;

  if (trip.user_id === user.id) return true;

  const { data, error } = await supabase
    .from('invitations')
    .select('role')
    .eq('trip_id', tripId)
    .eq('invited_email', user.email)
    .single();

  return !!data && !error && data.role === 'admin';
};

export const getUserEssentialStates = async (tripId: string): Promise<Record<string, boolean>> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return {};

  const { data, error } = await supabase
    .from('user_essentials')
    .select('essential_id, is_completed')
    .eq('trip_id', tripId)
    .eq('user_id', user.id);

  if (error) {
    console.error('Error fetching user essential states:', error);
    return {};
  }

  return (data || []).reduce((acc, curr) => {
    acc[curr.essential_id] = curr.is_completed;
    return acc;
  }, {} as Record<string, boolean>);
};

export const toggleUserEssential = async (tripId: string, essentialId: string, isCompleted: boolean) => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('user_essentials')
    .upsert({
      user_id: user.id,
      trip_id: tripId,
      essential_id: essentialId,
      is_completed: isCompleted,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,essential_id'
    });

  if (error) throw error;
};
