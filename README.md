# SmashLive — Badminton Live Scoring Platform

A real-time badminton match scoring, tournament management, and athlete tracking platform built for players, organisers, and spectators.

**Live App:** https://smash-live.vercel.app  
**Backend API:** https://smashlive.onrender.com/api

---

## Features

### Matches
- Create individual (singles/doubles/mixed) matches with toss ceremony
- Schedule matches with date, time, and court
- Live scoring with badminton rules (21-point, deuce, best of 3/5)
- Optional 15-point short game mode
- Real-time score updates via Socket.IO
- Undo last point, end match early
- Creator-only access to score/start/delete a match
- Live broadcast view for spectators

### Tournaments
- Create knockout or round-robin tournaments
- Registration with QR code and shareable link
- Participant approval/rejection by creator
- Draw generation (shuffled bracket)
- Schedule individual bracket matches with date/time/court
- Record results match by match
- Bye/forfeit support
- Standings for round-robin format
- Creator-only management (draw, results, close registration, delete)

### Athletes
- OTP-based login via email (Brevo API)
- Player profiles with stats, match history, tournament history
- World rankings by points
- Follow/unfollow athletes
- Smash Rating with level progression
- Achievement badges (streak, tournament performer, finalist, elite)

### Notifications
- In-app bell notifications (persistent across page reloads)
- Match reminders: 30 min, 5 min before, and time-up alerts
- Tournament bracket advancement alerts
- Clickable notifications navigate to the relevant match/tournament

---

## Tech Stack

### Frontend
- React 18 + TypeScript + Vite
- Tailwind CSS + shadcn/ui + Radix UI
- Framer Motion (animations)
- React Router v6
- Socket.IO client (live score updates)
- Deployed on **Vercel**

### Backend
- Node.js + Express + TypeScript
- MongoDB Atlas + Mongoose
- JSON Web Tokens (JWT auth)
- Socket.IO (real-time events)
- Brevo HTTP API (email OTP delivery)
- Zod (request validation)
- Helmet + CORS
- Deployed on **Render**

---

## Project Structure

```
SmashLive/
├── frontend/                  # React app (Vercel)
│   ├── src/
│   │   ├── components/        # UI components
│   │   │   ├── broadcast/     # Scoreboard, commentary, stats
│   │   │   ├── dashboard/     # SmashRating, GlobalSearch
│   │   │   ├── layout/        # Navbar, BottomNav
│   │   │   ├── profile/       # ProfileHero, TournamentSection
│   │   │   └── tournament/    # BracketTree
│   │   ├── pages/             # All route pages
│   │   ├── services/          # api.ts, auth.service.ts
│   │   ├── hooks/             # use-socket, use-notifications
│   │   └── utils/             # toast, helpers
│   └── index.html
│
├── backend/                   # Express API (Render)
│   └── src/
│       ├── controllers/       # auth, match, tournament
│       ├── models/            # User, Match, Tournament, Participant, Otp
│       ├── routes/            # auth, match, tournament, user, player, search
│       ├── services/          # auth, match, tournament, ranking, reminder, email
│       ├── middlewares/       # auth, error, owner, validate
│       ├── sockets/           # match real-time events
│       └── validations/       # Zod schemas
│
└── .env                       # Root env vars
```

---

## Auth Flow

1. User enters email on the login page
2. Backend sends a 6-digit OTP via Brevo email API
3. User enters OTP → backend verifies it against hashed OTP in MongoDB
4. On success, backend returns a JWT + user profile
5. JWT stored in `localStorage` → used for all subsequent API calls

---

## Local Development

### Prerequisites
- Node.js 18+
- MongoDB Atlas account
- Brevo account (for email OTP)

### Setup

```bash
git clone <repo-url>
cd SmashLive

# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install
```

### Environment Variables

**`backend/.env`**
```env
PORT=5001
NODE_ENV=development
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/smashlive
JWT_SECRET=your_jwt_secret
JWT_EXPIRE=30d
FRONTEND_URL=http://localhost:5173
BREVO_API_KEY=your_brevo_api_key
EMAIL_FROM=your@email.com
```

