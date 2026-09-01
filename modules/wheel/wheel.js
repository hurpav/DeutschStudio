// ============================================================
// DeutschStudio – Wheel
// Losování žáků + procvičování slovní zásoby
// ============================================================

// ------------------------------------------------------------
// STAV APLIKACE
// ------------------------------------------------------------

let currentTab = 'students';

let activeItems = [];
let selectedItemIndex = null;

// Skóre slovní zásoby
let correctAnswersCount = 0;
let wrongAnswersCount = 0;
let totalVocabCount = 0;

// Barvy kola
let baseColor = "#1f4e79";
let sectorColors = [];

// Rotace kola
let startAngle = 0;
let isSpinning = false;
let spinVelocity = 0;
let friction = 0.985;
let animFrameId = null;
let lastSoundSector = -1;


// ============================================================
// AUDIO
// ============================================================

const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playTickSound() {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(600, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(
        150,
        audioCtx.currentTime + 0.04
    );

    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    gain.gain.linearRampToValueAtTime(
        0.01,
        audioCtx.currentTime + 0.04
    );

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start();
    osc.stop(audioCtx.currentTime + 0.04);
}


function playWinSound() {
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const notes = [
        523.25,
        659.25,
        783.99,
        1046.50
    ];

    notes.forEach((freq, i) => {

        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        const startTime =
            audioCtx.currentTime + i * 0.1;

        osc.type = 'sine';
        osc.frequency.value = freq;

        gain.gain.setValueAtTime(
            0.2,
            startTime
        );

        gain.gain.exponentialRampToValueAtTime(
            0.001,
            startTime + 0.3
        );

        osc.connect(gain);
        gain.connect(audioCtx.destination);

        osc.start(startTime);
        osc.stop(startTime + 0.3);
    });
}


// ============================================================
// BARVY
// ============================================================

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

    let num = parseInt(
        hex.replace('#', ''),
        16
    );

    let amt = Math.round(2.55 * percent);

    let R = (num >> 16) + amt;
    let G = ((num >> 8) & 0x00FF) + amt;
    let B = (num & 0x0000FF) + amt;

    R = R < 1 ? 0 : R > 255 ? 255 : R;
    G = G < 1 ? 0 : G > 255 ? 255 : G;
    B = B < 1 ? 0 : B > 255 ? 255 : B;

    return '#' +
        (
            0x1000000 +
            R * 0x10000 +
            G * 0x100 +
            B
        )
        .toString(16)
        .slice(1);
}


// ============================================================
// BARVY TŘÍD
// ============================================================

function getColorForClassDefault(className) {

    className = className.toLowerCase();

    if (className.includes('7a')) return '#059669';
    if (className.includes('7b')) return '#d97706';
    if (className.includes('8a')) return '#dc2626';
    if (className.includes('8b')) return '#2563eb';
    if (className.includes('9a')) return '#7c3aed';

    return '#1f4e79';
}


// ============================================================
// START
// ============================================================

document.addEventListener("DOMContentLoaded", () => {

    console.log("🎡 DeutschStudio Wheel start");

    switchTab('students');

});


// ============================================================
// PŘEPÍNÁNÍ ZÁLOŽEK
// ============================================================

window.switchTab = function(tab) {

    currentTab = tab;

    const tabStudentsBtn =
        document.getElementById('tabStudentsBtn');

    const tabVocabBtn =
        document.getElementById('tabVocabBtn');

    const controlsStudents =
        document.getElementById('controlsStudents');

    const controlsVocab =
        document.getElementById('controlsVocab');

    const vocabScoreTracker =
        document.getElementById('vocabScoreTracker');

    const listTitle =
        document.getElementById('listTitle');


    tabStudentsBtn?.classList.toggle(
        'active',
        tab === 'students'
    );

    tabVocabBtn?.classList.toggle(
        'active',
        tab === 'vocab'
    );


    controlsStudents?.classList.toggle(
        'hidden',
        tab !== 'students'
    );

    controlsVocab?.classList.toggle(
        'hidden',
        tab !== 'vocab'
    );

    vocabScoreTracker?.classList.toggle(
        'hidden',
        tab !== 'vocab'
    );


    if (tab === 'students') {

        if (listTitle) {
            listTitle.innerText =
                'Klassenliste / Liste der Schüler:';
        }

        loadClassData();

    } else {

        if (listTitle) {
            listTitle.innerText =
                'Wortschatzliste im Rad:';
        }

        prepareVocabItems();

    }
};


