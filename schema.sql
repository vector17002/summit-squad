-- Summit Squad - Full Database Schema

-- 1. Enable Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Create Tables
CREATE TABLE public.trips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  title text NOT NULL,
  destination text NOT NULL,
  start_date date,
  end_date date,
  description text,
  status text DEFAULT 'confirmed' CHECK (status IN ('planned', 'confirmed')),
  total_budget numeric DEFAULT 0,
  budget_per_person numeric DEFAULT 0,
  handling_accounts int DEFAULT 1,
  expenditure numeric DEFAULT 0,
  contributors jsonb DEFAULT '[]'::jsonb,
  money_handlers jsonb DEFAULT '[]'::jsonb,
  expenses jsonb DEFAULT '[]'::jsonb,
  days jsonb DEFAULT '[]'::jsonb,
  essentials jsonb DEFAULT '[]'::jsonb,
  media_links jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id uuid REFERENCES public.trips ON DELETE CASCADE NOT NULL,
  invited_email text NOT NULL,
  role text DEFAULT 'participant' CHECK (role IN ('admin', 'participant')),
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public.user_essentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  trip_id uuid REFERENCES public.trips ON DELETE CASCADE NOT NULL,
  essential_id text NOT NULL,
  is_completed boolean DEFAULT false,
  updated_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id, essential_id)
);

-- 3. Helper Functions for RLS
CREATE OR REPLACE FUNCTION public.is_invited(t_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.invitations
    WHERE invitations.trip_id = t_id
    AND invitations.invited_email = auth.jwt()->>'email'
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_trip_owner(t_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = t_id
    AND trips.user_id = auth.uid()
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin(t_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.trips
    WHERE trips.id = t_id
    AND trips.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.invitations
    WHERE invitations.trip_id = t_id
    AND invitations.invited_email = auth.jwt()->>'email'
    AND invitations.role = 'admin'
  );
END;
$$;

-- 4. Enable RLS & Policies
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_essentials ENABLE ROW LEVEL SECURITY;

-- Trips Policies
CREATE POLICY "Owners manage their trips" ON public.trips FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Invited users view trips" ON public.trips FOR SELECT USING (is_invited(id));
CREATE POLICY "Admins update trips" ON public.trips FOR UPDATE USING (is_admin(id)) WITH CHECK (is_admin(id));
CREATE POLICY "Anyone can view planned trips" ON public.trips FOR SELECT USING (status = 'planned');
CREATE POLICY "Admin manage all trips" ON public.trips FOR ALL USING (auth.jwt()->>'email' = 'anshk17002@gmail.com');

-- Invitations Policies
CREATE POLICY "Owners manage invitations" ON public.invitations FOR ALL USING (is_trip_owner(trip_id));
CREATE POLICY "Users can join trips" ON public.invitations FOR INSERT WITH CHECK (invited_email = auth.jwt()->>'email');
CREATE POLICY "Invited users view invitations" ON public.invitations FOR SELECT USING (invited_email = auth.jwt()->>'email');
CREATE POLICY "Users can leave trips" ON public.invitations FOR DELETE USING (invited_email = auth.jwt()->>'email');
CREATE POLICY "Admin manage all invitations" ON public.invitations FOR ALL USING (auth.jwt()->>'email' = 'anshk17002@gmail.com');

-- User Essentials Policies
CREATE POLICY "Users manage their own states" ON public.user_essentials FOR ALL USING (auth.uid() = user_id);

-- 5. Profiles Table (for listing users)
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  display_name text,
  avatar_url text,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS on Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Profiles are viewable by authenticated users" ON public.profiles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (new.id, new.email, split_part(new.email, '@', 1));
  RETURN new;
END;
$$;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
