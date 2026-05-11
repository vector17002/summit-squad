export interface Activity {
  id: string;
  time: string;
  description: string;
}

export interface DayPlan {
  date: string;
  activities: Activity[];
}

export interface Essential {
  id: string;
  task: string;
  isCompleted: boolean;
}

export interface MediaLink {
  id: string;
  title: string;
  url: string;
}

export interface Contributor {
  id: string;
  name: string;
  amount: number;
}

export interface MoneyHandler {
  id: string;
  name: string;
  initialAmount: number;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  handlerId: string;
  date: string;
}

export type ParticipantRole = 'admin' | 'participant';

export interface Invitation {
  id: string;
  trip_id: string;
  invited_email: string;
  role: ParticipantRole;
  created_at: string;
}

export interface Profile {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
}

export interface Trip {
  id: string;
  user_id?: string;
  title: string;
  destination: string;
  startDate?: string;
  endDate?: string;
  description: string;
  coverImage?: string;
  status: 'planned' | 'confirmed';
  totalBudget?: number;
  budgetPerPerson?: number;
  handlingAccounts?: number;
  expenditure?: number;
  contributors: Contributor[];
  moneyHandlers: MoneyHandler[];
  expenses: Expense[];
  days: DayPlan[];
  essentials: Essential[];
  mediaLinks: MediaLink[];
}
