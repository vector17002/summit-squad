# Summit Squad — Gemini Context

## Project Overview

**Summit Squad** is a mobile-first, collaborative trip planning web application. Users can create and manage trips, plan day-by-day itineraries, track shared budgets and expenses, manage packing/preparation essentials, and invite friends to collaborate on trips.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend Framework | React 19 + TypeScript |
| Build Tool | Vite 8 |
| Routing | React Router DOM v7 |
| Styling | Vanilla CSS (Mobile-First) |
| Backend / Auth | Supabase (PostgreSQL + Auth) |
| Icons | Lucide React |

## Project Structure

```
tripplanner/
├── src/
│   ├── App.tsx              # Root component with routing, auth guard, header nav
│   ├── main.tsx             # React entry point
│   ├── index.css            # Global design system (CSS variables, themes, utilities)
│   ├── types.ts             # Shared TypeScript interfaces
│   ├── storage.ts           # All Supabase CRUD operations (trips, invitations, essentials)
│   ├── contexts/
│   │   ├── AuthContext.tsx  # Supabase auth state (user, signOut)
│   │   └── ThemeContext.tsx # Light/dark theme toggle (persisted to localStorage)
│   ├── lib/
│   │   └── supabase.ts      # Supabase client initialisation (env vars)
│   └── pages/
│       ├── Login.tsx        # Supabase magic-link / email-password auth
│       ├── Dashboard.tsx    # Trip listing, filtered by status tabs
│       ├── TripForm.tsx     # Create / edit a trip (all fields, multi-step-like layout)
│       └── TripPreview.tsx  # Full read/edit view: itinerary, budget, essentials, media
├── schema.sql               # Full Supabase PostgreSQL schema + RLS policies
├── public/
├── index.html
├── vite.config.ts
├── tsconfig*.json
└── .env                     # VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY (never commit)
```

## Core Data Model (`src/types.ts`)

```typescript
Trip {
  id, user_id, title, destination,
  startDate?, endDate?, description,
  status: 'planned' | 'confirmed',
  totalBudget?, budgetPerPerson?, handlingAccounts?, expenditure?,
  contributors: Contributor[],   // who pitched in money
  moneyHandlers: MoneyHandler[], // who physically holds/spends money
  expenses: Expense[],           // individual spend events
  days: DayPlan[],               // itinerary (date → activities[])
  essentials: Essential[],       // shared packing/prep checklist
  mediaLinks: MediaLink[]        // links to photo albums, Drive folders, etc.
}
```

> All JSONB columns in Supabase (`contributors`, `money_handlers`, `expenses`, `days`, `essentials`, `media_links`) map to their camelCase TypeScript counterparts in `storage.ts`.

## Database (`schema.sql`)

Three tables with Row-Level Security (RLS):

| Table | Purpose |
|---|---|
| `public.trips` | Core trip data with all JSONB fields |
| `public.invitations` | Email-based collaboration invites per trip |
| `public.user_essentials` | Per-user completion state for shared essentials |

**RLS rule summary:**
- Trip owners have full CRUD via `auth.uid() = user_id`.
- Invited users (matched by email in `invitations`) can `SELECT` and `UPDATE` trips.
- `user_essentials` is per-user only — each collaborator tracks their own checklist state.
- An admin email (`anshk17002@gmail.com`) has a blanket `FOR ALL` policy on trips and invitations.

## Key Storage Functions (`src/storage.ts`)

| Function | Description |
|---|---|
| `getTrips()` | Fetch all trips for the current user, sorted by `created_at` desc |
| `getTripById(id)` | Fetch a single trip by UUID |
| `saveTrip(trip)` | Upsert a trip; preserves original `user_id` on update |
| `deleteTrip(id)` | Hard-delete a trip |
| `updateTripFinances(...)` | Partial update for budget/expenses fields only |
| `inviteUser(tripId, email)` | Insert an invitation record |
| `isUserInvited(tripId)` | Check whether current user is an invitee |
| `getUserEssentialStates(tripId)` | Fetch per-user essential completion map |
| `toggleUserEssential(...)` | Upsert a user's essential completion state |

## Routes

| Path | Component | Guard |
|---|---|---|
| `/login` | `Login` | Redirect to `/` if already authenticated |
| `/` | `Dashboard` | Auth required |
| `/new` | `TripForm` | Auth required |
| `/edit/:id` | `TripForm` | Auth required |
| `/trip/:id` | `TripPreview` | Auth required |

## Environment Variables

```env
VITE_SUPABASE_URL=<your-supabase-project-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

Both are accessed via `import.meta.env` (Vite convention). The `.env` file is gitignored — never commit it.

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server (hot reload)
npm run build        # Type-check + production build to dist/
npm run lint         # ESLint check
npm run preview      # Preview the production build locally
```

## Styling Conventions

- CSS custom properties (variables) are defined in `src/index.css` under `:root` and `[data-theme="dark"]`.
- Theme switching is done by setting `data-theme` on `document.documentElement`.
- Design is **mobile-first** — base styles target small screens, desktop styles are added via `min-width` media queries.
- No CSS framework is used (no Tailwind, no Bootstrap). All styles are hand-crafted in `index.css`.

## Common Gotchas

- **camelCase ↔ snake_case mapping**: The DB uses `snake_case` column names; TypeScript types use `camelCase`. All conversion happens in `storage.ts` — keep them in sync when adding new fields.
- **JSONB fields default to `[]`**: Ensure newly added array fields on `Trip` have defaults in the SQL schema and are mapped in `storage.ts`.
- **RLS must be updated for new tables**: Any new Supabase table requires explicit RLS policies or queries will silently return empty arrays.
- **Supabase client is a singleton**: Imported from `src/lib/supabase.ts`. Do not instantiate it elsewhere.
- **Auth state is global**: Consumed via `useAuth()` from `AuthContext`. Avoid calling `supabase.auth` directly in components.
