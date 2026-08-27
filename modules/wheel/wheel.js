let currentTab = 'students';
let activeItems = [];
let selectedItemIndex = null;

// Sledování skóre pro slovní zásobu
let correctAnswersCount = 0;
let wrongAnswersCount = 0;
let totalVocabCount = 15;

// Dynamická paleta
let baseColor = "#1f4e79"; 
let sectorColors = [];

// Fyzika rotace
let startAngle = 0;
let isSpinning = false;
let spinVelocity = 0;
let friction = 0.985;
let animFrameId = null;
let lastSoundSector = -1;

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
    let G = (num >> 8 & 0x00FF) + amt;
    let B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 + 
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 + 
        (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
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
        document.getElementById('listTitle').innerText = 'Seznam žáků:';
        loadClassData();
    } else {
        document.getElementById('listTitle').innerText = 'Seznam slovíček v kole:';
        prepareVocabItems();
    }
};

window.loadClassData = async function() {
    const classSelect = document.getElementById('classSelect');
    if (!classSelect) return;
    
    const classInput = classSelect.value;
    const cleanClassName = classInput.toLowerCase().replace(/[^a-z0-9]/g, '');
    const fileName = `${cleanClassName}.json`;
    const relativePath = `../../../data/klassen/${fileName}`;

    try {
        let res = await fetch(relativePath);
        if (!res.ok) res = await fetch(`/DeutschStudio/data/klassen/${fileName}`);
        if (!res.ok) throw new Error(`Soubor ${fileName} nebyl nalezen.`);

        const rawData = await res.json();
        let students = Array.isArray(rawData) ? rawData : (rawData.students || []);
        let customColor = rawData.classColor || getColorForClassDefault(cleanClassName);

        sectorColors = generateColorPalette(customColor);
        const history = JSON.parse(localStorage.getItem(`ds_history_${cleanClassName}`)) || {};

        activeItems = students.map(s => {
            const lastInitial = s.lastName ? `${s.lastName.charAt(0)}.` : '';
            return {
                id: s.id,
                text: `${s.firstName} ${lastInitial}`.trim(),
                fullName: `${s.firstName} ${s.lastName || ''}`.trim(),
                disabled: !!history[s.id],
                lastTested: history[s.id] || null
            };
        });
    } catch (err) {
        sectorColors = generateColorPalette("#1f4e79");
        activeItems = [];
    }

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

    // Vynulování skóre a nastavení celkového počtu
    correctAnswersCount = 0;
    wrongAnswersCount = 0;
    totalVocabCount = count;

    sectorColors = generateColorPalette("#0f766e");

    try {
        const fullPath = `../../../data/slovicka/${ucebnice}/${folder}/data.json`;
        const res = await fetch(fullPath);
        if (!res.ok) throw new Error("Nelze načíst slovíčka");
        
        const data = await res.json();
        const words = data.words || [];
        const shuffled = [...words].sort(() => 0.5 - Math.random()).slice(0, count);

        activeItems = shuffled.map((v, idx) => {
            const deText = v.artikel ? `${v.artikel} ${v.de}` : v.de;
            return {
                id: 'vocab_' + idx,
                text: lang === 'de' ? deText : v.cz,
                fullName: lang === 'de' ? deText : v.cz,
                disabled: false
            };
        });
    } catch (e) {
        activeItems = [];
    }

    updateVocabTrackerUI();
    renderList();
    drawWheel();
};

function updateVocabTrackerUI() {
    const remaining = activeItems.filter(i => !i.disabled).length;
    document.getElementById('wordsLeftCount').innerText = `${remaining} / ${totalVocabCount}`;
    document.getElementById('scoreText').innerText = `${correctAnswersCount} : ${wrongAnswersCount}`;
}

// Vyhodnocení správné/špatné odpovědi u slovíček
window.rateAnswer = function(isCorrect) {
    if (isCorrect) {
        correctAnswersCount++;
    } else {
        wrongAnswersCount++;
    }

    // Vyřazení vytočeného slovíčka z kola (odpočet)
    if (selectedItemIndex !== null) {
        activeItems[selectedItemIndex].disabled = true;
    }

    updateVocabTrackerUI();
    renderList();
    drawWheel();
    closeModal();

    // Kontrola, zda již proběhl odpočet až na 0
    const remaining = activeItems.filter(i => !i.disabled).length;
    if (remaining === 0) {
        showFinalScoreModal();
    }
};

// --- VYHODNOCENÍ KONCE HRY SLOVÍČEK ---
function showFinalScoreModal() {
    const grade = calculateGrade(correctAnswersCount, totalVocabCount);
    
    document.getElementById('modalIcon').innerText = '🏆';
    document.getElementById('modalSubtitle').innerText = 'Konec hry! Výsledná známka:';
    document.getElementById('winnerText').innerHTML = `
        <div style="font-size: 4rem; color: #059669; font-weight: 900;">Známka ${grade}</div>
        <div style="font-size: 1.25rem; color: #475569; margin-top: 8px;">Správně: ${correctAnswersCount} | Špatně: ${wrongAnswersCount}</div>
    `;

    // Skryjeme ovládání jednotlivých kol a zobrazíme tlačítko pro zavření konce hry
    document.getElementById('studentModalControls')?.classList.add('hidden');
    document.getElementById('vocabModalControls')?.classList.add('hidden');
    document.getElementById('finalModalControls')?.classList.remove('hidden');

    const modal = document.getElementById('winnerModal');
    modal?.classList.remove('hidden');
}

