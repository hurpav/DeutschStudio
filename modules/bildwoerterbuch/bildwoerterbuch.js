let database = [];

// --------------------------------------------------
// Barvy podle členu
// --------------------------------------------------
function getColor(article) {
    switch (article) {
        case "der": return "#1e40af";
        case "die": return "#dc2626";
        case "das": return "#059669";
        default: return "#000000";
    }
}

// --------------------------------------------------
// Nápovědy / Texty
// --------------------------------------------------
function makeAnagram(word) {
    if (!word) return "";
    const letters = word.toUpperCase().split("");

    for (let i = letters.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [letters[i], letters[j]] = [letters[j], letters[i]];
    }

    const spaced = letters.join(" ");

    if (spaced.length > 10) {
        const half = Math.ceil(letters.length / 2);
        const line1 = letters.slice(0, half).join(" ");
        const line2 = letters.slice(half).join(" ");
        return "(" + line1 + "\n" + line2 + ")";
    }

    return "(" + spaced + ")";
}

function getHintText(item, hintType) {
    const word = item.word || "";
    const article = item.article || "";
    const first = word.charAt(0);

    switch (hintType) {
        case "full": 
            return article ? `${article} ${word}` : word;
        case "none": 
            return "__________";
        case "article": 
            return article || "___";
        case "first": 
            return first ? `${first}____` : "____";
        case "anagram": 
            return makeAnagram(word);
        case "article_first": 
            return article ? `${article} ${first}____` : `${first}____`;
        default: 
            return article ? `${article} ${word}` : word;
    }
}

// --------------------------------------------------
// Načtení JSONu
// --------------------------------------------------
export async function loadWords() {
    try {
        const params = new URLSearchParams(window.location.search);
        const ucebnice = params.get("ucebnice");
        const folder = params.get("folder");

        if (ucebnice && folder) {
            const fullPath = `/data/slovicka/${ucebnice}/${folder}/data.json`;
            const response = await fetch(fullPath);
            const data = await response.json();

            database = data.words.map(item => ({
                word: item.de,
                article: item.artikel,
                translation: item.cz,
                image: `/data/slovicka/${ucebnice}/${folder}/images/${item.image ? item.image.file : ''}`
            }));
        }

        changeMode();
    } catch (err) {
        console.error("Chyba při načítání JSON dat:", err);
    }
}

// --------------------------------------------------
// Filtr počtu obrázků
// --------------------------------------------------
function getFilteredItems() {
    const countElem = document.getElementById("countSelect");
    if (!countElem) return database;

    const countValue = countElem.value;
    if (countValue === "all") return database;

    const count = parseInt(countValue, 10);
    return database.slice(0, count);
}

// --------------------------------------------------
// Náhled procvičování na obrazovce
// --------------------------------------------------
export function generatePreview() {
    const hintElem = document.getElementById("hintSelect");
    const hintType = hintElem ? hintElem.value : "full";

    const grid = document.getElementById('exerciseGrid');
    if (!grid) return;

    grid.innerHTML = '';
    grid.style.display = "flex";
    grid.style.flexWrap = "wrap";
    grid.style.gap = "15px";

    const items = getFilteredItems();

    items.forEach(item => {
        const color = getColor(item.article);

        const card = document.createElement('div');
        card.style.border = `3px solid ${color}`;
        card.style.borderRadius = "10px";
        card.style.padding = "10px";
        card.style.background = "white";
        card.style.width = "180px";
        card.style.minHeight = "200px";
        card.style.display = "flex";
        card.style.flexDirection = "column";
        card.style.alignItems = "center";

        const imgWrapper = document.createElement('div');
        imgWrapper.style.width = "90px";
        imgWrapper.style.height = "90px";
        imgWrapper.style.borderRadius = "8px";
        imgWrapper.style.border = "1px solid #e5e7eb";
        imgWrapper.style.display = "flex";
        imgWrapper.style.alignItems = "center";
        imgWrapper.style.justifyContent = "center";
        imgWrapper.style.overflow = "hidden";
        imgWrapper.style.marginBottom = "8px";

        const img = document.createElement('img');
        img.src = item.image;
        img.style.maxWidth = "100%";
        img.style.maxHeight = "100%";
        img.onerror = () => img.src = 'https://via.placeholder.com/90';
        imgWrapper.appendChild(img);
        card.appendChild(imgWrapper);

        const hint = document.createElement('div');
        hint.textContent = getHintText(item, hintType);
        hint.style.marginTop = "10px";
        hint.style.fontSize = "18px";
        hint.style.fontWeight = "bold";
        hint.style.textAlign = "center";
        hint.style.whiteSpace = "pre-line";
        card.appendChild(hint);

        grid.appendChild(card);
    });
}

// --------------------------------------------------
// Náhled TISK na obrazovce
// --------------------------------------------------
export function generatePrint() {
    const hintElem = document.getElementById("hintSelect");
    const hintType = hintElem ? hintElem.value : "full";

    const grid = document.getElementById('exerciseGrid');
    if (!grid) return;

    grid.innerHTML = "";
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(2, 1fr)";
    grid.style.gap = "20px";

    const items = getFilteredItems();

    items.forEach(item => {
        const color = getColor(item.article);

        const card = document.createElement("div");
        card.style.border = `4px solid ${color}`;
        card.style.borderRadius = "12px";
        card.style.padding = "15px";
        card.style.background = "white";
        card.style.display = "flex";
        card.style.flexDirection = "column";
        card.style.alignItems = "center";
        card.style.minHeight = "260px";

        const img = document.createElement("img");
        img.src = item.image;
        img.style.width = "120px";
        img.style.height = "120px";
        img.style.objectFit = "contain";
        img.onerror = () => img.src = 'https://via.placeholder.com/120';

        const hint = document.createElement("div");
        hint.textContent = getHintText(item, hintType);
        hint.style.marginTop = "12px";
        hint.style.fontSize = "20px";
        hint.style.fontWeight = "bold";
        hint.style.textAlign = "center";
        hint.style.whiteSpace = "pre-line";

        card.appendChild(img);
        card.appendChild(hint);
        grid.appendChild(card);
    });
}