// ============================================================
// POMOCNÁ FUNKCE PRO NALEZENÍ DATA
// ============================================================
//
// Protože wheel.html může být později přesunut,
// zkusíme několik možných relativních cest.
// V konzoli vždy uvidíš, která cesta byla použita.
// ============================================================

async function fetchJSONFromPossiblePaths(paths) {

    let lastError = null;

    for (const path of paths) {

        try {

            console.log("🔎 Zkouším:", path);

            const response = await fetch(path);

            if (!response.ok) {

                lastError =
                    new Error(
                        `HTTP ${response.status}`
                    );

                continue;
            }

            const data = await response.json();

            console.log(
                "✅ JSON načten z:",
                path
            );

            return {
                data,
                path
            };

        } catch (error) {

            lastError = error;

            console.warn(
                "⚠️ Cesta nefunguje:",
                path,
                error
            );
        }
    }

    throw lastError ||
        new Error("JSON nebylo možné načíst.");
}


// ============================================================
// NAČTENÍ TŘÍDY
// ============================================================

window.loadClassData = async function() {

    const classSelect =
        document.getElementById('classSelect');

    if (!classSelect) {

        console.error(
            "❌ Element #classSelect nebyl nalezen."
        );

        return;
    }


    const className =
        classSelect.value;

    if (!className) {

        console.warn(
            "⚠️ Nebyla vybrána žádná třída."
        );

        return;
    }


    const cleanClassName =
        className
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');


    console.log(
        "👨‍🎓 Načítám třídu:",
        className
    );


    const fileName =
        `${className}.json`;


    // Standardní cesta při struktuře:
    //
    // dashboard/wheel/wheel.html
    // data/klassen/7A.json
    //
    // tedy ../../data/klassen/7A.json

    const possiblePaths = [

        `../../data/klassen/${fileName}`,

        `../data/klassen/${fileName}`,

        `./data/klassen/${fileName}`,

        `../../../data/klassen/${fileName}`

    ];


    try {

        const result =
            await fetchJSONFromPossiblePaths(
                possiblePaths
            );


        const rawData =
            result.data;


        console.log(
            "📦 Data třídy:",
            rawData
        );


        // JSON může být:
        //
        // [
        //   {...},
        //   {...}
        // ]
        //
        // nebo:
        //
        // {
        //   "students": [...]
        // }

        const students =
            Array.isArray(rawData)
                ? rawData
                : (
                    Array.isArray(rawData.students)
                        ? rawData.students
                        : []
                );


        if (students.length === 0) {

            throw new Error(
                "JSON byl načten, ale neobsahuje žádné žáky."
            );
        }


        // Barva třídy
        const customColor =
            rawData.classColor ||
            getColorForClassDefault(
                cleanClassName
            );


        sectorColors =
            generateColorPalette(
                customColor
            );


        // Historie zkoušení
        let history = {};

        try {

            history =
                JSON.parse(
                    localStorage.getItem(
                        `ds_history_${cleanClassName}`
                    )
                ) || {};

        } catch (error) {

            console.warn(
                "⚠️ Historie nebyla čitelná, používám prázdnou.",
                error
            );

            history = {};
        }


        // Vytvoření prvků kola
        activeItems =
            students.map((student, index) => {

                const firstName =
                    student.firstName ||
                    student.jmeno ||
                    student.name ||
                    "";


                const lastName =
                    student.lastName ||
                    student.prijmeni ||
                    "";


                const lastInitial =
                    lastName
                        ? `${lastName.charAt(0)}.`
                        : "";


                const id =
                    student.id ??
                    `${firstName}_${index}`;


                return {

                    id: id,

                    // Text na kole:
                    // Petr N.
                    text:
                        `${firstName} ${lastInitial}`
                            .trim(),

                    // Celé jméno v modalu
                    fullName:
                        `${firstName} ${lastName}`
                            .trim(),

                    // Už byl zkoušen?
                    disabled:
                        !!history[id],

                    // Datum
                    lastTested:
                        history[id] || null

                };

            });


        selectedItemIndex = null;

        console.log(
            "👨‍🎓 Načteno žáků:",
            activeItems.length
        );


        renderList();
        drawWheel();


    } catch (error) {

        console.error(
            "❌ Chyba při načítání třídy:",
            error
        );


        activeItems = [];

        sectorColors =
            generateColorPalette(
                "#1f4e79"
            );


        renderList();
        drawWheel();


        alert(
            `Třídu ${className} se nepodařilo načíst.\n\n` +
            `Hledaný soubor:\n${fileName}\n\n` +
            `Chyba:\n${error.message}`
        );
    }
};


