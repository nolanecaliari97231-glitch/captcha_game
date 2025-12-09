// --- CONFIGURATION ---
const SERVER_API_URL = "./api.php"; 

const NIVEAUX = [
    { theme: "Feu de signalisation", temps: 35, inversion: "none", correctImages: [1, 2, 3] },
    { theme: "Passage piéton", temps: 30, inversion: "none", correctImages: [1, 2, 3] },
    { theme: "Arbre", temps: 25, inversion: "x", correctImages: [1, 2, 3] },
    { theme: "Taxi", temps: 20, inversion: "y", correctImages: [1, 2, 3] },
    { theme: "Bouches d'incendie", temps: 15, inversion: "xy", correctImages: [1, 2, 3, 4], imagePrefix: "hydrant" } 
];

let currentLevel = 0;
let timerInterval;
const customCursor = document.getElementById('custom-cursor');
const gameContainer = document.getElementById('game-container'); 

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

function getInvertedCoords(realX, realY) {
    if (!NIVEAUX[currentLevel]) return { x: realX, y: realY };
    const inversionType = NIVEAUX[currentLevel].inversion;
    let finalX = realX, finalY = realY;

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

// --- INITIALISATION ---
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if(loginForm) {
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const user = document.getElementById('username').value.trim();
            const pass = document.getElementById('password').value.trim();
            
            // --- IDENTIFIANTS ---
            if (user === "Admin" && pass === "1234") {
                launchGame();
            } else {
                alert("Identifiant ou mot de passe incorrect.");
            }
        });
    }

    // Gestion souris globale
    document.addEventListener('mousemove', handleGlobalMouseMove, true);
    document.addEventListener('click', handleGlobalClick, true);
});

function isGameActive() {
    return gameContainer && gameContainer.offsetParent !== null;
}

// --- GESTION SOURIS (Inversion & Piège) ---
function handleGlobalMouseMove(e) {
    if (!isGameActive()) return;

    customCursor.style.display = 'block';
    const coords = getInvertedCoords(e.clientX, e.clientY);
    customCursor.style.left = coords.x + 'px';
    customCursor.style.top = coords.y + 'px';

    // Effet visuel sur le bouton si la VRAIE souris passe dessus
    const verifyBtn = document.getElementById('verify-button');
    if (verifyBtn) {
        customCursor.style.visibility = 'hidden'; 
        if (e.target.closest('#verify-button')) {
            verifyBtn.classList.add('force-hover');
        } else {
            verifyBtn.classList.remove('force-hover');
        }
        customCursor.style.visibility = 'visible';
    }
}

function handleGlobalClick(e) {
    if (!isGameActive()) return;

    // 1. Priorité au bouton avec la VRAIE souris (Piège)
    if (e.target.closest('#verify-button')) {
        checkCaptcha();
        return;
    }

    // 2. Gestion Tuiles avec le curseur ROSE (Miroir)
    const coords = getInvertedCoords(e.clientX, e.clientY);
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
    
    // Annule les clics dans le vide
    e.stopPropagation(); e.preventDefault();
}

// --- MOTEUR DE JEU ---
function launchGame() {
    document.getElementById('login-section').style.display = 'none';
    gameContainer.style.display = 'grid'; 
    document.body.classList.remove('login-mode');
    document.body.classList.add('game-mode');
    loadLevel(currentLevel);
}

function loadLevel(levelIndex) {
    document.getElementById('theme-name').textContent = NIVEAUX[levelIndex].theme;
    document.querySelectorAll('.tile').forEach(tile => tile.classList.remove('selected'));
    prepareGridForLevel(levelIndex); 
    startTimer(NIVEAUX[levelIndex].temps);
}

function nextLevel() {
    currentLevel++;
    if (currentLevel < NIVEAUX.length) {
        loadLevel(currentLevel);
    } else {
        winGame(); 
    }
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
    
    // Logique anti-adjacence
    do {
        actualCorrectGridIndices = [];
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
    } while (actualCorrectGridIndices.length < correctImageCount);
    
    const finalImageMapping = new Array(9);
    const shuffledCorrectImages = [...NIVEAUX[levelIndex].correctImages]; 
    shuffleArray(shuffledCorrectImages); 
    for (let k = 0; k < correctImageCount; k++) {
        finalImageMapping[actualCorrectGridIndices[k]] = shuffledCorrectImages[k];
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
    });
    NIVEAUX[levelIndex].currentCorrectGridIndices = actualCorrectGridIndices;
}

function checkCaptcha() {
    const userSelections = Array.from(document.querySelectorAll('.tile.selected')).map(t => parseInt(t.getAttribute('data-index'))).sort((a,b)=>a-b);
    const correctTiles = NIVEAUX[currentLevel].currentCorrectGridIndices.sort((a, b) => a - b); 
    const isCorrect = userSelections.length === correctTiles.length && userSelections.every((val, index) => val === correctTiles[index]);

    if (isCorrect) {
        clearInterval(timerInterval);
        // --- NOUVEAU : ALERTE DE SUCCÈS ENTRE LES NIVEAUX ---
        alert("✅ Niveau validé ! Passage au suivant...");
        nextLevel();
    } else {
        alert("❌ Mauvaise sélection ! Recommencez.");
        resetGame();
    }
}

// --- GESTION FIN (VERSION ALERTES SIMPLES) ---
async function winGame() {
    clearInterval(timerInterval);
    
    const params = new URLSearchParams({ clickSequence: "reverse_ok", zone: "3", valid: "true" });

    try {
        const response = await fetch(`${SERVER_API_URL}?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
            alert("SUCCÈS !\n" + data.message + "\n\nHumanité confirmée. Accès autorisé.");
            location.reload(); 
        } else {
            alert("ERREUR : " + data.message);
            resetGame();
        }
    } catch (error) {
        alert("Erreur de connexion au serveur.");
        console.error(error);
        resetGame();
    }
}

function startTimer(duration) {
    let timeLeft = duration;
    clearInterval(timerInterval);
    document.getElementById('time-value').textContent = `00:${timeLeft.toString().padStart(2, '0')}`;
    // Gestion couleur timer
    const timerEl = document.getElementById('timer-display');
    timerEl.classList.remove('timer-red', 'blink');

    timerInterval = setInterval(() => {
        timeLeft--;
        document.getElementById('time-value').textContent = `00:${timeLeft.toString().padStart(2, '0')}`;
        
        if (timeLeft < 10) {
            timerEl.classList.add('timer-red', 'blink');
        }

        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            alert("⏰ Temps écoulé ! Vous avez été trop lent.");
            resetGame();
        }
    }, 1000);
}