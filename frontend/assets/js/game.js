

// --- JÁTÉK MOTOR ---
const REGIONS = {
    WORLD: { bounds: { minLat: -60, maxLat: 75, minLng: -180, maxLng: 180 }, difficultyScale: 2000, streakLimit: 1500 },
    HUNGARY: { bounds: { minLat: 45.7, maxLat: 48.6, minLng: 16.1, maxLng: 22.9 }, poly: [ {lat: 47.9, lng: 16.1}, {lat: 48.6, lng: 19.0}, {lat: 48.4, lng: 22.2}, {lat: 47.9, lng: 22.9}, {lat: 45.7, lng: 18.0}, {lat: 46.3, lng: 16.4} ], difficultyScale: 50, streakLimit: 80 },
    EUROPE: { bounds: { minLat: 36, maxLat: 71, minLng: -10, maxLng: 40 }, poly: [ {lat: 71, lng: -10}, {lat: 71, lng: 40}, {lat: 45, lng: 40}, {lat: 41.5, lng: 29}, {lat: 40, lng: 26}, {lat: 36, lng: 22}, {lat: 36, lng: -10} ], difficultyScale: 1000, streakLimit: 500 },
    AMERICA: { bounds: { minLat: -55, maxLat: 70, minLng: -130, maxLng: -35 }, difficultyScale: 1500, streakLimit: 1000 },
    ASIA: { bounds: { minLat: 1, maxLat: 70, minLng: 30, maxLng: 145 }, difficultyScale: 2000, streakLimit: 1000 },
    AFRICA: { bounds: { minLat: -34, maxLat: 35, minLng: -17, maxLng: 50 }, difficultyScale: 1500, streakLimit: 800 }
};

const MAP_STYLES = [{stylers:[{hue:'#00d2ff'},{invert_lightness:true},{saturation:-100},{lightness:33}]}];

let state = { currentRegion: null, score: 0, round: 1, maxRounds: 5, timeLeft: 60, timerInterval: null, targetLoc: null, guessMarker: null, actualMarker: null, line: null, activePolygon: null, isStreakMode: false, streak: 0, history: [] };
let map, panorama, svService, summaryMap, audioCtx;
let currentLang = localStorage.getItem('geoLang') || 'hu';

function setLang(lang) {
    currentLang = lang;
    localStorage.setItem('geoLang', lang);
    document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`btn-${lang}`).classList.add('active');

    const t = i18n[lang];
    document.getElementById('lbl-highscore').innerText = t.highScore;
    document.getElementById('lbl-pts').innerText = t.pts;
    document.getElementById('lbl-streak-mode').innerText = t.streakMode;
    document.getElementById('btn-hungary').innerText = t.btnHungary;
    document.getElementById('btn-world').innerText = t.btnWorld;
    document.getElementById('btn-europe').innerText = t.btnEurope;
    document.getElementById('btn-america').innerText = t.btnAmerica;
    document.getElementById('btn-asia').innerText = t.btnAsia;
    document.getElementById('btn-africa').innerText = t.btnAfrica;
    document.getElementById('lbl-loading').innerText = t.loading;
    document.getElementById('lbl-mode').innerText = t.mode;
    document.getElementById('lbl-score').innerText = t.score;
    document.getElementById('lbl-time').innerText = t.time;
    document.getElementById('lbl-round').innerText = t.round;
    document.getElementById('guess-btn').innerText = t.guessBtn;
    document.getElementById('next-btn').innerText = t.nextBtn;
    document.getElementById('lbl-gameover').innerText = t.gameOverTitle;
    document.getElementById('btn-back').innerText = t.backMenu;
    document.getElementById('lbl-compass').innerText = t.compassN;

    if(state.currentRegion) {
        document.getElementById('current-mode').innerText = t.modes[state.currentRegion] + (state.isStreakMode ? " (🔥)" : "");
    }
}

function initAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); if (audioCtx.state === 'suspended') audioCtx.resume(); }
function playTone(freq, type, duration, vol=0.1) { if(!audioCtx) return; const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain(); osc.type = type; osc.frequency.setValueAtTime(freq, audioCtx.currentTime); gain.gain.setValueAtTime(vol, audioCtx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration); osc.connect(gain); gain.connect(audioCtx.destination); osc.start(); osc.stop(audioCtx.currentTime + duration); }
function playTick() { playTone(800, 'sine', 0.1, 0.05); }
function playSuccess() { playTone(523.25, 'sine', 0.1, 0.1); setTimeout(()=>playTone(659.25, 'sine', 0.3, 0.1), 100); }
function playFail() { playTone(300, 'sawtooth', 0.3, 0.1); setTimeout(()=>playTone(250, 'sawtooth', 0.5, 0.1), 300); }

function initGameMap() {
    setLang(currentLang);
    AuthManager.init(); // Elindítjuk az Auth felületet is betöltéskor
    document.getElementById('highscore').innerText = localStorage.getItem('geoHighScore') || 0;
    map = new google.maps.Map(document.getElementById("map"), { center: { lat: 20, lng: 0 }, zoom: 1, disableDefaultUI: true, zoomControl: true, gestureHandling: 'greedy', styles: MAP_STYLES });
    panorama = new google.maps.StreetViewPanorama(document.getElementById("pano"), { disableDefaultUI: true, showRoadLabels: false, motionTracking: false, motionTrackingControl: false });
    svService = new google.maps.StreetViewService();
    panorama.addListener('pov_changed', () => { document.getElementById('compass-arrow').style.transform = `rotate(${-panorama.getPov().heading}deg)`; });
    
    map.addListener("click", (e) => {
        if(document.getElementById('map-container').classList.contains('fullscreen')) return; 
        if (state.guessMarker) state.guessMarker.setPosition(e.latLng);
        else state.guessMarker = new google.maps.Marker({position: e.latLng, map: map, animation: google.maps.Animation.DROP});
        document.getElementById("guess-btn").disabled = false;
    });
    document.getElementById("guess-btn").onclick = submitGuess;
    document.getElementById("next-btn").onclick = nextAction;
}

function findRandomLocation() {
    document.getElementById('loader').style.display = 'flex';
    const region = REGIONS[state.currentRegion];
    let lat, lng, isValidPoint = false, attempts = 0;
    while (!isValidPoint && attempts < 100) {
        lat = Math.random() * (region.bounds.maxLat - region.bounds.minLat) + region.bounds.minLat;
        lng = Math.random() * (region.bounds.maxLng - region.bounds.minLng) + region.bounds.minLng;
        if (state.activePolygon) { if (google.maps.geometry.poly.containsLocation(new google.maps.LatLng(lat, lng), state.activePolygon)) isValidPoint = true; } 
        else isValidPoint = true; 
        attempts++;
    }
    svService.getPanorama({ location: {lat, lng}, radius: (state.currentRegion === 'HUNGARY' ? 10000 : 150000), source: 'outdoor' }, (data, status) => {
        if (status === "OK") {
            state.targetLoc = data.location.latLng;
            panorama.setPano(data.location.pano); panorama.setPov({ heading: Math.random()*360, pitch: 0 });
            document.getElementById('loader').style.display = 'none';
            startTimer();
        } else findRandomLocation(); 
    });
}

function startNewGame(regionKey) {
    initAudio(); 
    state.currentRegion = regionKey; state.score = 0; state.round = 1; state.streak = 0; state.history = [];
    state.isStreakMode = document.getElementById('streak-toggle').checked;
    state.activePolygon = REGIONS[regionKey].poly ? new google.maps.Polygon({paths: REGIONS[regionKey].poly}) : null;
    document.getElementById('current-mode').innerText = i18n[currentLang].modes[regionKey] + (state.isStreakMode ? " (🔥)" : "");
    document.getElementById('menu-screen').style.display = 'none';
    document.getElementById('game-container').style.display = 'block';
    resetRound(); findRandomLocation();
}

function startTimer() {
    clearInterval(state.timerInterval); state.timeLeft = 60;
    state.timerInterval = setInterval(() => {
        state.timeLeft--;
        const m = Math.floor(state.timeLeft/60), s = state.timeLeft%60;
        document.getElementById('timer').innerText = `${m}:${s < 10 ? '0'+s : s}`;
        if(state.timeLeft <= 10 && state.timeLeft > 0) playTick(); 
        if(state.timeLeft <= 0) submitGuess();
    }, 1000);
}

