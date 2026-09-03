// ============================================================
// DeutschStudio – Glücksrad (Kolo štěstí)
// Kompletní logika pro žáky a slovní zásobu
// ============================================================

let currentTab = 'students';
let activeItems = [];
let selectedItemIndex = null;

let correctAnswersCount = 0;
let wrongAnswersCount = 0;
let totalVocabCount = 15;

let baseColor = "#1f4e79";
let sectorColors = [];

let startAngle = 0;
let isSpinning = false;
let spinVelocity = 0;
let friction = 0.985;
let animFrameId = null;
let lastSoundSector = -1;
let skippedWordsCount = 0;
const MAX_SKIPS = 2;

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTickSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.04);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(0.01, audioCtx.currentTime + 0.04);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.04);
}

function playWinSound() {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime + i * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + i * 0.1 + 0.3);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start(audioCtx.currentTime + i * 0.1);
        osc.stop(audioCtx.currentTime + i * 0.1 + 0.3);
    });
}

function generateColorPalette(hexColor) {
    baseColor = hexColor || "#1f4e79";
    return [
        adjustColorBrightness(baseColor, 0),
        adjustColorBrightness(baseColor, 25),
        adjustColorBrightness(baseColor, -20),
        adjustColorBrightness(baseColor, 40),
        adjustColorBrightness(baseColor, -35)
    ];
}