// --------------------------------------------------
// Přepínání režimů
// --------------------------------------------------
export function changeMode() {
    const modeElem = document.getElementById("modeSelect");
    const mode = modeElem ? modeElem.value : "practice";

    if (mode === "print") generatePrint();
    else generatePreview();
}

// --------------------------------------------------
// PDF – konverze a optimalizace obrázku (Zmenšení rozlišení + JPEG komprese)
// --------------------------------------------------
function loadImageAsBase64(url) {
    return new Promise(resolve => {
        if (!url) { resolve(""); return; }
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = function () {
            // Omezíme rozlišení obrázku pro PDF na max 400px
            const MAX_SIZE = 400;
            let width = img.naturalWidth || 400;
            let height = img.naturalHeight || 400;

            if (width > height) {
                if (width > MAX_SIZE) {
                    height *= MAX_SIZE / width;
                    width = MAX_SIZE;
                }
            } else {
                if (height > MAX_SIZE) {
                    width *= MAX_SIZE / height;
                    height = MAX_SIZE;
                }
            }

            const canvas = document.createElement("canvas");
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");

            // Bílé pozadí pro JPEG
            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, width, height);

            ctx.drawImage(img, 0, 0, width, height);
            try {
                // Převod na JPEG s kompresí 75%
                resolve(canvas.toDataURL("image/jpeg", 0.75));
            } catch (e) {
                resolve("");
            }
        };
        img.onerror = () => resolve("");
        img.src = url;
    });
}

// --------------------------------------------------
// PDF Export (2× A5 na A4 na šířku s komprimovanými obrázky)
// --------------------------------------------------
export async function exportToPDF() {
    const jsPDFLib = window.jspdf ? window.jspdf.jsPDF : null;
    if (!jsPDFLib) {
        alert("Knihovna jsPDF nebyla načtena!");
        return;
    }

    const doc = new jsPDFLib({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    try {
        if (doc.existsFileInVFS && doc.existsFileInVFS("DejaVuSans.ttf")) {
            doc.addFont("DejaVuSans.ttf", "DejaVu", "normal");
            doc.setFont("DejaVu");
        }
    } catch(e) {
        console.warn("Písmo DejaVu není k dispozici, použije se standardní font.");
    }

    const hintElem = document.getElementById("hintSelect");
    const hintType = hintElem ? hintElem.value : "full";
    const items = getFilteredItems();
    const count = items.length;

    if (count === 0) {
        alert("Žádná slovíčka k exportu!");
        return;
    }

    // Výpočet mřížky
    let cols = 2, rows = 2;
    if (count > 4 && count <= 6) { cols = 2; rows = 3; }
    else if (count > 6 && count <= 8) { cols = 2; rows = 4; }
    else if (count > 8 && count <= 12) { cols = 3; rows = 4; }
    else if (count > 12) { cols = 4; rows = 5; }

    const halfWidth = 148.5;
    const paddingX = 8;
    const paddingY = 15;
    const availWidth = halfWidth - (paddingX * 2);
    const availHeight = 180;

    const cellWidth = availWidth / cols;
    const cellHeight = availHeight / rows;
    const boxSize = Math.min(cellWidth - 4, cellHeight - 10);

    // Načtení optimalizovaných JPEG obrázků
    const loadedImages = [];
    for (let item of items) {
        const imgB64 = await loadImageAsBase64(item.image);
        loadedImages.push(imgB64);
    }

    function drawA5Set(offsetX) {
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text("Obrázkový slovníček", offsetX + paddingX, 10);

        for (let i = 0; i < count; i++) {
            const item = items[i];
            const imgB64 = loadedImages[i];
            const col = i % cols;
            const row = Math.floor(i / cols);

            const x = offsetX + paddingX + (col * cellWidth) + (cellWidth - boxSize) / 2;
            const y = paddingY + (row * cellHeight);

            const color = getColor(item.article);
            doc.setDrawColor(color);
            doc.setLineWidth(1.2);
            doc.rect(x, y, boxSize, boxSize);

            // Vkládáme komprimovaný JPEG
            if (imgB64) {
                try {
                    doc.addImage(imgB64, "JPEG", x + 1.5, y + 1.5, boxSize - 3, boxSize - 3);
                } catch(e) {
                    console.warn("Chyba při vkládání obrázku:", e);
                }
            }

            doc.setFontSize(cols >= 3 ? 9 : 11);
            doc.setTextColor(0, 0, 0);
            const text = getHintText(item, hintType);
            doc.text(text, x + (boxSize / 2), y + boxSize + 4.5, { align: "center" });
        }
    }

    // Levý a pravý žák
    drawA5Set(0);
    drawA5Set(148.5);

    // Dělící čára
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.5);
    doc.setLineDashPattern([2, 2], 0);
    doc.line(148.5, 5, 148.5, 205);

    doc.save(`slovnicek-2xA5-${count}ks.pdf`);
}

export function goBack() {
    window.location.href = "/index.html";
}

// --------------------------------------------------
// PROPOJENÍ S HTML
// --------------------------------------------------
window.loadWords = loadWords;
window.changeMode = changeMode;
window.exportToPDF = exportToPDF;
window.goBack = goBack;

window.addEventListener("DOMContentLoaded", loadWords);