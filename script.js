// --- CONFIGURATION SERVEUR ---
const SERVER_API_URL = "./api.php"; 

const NIVEAUX = [
    { theme: "Feu de signalisation", temps: 35, inversion: "none", correctImages: [1, 2, 3] },
    { theme: "Passage piéton", temps: 30, inversion: "none", correctImages: [1, 2, 3] },
    { theme: "Arbre", temps: 25, inversion: "x", correctImages: [1, 2, 3] },
    { theme: "Taxi", temps: 20, inversion: "y", correctImages: [1, 2, 3] },
    { theme: "Bouches d'incendie", temps: 15, inversion: "xy", correctImages: [1, 2, 3, 4], imagePrefix: "hydrant" } 
];

// --- VARIABLES GLOBALES ---
let currentLevel = 0;
let timerInterval;
let customCursor = null;
let gameContainer = null;
let popupOverlay = null;
let popupTitle = null;
let popupMessage = null;

// =================================================================================
// INITIALISATION SÉCURISÉE
// =================================================================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. On récupère les éléments
    customCursor = document.getElementById('custom-cursor');
    gameContainer = document.getElementById('game-container'); 
    popupOverlay = document.getElementById('popup-overlay');
    popupTitle = document.getElementById('popup-title');
    popupMessage = document.getElementById('popup-message');

    // 2. Gestionnaire LOGIN
    const loginForm = document.getElementById('login-form');
    if(loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const userInput = document.getElementById('username');
            const passInput = document.getElementById('password');
            const userVal = userInput ? userInput.value.trim() : "";
            const passVal = passInput ? passInput.value.trim() : "";
            
            const ID_OFFICIEL = "Admin"; 
            const MDP_OFFICIEL = "1234";

            if (userVal === ID_OFFICIEL && passVal === MDP_OFFICIEL) {
                launchGame();
            } else {
                const loginSection = document.getElementById('login-section');
                if (loginSection) {
                    loginSection.classList.add('shake');
                    loginSection.style.borderColor = "var(--error)";
                    if(passInput) passInput.value = "";
                    setTimeout(() => {
                        loginSection.classList.remove('shake');
                        loginSection.style.borderColor = "rgba(9, 199, 223, 0.3)";
                    }, 500);
                }
            }
        });
    }

    // 3. Gestionnaires BOUTONS (Popup & Pardon)
    const pardonBtn = document.getElementById('pardon-button');
    if (pardonBtn) {
        pardonBtn.addEventListener('click', () => {
            hideInspectBlocker();
            if (isGameActive()) resetGame();
        });
    }
    const closePopupBtn = document.getElementById('popup-close-button');
    if(closePopupBtn) closePopupBtn.addEventListener('click', hidePopup);

    // 4. Protection et Souris
    initDevToolsProtection();
    document.addEventListener('mousemove', handleGlobalMouseMove, true);
    document.addEventListener('click', handleGlobalClick, true);
});

