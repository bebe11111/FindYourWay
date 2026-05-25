

// --- AUTHENTIKÁCIÓS MANAGER & UI VEZÉRLÉS ---
const AuthManager = {
    token: localStorage.getItem('geoToken') || null,
    username: localStorage.getItem('geoUsername') || null,
    currentTab: 'login', // 'login' vagy 'register'

    init() {
        // Ellenőrizzük, hogy be van-e lépve a játékos, és frissítjük a menüt
        this.updateAuthUI();
    },

    updateAuthUI() {
        const statusBar = document.getElementById('auth-status-bar');
        const greeting = document.getElementById('user-greeting');
        const navBtn = document.getElementById('auth-nav-btn');

        if (this.token && this.username) {
            // Ha be van jelentkezve
            greeting.innerText = `👤 Szia, ${this.username}!`;
            navBtn.innerText = "Kijelentkezés";
            // Kicseréljük az onclick eseményt kijelentkezésre
            navBtn.onclick = () => this.logout();
        } else {
            // Ha vendégként van itt
            greeting.innerText = "👤 Vendég";
            navBtn.innerText = "Bejelentkezés";
            navBtn.onclick = () => openAuthModal();
        }
    },

    logout() {
        localStorage.removeItem('geoToken');
        localStorage.removeItem('geoUsername');
        this.token = null;
        this.username = null;
        this.updateAuthUI();
        alert("Sikeresen kijelentkeztél!");
    }
};

// --- MODAL ABLAKOK NYITÁSA / ZÁRÁSA ---

// Bejelentkezés ablak megnyitása
function openAuthModal() {
    document.getElementById('auth-error-msg').style.display = 'none';
    document.getElementById('auth-form').reset();
    switchAuthTab('login'); // Mindig a login füllel nyíljon meg
    document.getElementById('auth-modal').style.display = 'flex';
}

// Bejelentkezés ablak bezárása
function closeAuthModal() {
    document.getElementById('auth-modal').style.display = 'none';
}

// Fül váltása (Bejelentkezés <-> Regisztráció)
function switchAuthTab(tab) {
    AuthManager.currentTab = tab;
    const loginTab = document.getElementById('tab-login');
    const registerTab = document.getElementById('tab-register');
    const confirmGroup = document.getElementById('confirm-password-group');
    const submitBtn = document.getElementById('auth-submit-btn');

    document.getElementById('auth-error-msg').style.display = 'none';

    if (tab === 'login') {
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
        confirmGroup.style.display = 'none';
        document.getElementById('auth-password-confirm').required = false;
        submitBtn.innerText = "BELÉPÉS";
    } else {
        registerTab.classList.add('active');
        loginTab.classList.remove('active');
        confirmGroup.style.display = 'flex';
        document.getElementById('auth-password-confirm').required = true;
        submitBtn.innerText = "REGISZTRÁCIÓ";
    }
}

// Ranglista ablak megnyitása
function openLeaderboardModal() {
    document.getElementById('leaderboard-modal').style.display = 'flex';
    if (typeof loadLeaderboardData === 'function') {
        loadLeaderboardData();
    }
}

// Ranglista ablak bezárása
function closeLeaderboardModal() {
    document.getElementById('leaderboard-modal').style.display = 'none';
}

// --- FORM ELKÜLDÉSE (AZ API SERVICE HASZNÁLATÁVAL) ---
async function handleAuthSubmit(event) {
    event.preventDefault(); // Megakadályozza az oldal újratöltését
    
    const username = document.getElementById('auth-username').value;
    const password = document.getElementById('auth-password').value;
    const confirmPassword = document.getElementById('auth-password-confirm').value;
    const errorMsg = document.getElementById('auth-error-msg');
    const submitBtn = document.getElementById('auth-submit-btn');

    // Regisztrációnál jelszó egyezés ellenőrzése
    if (AuthManager.currentTab === 'register' && password !== confirmPassword) {
        errorMsg.innerText = "A két jelszó nem egyezik meg!";
        errorMsg.style.display = 'block';
        errorMsg.style.color = "#e74c3c";
        return;
    }

    // --- UX: SZERVER ÉBREDEZIK TÖLTŐKÉPERNYŐ BEKAPCSOLÁSA ---
    submitBtn.disabled = true;
    errorMsg.innerText = "⏳ Kapcsolódás a szerverhez... (Ha a szerver aludt, ez eltarthat 30-50 másodpercig, kérjük várj!)";
    errorMsg.style.display = 'block';
    errorMsg.style.color = "#e67e22"; // Narancssárga figyelemfelhívás

    try {
        let response;
        
        // Eldöntjük, hogy a login vagy register metódust hívjuk meg az ApiService-ből
        if (AuthManager.currentTab === 'login') {
            response = await ApiService.login(username, password);
        } else {
            response = await ApiService.register(username, password);
        }
        
        const data = await response.json();
        
        if (response.ok) {
            // SIKER!
            errorMsg.innerText = "✅ Sikeres csatlakozás!";
            errorMsg.style.color = "#2ecc71"; // Zöld

            // Elmentjük a valódi adatokat
            localStorage.setItem('geoToken', data.token);
            localStorage.setItem('geoUsername', username);
            
            AuthManager.token = data.token;
            AuthManager.username = username;
            AuthManager.updateAuthUI();
            
            // Kis hatásszünet után bezárjuk a modalt
            setTimeout(() => {
                closeAuthModal();
                submitBtn.disabled = false;
            }, 800);

        } else {
            // A szerver hibát dobott vissza (pl. már létezik a felhasználó)
            errorMsg.innerText = `❌ Hiba: ${data.message || 'Sikertelen azonosítás'}`;
            errorMsg.style.color = "#e74c3c";
            submitBtn.disabled = false;
        }

    } catch (error) {
        // Hálózati összeomlás (ha teljesen áll a Render)
        console.error("Kapcsolódási hiba:", error);
        errorMsg.innerText = "❌ Nem sikerült elérni a szervert. Próbáld újra kicsit később.";
        errorMsg.style.color = "#e74c3c";
        submitBtn.disabled = false;
    }
}

