const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');

const router = express.Router();

// Middleware: Token ellenőrzése
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Format: "Bearer TOKEN"

    if (!token) return res.status(401).json({ error: "Nincs bejelentkezve!" });

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Érvénytelen vagy lejárt token!" });
        req.user = user;
        next();
    });
};

// Pontszám mentése (Csak bejelentkezve)
router.post('/', authenticateToken, async (req, res) => {
    const { region, mode, score } = req.body;

    if (!region || !mode || score === undefined) {
        return res.status(400).json({ error: "Hiányzó adatok!" });
    }

    try {
        await pool.query(
            'INSERT INTO scores (user_id, region, mode, score) VALUES (?, ?, ?, ?)', 
            [req.user.id, region, mode, score]
        );
        res.status(201).json({ message: "Pontszám sikeresen elmentve!" });
    } catch (err) {
        res.status(500).json({ error: "Hiba történt a pont mentésekor." });
    }
});

// Ranglista lekérése (Bárki számára elérhető)
router.get('/leaderboard/:region/:mode', async (req, res) => {
    const { region, mode } = req.params;

    try {
        const [rows] = await pool.query(`
            SELECT u.username, s.score, s.created_at 
            FROM scores s
            JOIN users u ON s.user_id = u.id
            WHERE s.region = ? AND s.mode = ?
            ORDER BY s.score DESC
            LIMIT 10
        `, [region, mode]);
        
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: "Hiba történt a ranglista betöltésekor." });
    }
});

module.exports = router;