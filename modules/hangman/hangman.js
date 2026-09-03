let allLessons = [];
let database = [];
let currentWordObj = null;
let guessedLetters = new Set();
let wrongAttempts = 0;
let maxAttempts = 10; // Dynamické podle levelu
let visualType = "Level1"; 
let isHintVisible = false;

const isGitHub = window.location.hostname.includes("github.io");
const BASE_URL = isGitHub ? "/DeutschStudio" : "";

const DE_ALPHABET = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'Ä', 'Ö', 'Ü', 'ß'];

function getGenderColor(article) {
    if (!article) return '#1e40af';
    const art = article.toLowerCase().trim();
    if (art === 'der') return 'var(--der)';
    if (art === 'die') return 'var(--die)';
    if (art === 'das') return 'var(--das)';
    return '#1e40af';
}

export async function initHangman() {
    try {
        let res = await fetch(`${BASE_URL}/data/lekce.json`);
        if (!res.ok) res = await fetch(`../../data/lekce.json`);
        if (!res.ok) throw new Error("Nelze načíst data/lekce.json");

        allLessons = await res.json();
        populateBooks();
    } catch (err) {
        console.error("Chyba při načítání lekcí:", err);
    }
}

function populateBooks() {
    const bookSelect = document.getElementById("bookSelect");
    if (!bookSelect) return;

    const books = [...new Set(allLessons.map(l => l.ucebnice))];
    bookSelect.innerHTML = "";

    books.forEach(b => {
        const opt = document.createElement("option");
        opt.value = b;
        opt.textContent = b;
        bookSelect.appendChild(opt);
    });

    updateLessonSelect();
}

window.onBookChange = function() {
    updateLessonSelect();
};

function updateLessonSelect() {
    const bookSelect = document.getElementById("bookSelect");
    const lessonSelect = document.getElementById("lessonSelect");
    if (!bookSelect || !lessonSelect) return;

    const selectedBook = bookSelect.value;
    const filtered = allLessons.filter(l => l.ucebnice === selectedBook);

    lessonSelect.innerHTML = "";
    filtered.forEach(l => {
        const opt = document.createElement("option");
        opt.value = l.folder;
        opt.textContent = `${l.id} – ${l.title}`;
        lessonSelect.appendChild(opt);
    });

    loadSelectedLessonData();
}

window.onLessonChange = function() {
    loadSelectedLessonData();
};

async function loadSelectedLessonData() {
    const lessonSelect = document.getElementById("lessonSelect");
    const bookSelect = document.getElementById("bookSelect");
    if (!lessonSelect || !bookSelect) return;

    const ucebnice = bookSelect.value;
    const folder = lessonSelect.value;
    if (!folder) return;

    const pathsToTry = [
        `${BASE_URL}/data/slovicka/${ucebnice}/${folder}/data.json`,
        `../../data/slovicka/${ucebnice}/${folder}/data.json`,
        `data/slovicka/${ucebnice}/${folder}/data.json`
    ];

    let data = null;
    for (let path of pathsToTry) {
        try {
            let res = await fetch(path);
            if (res.ok) {
                data = await res.json();
                break;
            }
        } catch (e) {}
    }

    if (!data || !data.words) {
        database = [];
    } else {
        database = data.words.map(item => ({
            word: item.de || "",
            article: item.artikel || "",
            translation: item.cz || ""
        })).filter(item => item.word.length > 0);
    }

    initGame();
}

window.changeVisual = function() {
    visualType = document.getElementById("visualSelect").value;
    if (visualType === "Level0") maxAttempts = 10;
    else if (visualType === "Level1") maxAttempts = 12;
    else if (visualType === "Level2") maxAttempts = 7;
    
    initGame();
};

