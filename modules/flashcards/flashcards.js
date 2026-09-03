let allLessons = [];
let database = [];
let activeCards = [];
let currentIndex = 0;
let isFlipped = false;
let autoAudioEnabled = true;

const isGitHub = window.location.hostname.includes("github.io");
const BASE_URL = isGitHub ? "/DeutschStudio" : "";

// Barvy podle členu
function getGenderColor(article) {
    if (!article) return '#1e40af';
    const art = article.toLowerCase().trim();
    if (art === 'der') return '#1e40af';
    if (art === 'die') return '#dc2626';
    if (art === 'das') return '#059669';
    return '#1e40af';
}

// 1. Inicializace – načtení seznamu lekcí z data/lekce.json
export async function initFlashcards() {
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

// Naplnění výběru učebnic
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

    // Podpora pro URL parametry z dashboardu, jinak vezme první
    const params = new URLSearchParams(window.location.search);
    const urlUcebnice = params.get("ucebnice");
    if (urlUcebnice && books.includes(urlUcebnice)) {
        bookSelect.value = urlUcebnice;
    }

    updateLessonSelect();
}

// Aktualizace lekcí podle vybrané učebnice
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

    // Podpora pro URL parametr folder
    const params = new URLSearchParams(window.location.search);
    const urlFolder = params.get("folder");
    if (urlFolder && filtered.some(l => l.folder === urlFolder)) {
        lessonSelect.value = urlFolder;
    }

    loadSelectedLessonData();
}

window.onLessonChange = function() {
    loadSelectedLessonData();
};

// 2. Načtení dat.json pro vybranou lekci
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

    if (!data) {
        console.error("Nelze načíst data.json pro lekci:", folder);
        database = [];
        prepareActiveCards();
        return;
    }

    database = (data.words || []).map(item => {
        const fileName = (item.image && item.image.file) ? item.image.file : '';
        return {
            word: item.de || "",
            article: item.artikel || "",
            translation: item.cz || "",
            image: fileName ? `${BASE_URL}/data/slovicka/${ucebnice}/${folder}/images/${fileName}` : ''
        };
    });

    prepareActiveCards();
}

window.prepareActiveCards = function() {
    const countElem = document.getElementById("countSelect");
    let items = [...database];

    if (countElem && countElem.value !== "all") {
        const count = parseInt(countElem.value, 10);
        items = items.slice(0, count);
    }

    activeCards = items;
    currentIndex = 0;
    renderCard();
};

window.shuffleCards = function() {
    activeCards.sort(() => Math.random() - 0.5);
    currentIndex = 0;
    renderCard();
};

window.changeMode = function() {
    renderCard();
};

window.flipCard = function() {
    const card = document.getElementById("flashcard");
    if (!card) return;
    card.classList.toggle("flipped");
    isFlipped = !isFlipped;

    const frontMode = document.getElementById("frontSideSelect").value;
    const item = activeCards[currentIndex];
    if (!item) return;
    const fullDeText = item.article ? `${item.article} ${item.word}` : item.word;

    // Logika spouštění audia při otočení
    if (isFlipped) {
        if (frontMode === "cz") {
            playAudioIfEnabled(fullDeText);
        }
    } else {
        if (frontMode === "de" || frontMode === "image") {
            playAudioIfEnabled(fullDeText);
        }
    }
};

window.nextCard = function() {
    if (activeCards.length === 0) return;
    const card = document.getElementById("flashcard");
    card?.classList.remove("flipped");
    isFlipped = false;

    setTimeout(() => {
        currentIndex = (currentIndex + 1) % activeCards.length;
        renderCard();
    }, 200);
};

window.prevCard = function() {
    if (activeCards.length === 0) return;
    const card = document.getElementById("flashcard");
    card?.classList.remove("flipped");
    isFlipped = false;

    setTimeout(() => {
        currentIndex = (currentIndex - 1 + activeCards.length) % activeCards.length;
        renderCard();
    }, 200);
};

window.toggleAutoAudio = function() {
    autoAudioEnabled = !autoAudioEnabled;
    const btn = document.getElementById("audioToggleBtn");
    const icon = document.getElementById("audioIcon");
    
    if (autoAudioEnabled) {
        if (btn) btn.style.background = "#059669";
        if (icon) icon.className = "fas fa-volume-high";
    } else {
        if (btn) btn.style.background = "#dc2626";
        if (icon) icon.className = "fas fa-volume-xmark";
    }
};

window.speakWord = function(text, event) {
    if (event) event.stopPropagation();
    if (!text) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "de-DE";
    window.speechSynthesis.speak(utterance);
};

function playAudioIfEnabled(text) {
    if (autoAudioEnabled && text) {
        setTimeout(() => {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = "de-DE";
            window.speechSynthesis.speak(utterance);
        }, 250);
    }
}