// ============================================================
// NAČTENÍ SLOVNÍ ZÁSOBY
// ============================================================

window.prepareVocabItems = async function() {

    const urlParams =
        new URLSearchParams(
            window.location.search
        );


    const ucebnice =
        urlParams.get('ucebnice') ||
        'maximal1';


    const folder =
        urlParams.get('folder') ||
        '2.2_schulsachen';


    const lang =
        document.getElementById('langSelect')?.value ||
        'de';


    const countElem =
        document.getElementById('countSelect');


    const requestedCount =
        countElem
            ? parseInt(
                countElem.value,
                10
            )
            : 15;


    // Reset skóre
    correctAnswersCount = 0;
    wrongAnswersCount = 0;


    sectorColors =
        generateColorPalette(
            "#0f766e"
        );


    console.log(
        "📚 Načítám slovní zásobu:"
    );

    console.log(
        "   učebnice:",
        ucebnice
    );

    console.log(
        "   lekce:",
        folder
    );

    console.log(
        "   jazyk:",
        lang
    );


    const fileName =
        "data.json";


    // Při struktuře:
    //
    // data/
    //   slovicka/
    //     maximal1/
    //       2.2_schulsachen/
    //         data.json
    //
    // a wheel.html v dashboard/wheel/
    // je správně:
    //
    // ../../data/slovicka/...

    const possiblePaths = [

        `../../data/slovicka/${ucebnice}/${folder}/${fileName}`,

        `../data/slovicka/${ucebnice}/${folder}/${fileName}`,

        `./data/slovicka/${ucebnice}/${folder}/${fileName}`,

        `../../../data/slovicka/${ucebnice}/${folder}/${fileName}`

    ];


    try {

        const result =
            await fetchJSONFromPossiblePaths(
                possiblePaths
            );


        const data =
            result.data;


        console.log(
            "📦 Data slovní zásoby:",
            data
        );


        // Podpora obou variant JSON:
        //
        // {
        //   "words": [...]
        // }
        //
        // nebo:
        //
        // [
        //   {...},
        //   {...}
        // ]

        const words =
            Array.isArray(data)
                ? data
                : (
                    Array.isArray(data.words)
                        ? data.words
                        : []
                );


        if (words.length === 0) {

            throw new Error(
                "JSON neobsahuje žádná slovíčka."
            );
        }


        // Kolik slov skutečně použijeme?
        const count =
            Math.min(
                requestedCount,
                words.length
            );


        // Náhodné zamíchání
        const shuffled =
            [...words]
                .sort(
                    () =>
                        Math.random() - 0.5
                )
                .slice(
                    0,
                    count
                );


        // Vytvoření položek
        activeItems =
            shuffled.map(
                (word, index) => {

                    const deText =
                        word.artikel
                            ? `${word.artikel} ${word.de}`
                            : (
                                word.de || ""
                            );


                    const czText =
                        word.cz || "";


                    const displayText =
                        lang === 'de'
                            ? deText
                            : czText;


                    return {

                        id:
                            'vocab_' +
                            index,

                        text:
                            displayText,

                        fullName:
                            displayText,

                        // Slovo není vyřazené
                        disabled:
                            false,

                        // Pro případné další použití
                        de:
                            deText,

                        cz:
                            czText

                    };

                }
            );


        totalVocabCount =
            activeItems.length;


        selectedItemIndex = null;


        console.log(
            "📚 Načteno slov:",
            totalVocabCount
        );


    } catch (error) {

        console.error(
            "❌ Chyba při načítání slovíček:",
            error
        );


        activeItems = [];
        totalVocabCount = 0;


        alert(
            `Slovní zásobu se nepodařilo načíst.\n\n` +
            `Učebnice: ${ucebnice}\n` +
            `Lekce: ${folder}\n\n` +
            `Chyba:\n${error.message}`
        );
    }


    updateVocabTrackerUI();

    renderList();

    drawWheel();
};


