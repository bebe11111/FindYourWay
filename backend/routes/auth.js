const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const router = express.Router();

// Regisztráció végpont
router.post('/register', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: "Felhasználónév és jelszó megadása kötelező!" });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query('INSERT INTO users (username, password_hash) VALUES (?, ?)', [username, hashedPassword]);
        res.status(201).json({ message: "Sikeres regisztráció!" });
    } catch (err) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: "Ez a felhasználónév már foglalt!" });
        }
        res.status(500).json({ error: "Szerverhiba történt a regisztráció során." });
    }
});

// Bejelentkezés végpont
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const [rows] = await pool.query('SELECT * FROM users WHERE username = ?', [username]);
        
        if (rows.length === 0) {
            return res.status(401).json({ error: "Hibás felhasználónév vagy jelszó!" });
        }

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);

        if (!isMatch) {
            return res.status(401).json({ error: "Hibás felhasználónév vagy jelszó!" });
        }
        
        // Token generálása (1 napig érvényes)
        const token = jwt.sign(
            { id: user.id, username: user.username }, 
            process.env.JWT_SECRET, 
            { expiresIn: '1d' }
        );

        res.json({ token, username: user.username });
    } catch (err) {
        res.status(500).json({ error: "Szerverhiba történt a bejelentkezés során." });
    }
});

module.exports = router;