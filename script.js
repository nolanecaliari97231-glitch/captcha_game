// --- DÉFINITION GLOBALE DU JEU ---
const NIVEAUX = [
    { theme: "Feu de signalisation", temps: 60, inversion: "none", correctImages: [1, 2, 3] },
    { theme: "Passage piéton", temps: 45, inversion: "none", correctImages: [1, 2, 3] },
    { theme: "Arbre", temps: 30, inversion: "x", correctImages: [1, 2, 3] },
    { theme: "Taxi", temps: 20, inversion: "y", correctImages: [1, 2, 3] },
    { theme: "Hydrant", temps: 15, inversion: "xy", correctImages: [1, 2, 3, 4] } 
];

let currentLevel = 0;
let timerInterval;
const customCursor = document.getElementById('custom-cursor');
const gameContainer = document.getElementById('game-container'); 
const popupOverlay = document.getElementById('popup-overlay');
const popupTitle = document.getElementById('popup-title');
const popupMessage = document.getElementById('popup-message');


// =================================================================================
// FONCTIONS UTILITAIRES
// =================================================================================

function cleanThemeName(theme) {
    return theme
        .toLowerCase()
        .replace(/é/g, 'e') 
        .replace(/ /g, '_'); 
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}


// =================================================================================
// BLOC 1 : MOTEUR ET ÉVÉNEMENTS
// =================================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Masque le curseur système
    document.body.style.cursor = 'none'; 
    
    // Initialise le curseur personnalisé
    customCursor.style.display = 'block';
    
    loadLevel(currentLevel);
    document.getElementById('verify-button').addEventListener('click', checkCaptcha);
    document.getElementById('popup-close-button').addEventListener('click', hidePopup);
    
    // Événement de mouvement de souris pour le curseur fictif
    document.addEventListener('mousemove', handleMouseInversion);
    const tiles = document.querySelectorAll('.tile');
    tiles.forEach(tile => tile.addEventListener('click', handleTileClick));
});


// MINUTEUR + LOGIQUE DE TREMBLEMENT
function startTimer(duration) {
    let timeLeft = duration;
    clearInterval(timerInterval);
    gameContainer.classList.remove('shake'); 

    timerInterval = setInterval(() => {
        
        // Active le tremblement subtil dans les 5 dernières secondes
        if (timeLeft <= 5 && timeLeft > 0) {
            gameContainer.classList.add('shake');
        } else {
            gameContainer.classList.remove('shake');
        }
        
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            gameContainer.classList.remove('shake'); 
            document.getElementById('time-value').textContent = `00:00`; 
            gameOver("temps");
            return;
        }

        const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
        const seconds = (timeLeft % 60).toString().padStart(2, '0');
        document.getElementById('time-value').textContent = `${minutes}:${seconds}`;

        timeLeft--; 
    }, 1000);
}

function loadLevel(levelIndex) {
    document.getElementById('theme-name').textContent = NIVEAUX[levelIndex].theme;
    
    document.querySelectorAll('.tile').forEach(tile => tile.classList.remove('selected'));
    
    prepareGridForLevel(levelIndex); 
    startTimer(NIVEAUX[levelIndex].temps);
}