window.toggleHint = function() {
    isHintVisible = !isHintVisible;
    const hintElem = document.getElementById("translationHint");
    const eyeIcon = document.getElementById("eyeIcon");

    if (isHintVisible) {
        hintElem.classList.remove("hidden");
        eyeIcon.className = "fas fa-eye";

        // Trest za použití nápovědy: odečtení 3 pokusů (přičtení 3 chyb)
        wrongAttempts += 3;
        
        // Zamezení tomu, aby wrongAttempts přeteklo maxAttempts (ošetření konce hry)
        if (wrongAttempts > maxAttempts) {
            wrongAttempts = maxAttempts;
        }

        updateVisualDisplay();
        
        // Pokud tímto postihem hráč vyčerpal všechny pokusy, rovnou končí prohrou
        if (wrongAttempts >= maxAttempts) {
            checkLoseCondition();
        }
    } else {
        hintElem.classList.add("hidden");
        eyeIcon.className = "fas fa-eye-slash";
    }
};

window.initGame = function() {
    if (database.length === 0) {
        document.getElementById("translationHint").innerText = "V této lekci nejsou žádná slovíčka.";
        document.getElementById("lettersContainer").innerHTML = "";
        return;
    }

    currentWordObj = database[Math.floor(Math.random() * database.length)];
    guessedLetters.clear();
    wrongAttempts = 0;
    isHintVisible = false;

    if (visualType === "Level1") maxAttempts = 10;
    else if (visualType === "Level2") maxAttempts = 12;
    else if (visualType === "Level3") maxAttempts = 7;

    document.getElementById("statusMessage").innerText = "";
    document.getElementById("nextBtn").style.display = "none";
    document.getElementById("eyeIcon").className = "fas fa-eye-slash";

    const hintElem = document.getElementById("translationHint");
    hintElem.innerText = currentWordObj.translation;
    hintElem.classList.add("hidden");

    const articleBox = document.getElementById("articleBox");
    if (currentWordObj.article) {
        articleBox.style.display = "block";
        articleBox.innerText = currentWordObj.article;
        articleBox.style.color = getGenderColor(currentWordObj.article);
    } else {
        articleBox.style.display = "none";
    }

    renderWordMask();
    updateVisualDisplay();
    renderKeyboard();
};

function renderWordMask() {
    const container = document.getElementById("lettersContainer");
    container.innerHTML = "";

    const cleanWord = currentWordObj.word.toUpperCase();
    for (let char of cleanWord) {
        const slot = document.createElement("span");
        
        if (char === ' ') {
            slot.className = "word-space"; // Zde bude jen prázdná mezera bez podtržení
        } else {
            slot.className = "letter-slot";
            if (guessedLetters.has(char) || !/[A-ZÄÖÜß]/.test(char)) {
                slot.innerText = char;
            } else {
                slot.innerText = "_";
            }
        }
        container.appendChild(slot);
    }
}

