let jsonPairs = [];
let manualPairs = [];
let activePairs = [];
let currentInputMode = "json"; // 'json' nebo 'manual'
let topicName = "Trimino";

function odstranDiakritiku(text) {
    if (!text) return "";
    return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function getColor(article) {
    switch (article) {
        case "der": return "#1e40af";
        case "die": return "#dc2626";
        case "das": return "#059669";
        default: return "#000000";
    }
}

// 1. Načtení slovíček z JSONu
export async function loadWords() {
    try {
        const params = new URLSearchParams(window.location.search);
        const ucebnice = params.get("ucebnice") || "maximal1";
        const folder = params.get("folder") || "1.1_wer_bist_du";
        topicName = folder;

        const fullPath = `../../data/slovicka/${ucebnice}/${folder}/data.json`;
        const response = await fetch(fullPath);
        const data = await response.json();

        jsonPairs = data.words.map(item => {
            const article = item.artikel ? item.artikel.trim() : "";
            const word = item.de ? item.de.trim() : "";
            const fullDe = article ? `${article} ${word}` : word;

            return {
                de: fullDe,
                cz: item.cz ? item.cz.trim() : "",
                article: article,
                image: item.image && item.image.file ? `../../data/slovicka/${ucebnice}/${folder}/images/${item.image.file}` : ""
            };
        });

        switchInputMode("json");
    } catch (err) {
        console.error("Chyba při načítání slovíček pro Trimino:", err);
    }
}

// 2. Přepínání mezi načítáním z JSONu a ručním textovým vstupem
export function switchInputMode(mode) {
    currentInputMode = mode;
    
    const jsonBtn = document.getElementById("modeJsonBtn");
    const manualBtn = document.getElementById("modeManualBtn");
    const manualBox = document.getElementById("manualInputBox");

    if (mode === "json") {
        jsonBtn.classList.add("active");
        manualBtn.classList.remove("active");
        manualBox.style.display = "none";
        activePairs = [...jsonPairs];
    } else {
        manualBtn.classList.add("active");
        jsonBtn.classList.remove("active");
        manualBox.style.display = "block";
        parseManualInput();
    }

    changeMode();
}

// 3. Zpracování ručně vloženého textu z textarea (rozbalení na pojem - překlad)
export function parseManualInput() {
    if (currentInputMode !== "manual") return;

    const textarea = document.getElementById("manualTextarea");
    if (!textarea) return;

    const lines = textarea.value.split("\n");
    manualPairs = [];

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // Rozdělení řádku podle pomlčky nebo středníku (- nebo ;)
        let parts = trimmed.split(/[-;]/);
        if (parts.length >= 2) {
            let rawDe = parts[0].trim();
            let rawCz = parts[1].trim();
            let article = "";

            // Zjištění rodu ze slova (der / die / das)
            const firstWord = rawDe.split(" ")[0].toLowerCase();
            if (["der", "die", "das"].includes(firstWord)) {
                article = firstWord;
            }

            manualPairs.push({
                de: rawDe,
                cz: rawCz,
                article: article,
                image: "" // Ručně zadaná slova nemají obrázek
            });
        }
    });

    activePairs = [...manualPairs];
    changeMode();
}

// 4. Aktualizace náhledu v tabulce
export function changeMode() {
    const selectedType = document.getElementById("triminoType").value;
    const isImageMode = document.getElementById("imageModeCheckbox").checked;
    const downloadZipBtn = document.getElementById("downloadZipBtn");
    const tbody = document.getElementById("previewTableBody");

    if (downloadZipBtn) {
        downloadZipBtn.style.display = isImageMode ? "inline-flex" : "none";
    }

    if (!tbody) return;
    tbody.innerHTML = "";

    let requiredPairs = 12;
    if (selectedType === "2") requiredPairs = 9;
    if (selectedType === "3") requiredPairs = 30;

    for (let i = 0; i < requiredPairs; i++) {
        const pair = activePairs[i];
        const tr = document.createElement("tr");

        const color = pair ? getColor(pair.article) : "#000000";
        const deText = pair ? pair.de : "---";
        const czText = pair ? (isImageMode ? `${i + 1}.png` : pair.cz) : "---";

        tr.innerHTML = `
            <td><strong>${i + 1}.</strong></td>
            <td style="color: ${color}; font-weight: bold;">${deText}</td>
            <td>${czText}</td>
            <td id="imgCell_${i}">
                <span style="color:#94a3b8; font-style:italic;">--</span>
            </td>
        `;
        tbody.appendChild(tr);

        renderCanvasPreview(`imgCell_${i}`, pair ? pair.image : null);
    }
}

