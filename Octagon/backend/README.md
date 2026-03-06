# Octagon Oracle Backend API

Backend API server for the Octagon Oracle MMA analytics platform built with Node.js, Express, TypeScript, and MongoDB.

## Tech Stack

- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Security**: Helmet, CORS, Rate Limiting

## Project Structure

```
backend/
├── src/
│   ├── config/              # Configuration files
│   │   ├── index.ts         # App configuration
│   │   └── database.ts      # MongoDB connection
│   ├── controllers/         # Route handlers
│   │   ├── index.ts         # Controller exports
│   │   ├── authController.ts    # Authentication logic
│   │   ├── eventController.ts   # Event management
│   │   └── fighterController.ts # Fighter data operations
│   ├── middleware/          # Custom middleware
│   │   ├── index.ts         # Middleware exports
│   │   └── auth.ts          # JWT authentication
│   ├── models/              # Mongoose models
│   │   ├── index.ts         # Model exports
│   │   ├── User.ts          # User schema
│   │   ├── Event.ts         # UFC Event schema
│   │   ├── Fighter.ts       # Fighter schema
│   │   └── FightStats.ts    # Fight statistics schema
│   ├── routes/              # API routes
│   │   ├── index.ts         # Route aggregator
│   │   ├── auth.ts          # Auth routes
│   │   ├── events.ts        # Event routes
│   │   └── fighters.ts      # Fighter routes
│   ├── scripts/             # Utility scripts
│   │   └── importData.ts    # CSV data import script
│   └── server.ts            # App entry point
├── data/                    # CSV data files
│   ├── events.csv           # UFC events data
│   ├── fighters.csv         # Fighter profiles
│   └── fightstats.csv       # Fight statistics
├── .env.example             # Environment variables template
├── package.json
├── tsconfig.json
└── Dockerfile
```

## Getting Started

### Prerequisites

- Node.js 20 or higher
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   ```

4. Edit `.env` with your configuration:
   ```env
   PORT=5000
   NODE_ENV=development
   MONGODB_URI=mongodb://localhost:27017/octagon-oracle
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRES_IN=7d
   FRONTEND_URL=http://localhost:3001
   ```

### Running the Server

**Development mode** (with hot reload):
```bash
npm run dev
```

**Production build**:
```bash
npm run build
npm start
```

## API Endpoints

### Health Check
- `GET /api/health` - Check if API is running

### Authentication
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login user | No |
| GET | `/api/auth/me` | Get current user | Yes |
| PUT | `/api/auth/profile` | Update profile | Yes |
| PUT | `/api/auth/password` | Change password | Yes |

### Events
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/events` | Get all events (paginated) | No |
| GET | `/api/events/upcoming` | Get upcoming events | No |
| GET | `/api/events/recent` | Get recent completed events | No |
| GET | `/api/events/search` | Search events by name/location | No |
| GET | `/api/events/stats` | Get event statistics summary | No |
| GET | `/api/events/event/:eventId` | Get event by eventId (CSV ID) | No |
| GET | `/api/events/:id` | Get event by MongoDB ID | No |
| GET | `/api/events/:eventId/fights` | Get fights for an event | No |

### Fighters
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/api/fighters` | Get all fighters (paginated) | No |
| GET | `/api/fighters/search` | Search fighters by name | No |
| GET | `/api/fighters/compare` | Compare two fighters | No |
| GET | `/api/fighters/top` | Get top fighters by stat | No |
| GET | `/api/fighters/name/:name` | Get fighter by name | No |
| GET | `/api/fighters/:id` | Get fighter by ID | No |
| GET | `/api/fighters/:id/stats` | Get fighter's fight history | No |

### Request/Response Examples

#### Register User
```bash
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "fan"
}
```

Response:
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "fan",
      "joinDate": "November 2025"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Get Upcoming Events
```bash
GET /api/events/upcoming?limit=5
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "eventId": "1234",
      "name": "UFC 300",
      "date": "2025-04-13T00:00:00.000Z",
      "location": "Las Vegas, NV",
      "status": "upcoming"
    }
  ]
}
```

#### Search Fighters
```bash
GET /api/fighters/search?q=mcgregor
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "_id": "...",
      "name": "Conor McGregor",
      "nickname": "The Notorious",
      "weightClass": "Lightweight",
      "wins": 22,
      "losses": 6
    }
  ]
}
```

#### Compare Fighters
```bash
GET /api/fighters/compare?fighter1=<id>&fighter2=<id>
```

Response:
```json
{
  "success": true,
  "data": {
    "fighter1": { "name": "Fighter A", "wins": 20, "losses": 5 },
    "fighter2": { "name": "Fighter B", "wins": 18, "losses": 3 },
    "comparison": {
      "winRate": { "fighter1": 80, "fighter2": 85.7 },
      "finishRate": { "fighter1": 65, "fighter2": 70 }
    }
  }
}
```

#### Protected Routes
Include the JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Docker

Build and run with Docker:

```bash
# Build the image
docker build -t octagon-oracle-backend .

# Run the container
docker run -p 5000:5000 --env-file .env octagon-oracle-backend
```

Or use Docker Compose from the root directory:

```bash
docker-compose up -d
```

## Data Import

Import UFC data from CSV files into MongoDB:

```bash
# Run the import script
npm run import-data
```

This will import:
- **Events**: UFC event details (name, date, location)
- **Fighters**: Fighter profiles and records
- **Fight Stats**: Individual fight statistics

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 5000 |
| NODE_ENV | Environment | development |
| MONGODB_URI | MongoDB connection string | mongodb://localhost:27017/octagon-oracle |
| JWT_SECRET | Secret key for JWT | (required) |
| JWT_EXPIRES_IN | Token expiration | 7d |
| FRONTEND_URL | Frontend URL for CORS | http://localhost:3000 |

## Error Handling

All errors return a consistent JSON structure:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [] // Validation errors if applicable
}
```

## License

ISC
