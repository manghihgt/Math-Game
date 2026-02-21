# Math Master Multiplayer Setup

This is a real-time multiplayer math quiz game.

## Prerequisites
- Node.js (v16+)
- MongoDB (Optional, for score persistence)

## How to Run

### 1. Start the Server
```bash
cd server
npm start
```
The server will run on `http://localhost:5000`.

### 2. Start the Client
```bash
cd client
npm run dev
```
The client will run on `http://localhost:5173`.

## Deployment
- **Render/Railway**: Connect your GitHub repo. Set root directory for client/server respectively.
- **Environment Variables**:
  - `PORT`: (Server) Port number.
  - `MONGODB_URI`: (Server) Connection string.
  - `VITE_API_URL`: (Client) URL of your deployed server.

## Features
- ✅ Room creation (Host only)
- ✅ Join room with alphanumeric code
- ✅ 10 Questions (Arithmetic, Geometry, Sequences)
- ✅ 30-second timer per question
- ✅ Points based on speed + correctness
- ✅ Anti-cheat (Locked answers)
- ✅ Winning Podium with confetti