// ============================================================
// UKAZATEL SKÓRE
// ============================================================

function updateVocabTrackerUI() {

    const remaining =
        activeItems.filter(
            item => !item.disabled
        ).length;


    const remainingElem =
        document.getElementById(
            'wordsLeftCount'
        );


    const scoreElem =
        document.getElementById(
            'scoreText'
        );


    if (remainingElem) {

        remainingElem.innerText =
            `${remaining} / ${totalVocabCount}`;
    }


    if (scoreElem) {

        scoreElem.innerText =
            `${correctAnswersCount} : ${wrongAnswersCount}`;
    }
}


// ============================================================
// POTVRZENÍ VYLOSOVANÉHO ŽÁKA
// ============================================================

window.confirmWinner = function() {

    if (
        selectedItemIndex !== null &&
        currentTab === 'students'
    ) {

        toggleItem(
            selectedItemIndex
        );
    }


    closeModal();
};


// ============================================================
// RICHTIG / FALSCH
// ============================================================

window.rateAnswer = function(isCorrect) {

    if (currentTab !== 'vocab') {
        return;
    }


    if (isCorrect) {

        correctAnswersCount++;

    } else {

        wrongAnswersCount++;

    }


    // Vyřadíme právě vybrané slovíčko
    if (
        selectedItemIndex !== null &&
        activeItems[selectedItemIndex]
    ) {

        activeItems[
            selectedItemIndex
        ].disabled = true;
    }


    updateVocabTrackerUI();

    renderList();

    drawWheel();


    const remaining =
        activeItems.filter(
            item => !item.disabled
        ).length;


    // Konec hry
    if (remaining === 0) {

        showFinalScoreModal();

    } else {

        closeModal();
    }
};


// ============================================================
// FINÁLNÍ VÝSLEDEK
// ============================================================

function showFinalScoreModal() {

    const actualTotal =
        correctAnswersCount +
        wrongAnswersCount;


    const grade =
        calculateGrade(
            correctAnswersCount,
            actualTotal
        );


    const modalIcon =
        document.getElementById(
            'modalIcon'
        );


    const modalSubtitle =
        document.getElementById(
            'modalSubtitle'
        );


    const winnerTextElem =
        document.getElementById(
            'winnerText'
        );


    if (modalIcon) {

        modalIcon.innerText =
            '🏆';
    }


    if (modalSubtitle) {

        modalSubtitle.innerText =
            'Spielende! Gesamtnote:';
    }


    document
        .getElementById(
            'studentModalControls'
        )
        ?.classList.add('hidden');


    document
        .getElementById(
            'vocabModalControls'
        )
        ?.classList.add('hidden');


    document
        .getElementById(
            'finalModalControls'
        )
        ?.classList.remove('hidden');


    if (winnerTextElem) {

        winnerTextElem.innerHTML = `

            <div
                style="
                    font-size: 3rem;
                    color: #059669;
                    font-weight: 900;
                    margin: 5px 0;
                "
            >
                Note ${grade}
            </div>

            <div
                style="
                    font-size: 1.1rem;
                    color: #475569;
                    margin-top: 5px;
                "
            >
                Richtig:
                ${correctAnswersCount}
                |
                Falsch:
                ${wrongAnswersCount}
            </div>

        `;
    }


    document
        .getElementById(
            'winnerModal'
        )
        ?.classList.remove('hidden');


    playWinSound();
}


// ============================================================
// ZNÁMKA
// ============================================================