// --- UTILITAIRES ---
function cleanThemeName(theme) {
    return theme.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function isAdjacent(i, currentCorrects) {
    if (currentCorrects.length === 0) return false;
    for (const correctIndex of currentCorrects) {
        if (i === correctIndex - 3 || i === correctIndex + 3) return true;
        if (Math.abs(i - correctIndex) === 1 && Math.floor(i / 3) === Math.floor(correctIndex / 3)) return true;
    }
    return false;
}

// =================================================================================
// CALCULS
// =================================================================================
function getInvertedCoords(realX, realY) {
    if (!NIVEAUX[currentLevel]) return { x: realX, y: realY };
    const inversionType = NIVEAUX[currentLevel].inversion;
    let finalX = realX;
    let finalY = realY;

    if (inversionType.includes('x')) finalX = window.innerWidth - realX;
    if (inversionType.includes('y')) finalY = window.innerHeight - realY;

    finalX = Math.max(0, Math.min(window.innerWidth - 1, finalX));
    finalY = Math.max(0, Math.min(window.innerHeight - 1, finalY));

    return { x: finalX, y: finalY };
}

function getMirroredIndex(index, type) {
    let row = Math.floor(index / 3);
    let col = index % 3;
    if (type.includes('x')) col = 2 - col;
    if (type.includes('y')) row = 2 - row;
    return row * 3 + col;
}

function isGameActive() {
    return gameContainer && gameContainer.offsetParent !== null;
}

// =================================================================================
// GESTIONNAIRE DE SOURIS (DETECTION RECTANGLE)
// =================================================================================

function handleGlobalMouseMove(e) {
    if (!customCursor || !gameContainer) return;
    if (!isGameActive()) return; 
    if (popupOverlay && popupOverlay.classList.contains('active')) return;

    // 1. Calculs
    const coords = getInvertedCoords(e.clientX, e.clientY);
    
    // 2. Application position
    customCursor.style.left = coords.x + 'px';
    customCursor.style.top = coords.y + 'px';
    
    // 3. LOGIQUE RECTANGLE (Fixe le problème du bouton)
    const btn = document.getElementById('verify-button');
    if (btn) {
        const rect = btn.getBoundingClientRect();
        const isOverButton = (
            coords.x >= rect.left && 
            coords.x <= rect.right && 
            coords.y >= rect.top && 
            coords.y <= rect.bottom
        );

        if (isOverButton) {
            btn.classList.add('force-hover'); 
        } else {
            btn.classList.remove('force-hover'); 
        }
    }
}

function handleGlobalClick(e) {
    if (!isGameActive()) return;
    if (popupOverlay && popupOverlay.classList.contains('active')) return;
    if (e.target.closest('#popup-content') || e.target.closest('#inspect-blocker')) return;

    const coords = getInvertedCoords(e.clientX, e.clientY);
    
    // 1. VÉRIFICATION DU BOUTON (Prioritaire via Rectangle)
    const btn = document.getElementById('verify-button');
    if (btn) {
        const rect = btn.getBoundingClientRect();
        const isOverButton = (
            coords.x >= rect.left && 
            coords.x <= rect.right && 
            coords.y >= rect.top && 
            coords.y <= rect.bottom
        );

        if (isOverButton) {
            checkCaptcha(); 
            e.stopPropagation(); e.preventDefault();
            return;
        }
    }

    // 2. VÉRIFICATION DES TUILES
    customCursor.style.visibility = 'hidden'; 
    const targetElement = document.elementFromPoint(coords.x, coords.y);
    customCursor.style.visibility = 'visible';

    if (targetElement) {
        const tile = targetElement.closest('.tile');
        if (tile) {
            const visualIndex = parseInt(tile.getAttribute('data-index'));
            const inversionType = NIVEAUX[currentLevel].inversion;
            
            const targetIndex = getMirroredIndex(visualIndex, inversionType);
            const targetTile = document.querySelector(`.tile[data-index="${targetIndex}"]`);
            
            if (targetTile) targetTile.classList.toggle('selected');
            
            e.stopPropagation(); e.preventDefault();
            return;
        }
    }
    e.stopPropagation(); e.preventDefault();
}

// =================================================================================
// MOTEUR JEU
// =================================================================================

function launchGame() {
    const loginSection = document.getElementById('login-section');
    if (loginSection) loginSection.style.display = 'none';
    
    if (gameContainer) gameContainer.style.display = 'grid'; 
    
    document.body.classList.remove('login-mode');
    document.body.classList.add('game-mode');
    document.body.style.cursor = 'none';
    
    loadLevel(currentLevel);
}

function loadLevel(levelIndex) {
    const themeNameEl = document.getElementById('theme-name');
    if(themeNameEl) themeNameEl.textContent = NIVEAUX[levelIndex].theme;
    
    document.querySelectorAll('.tile').forEach(tile => tile.classList.remove('selected'));
    
    const feedbackBox = document.getElementById('server-message');
    if(feedbackBox) { feedbackBox.textContent = ""; feedbackBox.classList.remove('error-visible'); }
    
    prepareGridForLevel(levelIndex); 
    startTimer(NIVEAUX[levelIndex].temps);
}

function nextLevel() {
    if(gameContainer) gameContainer.classList.remove('shake'); 
    currentLevel++;
    if (currentLevel < NIVEAUX.length) loadLevel(currentLevel);
    else winGame(); 
}

function resetGame() {
    currentLevel = 0;
    loadLevel(currentLevel);
}

function prepareGridForLevel(levelIndex) {
    const themeClean = cleanThemeName(NIVEAUX[levelIndex].theme);
    const tiles = document.querySelectorAll('.tile');
    const correctImageCount = NIVEAUX[levelIndex].correctImages.length;
    let actualCorrectGridIndices = [];
    
    let attempts = 0;
    do {
        attempts++;
        actualCorrectGridIndices = [];
        let imageIndices = [1, 2, 3, 4, 5, 6, 7, 8, 9]; 
        shuffleArray(imageIndices); 
        let gridIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8];
        shuffleArray(gridIndices);
        let correctImageCounter = 0;
        for (const gridIndex of gridIndices) {
            if (correctImageCounter >= correctImageCount) break; 
            if (!isAdjacent(gridIndex, actualCorrectGridIndices)) {
                actualCorrectGridIndices.push(gridIndex);
                correctImageCounter++;
            }
        }
        if (attempts > 500) break; 
    } while (actualCorrectGridIndices.length < correctImageCount);
    
    const finalImageMapping = new Array(9);
    const shuffledCorrectImages = [...NIVEAUX[levelIndex].correctImages]; 
    shuffleArray(shuffledCorrectImages); 
    for (let k = 0; k < correctImageCount; k++) {
        if(k < actualCorrectGridIndices.length) {
            finalImageMapping[actualCorrectGridIndices[k]] = shuffledCorrectImages[k];
        }
    }
    const allPossibleImages = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const incorrectImages = allPossibleImages.filter(imgID => !NIVEAUX[levelIndex].correctImages.includes(imgID));
    shuffleArray(incorrectImages); 
    let incorrectImageIndex = 0;
    for (let i = 0; i < 9; i++) {
        if (finalImageMapping[i] === undefined) {
            finalImageMapping[i] = incorrectImages[incorrectImageIndex];
            incorrectImageIndex++;
        }
    }
    tiles.forEach((tile, i) => {
        const imageNum = finalImageMapping[i];
        const prefix = NIVEAUX[levelIndex].imagePrefix || themeClean;
        const imageUrl = `./images/${prefix}_${imageNum}.jpg`; 
        tile.style.backgroundImage = `url(${imageUrl})`; 
        tile.classList.remove('selected'); 
    });
    NIVEAUX[levelIndex].currentCorrectGridIndices = actualCorrectGridIndices;
}

