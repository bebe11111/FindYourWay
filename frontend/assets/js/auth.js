

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
    // Ha már össze lesz kötve a backenddel, itt automatikusan le is kérjük az adatokat:
    if (typeof loadLeaderboardData === 'function') {
        loadLeaderboardData();
    }
}

// Ranglista ablak bezárása
function closeLeaderboardModal() {
    document.getElementById('leaderboard-modal').style.display = 'none';
}

// --- FORM ELKÜLDÉSE (EGYELŐRE TESZT FUNKCIÓ) ---
function handleAuthSubmit(event) {
    event.preventDefault(); // Megakadályozza az oldal újratöltését
    
    const username = document.getElementById('auth-username').value;
    const password = document.getElementById('auth-password').value;
    const confirmPassword = document.getElementById('auth-password-confirm').value;
    const errorMsg = document.getElementById('auth-error-msg');

    if (AuthManager.currentTab === 'register' && password !== confirmPassword) {
        errorMsg.innerText = "A két jelszó nem egyezik meg!";
        errorMsg.style.display = 'block';
        return;
    }

    // Ideiglenes mock (szimulált) bejelentkezés, amíg a backend nem fut:
    alert(`Sikeres ${AuthManager.currentTab === 'login' ? 'bejelentkezés' : 'regisztráció'}! (Szerver nélkül, helyi teszt)`);
    
    // Elmentjük helyileg, hogy lássuk a UI változását
    localStorage.setItem('geoToken', 'kamu-teszt-token');
    localStorage.setItem('geoUsername', username);
    
    AuthManager.token = 'kamu-teszt-token';
    AuthManager.username = username;
    
    AuthManager.updateAuthUI();
    closeAuthModal();
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