function calculateGrade(correct, total) {

    if (!total || total <= 0) {
        return '5 ❌';
    }


    const ratio =
        correct / total;


    if (ratio >= 0.85) {
        return '1 🥇';
    }


    if (ratio >= 0.67) {
        return '2 🥈';
    }


    if (ratio >= 0.45) {
        return '3 🥉';
    }


    if (ratio >= 0.25) {
        return '4 📄';
    }


    return '5 ❌';
}


// ============================================================
// PŘIDÁNÍ VLASTNÍ POLOŽKY
// ============================================================

window.addItem = function() {

    const input =
        document.getElementById(
            'newItemInput'
        );


    if (!input) {
        return;
    }


    const value =
        input.value.trim();


    if (!value) {
        return;
    }


    activeItems.unshift({

        id:
            'custom_' +
            Date.now(),

        text:
            value,

        fullName:
            value,

        disabled:
            false

    });


    input.value = '';


    renderList();

    drawWheel();


    if (currentTab === 'vocab') {

        totalVocabCount =
            activeItems.length;

        updateVocabTrackerUI();
    }
};


// ============================================================
// SMAZÁNÍ POLOŽKY
// ============================================================

window.deleteItem = function(index) {

    if (
        index < 0 ||
        index >= activeItems.length
    ) {
        return;
    }


    activeItems.splice(
        index,
        1
    );


    renderList();

    drawWheel();


    if (currentTab === 'vocab') {

        totalVocabCount =
            activeItems.length;

        updateVocabTrackerUI();
    }
};


// ============================================================
// AKTIVACE / DEAKTIVACE
// ============================================================

window.toggleItem = function(index) {

    const item =
        activeItems[index];


    if (!item) {
        return;
    }


    // --------------------------------------------------------
    // SLOVNÍ ZÁSOBA
    // --------------------------------------------------------

    if (currentTab === 'vocab') {

        item.disabled =
            !item.disabled;


        renderList();

        drawWheel();

        updateVocabTrackerUI();

        return;
    }


    // --------------------------------------------------------
    // ŽÁCI
    // --------------------------------------------------------

    const classSelect =
        document.getElementById(
            'classSelect'
        );


    const className =
        classSelect
            ? classSelect.value
            : 'unknown';


    const cleanClassName =
        className
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '');


    let history = {};


    try {

        history =
            JSON.parse(
                localStorage.getItem(
                    `ds_history_${cleanClassName}`
                )
            ) || {};

    } catch (error) {

        history = {};
    }


    // Žák byl vyzkoušen → obnovit
    if (item.disabled) {

        item.disabled = false;

        item.lastTested = null;


        if (history[item.id]) {

            delete history[item.id];

        }

    }

    // Žák nebyl vyzkoušen → označit
    else {

        const nowStr =
            new Date()
                .toLocaleDateString(
                    'cs-CZ'
                );


        item.disabled = true;

        item.lastTested =
            nowStr;


        history[item.id] =
            nowStr;
    }


    localStorage.setItem(

        `ds_history_${cleanClassName}`,

        JSON.stringify(history)

    );


    renderList();

    drawWheel();
};


// ============================================================
// VYKRESLENÍ SEZNAMU
// ============================================================

function renderList() {

    const container =
        document.getElementById(
            'itemList'
        );


    if (!container) {
        return;
    }


    container.innerHTML = '';


    activeItems.forEach(
        (item, index) => {

            const row =
                document.createElement(
                    'div'
                );


            row.className =
                `item-row ${
                    item.disabled
                        ? 'disabled'
                        : ''
                }`;


            const dateBadge =
                (
                    currentTab === 'students' &&
                    item.lastTested
                )
                    ? `
                        <span class="badge-date">
                            🗓️ ${item.lastTested}
                        </span>
                      `
                    : '';


            let btnText;


            if (item.disabled) {

                btnText =
                    '🔄 Wiederherstellen';

            } else {

                btnText =
                    currentTab === 'students'
                        ? '✔ Abfragen'
                        : 'Entfernen';
            }


            const btnClass =
                item.disabled
                    ? 'ds-btn-secondary'
                    : 'ds-btn-danger';


            row.innerHTML = `

                <div
                    style="
                        flex:1;
                        overflow:hidden;
                        text-overflow:ellipsis;
                        white-space:nowrap;
                    "
                >

                    <strong>
                        ${item.text}
                    </strong>

                    ${dateBadge}

                </div>


                <div
                    style="
                        display:flex;
                        gap:4px;
                    "
                >

                    <button
                        class="ds-btn ds-btn-sm ${btnClass}"
                        onclick="toggleItem(${index})"
                    >
                        ${btnText}
                    </button>


                    <button
                        class="btn-delete"
                        title="Löschen"
                        onclick="deleteItem(${index})"
                    >
                        🗑️
                    </button>

                </div>

            `;


            container.appendChild(
                row
            );

        }
    );
}


