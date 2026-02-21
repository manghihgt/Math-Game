const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { generateQuestion } = require('./gameLogic');

dotenv.config();

const path = require('path');
const app = express();
app.use(cors());
app.use(express.json());

// Serve the standalone game file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'standalone_game.html'));
});

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// MongoDB Setup (Optional for local but implemented)
const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mathmaster';
mongoose.connect(mongoURI)
    .then(() => console.log('Connected to MongoDB'))
    .catch(err => console.error('MongoDB connection error:', err));

const ScoreSchema = new mongoose.Schema({
    username: String,
    score: Number,
    roomCode: String,
    date: { type: Date, default: Date.now }
});
const Score = mongoose.model('Score', ScoreSchema);

// Game State
const rooms = new Map();

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('create_room', ({ username }) => {
        const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
        const room = {
            code: roomCode,
            hostId: socket.id,
            players: [{ id: socket.id, username, score: 0 }],
            gameStarted: false,
            currentQuestion: 0,
            questions: [],
            answersReceived: 0,
            questionStartTime: null
        };
        rooms.set(roomCode, room);
        socket.join(roomCode);
        socket.emit('room_created', { roomCode, players: room.players });
        console.log(`\x1b[32m[ROOM CREATED]\x1b[0m ${roomCode} | Host: ${username}`);
    });

    socket.on('join_room', ({ roomCode, username }) => {
        const room = rooms.get(roomCode.toUpperCase());
        if (room) {
            if (room.gameStarted) {
                socket.emit('error', 'Game already started');
                return;
            }
            if (room.players.length >= 10) {
                socket.emit('error', 'Room is full (Max 10)');
                return;
            }
            room.players.push({ id: socket.id, username, score: 0 });
            socket.join(roomCode);
            io.to(roomCode).emit('player_joined', { players: room.players });
            socket.emit('joined_successfully', { roomCode, players: room.players });
            console.log(`\x1b[34m[PLAYER JOIN]\x1b[0m ${roomCode} | ${username}`);
        } else {
            socket.emit('error', 'Room not found');
        }
    });

    socket.on('start_game', ({ roomCode }) => {
        const room = rooms.get(roomCode);
        if (room && room.hostId === socket.id) {
            if (room.players.length < 2) {
                socket.emit('error', 'Minimum 2 players required');
                return;
            }
            room.gameStarted = true;
            room.questions = Array.from({ length: 10 }, () => generateQuestion());
            console.log(`\x1b[35m[GAME START]\x1b[0m Room: ${roomCode}`);
            sendQuestion(roomCode);
        }
    });

    const sendQuestion = (roomCode) => {
        const room = rooms.get(roomCode);
        if (!room) return;

        if (room.currentQuestion < 10) {
            const questionData = room.questions[room.currentQuestion];
            room.answersReceived = 0;
            room.questionStartTime = Date.now();

            io.to(roomCode).emit('next_question', {
                question: questionData.question,
                options: questionData.options,
                number: room.currentQuestion + 1,
                total: 10
            });
            console.log(`\x1b[33m[QUESTION]\x1b[0m Room ${roomCode} | Q${room.currentQuestion + 1}`);

            // Auto transition after 30s if not all answered
            room.timer = setTimeout(() => {
                showLeaderboard(roomCode);
            }, 30000);
        } else {
            endGame(roomCode);
        }
    };

    socket.on('submit_answer', ({ roomCode, answer }) => {
        const room = rooms.get(roomCode);
        if (!room || !room.questionStartTime) return;

        const player = room.players.find(p => p.id === socket.id);
        if (player && !player.answered) {
            const questionData = room.questions[room.currentQuestion];
            const isCorrect = answer === questionData.answer;
            player.answered = true;

            if (isCorrect) {
                player.score += 1; // Simplified: +1 point per correct answer
                const timeTaken = (Date.now() - room.questionStartTime) / 1000;
                console.log(`\x1b[32m[CORRECT]\x1b[0m ${player.username} | Total: ${player.score}`);

                // Track fastest answer in room metadata
                if (!room.fastestAnswer || timeTaken < room.fastestAnswer.time) {
                    room.fastestAnswer = { username: player.username, time: timeTaken };
                }
            } else {
                console.log(`\x1b[31m[WRONG]\x1b[0m ${player.username}`);
            }

            room.answersReceived++;
            io.to(roomCode).emit('answer_update', { received: room.answersReceived, total: room.players.length });

            if (room.answersReceived === room.players.length) {
                clearTimeout(room.timer);
                showLeaderboard(roomCode);
            }
        }
    });

    const showLeaderboard = (roomCode) => {
        const room = rooms.get(roomCode);
        if (!room) return;

        // Reset answered state for next question
        room.players.forEach(p => p.answered = false);

        const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
        io.to(roomCode).emit('leaderboard', {
            players: sortedPlayers,
            fastest: room.fastestAnswer
        });

        room.fastestAnswer = null;
        room.currentQuestion++;

        // Wait 5 seconds before next question
        setTimeout(() => {
            sendQuestion(roomCode);
        }, 5000);
    };

    const endGame = async (roomCode) => {
        const room = rooms.get(roomCode);
        if (!room) return;

        const sortedPlayers = [...room.players].sort((a, b) => b.score - a.score);
        io.to(roomCode).emit('game_over', { winner: sortedPlayers[0], players: sortedPlayers });

        // Save scores to DB
        try {
            const scorePromises = room.players.map(p =>
                new Score({ username: p.username, score: p.score, roomCode }).save()
            );
            await Promise.all(scorePromises);
        } catch (err) {
            console.error('Failed to save scores:', err);
        }

        rooms.delete(roomCode);
    };

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        // Handle cleanup if needed
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    let networkIp = 'localhost';

    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                networkIp = net.address;
            }
        }
    }

    console.log(`\n\x1b[36m========================================\x1b[0m`);
    console.log(`\x1b[1m  MATH MASTER SERVER IS LIVE!\x1b[0m`);
    console.log(`\x1b[36m========================================\x1b[0m`);
    console.log(`\x1b[32m[LOCAL]\x1b[0m   http://localhost:${PORT}`);
    console.log(`\x1b[32m[NETWORK]\x1b[0m http://${networkIp}:${PORT} (Tell friends to join this!)`);
    console.log(`\x1b[36m========================================\x1b[0m\n`);
});