function renderCanvasPreview(cellId, imgUrl) {
    const cell = document.getElementById(cellId);
    if (!cell) return;
    cell.innerHTML = "";

    if (!imgUrl) {
        cell.innerHTML = '<span style="color: #94a3b8;">Bez obrázku</span>';
        return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = 300;
    canvas.height = 130;
    const ctx = canvas.getContext("2d");

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imgUrl;

    img.onload = () => {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 300, 130);

        const scale = Math.min(300 / img.width, 130 / img.height);
        const x = (300 - img.width * scale) / 2;
        const y = (130 - img.height * scale) / 2;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

        cell.appendChild(canvas);
    };

    img.onerror = () => {
        cell.innerHTML = '<span style="color: #dc2626;">Chyba obrázku</span>';
    };
}

// 5. Generování ZIP archivu (300×130 px)
export async function downloadZipArchive() {
    if (typeof JSZip === "undefined") {
        alert("Knihovna JSZip není načtena!");
        return;
    }

    const selectedType = document.getElementById("triminoType").value;
    let requiredPairs = 12;
    if (selectedType === "2") requiredPairs = 9;
    if (selectedType === "3") requiredPairs = 30;

    const zip = new JSZip();
    const downloadZipBtn = document.getElementById("downloadZipBtn");
    if (downloadZipBtn) downloadZipBtn.innerText = "⏳ Připravuji ZIP...";

    for (let i = 0; i < requiredPairs; i++) {
        const pair = activePairs[i];
        const blob = await generateImageBlob(pair ? pair.image : null);
        zip.file(`${i + 1}.png`, blob);
    }

    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(content);
    link.download = `trimino_300x130_${topicName}.zip`;
    link.click();

    if (downloadZipBtn) downloadZipBtn.innerText = "📦 Stáhnout obrázkový ZIP (300×130)";
}

function generateImageBlob(imgUrl) {
    return new Promise((resolve) => {
        const canvas = document.createElement("canvas");
        canvas.width = 300;
        canvas.height = 130;
        const ctx = canvas.getContext("2d");

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 300, 130);

        if (!imgUrl) {
            canvas.toBlob((blob) => resolve(blob), "image/png");
            return;
        }

        const img = new Image();
        img.crossOrigin = "anonymous";
        img.src = imgUrl;

        img.onload = () => {
            const scale = Math.min(300 / img.width, 130 / img.height);
            const x = (300 - img.width * scale) / 2;
            const y = (130 - img.height * scale) / 2;
            ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
            canvas.toBlob((blob) => resolve(blob), "image/png");
        };

        img.onerror = () => {
            canvas.toBlob((blob) => resolve(blob), "image/png");
        };
    });
}

// 6. Odeslání do Paulova generátoru přes GET (s automatickým ořezem diakritiky)
export function sendToPaulMatthies() {
    const selectedType = document.getElementById("triminoType").value;
    let requiredPairs = 12;
    if (selectedType === "2") requiredPairs = 9;
    if (selectedType === "3") requiredPairs = 30;

    const isImageMode = document.getElementById("imageModeCheckbox").checked;
    const baseUrl = "https://schule.paul-matthies.de/Trimino.php";
    const alphabet = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z", "AA", "AB", "AC", "AD"];
    
    let urlParams = [];
    urlParams.push(`style=${selectedType}`);
    urlParams.push(`thema=${encodeURIComponent(odstranDiakritiku(topicName))}`);
    urlParams.push(`font1=monospace`);
    urlParams.push(`font2=sans`);
    urlParams.push(`color1=000000`);
    urlParams.push(`color2=980000`);

    for (let i = 0; i < requiredPairs; i++) {
        const letter = alphabet[i];
        const pair = activePairs[i];

        const deVal = pair ? pair.de : `Dummy ${i + 1}`;
        const czVal = pair ? pair.cz : `Test ${i + 1}`;

        urlParams.push(`${letter}1=${encodeURIComponent(odstranDiakritiku(deVal))}`);

        if (isImageMode) {
            urlParams.push(`${letter}2=${encodeURIComponent((i + 1) + ".png")}`);
        } else {
            urlParams.push(`${letter}2=${encodeURIComponent(odstranDiakritiku(czVal))}`);
        }
    }

    const finalUrl = baseUrl + "?" + urlParams.join("&");
    window.open(finalUrl, "_blank");
}

window.switchInputMode = switchInputMode;
window.parseManualInput = parseManualInput;
window.changeMode = changeMode;
window.sendToPaulMatthies = sendToPaulMatthies;
window.downloadZipArchive = downloadZipArchive;
window.goBack = () => { window.location.href = "../../index.html"; };

loadWords();