function calculateGrade(correct, total) {
    const ratio = correct / total;
    if (ratio >= 0.85) return '1 🥇';
    if (ratio >= 0.67) return '2 🥈';
    if (ratio >= 0.45) return '3 🥉';
    if (ratio >= 0.25) return '4 📄';
    return '5 ❌';
}

window.addItem = function() {
    const input = document.getElementById('newItemInput');
    if (!input) return;
    const value = input.value.trim();
    if (!value) return;

    activeItems.unshift({
        id: 'custom_' + Date.now(),
        text: value,
        fullName: value,
        disabled: false
    });

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
        if (history[item.id]) {
            delete history[item.id];
            localStorage.setItem(`ds_history_${cleanClassName}`, JSON.stringify(history));
        }
    } else {
        const nowStr = new Date().toLocaleDateString('cs-CZ');
        item.disabled = true;
        item.lastTested = nowStr;
        history[item.id] = nowStr;
        localStorage.setItem(`ds_history_${cleanClassName}`, JSON.stringify(history));
    }

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

        const btnText = item.disabled ? '🔄 Vrátit' : (currentTab === 'students' ? '✔ Vyzkoušet' : 'Vyřadit');
        const btnClass = item.disabled ? 'ds-btn-secondary' : 'ds-btn-danger';

        row.innerHTML = `
            <div style="flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                <strong>${item.text}</strong>
                ${dateBadge}
            </div>
            <div style="display:flex; gap:4px;">
                <button class="ds-btn ds-btn-sm ${btnClass}" onclick="toggleItem(${index})">
                    ${btnText}
                </button>
                <button class="btn-delete" title="Trvale smazat" onclick="deleteItem(${index})">🗑️</button>
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
    const outsideRadius = 200;
    const textRadius = 135;
    const insideRadius = 35;

    ctx.clearRect(0, 0, 400, 400);

    if (availableItems.length === 0) {
        ctx.fillStyle = "#94a3b8";
        ctx.beginPath();
        ctx.arc(200, 200, outsideRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.font = 'bold 16px sans-serif';
        ctx.textAlign = "center";
        ctx.fillText("Žádné dostupné položky!", 200, 205);
        return;
    }

    const arc = Math.PI / (availableItems.length / 2);

    availableItems.forEach((item, i) => {
        const angle = startAngle + i * arc;
        ctx.fillStyle = sectorColors[i % sectorColors.length];

        ctx.beginPath();
        ctx.arc(200, 200, outsideRadius, angle, angle + arc, false);
        ctx.arc(200, 200, insideRadius, angle + arc, angle, true);
        ctx.fill();

        ctx.save();
        ctx.fillStyle = "white";
        ctx.translate(200 + Math.cos(angle + arc / 2) * textRadius, 
                      200 + Math.sin(angle + arc / 2) * textRadius);
        ctx.rotate(angle + arc / 2 + Math.PI / 2);
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = "center";
        
        let displayStr = item.text;
        if (displayStr.length > 14) displayStr = displayStr.substring(0, 12) + '..';
        ctx.fillText(displayStr, 0, 0);
        ctx.restore();
    });
}

window.spinWheel = function() {
    if (isSpinning) return;
    const availableItems = activeItems.filter(i => !i.disabled);
    if (availableItems.length === 0) return;

    isSpinning = true;
    document.getElementById('spinBtn').disabled = true;

    if (currentTab === 'vocab') {
        spinVelocity = Math.random() * 0.40 + 0.70; // Rychlá animace
        friction = 0.940 + Math.random() * 0.010;
    } else {
        spinVelocity = Math.random() * 0.20 + 0.35; // Pomalá animace
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
    const currentSector = Math.floor((startAngle % (Math.PI * 2)) / (Math.PI * 2 / availableItems.length));
    if (currentSector !== lastSoundSector) {
        playTickSound();
        lastSoundSector = currentSector;
    }

    if (spinVelocity < 0.002) {
        stopRotateWheel();
        return;
    }

    animFrameId = requestAnimationFrame(animateWheel);
}

// --- ZOBRAZENÍ VÝSLEDKU KOLEČKA ---
function stopRotateWheel() {
    cancelAnimationFrame(animFrameId);
    isSpinning = false;
    document.getElementById('spinBtn').disabled = false;

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

    // Přepínání viditelnosti tlačítek v modálním okně
    document.getElementById('studentModalControls')?.classList.toggle('hidden', currentTab !== 'students');
    document.getElementById('vocabModalControls')?.classList.toggle('hidden', currentTab !== 'vocab');
    document.getElementById('finalModalControls')?.classList.add('hidden'); // Skryjeme tlačítko konce hry během běžného kola

    document.getElementById('winnerModal')?.classList.remove('hidden');
}

window.closeModal = function() {
    document.getElementById('winnerModal')?.classList.add('hidden');

    // Pokud skončila hra u slovíček, po zavření modálu připravíme novou sadu slovíček
    if (currentTab === 'vocab' && activeItems.filter(i => !i.disabled).length === 0) {
        prepareVocabItems();
    }
};

window.loadClassData = loadClassData;
window.prepareVocabItems = prepareVocabItems;
window.addItem = addItem;
window.deleteItem = deleteItem;
window.toggleItem = toggleItem;
window.spinWheel = spinWheel;
window.confirmWinner = confirmWinner;
window.closeModal = closeModal;
window.rateAnswer = rateAnswer;