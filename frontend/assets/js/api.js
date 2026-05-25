

// --- API RENDŐRSÉG (Szerver kommunikáció) ---
const API_URL = "https://findyourway-84ta.onrender.com";

const ApiService = {
    // Segédfüggvény, ami automatikusan hozzárakja a Tokent a fejléchez, ha be vagyunk lépve
    getHeaders() {
        const token = localStorage.getItem('geoToken');
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
    },

    // 🔑 Bejelentkezés
    async login(username, password) {
        return await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
    },

    // 📝 Regisztráció
    async register(username, password) {
        return await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
    },

    // 🏆 Pontszám mentése az Aiven adatbázisba
    async saveScore(region, mode, score) {
        try {
            const response = await fetch(`${API_URL}/api/scores`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ region, mode, score })
            });
            return await response.json();
        } catch (error) {
            console.error("Hiba a pontszám mentésekor:", error);
        }
    },

    // 📊 Ranglista lekérése
    async getLeaderboard(region, mode) {
        try {
            const response = await fetch(`${API_URL}/api/scores?region=${region}&mode=${mode}`, {
                method: 'GET',
                headers: this.getHeaders()
            });
            return await response.json();
        } catch (error) {
            console.error("Hiba a ranglista lekérésekor:", error);
            return [];
        }
    }
};