function submitGuess() {
    clearInterval(state.timerInterval);
    document.getElementById('map-container').classList.add('fullscreen');
    document.getElementById('guess-btn').style.display = 'none';
    let dist = 20000; let guessPos = null;
    if(state.guessMarker) {
        guessPos = state.guessMarker.getPosition();
        dist = google.maps.geometry.spherical.computeDistanceBetween(guessPos, state.targetLoc) / 1000;
    }
    const roundScore = Math.round(5000 * Math.exp(-dist / REGIONS[state.currentRegion].difficultyScale));
    state.score += roundScore; state.history.push({ actual: state.targetLoc, guess: guessPos });
    state.actualMarker = new google.maps.Marker({ position: state.targetLoc, map: map, icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png' });
    if(state.guessMarker) {
        state.line = new google.maps.Polyline({ path: [guessPos, state.targetLoc], map: map, strokeColor: '#00d2ff', strokeWidth: 3 });
        const bounds = new google.maps.LatLngBounds(); bounds.extend(state.targetLoc); bounds.extend(guessPos);
        map.fitBounds(bounds, {padding: 100});
    }
    const t = i18n[currentLang];
    let titleText = t.roundEnd, btnText = t.nextBtn, streakLost = false;
    if (state.isStreakMode) {
        if (dist <= REGIONS[state.currentRegion].streakLimit) { state.streak++; titleText = `${t.streakAlive} (${state.streak})`; playSuccess(); }
        else { titleText = `${t.streakLost} (${t.max} ${state.streak})`; btnText = t.gameOverBtn; streakLost = true; playFail(); }
    } else { if (roundScore > 4000) playSuccess(); else if (roundScore < 1000) playFail(); if(state.round >= state.maxRounds) btnText = t.gameOverBtn; }
    document.getElementById('round-title').innerText = titleText;
    document.getElementById('dist-text').innerHTML = `${t.dist} <b>${dist.toFixed(1)} km</b>`;
    document.getElementById('score-text').innerText = `+${roundScore} ${t.pts}`;
    document.getElementById('current-score').innerText = state.score;
    document.getElementById('next-btn').innerText = btnText;
    if (streakLost) state.round = state.maxRounds; 
    document.getElementById('result-modal').style.display = 'flex';
}

function nextAction() {
    if(state.round >= state.maxRounds || (state.isStreakMode && document.getElementById('round-title').innerText.includes(i18n[currentLang].max))) endGame();
    else { state.round++; resetRound(); findRandomLocation(); }
}

function resetRound() {
    document.getElementById('map-container').classList.remove('fullscreen');
    document.getElementById('guess-btn').style.display = 'block';
    document.getElementById('result-modal').style.display = 'none';
    if(state.guessMarker) state.guessMarker.setMap(null); if(state.actualMarker) state.actualMarker.setMap(null); if(state.line) state.line.setMap(null);
    state.guessMarker = null; state.actualMarker = null; state.line = null;
    document.getElementById('guess-btn').disabled = true;
    const t = i18n[currentLang];
    document.getElementById('round-card').innerHTML = state.isStreakMode ? `<span>${t.streakLabel}</span> <span style="color:#ff9800">${state.streak}</span>` : `<span>${t.round}</span> <span>${state.round} / ${state.maxRounds}</span>`;
    map.setCenter({lat: 20, lng: 0}); map.setZoom(1);
}

function endGame() {
    document.getElementById('game-container').style.display = 'none';
    document.getElementById('result-modal').style.display = 'none';
    document.getElementById('summary-screen').style.display = 'flex';
    
    // Eredeti helyi (böngészős) mentés
    const high = parseInt(localStorage.getItem('geoHighScore') || 0);
    if(state.score > high && !state.isStreakMode) localStorage.setItem('geoHighScore', state.score);
    
    const t = i18n[currentLang];
    document.getElementById('final-stats').innerHTML = `${t.totalScore} <b>${state.score}</b>` + (state.isStreakMode ? `<br>${t.achievedStreak} <b>${state.streak}</b>` : "");
    
    // --- 🚀 ÚJ RÉSZ: ADATBÁZISBA MENTÉS ---
    // Csak akkor mentünk, ha van Token (be van lépve a játékos)

    if (localStorage.getItem('geoToken')) {

        const mode = state.isStreakMode ? 'STREAK' : 'NORMAL'; 
        const finalScore = state.isStreakMode ? state.streak : state.score;
        const region = typeof currentRegion !== 'undefined' ? currentRegion.toUpperCase() : 'WORLD';

        console.log("⏳ Pontszám elküldése az adatbázisba...");
        
        ApiService.saveScore(region, mode, finalScore)
            .then(() => console.log("✅ Pontszám sikeresen elmentve!"))
            .catch(err => console.error("❌ Hiba:", err));
    }


    // --- ÚJ RÉSZ VÉGE ---

    // Eredeti térkép kirajzoló kód folytatódik
    if(!summaryMap) summaryMap = new google.maps.Map(document.getElementById("summary-map"), { styles: MAP_STYLES, gestureHandling: 'greedy' });
    const bounds = new google.maps.LatLngBounds();
    state.history.forEach((r, i) => {
        new google.maps.Marker({ position: r.actual, map: summaryMap, icon: 'http://maps.google.com/mapfiles/ms/icons/green-dot.png' });
        bounds.extend(r.actual);
        if(r.guess) {
            new google.maps.Marker({ position: r.guess, map: summaryMap, icon: { path: google.maps.SymbolPath.CIRCLE, scale: 5, fillColor: '#00d2ff', fillOpacity: 1, strokeColor: '#fff' } });
            new google.maps.Polyline({ path: [r.guess, r.actual], map: summaryMap, strokeColor: '#00d2ff', strokeWidth: 1, strokeOpacity: 0.5 });
            bounds.extend(r.guess);
        }
    });
    setTimeout(() => { google.maps.event.trigger(summaryMap, 'resize'); summaryMap.fitBounds(bounds, {padding: 50}); }, 500); 
}

async function loadLeaderboardData() {
    // 1. Kiolvassuk a legördülő menük aktuálisan kiválasztott értékeit (pl. WORLD, NORMAL)
    const region = document.getElementById('filter-region').value;
    const mode = document.getElementById('filter-mode').value;
    const tbody = document.getElementById('leaderboard-body');

    if (!tbody) return;

    // 2. Töltési állapot mutatása a táblázatban
    tbody.innerHTML = `
        <tr>
            <td colspan="4" style="text-align:center;">⏳ Adatok lekérése a szerverről...</td>
        </tr>
    `;

    try {
        // 3. Lekérjük a szűrt adatokat az API-n keresztül
        const scores = await ApiService.getLeaderboard(region, mode);
        
        // Ha nincs adat vagy üres a válasz
        if (!scores || scores.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="4" style="text-align:center;">Még nincsenek pontszámok ebben a kategóriában. Légy te az első!</td>
                </tr>
            `;
            return;
        }

        // 4. HTML sorok felépítése a kapott adatokból
        let html = "";
        
        scores.forEach((entry, index) => {
            // Megpróbáljuk szépen leformázni a dátumot (magyar formátumra: ÉÉÉÉ. MM. DD.)
            // A 'created_at' helyett azt a mezőnevet használd, amit a backend SQL lekérdezése visszaad!
            const rawDate = entry.created_at || entry.date;
            const formattedDate = rawDate ? new Date(rawDate).toLocaleDateString('hu-HU') : '-';
            
            html += `
                <tr>
                    <td><b>#${index + 1}</b></td>
                    <td>${entry.username}</td>
                    <td><strong>${entry.score}</strong></td>
                    <td>${formattedDate}</td>
                </tr>
            `;
        });
        
        // 5. Befecskendezzük az elkészült sorokat a táblázatba
        tbody.innerHTML = html;

    } catch (error) {
        console.error("Ranglista betöltési hiba:", error);
        tbody.innerHTML = `
            <tr>
                <td colspan="4" style="text-align:center; color: #e74c3c;">❌ Nem sikerült elérni a szervert.</td>
            </tr>
        `;
    }
}