function updateVisualDisplay() {
    const box = document.getElementById("visualBox");
    
    if (visualType === "Level0") {
        let heartsHtml = "";
        const livesLeft = maxAttempts - wrongAttempts;
        for (let i = 0; i < maxAttempts; i++) {
            if (i < livesLeft) {
                heartsHtml += '<i class="fas fa-heart" style="color: #dc2626; font-size: 2.2rem; filter: drop-shadow(0 4px 6px rgba(0,0,0,0.1));"></i>';
            } else {
                heartsHtml += '<i class="fas fa-heart-crack" style="color: #cbd5e1; font-size: 2.2rem;"></i>';
            }
        }
        box.innerHTML = `<div style="display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; align-items: center; max-width: 500px;">${heartsHtml}</div>`;
    } 
    else if (visualType === "Level1") {
        // Level 1: Celkem 12 chyb (stavíme od nuly: podlaha, tyče, provaz, panáček)
        const stepsLevel2 = [
            /* 0 chyb: čisté plátno */
            '',
            /* 1: podlaha */
            '<line x1="20" y1="170" x2="140" y2="170" />',
            /* 2: svislý trám */
            '<line x1="20" y1="170" x2="140" y2="170" /><line x1="50" y1="170" x2="50" y2="20" />',
            /* 3: horní vodorovný trám */
            '<line x1="20" y1="170" x2="140" y2="170" /><line x1="50" y1="170" x2="50" y2="20" /><line x1="50" y1="20" x2="110" y2="20" />',
            /* 4: podpěra / vzpěra */
            '<line x1="20" y1="170" x2="140" y2="170" /><line x1="50" y1="170" x2="50" y2="20" /><line x1="50" y1="20" x2="110" y2="20" /><line x1="50" y1="50" x2="80" y2="20" />',
            /* 5: provaz */
            '<line x1="20" y1="170" x2="140" y2="170" /><line x1="50" y1="170" x2="50" y2="20" /><line x1="50" y1="20" x2="110" y2="20" /><line x1="50" y1="50" x2="80" y2="20" /><line x1="110" y1="20" x2="110" y2="50" />',
            /* 6: hlava */
            '<line x1="20" y1="170" x2="140" y2="170" /><line x1="50" y1="170" x2="50" y2="20" /><line x1="50" y1="20" x2="110" y2="20" /><line x1="50" y1="50" x2="80" y2="20" /><line x1="110" y1="20" x2="110" y2="50" /><circle cx="110" cy="70" r="20" />',
            /* 7: tělo */
            '<line x1="20" y1="170" x2="140" y2="170" /><line x1="50" y1="170" x2="50" y2="20" /><line x1="50" y1="20" x2="110" y2="20" /><line x1="50" y1="50" x2="80" y2="20" /><line x1="110" y1="20" x2="110" y2="50" /><circle cx="110" cy="70" r="20" /><line x1="110" y1="90" x2="110" y2="130" />',
            /* 8: levá ruka */
            '<line x1="20" y1="170" x2="140" y2="170" /><line x1="50" y1="170" x2="50" y2="20" /><line x1="50" y1="20" x2="110" y2="20" /><line x1="50" y1="50" x2="80" y2="20" /><line x1="110" y1="20" x2="110" y2="50" /><circle cx="110" cy="70" r="20" /><line x1="110" y1="90" x2="110" y2="130" /><line x1="110" y1="105" x2="85" y2="120" />',
            /* 9: pravá ruka */
            '<line x1="20" y1="170" x2="140" y2="170" /><line x1="50" y1="170" x2="50" y2="20" /><line x1="50" y1="20" x2="110" y2="20" /><line x1="50" y1="50" x2="80" y2="20" /><line x1="110" y1="20" x2="110" y2="50" /><circle cx="110" cy="70" r="20" /><line x1="110" y1="90" x2="110" y2="130" /><line x1="110" y1="105" x2="85" y2="120" /><line x1="110" y1="105" x2="135" y2="120" />',
            /* 10: levá noha */
            '<line x1="20" y1="170" x2="140" y2="170" /><line x1="50" y1="170" x2="50" y2="20" /><line x1="50" y1="20" x2="110" y2="20" /><line x1="50" y1="50" x2="80" y2="20" /><line x1="110" y1="20" x2="110" y2="50" /><circle cx="110" cy="70" r="20" /><line x1="110" y1="90" x2="110" y2="130" /><line x1="110" y1="105" x2="85" y2="120" /><line x1="110" y1="105" x2="135" y2="120" /><line x1="110" y1="130" x2="90" y2="160" />',
            /* 11: pravá noha */
            '<line x1="20" y1="170" x2="140" y2="170" /><line x1="50" y1="170" x2="50" y2="20" /><line x1="50" y1="20" x2="110" y2="20" /><line x1="50" y1="50" x2="80" y2="20" /><line x1="110" y1="20" x2="110" y2="50" /><circle cx="110" cy="70" r="20" /><line x1="110" y1="90" x2="110" y2="130" /><line x1="110" y1="105" x2="85" y2="120" /><line x1="110" y1="105" x2="135" y2="120" /><line x1="110" y1="130" x2="90" y2="160" /><line x1="110" y1="130" x2="130" y2="160" />',
            /* 12: konec */
            '<line x1="20" y1="170" x2="140" y2="170" /><line x1="50" y1="170" x2="50" y2="20" /><line x1="50" y1="20" x2="110" y2="20" /><line x1="50" y1="50" x2="80" y2="20" /><line x1="110" y1="20" x2="110" y2="50" /><circle cx="110" cy="70" r="20" /><line x1="110" y1="90" x2="110" y2="130" /><line x1="110" y1="105" x2="85" y2="120" /><line x1="110" y1="105" x2="135" y2="120" /><line x1="110" y1="130" x2="90" y2="160" /><line x1="110" y1="130" x2="130" y2="160" /><line x1="100" y1="62" x2="108" y2="70" /><line x1="108" y1="62" x2="100" y2="70" /><line x1="112" y1="62" x2="120" y2="70" /><line x1="120" y1="62" x2="112" y2="70" />'
        ];
        box.innerHTML = `<svg class="gallows-svg" viewBox="0 0 160 190">${stepsLevel2[wrongAttempts]}</svg>`;
    }
    else if (visualType === "Level2") {
        // Level 2: Šibenice už stojí, věší se jen panáček (7 chyb)
        const stepsLevel3 = [
            /* 0 chyb: hotová šibenice */
            '<line x1="20" y1="170" x2="140" y2="170" /><line x1="50" y1="170" x2="50" y2="20" /><line x1="50" y1="20" x2="110" y2="20" /><line x1="50" y1="50" x2="80" y2="20" /><line x1="110" y1="20" x2="110" y2="50" />',
            /* 1: hlava */
            '<line x1="20" y1="170" x2="140" y2="170" /><line x1="50" y1="170" x2="50" y2="20" /><line x1="50" y1="20" x2="110" y2="20" /><line x1="50" y1="50" x2="80" y2="20" /><line x1="110" y1="20" x2="110" y2="50" /><circle cx="110" cy="70" r="20" />',
            /* 2: tělo */
            '<line x1="20" y1="170" x2="140" y2="170" /><line x1="50" y1="170" x2="50" y2="20" /><line x1="50" y1="20" x2="110" y2="20" /><line x1="50" y1="50" x2="80" y2="20" /><line x1="110" y1="20" x2="110" y2="50" /><circle cx="110" cy="70" r="20" /><line x1="110" y1="90" x2="110" y2="130" />',
            /* 3: levá ruka */
            '<line x1="20" y1="170" x2="140" y2="170" /><line x1="50" y1="170" x2="50" y2="20" /><line x1="50" y1="20" x2="110" y2="20" /><line x1="50" y1="50" x2="80" y2="20" /><line x1="110" y1="20" x2="110" y2="50" /><circle cx="110" cy="70" r="20" /><line x1="110" y1="90" x2="110" y2="130" /><line x1="110" y1="105" x2="85" y2="120" />',
            /* 4: pravá ruka */
            '<line x1="20" y1="170" x2="140" y2="170" /><line x1="50" y1="170" x2="50" y2="20" /><line x1="50" y1="20" x2="110" y2="20" /><line x1="50" y1="50" x2="80" y2="20" /><line x1="110" y1="20" x2="110" y2="50" /><circle cx="110" cy="70" r="20" /><line x1="110" y1="90" x2="110" y2="130" /><line x1="110" y1="105" x2="85" y2="120" /><line x1="110" y1="105" x2="135" y2="120" />',
            /* 5: levá noha */
            '<line x1="20" y1="170" x2="140" y2="170" /><line x1="50" y1="170" x2="50" y2="20" /><line x1="50" y1="20" x2="110" y2="20" /><line x1="50" y1="50" x2="80" y2="20" /><line x1="110" y1="20" x2="110" y2="50" /><circle cx="110" cy="70" r="20" /><line x1="110" y1="90" x2="110" y2="130" /><line x1="110" y1="105" x2="85" y2="120" /><line x1="110" y1="105" x2="135" y2="120" /><line x1="110" y1="130" x2="90" y2="160" />',
            /* 6: pravá noha */
            '<line x1="20" y1="170" x2="140" y2="170" /><line x1="50" y1="170" x2="50" y2="20" /><line x1="50" y1="20" x2="110" y2="20" /><line x1="50" y1="50" x2="80" y2="20" /><line x1="110" y1="20" x2="110" y2="50" /><circle cx="110" cy="70" r="20" /><line x1="110" y1="90" x2="110" y2="130" /><line x1="110" y1="105" x2="85" y2="120" /><line x1="110" y1="105" x2="135" y2="120" /><line x1="110" y1="130" x2="90" y2="160" /><line x1="110" y1="130" x2="130" y2="160" />'
        ];
        box.innerHTML = `<svg class="gallows-svg" viewBox="0 0 160 190">${stepsLevel3[wrongAttempts]}</svg>`;
    }
}
function renderKeyboard() {
    const kb = document.getElementById("keyboard");
    kb.innerHTML = "";

    DE_ALPHABET.forEach(letter => {
        const btn = document.createElement("button");
        btn.className = "key-btn";
        btn.innerText = letter;
        if (guessedLetters.has(letter)) {
            btn.disabled = true;
        }
        btn.onclick = () => handleGuess(letter, btn);
        kb.appendChild(btn);
    });
}