function nextLevel() {
    gameContainer.classList.remove('shake'); 
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


// =================================================================================
// BLOC 2 : INVERSION DE LA SOURIS 
// =================================================================================

function handleMouseInversion(e) {
    
    if (popupOverlay.classList.contains('active')) {
        return; 
    }

    // Affiche le curseur s'il est caché
    if (customCursor.style.display === 'none') {
        customCursor.style.display = 'block';
    }

    const inversionType = NIVEAUX[currentLevel].inversion;
    let newX = e.clientX;
    let newY = e.clientY;
    
    if (inversionType.includes('x')) {
        newX = window.innerWidth - e.clientX; 
    }
    
    if (inversionType.includes('y')) {
        newY = window.innerHeight - e.clientY; 
    }

    // Positionne le curseur
    customCursor.style.left = newX + 'px';
    customCursor.style.top = newY + 'px';
}


// =================================================================================
// BLOC 3 : LOGIQUE DU CAPTCHA
// =================================================================================

function prepareGridForLevel(levelIndex) {
    const themeClean = cleanThemeName(NIVEAUX[levelIndex].theme);
    const tiles = document.querySelectorAll('.tile');
    
    const imageIndices = [1, 2, 3, 4, 5, 6, 7, 8, 9]; 
    shuffleArray(imageIndices); 

    const actualCorrectGridIndices = [];

    tiles.forEach((tile, i) => {
        const imageNum = imageIndices[i]; 
        const imageUrl = `./images/${themeClean}_${imageNum}.jpg`; 
        
        tile.style.backgroundImage = `url(${imageUrl})`; 
        tile.classList.remove('selected'); 
        
        if (NIVEAUX[levelIndex].correctImages.includes(imageNum)) {
            actualCorrectGridIndices.push(i);
        }
    });
    
    NIVEAUX[levelIndex].currentCorrectGridIndices = actualCorrectGridIndices;
}


function handleTileClick(event) {
    event.currentTarget.classList.toggle('selected');
}

function getUserSelectedTiles() {
    const selectedTiles = Array.from(document.querySelectorAll('.tile.selected'));
    return selectedTiles.map(tile => parseInt(tile.getAttribute('data-index'))).sort((a, b) => a - b);
}

function checkCaptcha() {
    const userSelections = getUserSelectedTiles();
    
    const correctTiles = NIVEAUX[currentLevel].currentCorrectGridIndices.sort((a, b) => a - b); 

    const isCorrect = userSelections.length === correctTiles.length &&
                      userSelections.every((tile, index) => tile === correctTiles[index]);

    if (isCorrect) {
        clearInterval(timerInterval);
        nextLevel();
    } else {
        gameOver("captcha");
    }
}


// =================================================================================
// BLOC 4 : GESTION DES POP-UPS
// =================================================================================

function gameOver(reason) {
    clearInterval(timerInterval);
    gameContainer.classList.remove('shake'); 
    const currentTheme = NIVEAUX[currentLevel].theme.toLowerCase();

    // Réinitialise les classes de style au cas où
    const popupContent = document.querySelector('#popup-content');
    popupContent.classList.remove('success-popup');
    popupTitle.classList.remove('success-title');
    popupMessage.classList.remove('success-message');

    if (reason === "temps") {
        showPopup(
            "⏱️ ÉCHEC : Il est lent ce lait !",
            "Le temps s'est écoulé ! Le système a pris votre lenteur pour de l'hésitation. Retour au niveau 1. Allez activo !"
        );
    } else if (reason === "captcha") {
        showPopup(
            "❌ ÉCHEC : Aie t'a pas la vision !",
            `Vous n'avez pas sélectionné toutes les cases contenant un **${currentTheme}** ! On dirait que vous avez besoin de lunettes... ou que vous êtes un bot. Niveau 1 !`
        );
    }
}

function winGame() {
    clearInterval(timerInterval);
    gameContainer.classList.remove('shake'); 
    
    // Utilise des classes spécifiques pour le style de succès
    const popupContent = document.querySelector('#popup-content');
    popupContent.classList.add('success-popup');
    
    showPopup(
        "🎉 SUCCÈS : HUMANITÉ CONFIRMÉE !",
        "FÉLICITATIONS ! Vous avez survécu à l'épreuve de l'inversion et de la pression temporelle. Le code final pour l'Escape Game est : <strong>U-HUMAIN-1337</strong> !"
    );
    
    // Ajoute les classes de style pour le succès après l'affichage
    setTimeout(() => {
        popupTitle.classList.add('success-title');
        popupMessage.classList.add('success-message');
    }, 10);
}

function showPopup(title, message) {
    popupTitle.innerHTML = title;
    popupMessage.innerHTML = message;
    
    popupOverlay.classList.add('active'); 
    
    // Masque le curseur fictif
    customCursor.style.display = 'none'; 
    // Restaure le curseur par défaut
    document.body.style.cursor = 'default'; 
}

/**
 * Cache la pop-up. Réinitialise le jeu UNIQUEMENT en cas d'échec.
 */
function hidePopup() {
    // Réinitialise les classes de style
    const popupContent = document.querySelector('#popup-content');
    popupContent.classList.remove('success-popup');
    popupTitle.classList.remove('success-title');
    popupMessage.classList.remove('success-message');
    
    popupOverlay.classList.remove('active');
    
    // Rétablit l'affichage du curseur fictif
    document.body.style.cursor = 'none'; 
    
    // Ne réinitialise PAS le jeu pour le succès
    if (!popupTitle.innerHTML.includes("SUCCÈS")) {
        resetGame(); 
    }
}