window.toggleFullScreen = function() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().then(() => {
            document.body.classList.add('fullscreen-mode');
        }).catch(err => {
            console.error("Chyba při otevírání celé obrazovky:", err);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen().then(() => {
                document.body.classList.remove('fullscreen-mode');
            });
        }
    }
};

document.addEventListener("fullscreenchange", () => {
    if (!document.fullscreenElement) {
        document.body.classList.remove('fullscreen-mode');
    }
});

function renderCard() {
    const frontElem = document.getElementById("cardFront");
    const backElem = document.getElementById("cardBack");
    const counterElem = document.getElementById("cardCounter");
    const frontMode = document.getElementById("frontSideSelect").value;

    if (!frontElem || !backElem || !counterElem) return;

    if (activeCards.length === 0) {
        frontElem.innerHTML = "<div class='card-text'>Žádná slovíčka</div>";
        backElem.innerHTML = "<div class='card-translation'>-</div>";
        counterElem.innerText = "0 / 0";
        return;
    }

    const item = activeCards[currentIndex];
    const genderColor = getGenderColor(item.article);
    const fullDeText = item.article ? `${item.article} ${item.word}` : item.word;
    const imgHtml = item.image ? `<img src="${item.image}" class="card-image" style="max-width: 110px; max-height: 110px; object-fit: contain; border-radius: 8px; margin: 0;" alt="">` : '';

    // --- 1. REŽIM: OBRÁZEK ---
    if (frontMode === "image") {
        if (item.image) {
            frontElem.style.borderColor = genderColor;
            frontElem.innerHTML = `
                <img src="${item.image}" class="card-image" alt="">
                <button class="audio-btn" onclick="speakWord('${fullDeText}', event)"><i class="fas fa-volume-up"></i></button>
            `;
            backElem.style.borderColor = genderColor;
            backElem.innerHTML = `
                <div class="card-text" style="color: ${genderColor};">${fullDeText}</div>
                <div class="card-translation" style="margin-top: 10px;">${item.translation}</div>
            `;
        } else {
            // Fallback pokud obrázek není -> chová se jako DE
            frontElem.style.borderColor = genderColor;
            frontElem.innerHTML = `
                <div class="card-text" style="color: ${genderColor}">${fullDeText}</div>
                <button class="audio-btn" onclick="speakWord('${fullDeText}', event)"><i class="fas fa-volume-up"></i></button>
            `;
            playAudioIfEnabled(fullDeText);
            backElem.style.borderColor = genderColor;
            backElem.innerHTML = `
                <div class="card-translation">${item.translation}</div>
            `;
        }
    }
    // --- 2. REŽIM: NĚMECKY (DE) – obrázek vlevo, text vpravo ---
    else if (frontMode === "de") {
        frontElem.style.borderColor = genderColor;
        if (item.image) {
            frontElem.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; gap: 25px; width: 100%; padding: 0 15px;">
                    ${imgHtml}
                    <div style="display: flex; flex-direction: column; align-items: center; text-align: left;">
                        <div class="card-text" style="color: ${genderColor}">${fullDeText}</div>
                        <button class="audio-btn" onclick="speakWord('${fullDeText}', event)" style="margin-top: 8px;"><i class="fas fa-volume-up"></i></button>
                    </div>
                </div>
            `;
        } else {
            frontElem.innerHTML = `
                <div class="card-text" style="color: ${genderColor}">${fullDeText}</div>
                <button class="audio-btn" onclick="speakWord('${fullDeText}', event)"><i class="fas fa-volume-up"></i></button>
            `;
        }
        playAudioIfEnabled(fullDeText);

        backElem.style.borderColor = genderColor;
        backElem.innerHTML = `
            <div class="card-translation">${item.translation}</div>
        `;
    }
    // --- 3. REŽIM: ČESKY (CZ) – obrázek vlevo, čeština vpravo ---
    else if (frontMode === "cz") {
        frontElem.style.borderColor = genderColor;
        if (item.image) {
            frontElem.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; gap: 25px; width: 100%; padding: 0 15px;">
                    ${imgHtml}
                    <div class="card-translation">${item.translation}</div>
                </div>
            `;
        } else {
            frontElem.innerHTML = `
                <div class="card-translation">${item.translation}</div>
            `;
        }

        backElem.style.borderColor = genderColor;
        backElem.innerHTML = `
            <div class="card-text" style="color: ${genderColor}">${fullDeText}</div>
            <button class="audio-btn" onclick="speakWord('${fullDeText}', event)"><i class="fas fa-volume-up"></i></button>
        `;
    }

    counterElem.innerText = `${currentIndex + 1} / ${activeCards.length}`;
}

document.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
        e.preventDefault();
        window.flipCard();
    } else if (e.code === "ArrowRight") {
        window.nextCard();
    } else if (e.code === "ArrowLeft") {
        window.prevCard();
    }
});

window.addEventListener("DOMContentLoaded", initFlashcards);