function handleGuess(letter, btn) {
    btn.disabled = true;
    guessedLetters.add(letter);

    const cleanWord = currentWordObj.word.toUpperCase();
    if (cleanWord.includes(letter)) {
        renderWordMask();
        checkWinCondition();
  } else {
        wrongAttempts++;
        
        // Pokud stavíme šibenici (Level 1 nebo Level 2), přehrajeme zvuk dřeva
        if (visualType === "Level1" || visualType === "Level2") {
            playWoodSound();
        }

        updateVisualDisplay();
        checkLoseCondition();
    }
}

function checkWinCondition() {
    const cleanWord = currentWordObj.word.toUpperCase();
    const won = [...cleanWord].every(char => !/[A-ZÄÖÜß]/.test(char) || guessedLetters.has(char));

    if (won) {
        if (!isHintVisible) toggleHint();

        const msg = document.getElementById("statusMessage");
        msg.style.color = "#059669";
        msg.innerHTML = '<i class="fas fa-check-circle"></i> Ausgezeichnet! (Výborně!)';
        disableAllKeys();
        document.getElementById("nextBtn").style.display = "inline-block";
    }
}

function checkLoseCondition() {
    if (wrongAttempts >= maxAttempts) {
        if (!isHintVisible) toggleHint();

        const msg = document.getElementById("statusMessage");
        msg.style.color = "#dc2626";
        msg.innerHTML = `<i class="fas fa-times-circle"></i> Das ist leider falsch! Das gesuchte Wort war: <b>${currentWordObj.word}</b> (Bohužel špatně! Hledané slovo bylo)`;
        
        const container = document.getElementById("lettersContainer");
        container.innerHTML = "";
        for (let char of currentWordObj.word.toUpperCase()) {
            const slot = document.createElement("span");
            slot.className = "letter-slot";
            slot.innerText = char;
            container.appendChild(slot);
        }

        disableAllKeys();
        document.getElementById("nextBtn").style.display = "inline-block";
    }
}

function disableAllKeys() {
    const buttons = document.querySelectorAll(".key-btn");
    buttons.forEach(b => b.disabled = true);
}
window.toggleFullScreen = function() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
            document.body.classList.add('fullscreen-mode');
        }).catch(err => {
            console.error(err);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen().then(() => {
                document.body.classList.remove('fullscreen-mode');
            });
        }
    }
};

// Automatické vrácení zpět do základního rozlišení při stisknutí klávesy ESC
document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement) {
        document.body.classList.remove('fullscreen-mode');
    }
});
function playWoodSound() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        
        // Vytvoříme oscilátor pro hlubší dřevěný tón
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(120, audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, audioCtx.currentTime + 0.15);
        
        gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.15);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
    } catch (e) {
        console.error("Audio Context nepodporován nebo zablokován prohlížečem", e);
    }
}

window.addEventListener("DOMContentLoaded", initHangman);