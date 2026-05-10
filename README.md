# Trippaglu

Trippaglu is a modern, mobile-first trip planning application designed for adventurers and their friends.

## Features
- **Trip Management**: Organize trips into Ongoing, Upcoming, Completed, and Planned (Ideas).
- **Interactive Itinerary**: Plan your journey day by day with specific activities.
- **Shared Essentials**: User-specific to-do lists for trip preparation.
- **Media Links**: Keep all your Drive folders, photo albums, and video links in one place.
- **Collaboration**: Invite friends to view your trips via email.
- **Secure**: Powered by Supabase for authentication and database management.

## Tech Stack
- **Frontend**: React, TypeScript, Vite
- **Styling**: Vanilla CSS (Mobile-First)
- **Backend**: Supabase (Auth & PostgreSQL)
- **Icons**: Lucide React

## Setup
1. Clone the repository.
2. Install dependencies: `npm install`
3. Configure your `.env` file with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
4. Set up the database using the provided `schema.sql` in the Supabase SQL Editor.
5. Run the development server: `npm run dev`