function adjustColorBrightness(hex, percent) {
    let num = parseInt(hex.replace('#', ''), 16);
    let amt = Math.round(2.55 * percent);
    let R = (num >> 16) + amt;
    let G = ((num >> 8) & 0x00FF) + amt;
    let B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + 
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + 
        (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
}

function getGenderColor(article) {
    if (!article) return '#0f172a';
    const art = article.toLowerCase().trim();
    if (art === 'der') return '#1e40af';
    if (art === 'die') return '#dc2626';
    if (art === 'das') return '#059669';
    return '#0f172a';
}

document.addEventListener("DOMContentLoaded", () => {
    switchTab('students');
});

window.switchTab = function(tab) {
    currentTab = tab;
    document.getElementById('tabStudentsBtn')?.classList.toggle('active', tab === 'students');
    document.getElementById('tabVocabBtn')?.classList.toggle('active', tab === 'vocab');
    
    document.getElementById('controlsStudents')?.classList.toggle('hidden', tab !== 'students');
    document.getElementById('controlsVocab')?.classList.toggle('hidden', tab !== 'vocab');
    document.getElementById('vocabScoreTracker')?.classList.toggle('hidden', tab !== 'vocab');

    if (tab === 'students') {
        const titleElem = document.getElementById('listTitle');
        if (titleElem) titleElem.innerText = 'Klassenliste / Liste der Schüler:';
        loadClassData();
    } else {
        const titleElem = document.getElementById('listTitle');
        if (titleElem) titleElem.innerText = 'Wortschatzliste im Rad:';
        prepareVocabItems();
    }
};

window.loadClassData = async function() {
    const classSelect = document.getElementById('classSelect');
    if (!classSelect) return;
    
    const classInput = classSelect.value;
    const cleanClassName = classInput.toLowerCase().replace(/[^a-z0-9]/g, '');

    const possibleFileNames = [`${classInput}.json`, `${cleanClassName}.json`];
    let rawData = null;

    const isGitHub = window.location.hostname.includes("github.io");
    const BASE_URL = isGitHub ? "/DeutschStudio" : "";

    for (let fileName of possibleFileNames) {
        const pathsToTry = [
            `${BASE_URL}/data/klassen/${fileName}`,
            `../../data/klassen/${fileName}`,
            `data/klassen/${fileName}`
        ];

        for (let path of pathsToTry) {
            try {
                let res = await fetch(path);
                if (res.ok) {
                    rawData = await res.json();
                    break;
                }
            } catch (e) {}
        }
        if (rawData) break;
    }

    if (!rawData) {
        sectorColors = generateColorPalette("#1f4e79");
        activeItems = [];
        renderList();
        drawWheel();
        return;
    }

    let students = Array.isArray(rawData) ? rawData : (rawData.students || []);
    let customColor = rawData.classColor || getColorForClassDefault(cleanClassName);

    sectorColors = generateColorPalette(customColor);
    const history = JSON.parse(localStorage.getItem(`ds_history_${cleanClassName}`)) || {};

    activeItems = students.map(s => {
        const firstName = s.firstName || s.jmeno || "";
        const lastName = s.lastName || s.prijmeni || "";
        const lastInitial = lastName ? `${lastName.charAt(0)}.` : '';
        
        return {
            id: s.id || firstName,
            text: `${firstName} ${lastInitial}`.trim(),
            fullName: `${firstName} ${lastName}`.trim(),
            disabled: !!history[s.id || firstName],
            lastTested: history[s.id || firstName] || null,
            color: '#0f172a'
        };
    });

    renderList();
    drawWheel();
};

function getColorForClassDefault(className) {
    if (className.includes('7a')) return '#059669'; 
    if (className.includes('7b')) return '#d97706'; 
    if (className.includes('8a')) return '#dc2626'; 
    if (className.includes('8b')) return '#2563eb'; 
    if (className.includes('9a')) return '#7c3aed'; 
    return '#1f4e79';
}

window.prepareVocabItems = async function() {
    const urlParams = new URLSearchParams(window.location.search);
    const ucebnice = urlParams.get('ucebnice') || 'maximal1';
    const folder = urlParams.get('folder') || '1.1_wer_bist_du';
    
    const lang = document.getElementById('langSelect')?.value || 'de';
    const count = parseInt(document.getElementById('countSelect')?.value || 15, 10);

    correctAnswersCount = 0;
    wrongAnswersCount = 0;
    totalVocabCount = count;
    skippedWordsCount = 0;

    sectorColors = generateColorPalette("#0f766e");

    const isGitHub = window.location.hostname.includes("github.io");
    const BASE_URL = isGitHub ? "/DeutschStudio" : "";
    const fullPath = `${BASE_URL}/data/slovicka/${ucebnice}/${folder}/data.json`;

    try {
        let res = await fetch(fullPath);
        if (!res.ok) res = await fetch(`../../data/slovicka/${ucebnice}/${folder}/data.json`);
        if (!res.ok) throw new Error("Keine Wörter gefunden");

        const data = await res.json();
        const words = data.words || [];
        
        if (words.length === 0) {
            activeItems = [];
            return;
        }

        const shuffled = [...words].sort(() => 0.5 - Math.random()).slice(0, count);

        activeItems = shuffled.map((v, idx) => {
            const article = v.artikel ? v.artikel.trim() : "";
            const word = v.de ? v.de.trim() : "";
            const deText = article ? `${article} ${word}` : word;
            const czText = v.cz || "";
            const color = getGenderColor(article);

            return {
                id: 'vocab_' + idx,
                text: lang === 'de' ? deText : czText,
                fullName: lang === 'de' ? deText : czText,
                disabled: false,
                color: lang === 'de' ? color : '#0f172a',
                artikel: article,
                word: word
            };
        });
        totalVocabCount = activeItems.length;
    } catch (e) {
        activeItems = [];
    }

    updateVocabTrackerUI();
    renderList();
    drawWheel();
};

function updateVocabTrackerUI() {
    const remaining = activeItems.filter(i => !i.disabled).length;
    const remainingElem = document.getElementById('wordsLeftCount');
    const scoreElem = document.getElementById('scoreText');
    if (remainingElem) remainingElem.innerText = `${remaining} / ${totalVocabCount}`;
    if (scoreElem) scoreElem.innerText = `${correctAnswersCount} : ${wrongAnswersCount}`;
}

window.addItem = function() {
    const input = document.getElementById('newItemInput');
    if (!input) return;
    const val = input.value.trim();
    if (!val) return;

    let article = "";
    let word = val;
    if (val.toLowerCase().startsWith("der ")) { article = "der"; word = val.substring(4); }
    else if (val.toLowerCase().startsWith("die ")) { article = "die"; word = val.substring(4); }
    else if (val.toLowerCase().startsWith("das ")) { article = "das"; word = val.substring(4); }

    const newItem = {
        id: 'custom_' + Date.now(),
        text: val,
        fullName: val,
        disabled: false,
        color: getGenderColor(article)
    };

    activeItems.push(newItem);
    input.value = '';
    renderList();
    drawWheel();
    if (currentTab === 'vocab') updateVocabTrackerUI();
};

window.deleteItem = function(index) {
    activeItems.splice(index, 1);
    renderList();
    drawWheel();
    if (currentTab === 'vocab') updateVocabTrackerUI();
};

window.toggleItem = function(index) {
    const item = activeItems[index];

    if (currentTab === 'vocab') {
        item.disabled = !item.disabled;
        renderList();
        drawWheel();
        updateVocabTrackerUI();
        return;
    }

    const classSelect = document.getElementById('classSelect');
    const cleanClassName = classSelect ? classSelect.value.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
    let history = JSON.parse(localStorage.getItem(`ds_history_${cleanClassName}`)) || {};

    if (item.disabled) {
        item.disabled = false;
        item.lastTested = null;
        delete history[item.id];
    } else {
        const nowStr = new Date().toLocaleDateString('cs-CZ');
        item.disabled = true;
        item.lastTested = nowStr;
        history[item.id] = nowStr;
    }
    localStorage.setItem(`ds_history_${cleanClassName}`, JSON.stringify(history));

    renderList();
    drawWheel();
};

function renderList() {
    const container = document.getElementById('itemList');
    if (!container) return;
    container.innerHTML = '';

    activeItems.forEach((item, index) => {
        const row = document.createElement('div');
        row.className = `item-row ${item.disabled ? 'disabled' : ''}`;
        
        const dateBadge = (currentTab === 'students' && item.lastTested) 
            ? `<span class="badge-date">🗓️ ${item.lastTested}</span>` 
            : '';

        const btnText = item.disabled ? '🔄 Obnovit' : (currentTab === 'students' ? '✔ Zkoušet' : 'Vyřadit');
        const btnClass = item.disabled ? 'ds-btn-secondary' : 'ds-btn-danger';

        row.innerHTML = `
            <div style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color: ${item.color || '#0f172a'}; font-weight: 600;">
                ${item.text}
                ${dateBadge}
            </div>
            <div style="display:flex; gap:4px;">
                <button class="ds-btn ds-btn-sm ${btnClass}" onclick="toggleItem(${index})">${btnText}</button>
                <button class="ds-btn ds-btn-secondary ds-btn-sm" onclick="deleteItem(${index})"><i class="fas fa-trash"></i></button>
            </div>
        `;
        container.appendChild(row);
    });
}

function drawWheel() {
    const canvas = document.getElementById("canvas");
    if (!canvas || !canvas.getContext) return;

    const ctx = canvas.getContext("2d");
    const availableItems = activeItems.filter(i => !i.disabled);

    const cx = 180;
    const cy = 180;
    const outsideRadius = 160;
    const insideRadius = 30;

    // Prostor, ve kterém se bude zobrazovat text
    const textInnerRadius = insideRadius + 14;
    const textOuterRadius = outsideRadius - 10;
    const maxTextWidth = textOuterRadius - textInnerRadius;

    ctx.clearRect(0, 0, 360, 360);

    if (availableItems.length === 0) {
        ctx.fillStyle = "#94a3b8";
        ctx.beginPath();
        ctx.arc(cx, cy, outsideRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "white";
        ctx.font = "bold 14px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Žádné položky!", cx, cy + 5);
        return;
    }

    const arc = Math.PI / (availableItems.length / 2);

    // Automaticky najde největší velikost písma,
    // která se ještě vejde do prostoru výseče.
    function fitFontSize(text, maxWidth, startSize = 11, minSize = 7.5) {
        let size = startSize;

        while (size > minSize) {
            ctx.font = `bold ${size}px sans-serif`;

            if (ctx.measureText(text).width <= maxWidth) {
                return size;
            }

            size -= 0.5;
        }

        return minSize;
    }

    availableItems.forEach((item, i) => {
        const angle = startAngle + i * arc;
        const sectorAngle = angle + arc / 2;

        // ==========================================
        // VÝSEČ
        // ==========================================

        ctx.fillStyle = sectorColors[i % sectorColors.length];

        ctx.beginPath();

        ctx.arc(
            cx,
            cy,
            outsideRadius,
            angle,
            angle + arc,
            false
        );

        ctx.arc(
            cx,
            cy,
            insideRadius,
            angle + arc,
            angle,
            true
        );

        ctx.closePath();
        ctx.fill();


        // ==========================================
        // TEXT
        // ==========================================

        ctx.save();

        // Umístění textu přibližně doprostřed výseče
        const textRadius =
            (textInnerRadius + textOuterRadius) / 2;

        const tx =
            cx + Math.cos(sectorAngle) * textRadius;

        const ty =
            cy + Math.sin(sectorAngle) * textRadius;

        ctx.translate(tx, ty);

        // Text bude vždy čitelný,
        // nebude vzhůru nohama.
        let rot = sectorAngle;

        if (Math.cos(sectorAngle) < 0) {
            rot += Math.PI;
        }

        ctx.rotate(rot);

        ctx.textAlign = "center";
        ctx.textBaseline = "middle";


        // ==========================================
        // NĚMECKÉ SLOVÍČKO
        // der / die / das
        //        slovo
        // ==========================================

        const isGermanVocab =
            currentTab === "vocab" &&
            item.artikel &&
            item.word;

        if (isGermanVocab) {

            const article = item.artikel.trim();
            const word = item.word.trim();

            // Velikost samotného slova podle délky
            const wordFontSize =
                fitFontSize(
                    word,
                    maxTextWidth,
                    11,
                    7.5
                );

            // Člen může být trochu menší
            const articleFontSize =
                Math.min(10, wordFontSize);

            ctx.fillStyle =
                item.color || "white";

            // Rozestup mezi řádky
            const lineGap =
                Math.max(
                    5,
                    wordFontSize * 0.45
                );

            const totalHeight =
                articleFontSize +
                lineGap +
                wordFontSize;


            // ------------------------------
            // ČLEN
            // ------------------------------

            ctx.font =
                `bold ${articleFontSize}px sans-serif`;

            ctx.fillText(
                article,
                0,
                -(
                    totalHeight / 2 -
                    articleFontSize / 2
                )
            );


            // ------------------------------
            // SLOVO
            // ------------------------------

            ctx.font =
                `bold ${wordFontSize}px sans-serif`;

            ctx.fillText(
                word,
                0,
                totalHeight / 2 -
                wordFontSize / 2
            );


        } else {

            // ==========================================
            // OSTATNÍ POLOŽKY
            // ==========================================

            const displayText =
                item.text || "";

            const fontSize =
                fitFontSize(
                    displayText,
                    maxTextWidth,
                    11,
                    7.5
                );

            ctx.fillStyle =
                item.color || "white";

            ctx.font =
                `bold ${fontSize}px sans-serif`;

            ctx.fillText(
                displayText,
                0,
                0
            );
        }

        ctx.restore();
    });
}

window.spinWheel = function() {
    if (isSpinning) return;
    const availableItems = activeItems.filter(i => !i.disabled);
    if (availableItems.length === 0) return;

    isSpinning = true;
    const spinBtn = document.getElementById('spinBtn');
    if (spinBtn) spinBtn.disabled = true;

    const container = document.querySelector('.wheel-container');
    container?.classList.add('fullscreen-spin');
    document.body.classList.add('is-spinning');

    const speedMultiplier = parseFloat(document.getElementById('speedRange')?.value) || 1.0;

    if (currentTab === 'vocab') {
        spinVelocity = (Math.random() * 0.40 + 0.70) * speedMultiplier;
        friction = 0.940 + Math.random() * 0.010;
    } else {
        spinVelocity = (Math.random() * 0.20 + 0.35) * speedMultiplier;
        friction = 0.983 + Math.random() * 0.005;
    }

    lastSoundSector = -1;
    animateWheel();
};

function animateWheel() {
    spinVelocity *= friction;
    startAngle += spinVelocity;

    drawWheel();

    const availableItems = activeItems.filter(i => !i.disabled);
    if (availableItems.length > 0) {
        const currentSector = Math.floor((startAngle % (Math.PI * 2)) / (Math.PI * 2 / availableItems.length));
        if (currentSector !== lastSoundSector) {
            playTickSound();
            lastSoundSector = currentSector;
        }
    }

    if (spinVelocity < 0.002) {
        stopRotateWheel();
        return;
    }

    animFrameId = requestAnimationFrame(animateWheel);
}

function stopRotateWheel() {
    cancelAnimationFrame(animFrameId);
    isSpinning = false;
    const spinBtn = document.getElementById('spinBtn');
    if (spinBtn) spinBtn.disabled = false;

    const container = document.querySelector('.wheel-container');
    container?.classList.remove('fullscreen-spin');
    document.body.classList.remove('is-spinning');

    const availableItems = activeItems.filter(i => !i.disabled);
    const arc = Math.PI / (availableItems.length / 2);
    const degrees = startAngle * 180 / Math.PI + 90;
    const arcd = arc * 180 / Math.PI;
    const index = Math.floor((360 - degrees % 360) / arcd) % availableItems.length;
    
    const winner = availableItems[index];
    selectedItemIndex = activeItems.findIndex(i => i.id === winner.id);

    playWinSound();
    document.getElementById('modalIcon').innerText = '🎉';
    document.getElementById('modalSubtitle').innerText = 'Vybráno:';
    document.getElementById('winnerText').innerText = winner.fullName || winner.text;

    document.getElementById('studentModalControls')?.classList.toggle('hidden', currentTab !== 'students');
    document.getElementById('vocabModalControls')?.classList.toggle('hidden', currentTab !== 'vocab');
    document.getElementById('finalModalControls')?.classList.add('hidden');
    document.getElementById('skipModalControl')?.classList.toggle('hidden', currentTab !== 'vocab');

    document.getElementById('winnerModal')?.classList.remove('hidden');
    // Správa tlačítka pro přeskočení a limitu 2 pokusů
    const skipBtn = document.getElementById('skipWordBtn');
    const skipBadge = document.getElementById('skipCountBadge');
    const remainingSkips = MAX_SKIPS - skippedWordsCount;

    if (skipBtn && skipBadge) {
        skipBadge.innerText = `(${remainingSkips}/${MAX_SKIPS})`;
        if (skippedWordsCount >= MAX_SKIPS) {
            skipBtn.disabled = true;
            skipBtn.style.opacity = '0.4';
            skipBtn.style.cursor = 'not-allowed';
        } else {
            skipBtn.disabled = false;
            skipBtn.style.opacity = '1';
            skipBtn.style.cursor = 'pointer';
        }
    }
}

window.confirmWinner = function() {
    if (selectedItemIndex !== null && currentTab === 'students') {
        toggleItem(selectedItemIndex);
    }
    closeModal();
};

window.rateAnswer = function(isCorrect) {
    if (isCorrect) {
        correctAnswersCount++;
    } else {
        wrongAnswersCount++;
    }

    if (selectedItemIndex !== null && activeItems[selectedItemIndex]) {
        activeItems[selectedItemIndex].disabled = true;
    }

    updateVocabTrackerUI();
    renderList();
    drawWheel();

    const remaining = activeItems.filter(i => !i.disabled).length;
    if (remaining === 0) {
        showFinalScoreModal(); // Zobrazí finální okno se skóre přímo
    } else {
        closeModal();
    }
};window.skipWord = function() {
    if (selectedItemIndex !== null && activeItems[selectedItemIndex]) {
        activeItems[selectedItemIndex].disabled = true;
    }

    updateVocabTrackerUI();
    renderList();
    drawWheel();

    const remaining = activeItems.filter(i => !i.disabled).length;
    if (remaining === 0) {
        showFinalScoreModal(); // Zobrazí finální okno se skóre přímo
    } else {
        closeModal();
    }
};

function showFinalScoreModal() {
    document.getElementById('modalIcon').innerText = '🏆';
    document.getElementById('modalSubtitle').innerText = 'Spielende!';
    document.getElementById('winnerText').innerHTML = `Richtig: ${correctAnswersCount} | Falsch: ${wrongAnswersCount}`;

    document.getElementById('studentModalControls')?.classList.add('hidden');
    document.getElementById('vocabModalControls')?.classList.add('hidden');
    document.getElementById('skipModalControl')?.classList.add('hidden');
    document.getElementById('finalModalControls')?.classList.remove('hidden');

    document.getElementById('winnerModal')?.classList.remove('hidden');
}

window.closeModal = function() {
    document.getElementById('winnerModal')?.classList.add('hidden');
    
    // Nová sada slovíček se připraví až po kliknutí na OK ve finálním okně
    if (currentTab === 'vocab' && activeItems.filter(i => !i.disabled).length === 0) {
        prepareVocabItems();
    }
};