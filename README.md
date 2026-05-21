# SCARCC - Creator Deal Pipeline

A full-stack web application for managing creator-to-brand deal pipelines. This system handles creator video uploads, AI-powered product extraction, deal management, and creator portals.

## Features

### Creator Upload Flow (`/`)
- Creators upload screen recordings of TikTok Shop analytics
- AI analyzes videos to extract product performance data
- Automatic deduplication of videos and products
- Creates creator accounts and portal URLs

### Creator Portal (`/portal/:creatorSlug`)
- Password-protected private portals
- Step-by-step onboarding flow:
  1. Account setup with authorization agreement
  2. Brand-by-brand information collection
  3. Portal access for deal management
- View and respond to active deals
- Track personal deals separately

### Admin Dashboard (`/admin`)
- Overview metrics with time range filtering
- Creator directory with stats
- Due-now task indicators
- Quick access to creator workspaces

### Admin Creator Workspace (`/admin/creator/:creatorSlug`)
- Full deal management per creator
- Product-level deal editing (autosave)
- Task management (due now / upcoming views)
- Delivery tracking for closed deals
- Workspace deletion with confirmation

### Late-Stage Kanban (`/admin/late-stage`)
- Negotiation and closed-won deals
- Deal cards with creator info and amounts

### Closed-Delivery Kanban (`/admin/closed-delivery`)
- Track delivery progress for closed deals
- Not Started / In Progress / Complete columns

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Storage**: Vercel Blob
- **AI**: Google Gemini (with mock fallback)
- **Styling**: Tailwind CSS
- **Auth**: bcrypt for password hashing

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL database
- Vercel Blob token (optional for dev)
- Gemini API key (optional, uses mock mode)

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your database URL and API keys

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Seed sample data (optional)
npm run db:seed

# Start development server
npm run dev
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob token | No (uses mock) |
| `AI_PROVIDER` | "gemini" or "mock" | No (defaults to mock) |
| `GEMINI_API_KEY` | Google Gemini API key | No (if using mock) |
| `NEXT_PUBLIC_APP_URL` | App URL for portal links | No |
| `COMMISSION_RATE` | Commission rate (e.g., 0.30) | No (defaults to 30%) |

## API Routes

### Upload
- `POST /api/upload` - Upload video for analysis

### Creators
- `GET /api/creators` - List all creators
- `GET /api/creators/:slug` - Get creator details
- `DELETE /api/creators/:slug` - Delete creator (requires confirmation)

### Opportunities
- `GET /api/opportunities` - List opportunities (filterable)
- `GET /api/opportunities/:id` - Get opportunity details
- `PATCH /api/opportunities/:id` - Update opportunity
- `DELETE /api/opportunities/:id` - Delete opportunity

### Tasks
- `GET /api/tasks` - List tasks (filterable)
- `POST /api/tasks` - Create manual task
- `PATCH /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

### Portal
- `GET /api/portal/:slug/auth` - Check auth status
- `POST /api/portal/:slug/auth` - Login or setup
- `GET /api/portal/:slug/onboarding` - Get onboarding status
- `POST /api/portal/:slug/onboarding` - Submit brand onboarding
- `PUT /api/portal/:slug/onboarding` - Complete onboarding
- `GET /api/portal/:slug/deals` - Get creator deals
- `PATCH /api/portal/:slug/deals` - Update deal (creator side)
- `GET /api/portal/:slug/self-tracked` - Get self-tracked deals
- `POST /api/portal/:slug/self-tracked` - Create self-tracked deal
- `PATCH /api/portal/:slug/self-tracked` - Update self-tracked deal

### Dashboard
- `GET /api/dashboard/stats` - Get dashboard statistics

### Config
- `GET /api/config` - Get app configuration

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import to Vercel
3. Add environment variables
4. Deploy

The app is designed for Vercel's serverless architecture:
- Direct-to-blob uploads for large videos
- Edge-compatible API routes
- PostgreSQL via Vercel Postgres or external

### Database Setup

Use any PostgreSQL provider:
- Vercel Postgres
- Neon
- Supabase
- PlanetScale (MySQL mode)
- Self-hosted

## Development

```bash
# Run development server
npm run dev

# Open Prisma Studio
npm run db:studio

# Create migration
npm run db:migrate

# Reset and reseed
npm run db:push && npm run db:seed
```

## Demo Credentials

After seeding, use these credentials:
- **Portal**: `/portal/sarah-johnson-sarahjcreates`
- **Password**: `demo123`

## License

Private - All rights reserved