// ============================================================
// VYKRESLENÍ KOLA
// ============================================================

function drawWheel() {

    const canvas =
        document.getElementById(
            "canvas"
        );


    if (
        !canvas ||
        !canvas.getContext
    ) {
        return;
    }


    const ctx =
        canvas.getContext(
            "2d"
        );


    const availableItems =
        activeItems.filter(
            item => !item.disabled
        );


    const outsideRadius =
        230;


    const textRadius =
        160;


    const insideRadius =
        45;


    ctx.clearRect(
        0,
        0,
        500,
        500
    );


    // --------------------------------------------------------
    // ŽÁDNÉ POLOŽKY
    // --------------------------------------------------------

    if (
        availableItems.length === 0
    ) {

        ctx.fillStyle =
            "#94a3b8";


        ctx.beginPath();

        ctx.arc(
            250,
            250,
            outsideRadius,
            0,
            Math.PI * 2
        );

        ctx.fill();


        ctx.fillStyle =
            "white";


        ctx.font =
            'bold 18px sans-serif';


        ctx.textAlign =
            "center";


        ctx.fillText(
            "Keine verfügbaren Elemente!",
            250,
            255
        );


        return;
    }


    const arc =
        Math.PI /
        (
            availableItems.length / 2
        );


    availableItems.forEach(
        (item, i) => {

            const angle =
                startAngle +
                i * arc;


            ctx.fillStyle =
                sectorColors[
                    i %
                    sectorColors.length
                ];


            // Výseč
            ctx.beginPath();

            ctx.arc(
                250,
                250,
                outsideRadius,
                angle,
                angle + arc,
                false
            );


            ctx.arc(
                250,
                250,
                insideRadius,
                angle + arc,
                angle,
                true
            );


            ctx.fill();


            // Text
            ctx.save();


            ctx.fillStyle =
                "white";


            const textAngle =
                angle +
                arc / 2;


            ctx.translate(

                250 +
                Math.cos(textAngle) *
                textRadius,

                250 +
                Math.sin(textAngle) *
                textRadius

            );


            ctx.rotate(
                textAngle +
                Math.PI / 2
            );


            ctx.font =
                'bold 15px sans-serif';


            ctx.textAlign =
                "center";


            let displayStr =
                item.text;


            if (
                displayStr.length > 16
            ) {

                displayStr =
                    displayStr.substring(
                        0,
                        14
                    ) +
                    '..';
            }


            ctx.fillText(
                displayStr,
                0,
                0
            );


            ctx.restore();

        }
    );
}


// ============================================================
// SPUŠTĚNÍ KOLA
// ============================================================

window.spinWheel = function() {

    if (isSpinning) {
        return;
    }


    const availableItems =
        activeItems.filter(
            item => !item.disabled
        );


    if (
        availableItems.length === 0
    ) {
        return;
    }


    isSpinning = true;


    const spinBtn =
        document.getElementById(
            'spinBtn'
        );


    if (spinBtn) {
        spinBtn.disabled = true;
    }


    // Slovíčka rychleji
    if (currentTab === 'vocab') {

        spinVelocity =
            Math.random() *
            0.40 +
            0.70;


        friction =
            0.940 +
            Math.random() *
            0.010;

    } else {

        // Žáci pomaleji
        spinVelocity =
            Math.random() *
            0.20 +
            0.35;


        friction =
            0.983 +
            Math.random() *
            0.005;
    }


    lastSoundSector = -1;


    animateWheel();
};


