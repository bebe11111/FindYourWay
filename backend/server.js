require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const scoreRoutes = require('./routes/scores');

const app = express();

// Middleware-ek
app.use(cors()); // Engedélyezi a cross-origin kéréseket (kliens -> szerver)
app.use(express.json()); // JSON adatok feldolgozása a request body-ban

// Útvonalak (Routes) felcsatolása
app.use('/api/auth', authRoutes);
app.use('/api/scores', scoreRoutes);

// Alap végpont a szerver állapotának ellenőrzéséhez
app.get('/', (req, res) => {
    res.json({ message: "Geoguessr Clone API fut!" });
});

// Szerver indítása
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Szerver elindítva a ${PORT}-es porton!`);
});