**`frontend/.env`**
```env
VITE_API_URL=http://localhost:5001/api
```

### Run

```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

Frontend: **http://localhost:5173**  
Backend: **http://localhost:5001**

---

## API Endpoints

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/send-otp` | Send OTP to email |
| POST | `/api/auth/login` | Verify OTP, return JWT |
| POST | `/api/auth/register` | Register new athlete |
| GET | `/api/auth/profile` | Get current user (JWT) |
| PATCH | `/api/auth/profile` | Update profile (JWT) |

### Matches
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/matches` | List matches (filter by status) |
| POST | `/api/matches` | Create match |
| GET | `/api/matches/:id` | Get match by ID |
| POST | `/api/matches/:id/start` | Start match (creator only) |
| POST | `/api/matches/:id/score` | Score a point (creator only) |
| POST | `/api/matches/:id/undo` | Undo last point (creator only) |
| POST | `/api/matches/:id/end` | End match (creator only) |
| DELETE | `/api/matches/:id` | Delete match (creator only) |

### Tournaments
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/tournaments` | List tournaments |
| POST | `/api/tournaments` | Create tournament (auth) |
| GET | `/api/tournaments/:id` | Get tournament details |
| PATCH | `/api/tournaments/:id` | Update tournament (creator) |
| DELETE | `/api/tournaments/:id` | Delete tournament (creator) |
| POST | `/api/tournaments/:id/draw` | Generate bracket (creator) |
| POST | `/api/tournaments/:id/result` | Record bracket result (creator) |
| POST | `/api/tournaments/:id/close-registration` | Close registration (creator) |
| POST | `/api/tournaments/:id/bracket/:matchId/schedule` | Schedule bracket match (creator) |
| POST | `/api/tournaments/:id/bracket/:matchId/bye` | Give bye/forfeit (participant) |
| GET | `/api/tournaments/:id/participants` | List participants |
| POST | `/api/tournaments/:id/participants` | Register participant |

### Users
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | List all users |
| GET | `/api/users/:id` | Get user by ID |
| GET | `/api/users/:id/stats` | Full stats + match history |
| GET | `/api/users/rankings` | World/state/district rankings |
| POST | `/api/users/:id/follow` | Follow/unfollow user |

---

## Deployment

### Frontend → Vercel
Auto-deploys on push to `main`.

Required env vars in Vercel:
- `VITE_API_URL` → Render backend URL

### Backend → Render
- Build command: `npm run build`
- Start command: `npm start`
- Root directory: `backend`

Required env vars in Render:
- `PORT`, `NODE_ENV`, `MONGODB_URI`
- `JWT_SECRET`, `JWT_EXPIRE`
- `FRONTEND_URL`
- `BREVO_API_KEY`, `EMAIL_FROM`

---

## Changelog

### October 2026
- Creator-only access enforced for match start, score, undo, end, delete
- Creator-only access enforced for tournament manage, draw, results, delete
- `createdBy` field now correctly saved on match creation
- Tournament bracket match scheduling (date/time/court)
- Early start option for scheduled matches
- 15-point short game mode
- Dynamic page titles based on current route
- Persistent in-app notifications with navigation on click
- Fix: match reminder windows are now exclusive (no duplicate alerts)
- Fix: `total_sets` respected in scoring (1 set = first to win 1 game)
- Fix: scoreboard sets box uses safe validation to prevent corruption
- Player world rank displayed on profile page
- Clickable match/tournament cards in player profile
- Register button on tournament listing for non-creators
- Dynamic Smash Rating change based on last match result

### September 2026
- Real-time live scoring with Socket.IO
- Tournament bracket (knockout + round robin)
- Email OTP auth via Brevo API
- Player profiles with rankings, badges, stats
- Match archive and scorecard pages
- SmashID system for athlete identification
- Match reminders (30min, 5min alerts)