// ============================================================
// ANIMACE
// ============================================================

function animateWheel() {

    spinVelocity *= friction;

    startAngle += spinVelocity;


    drawWheel();


    const availableItems =
        activeItems.filter(
            item => !item.disabled
        );


    if (
        availableItems.length > 0
    ) {

        const sectorSize =
            Math.PI * 2 /
            availableItems.length;


        const currentSector =
            Math.floor(
                (
                    (
                        startAngle %
                        (Math.PI * 2)
                    ) +
                    Math.PI * 2
                ) %
                (Math.PI * 2) /
                sectorSize
            );


        if (
            currentSector !==
            lastSoundSector
        ) {

            playTickSound();

            lastSoundSector =
                currentSector;
        }
    }


    if (
        spinVelocity < 0.002
    ) {

        stopRotateWheel();

        return;
    }


    animFrameId =
        requestAnimationFrame(
            animateWheel
        );
}


// ============================================================
// ZASTAVENÍ KOLA
// ============================================================

function stopRotateWheel() {

    if (animFrameId) {

        cancelAnimationFrame(
            animFrameId
        );

        animFrameId = null;
    }


    isSpinning = false;


    const spinBtn =
        document.getElementById(
            'spinBtn'
        );


    if (spinBtn) {
        spinBtn.disabled = false;
    }


    const availableItems =
        activeItems.filter(
            item => !item.disabled
        );


    if (
        availableItems.length === 0
    ) {
        return;
    }


    const arc =
        Math.PI /
        (
            availableItems.length / 2
        );


    const degrees =
        startAngle *
        180 /
        Math.PI +
        90;


    const arcd =
        arc *
        180 /
        Math.PI;


    const normalizedDegrees =
        (
            degrees % 360 +
            360
        ) % 360;


    const index =
        Math.floor(
            (
                360 -
                normalizedDegrees
            ) /
            arcd
        ) %
        availableItems.length;


    const winner =
        availableItems[index];


    selectedItemIndex =
        activeItems.findIndex(
            item =>
                item.id === winner.id
        );


    if (
        selectedItemIndex < 0
    ) {

        console.error(
            "❌ Vylosovanou položku se nepodařilo najít."
        );

        return;
    }


    playWinSound();


    // --------------------------------------------------------
    // MODAL
    // --------------------------------------------------------

    const modalIcon =
        document.getElementById(
            'modalIcon'
        );


    const modalSubtitle =
        document.getElementById(
            'modalSubtitle'
        );


    const winnerText =
        document.getElementById(
            'winnerText'
        );


    if (modalIcon) {

        modalIcon.innerText =
            '🎉';
    }


    if (modalSubtitle) {

        modalSubtitle.innerText =
            'Ausgewählt:';
    }


    if (winnerText) {

        winnerText.innerText =
            winner.fullName ||
            winner.text;
    }


    const studentControls =
        document.getElementById(
            'studentModalControls'
        );


    const vocabControls =
        document.getElementById(
            'vocabModalControls'
        );


    const finalControls =
        document.getElementById(
            'finalModalControls'
        );


    studentControls?.classList.toggle(
        'hidden',
        currentTab !== 'students'
    );


    vocabControls?.classList.toggle(
        'hidden',
        currentTab !== 'vocab'
    );


    finalControls?.classList.add(
        'hidden'
    );


    document
        .getElementById(
            'winnerModal'
        )
        ?.classList.remove(
            'hidden'
        );
}


// ============================================================
// ZAVŘENÍ MODALU
// ============================================================

window.closeModal = function() {

    document
        .getElementById(
            'winnerModal'
        )
        ?.classList.add(
            'hidden'
        );


    // --------------------------------------------------------
    // KONEC SLOVNÍ ZÁSOBY
    // --------------------------------------------------------
    //
    // Po zavření výsledné obrazovky připravíme novou hru.
    // --------------------------------------------------------

    if (
        currentTab === 'vocab' &&
        activeItems.length > 0 &&
        activeItems.every(
            item => item.disabled
        )
    ) {

        prepareVocabItems();
    }


    selectedItemIndex = null;
};
