let database = [];

// --------------------------------------------------
// Barvy podle členu
// --------------------------------------------------
function getColor(article) {
    switch(article) {
        case "der": return "#1e40af";   // modrá
        case "die": return "#dc2626";   // červená
        case "das": return "#059669";   // zelená
        default: return "#000000";
    }
}

// --------------------------------------------------
// Nápovědy
// --------------------------------------------------
function makeAnagram(word) {
    // 1) Velká písmena + rozdělení na znaky
    const letters = word.toUpperCase().split("");

    // 2) Zamíchání
    for (let i = letters.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [letters[i], letters[j]] = [letters[j], letters[i]];
    }

    // 3) Spojení s mezerami
    const spaced = letters.join(" ");

    // 4) Pokud je anagram dlouhý → rozdělíme na dva řádky
    if (spaced.length > 10) {
        const half = Math.ceil(letters.length / 2);
        const line1 = letters.slice(0, half).join(" ");
        const line2 = letters.slice(half).join(" ");
        return "(" + line1 + "\n" + line2 + ")";
    }

    // 5) Krátká slova zůstanou na jednom řádku
    return "(" + spaced + ")";
}


function getHintText(item, hintType) {
    const first = item.word.charAt(0);

    switch(hintType) {
        case "none": return "__________";
        case "article": return item.article;
        case "first": return first + "____";
        case "anagram": return makeAnagram(item.word);
        case "article_first": return `${item.article} ${first}____`;
        default: return item.word;
    }
}

// --------------------------------------------------
// Načtení JSONu
// --------------------------------------------------
async function loadWords() {
    const urlParams = new URLSearchParams(window.location.search);
    const jsonFile = urlParams.get("file");

    const response = await fetch("../../" + jsonFile);
    const data = await response.json();

    let words = data.words;

    // filtr počtu obrázků
    const countSelect = document.getElementById("countSelect").value;
    if (countSelect !== "all") {
        words = words.slice(0, parseInt(countSelect));
    }

    database = words.map(item => ({
        word: item.de,
        article: item.artikel,
        translation: item.cz,
        image: "../../" + item.image.file
    }));

    generatePreview();
}

document.addEventListener("DOMContentLoaded", () => {
    loadWords();
    document.getElementById("countSelect").addEventListener("change", loadWords);
});

// --------------------------------------------------
// Náhled
// --------------------------------------------------
function generatePreview() {
    const mode = document.getElementById("modeSelect").value;
    const hintType = document.getElementById("hintSelect").value;
    const grid = document.getElementById('exerciseGrid');
    grid.innerHTML = '';

    database.forEach(item => {
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
        img.onerror = () => img.src = 'https://placehold.co/80x80?text=IMG';

        imgWrapper.appendChild(img);
        card.appendChild(imgWrapper);

        if (mode === "print") {
            const wordEl = document.createElement('div');
            wordEl.textContent = `${item.article} ${item.word}`;
            wordEl.style.color = color;
            wordEl.style.fontWeight = "bold";
            wordEl.style.fontSize = "16px";

            const trEl = document.createElement('div');
            trEl.textContent = item.translation;
            trEl.style.color = "#4b5563";
            trEl.style.fontSize = "14px";

            card.appendChild(wordEl);
            card.appendChild(trEl);
        } else {
            const hintEl = document.createElement('div');
            hintEl.textContent = getHintText(item, hintType);
            hintEl.style.color = color;
            hintEl.style.fontWeight = "bold";
            hintEl.style.fontSize = "16px";

            card.appendChild(hintEl);
        }

        grid.appendChild(card);
    });
}

// --------------------------------------------------
// PDF export
// --------------------------------------------------
async function exportToPDF() {
    const mode = document.getElementById("modeSelect").value;
    const hintType = document.getElementById("hintSelect").value;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    doc.addFont("DejaVuSans.ttf", "DejaVuSans", "normal");
    doc.setFont("DejaVuSans");

    let y = 20;
    let col = 0;

    for (let item of database) {
        const x = col === 0 ? 20 : 110;
        const colorHex = getColor(item.article);

        const r = parseInt(colorHex.slice(1,3),16);
        const g = parseInt(colorHex.slice(3,5),16);
        const b = parseInt(colorHex.slice(5,7),16);

        const boxWidth = 70;
        const boxHeight = mode === "print" ? 42 : 38;

        doc.setDrawColor(r, g, b);
        doc.setLineWidth(1.5);
        doc.roundedRect(x, y, boxWidth, boxHeight, 3, 3);

        const imgBase64 = await loadImageAsBase64(item.image);
        doc.addImage(imgBase64, "PNG", x + 3, y + 3, 20, 20);

        doc.setFontSize(10);
        doc.setTextColor(r, g, b);

        if (mode === "print") {
            doc.text(`${item.article} ${item.word}`, x + 26, y + 12);
            doc.setTextColor(0,0,0);
            doc.text(item.translation, x + 26, y + 20);
        } else {
            const hintText = getHintText(item, hintType);
            doc.text(hintText, x + 26, y + 15);
        }

        if (col === 0) col = 1;
        else {
            col = 0;
            y += boxHeight + 8;
        }

        if (y > 240) {
            doc.addPage();
            y = 20;
            col = 0;
        }
    }

    doc.save(mode === "print" ? "slovnicek.pdf" : "procvicovani.pdf");
}

// --------------------------------------------------
// Obrázky
// --------------------------------------------------
async function loadImageAsBase64(url) {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise(resolve => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
    });
}

// --------------------------------------------------
// Zpět na dashboard
// --------------------------------------------------
function goBack() {
    window.location.href = "../../index.html";
}