function checkCaptcha() {
    const userSelections = getUserSelectedTiles();
    const correctTiles = NIVEAUX[currentLevel].currentCorrectGridIndices.sort((a, b) => a - b); 
    const isCorrect = userSelections.length === correctTiles.length && userSelections.every((tile, index) => tile === correctTiles[index]);
    
    if (isCorrect) {
        // --- 🔔 ALERTE 1 : Niveau Réussi ---
        alert("✅ Niveau validé avec succès !\n\nCliquez sur OK pour passer au niveau suivant.");
        
        clearInterval(timerInterval);
        nextLevel();
    } else {
        gameOver("captcha");
    }
}

function getUserSelectedTiles() {
    const selectedTiles = Array.from(document.querySelectorAll('.tile.selected'));
    return selectedTiles.map(tile => parseInt(tile.getAttribute('data-index'))).sort((a, b) => a - b);
}

function gameOver(reason) {
    clearInterval(timerInterval);
    if(gameContainer) gameContainer.classList.remove('shake'); 
    const popupContent = document.querySelector('#popup-content');
    if(popupContent) popupContent.classList.remove('success-popup');
    if(popupTitle) popupTitle.classList.remove('success-title');
    if(popupMessage) popupMessage.classList.remove('success-message');
    
    if (reason === "temps") showPopup("⏱️ ÉCHEC", "Il est lent ce lait ! Retour au début.");
    else if (reason === "captcha") showPopup("❌ ÉCHEC", "Mauvaise sélection. Êtes-vous un robot ?");
}

async function winGame() {
    clearInterval(timerInterval);
    if(gameContainer) gameContainer.classList.remove('shake'); 
    
    // --- 🔔 ALERTE 2 : Captcha fini / Envoi Serveur ---
    alert("🚀 Captcha terminé !\n\nJe vais maintenant interroger le serveur (api.php) pour vérifier l'intégrité de la session...");

    const feedbackBox = document.getElementById('server-message');
    const loadingOverlay = document.getElementById('loading-overlay');
    
    if(feedbackBox) {
        feedbackBox.textContent = "";
        feedbackBox.classList.remove('error-visible');
    }
    
    if(loadingOverlay) loadingOverlay.style.display = 'flex';

    const params = new URLSearchParams({ clickSequence: "reverse_ok", zone: "3", valid: "true" });

    try {
        // Attente simulée (tu peux réduire les 10000ms si c'est trop long pour la démo)
        await new Promise(resolve => setTimeout(resolve, 3000)); 
        
        const response = await fetch(`${SERVER_API_URL}?${params.toString()}`);
        const data = await response.json();

        // --- 🔔 ALERTE 3 : Réponse du Serveur ---
        alert("📩 Réponse du serveur reçue :\n\n" + JSON.stringify(data, null, 2) + "\n\nLe protocole va maintenant afficher l'écran de succès.");

        if(loadingOverlay) loadingOverlay.style.display = 'none';

        if (data.success) {
            const popupContent = document.querySelector('#popup-content');
            if(popupContent) popupContent.classList.add('success-popup');
            showPopup("🎉 ACCÈS AUTORISÉ", "HUMANITÉ CONFIRMÉE.<br>Le protocole de sécurité a validé votre accès.");
            if(popupTitle) popupTitle.classList.add('success-title');
            if(popupMessage) popupMessage.classList.add('success-message');
        } else {
            throw new Error(data.message || "Refus du serveur.");
        }
    } catch (error) {
        if(loadingOverlay) loadingOverlay.style.display = 'none';
        
        // Alerte en cas d'erreur aussi, c'est utile
        alert("❌ Erreur de communication serveur :\n" + error.message);

        if(feedbackBox) {
            feedbackBox.textContent = "❌ " + error.message;
            feedbackBox.style.color = "var(--error)";
            feedbackBox.classList.add('error-visible');
        }
    }
}

