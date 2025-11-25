// --- DÉFINITION GLOBALE DU JEU ---
const NIVEAUX = [
    { theme: "Feu de signalisation", temps: 35, inversion: "none", correctImages: [1, 2, 3] },
    { theme: "Passage piéton", temps: 30, inversion: "none", correctImages: [1, 2, 3] },
    { theme: "Arbre", temps: 25, inversion: "x", correctImages: [1, 2, 3] },
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

/**
 * Vérifie si le nouvel index (i) est adjacent (horizontalement ou verticalement)
 * à l'un des indices déjà corrects (currentCorrects) sur une grille 3x3.
 */
function isAdjacent(i, currentCorrects) {
    if (currentCorrects.length === 0) return false;

    for (const correctIndex of currentCorrects) {
        // Voisinage Vertical (Haut/Bas : différence de 3)
        if (i === correctIndex - 3 || i === correctIndex + 3) {
            return true;
        }
        
        // Voisinage Horizontal (Gauche/Droite : différence de 1)
        // Vérifie aussi qu'ils sont sur la même ligne (pour éviter 2 adjacent à 3, ou 5 à 6)
        if (Math.abs(i - correctIndex) === 1 && Math.floor(i / 3) === Math.floor(correctIndex / 3)) {
            return true;
        }
    }
    
    return false;
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
    const correctImageCount = NIVEAUX[levelIndex].correctImages.length;
    
    let actualCorrectGridIndices = [];
    let imageIndices = [];
    let gridIndices = [];
    
    // --- NOUVELLE LOGIQUE POUR ÉVITER L'ADJACENCE (DO...WHILE) ---
    do {
        // 1. Réinitialiser
        actualCorrectGridIndices = [];
        
        // 2. Préparer les indices d'images (1 à 9) et les indices de grille (0 à 8)
        imageIndices = [1, 2, 3, 4, 5, 6, 7, 8, 9]; 
        shuffleArray(imageIndices); 
        
        gridIndices = [0, 1, 2, 3, 4, 5, 6, 7, 8];
        shuffleArray(gridIndices); // Mélange l'ordre d'affectation des indices de grille
        
        // 3. Essayer de placer les images correctes
        let correctImageCounter = 0;
        
        for (const gridIndex of gridIndices) {
            // Vérifie si on a déjà atteint le nombre d'images correctes
            if (correctImageCounter >= correctImageCount) break; 
            
            // Si la tuile N'EST PAS adjacente aux tuiles correctes déjà sélectionnées
            if (!isAdjacent(gridIndex, actualCorrectGridIndices)) {
                
                // Marque cet indice de grille comme correct
                actualCorrectGridIndices.push(gridIndex);
                correctImageCounter++;
            }
        }
    
    // Répéter si on n'a pas réussi à placer le nombre requis d'images correctes
    } while (actualCorrectGridIndices.length < correctImageCount);
    
    // 4. Une fois que les indices de grille CORRECTS sont choisis, on distribue les images
    
    const finalImageMapping = new Array(9);
    
    // a. Affecte les images correctes aux indices de grille choisis (randomly)
    // On doit faire une copie car .correctImages est un tableau de référence
    const shuffedCorrectImages = [...NIVEAUX[levelIndex].correctImages]; 
    shuffleArray(shuffedCorrectImages); 
    
    for (let k = 0; k < correctImageCount; k++) {
        const correctGridIndex = actualCorrectGridIndices[k];
        const correctImageID = shuffedCorrectImages[k];
        finalImageMapping[correctGridIndex] = correctImageID;
    }

    // b. Affecte les images restantes aux indices de grille restants
    const incorrectImages = imageIndices.filter(imgID => !NIVEAUX[levelIndex].correctImages.includes(imgID));
    let incorrectImageIndex = 0;
    
    for (let i = 0; i < 9; i++) {
        if (finalImageMapping[i] === undefined) {
            finalImageMapping[i] = incorrectImages[incorrectImageIndex];
            incorrectImageIndex++;
        }
    }
    
    // 5. Appliquer les images à la grille
    tiles.forEach((tile, i) => {
        const imageNum = finalImageMapping[i];
        const imageUrl = `./images/${themeClean}_${imageNum}.jpg`; 
        
        tile.style.backgroundImage = `url(${imageUrl})`; 
        tile.classList.remove('selected'); 
    });
    
    // 6. Sauvegarder les vrais indices corrects pour la vérification
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