// Jelszó láthatóságának váltása (Szem ikon)
function togglePassword(inputId, iconElement) {
    const passwordInput = document.getElementById(inputId);
    
    if (passwordInput.type === "password") {
        passwordInput.type = "text";
        iconElement.innerText = "visibility_off"; // Áthúzott szem ikonra vált
        iconElement.style.color = "var(--accent)"; // Aktív állapotban kéken világít
    } else {
        passwordInput.type = "password";
        iconElement.innerText = "visibility"; // Sima szem ikonra vált
        iconElement.style.color = "#888";
    }
}

// A fájl legvégére, hogy a térképtől függetlenül is azonnal működjön a gomb:
document.addEventListener("DOMContentLoaded", () => {
    AuthManager.init();
});

// --- AUTOMATIKUS KIJELENTKEZTETÉS INAKTIVITÁS MIATT ---
// --- AUTOMATIKUS KIJELENTKEZTETÉS (LAPBEZÁRÁST IS TÚLÉLŐ VERZIÓ) ---
const InactivityManager = {
    timer: null,
    // Teszteléshez írd át: 10 * 1000
    // Élesben: 4 * 60 * 60 * 1000
    TIMEOUT_LIMIT: 4*60*60*1000, 

    init() {
        if (!localStorage.getItem('geoToken')) return;

        console.log("🔒 Inaktivitás figyelő elindítva...");

        // 1. Azonnali ellenőrzés betöltéskor (Hátha lejárt az idő, amíg a lap be volt zárva)
        if (this.isTimeExpired()) {
            this.logoutUser("Biztonsági okokból kijelentkeztettünk, mert túl sokáig voltál távol.");
            return; 
        }

        // 2. Figyeljük a kattintásokat, gépelést, stb.
        const activityEvents = ['mousedown', 'keypress', 'scroll', 'touchstart'];
        activityEvents.forEach(event => {
            window.addEventListener(event, () => this.registerActivity(), { passive: true });
        });

        // 3. Figyeljük, ha a felhasználó visszavált a lapra egy másik fülről
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible' && this.isTimeExpired()) {
                this.logoutUser("Biztonsági okokból kijelentkeztettünk, mert a háttérben lejárt az időd.");
            }
        });

        // Elindítjuk az első mérést
        this.registerActivity();
    },

    isTimeExpired() {
        const lastActivity = localStorage.getItem('geoLastActivity');
        if (!lastActivity) return false;

        const now = Date.now();
        const diff = now - parseInt(lastActivity, 10);
        
        return diff > this.TIMEOUT_LIMIT;
    },

    registerActivity() {
        // 1. Elmentjük a jelenlegi milliszekundumot a localStorage-ba
        localStorage.setItem('geoLastActivity', Date.now().toString());
        
        // 2. Újraindítjuk a memóriában lévő visszaszámlálót is (ha nyitva hagyja a lapot)
        clearTimeout(this.timer);
        this.timer = setTimeout(() => {
            this.logoutUser("4 óra inaktivitás telt el. Automatikus kijelentkeztetés...");
        }, this.TIMEOUT_LIMIT);
    },

    logoutUser(message) {
        console.warn("⚠️", message);
        
        // Takarítás!
        localStorage.removeItem('geoToken');
        localStorage.removeItem('geoUser');
        localStorage.removeItem('geoLastActivity'); 
        
        alert(message);
        window.location.reload(); // Frissítés, ami visszadob a menübe
    }
};