function showPopup(title, message) {
    if(popupTitle) popupTitle.innerHTML = title;
    if(popupMessage) popupMessage.innerHTML = message;
    if(popupOverlay) popupOverlay.classList.add('active'); 
    if(customCursor) customCursor.style.display = 'none'; 
    document.body.style.cursor = 'default'; 
}

function hidePopup() {
    const popupContent = document.querySelector('#popup-content');
    if(popupContent) popupContent.classList.remove('success-popup');
    if(popupTitle) popupTitle.classList.remove('success-title');
    if(popupMessage) popupMessage.classList.remove('success-message');
    if(popupOverlay) popupOverlay.classList.remove('active');
    
    if (isGameActive()) {
        document.body.style.cursor = 'none';
    }
    resetGame();
}

function startTimer(duration) {
    let timeLeft = duration;
    clearInterval(timerInterval);
    if(gameContainer) gameContainer.classList.remove('shake');
    updateTimerDisplay(timeLeft);

    timerInterval = setInterval(() => {
        timeLeft--;
        if (timeLeft <= 5 && timeLeft > 0 && gameContainer) gameContainer.classList.add('shake');
        else if(gameContainer) gameContainer.classList.remove('shake');

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            if(gameContainer) gameContainer.classList.remove('shake');
            updateTimerDisplay(0);
            gameOver("temps");
            return;
        }
        updateTimerDisplay(timeLeft);
    }, 1000);
}

function updateTimerDisplay(timeLeft) {
    const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
    const seconds = (timeLeft % 60).toString().padStart(2, '0');
    const timeVal = document.getElementById('time-value');
    if(timeVal) timeVal.textContent = `${minutes}:${seconds}`;

    const timerEl = document.getElementById('timer-display');
    if(timerEl) {
        timerEl.classList.remove('timer-yellow', 'timer-orange', 'timer-red', 'blink');
        if (timeLeft < 8) timerEl.classList.add('timer-red', 'blink');
        else if (timeLeft < 10) timerEl.classList.add('timer-red');
        else if (timeLeft < 20) timerEl.classList.add('timer-orange');
        else if (timeLeft < 30) timerEl.classList.add('timer-yellow');
    }
}

function initDevToolsProtection() {
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('keydown', e => {
        const k = e.key.toUpperCase();
        if (k === 'F12' || (e.ctrlKey && e.shiftKey && ['I','J','C'].includes(k)) || (e.ctrlKey && k === 'U') || (e.ctrlKey && k === 'S')) {
            e.preventDefault(); e.stopPropagation();
            showInspectBlocker("Commencez la partie d'abord — inspection désactivée.");
        }
    });

    let devtoolsOpen = false;
    setInterval(() => {
        const threshold = 160;
        const opened = (window.outerWidth - window.innerWidth) > threshold || (window.outerHeight - window.innerHeight) > threshold;
        if (opened && !devtoolsOpen) {
            devtoolsOpen = true;
            showInspectBlocker("Outils de développement détectés — jouez d'abord pour continuer.");
            if (typeof timerInterval !== 'undefined') clearInterval(timerInterval);
        } else if (!opened && devtoolsOpen) {
            devtoolsOpen = false;
            hideInspectBlocker();
        }
    }, 500);
}

function showInspectBlocker(msg) {
    const el = document.getElementById('inspect-blocker');
    if(el) {
        const p = el.querySelector('.ib-message p');
        if(p) p.textContent = msg;
        el.style.display = 'flex';
        document.body.style.pointerEvents = 'none';
        el.style.pointerEvents = 'auto';
    }
}

function hideInspectBlocker() {
    const el = document.getElementById('inspect-blocker');
    if (el) el.style.display = 'none';
    document.body.style.pointerEvents = 'auto';
}