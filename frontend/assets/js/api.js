

// --- API RENDŐRSÉG (Szerver kommunikáció) ---
const API_URL = "http://localhost:3000/api";

const ApiService = {
    async login(username, password) {
        // Ide jön majd a bejelentkezés fetch kérése
    },
    async register(username, password) {
        // Ide jön majd a regisztráció fetch kérése
    },
    async saveScore(region, mode, score) {
        // Ide jön majd a pontszám mentése
    },
    async getLeaderboard(region, mode) {
        // Ide jön majd a ranglista lekérése
    }
};