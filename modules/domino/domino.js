let database = [];
let dominoChain = [];

function getColor(article) {
    switch (article) {
        case "der": return "#1e40af";
        case "die": return "#dc2626";
        case "das": return "#059669";
        default: return "#000000";
    }
}

function getHintText(item, hintType) {
    const word = item.word || "";
    const article = item.article || "";
    const first = word.charAt(0);

    switch (hintType) {
        case "full": return article ? `${article} ${word}` : word;
        case "article": return article || "";
        case "first": return first ? `${first}____` : "";
        case "article_first": return article ? `${article} ${first}____` : `${first}____`;
        default: return article ? `${article} ${word}` : word;
    }
}

export async function loadWords() {
    try {
        const params = new URLSearchParams(window.location.search);
        const ucebnice = params.get("ucebnice") || "maximal1";
        const folder = params.get("folder") || "1.1_wer_bist_du";

        const fullPath = `../../data/slovicka/${ucebnice}/${folder}/data.json`;
        const response = await fetch(fullPath);
        const data = await response.json();

        database = data.words
            .filter(item => item.image && item.image.available && item.image.file)
            .map(item => ({
                word: item.de,
                article: item.artikel,
                translation: item.cz,
                image: `../../data/slovicka/${ucebnice}/${folder}/images/${item.image.file}`
            }));

        changeMode();
    } catch (err) {
        console.error("Chyba při načítání JSON dat:", err);
    }
}

function buildDominoChain(count) {
    if (database.length === 0) return [];
    
    let selected = [...database].sort(() => 0.5 - Math.random()).slice(0, count);
    
    while (selected.length < count && selected.length > 0) {
        selected.push(selected[selected.length % selected.length]);
    }

    dominoChain = [];
    for (let i = 0; i < selected.length; i++) {
        const prevItem = selected[(i - 1 + selected.length) % selected.length];
        const currentItem = selected[i];

        dominoChain.push({
            textItem: prevItem,
            imageItem: currentItem
        });
    }

    return dominoChain;
}

export function changeMode() {
    const countSelect = document.getElementById("countSelect");
    const hintSelect = document.getElementById("hintSelect");
    const container = document.getElementById("dominoGrid");
    
    if (!container) return;
    container.innerHTML = "";

    const count = parseInt(countSelect.value, 10);
    const hintType = hintSelect.value;
    const cards = buildDominoChain(count);

    const pageElem = document.createElement("div");
    pageElem.className = "preview-page-a4";

    const titleElem = document.createElement("div");
    titleElem.className = "preview-title";
    titleElem.innerText = `📄 Náhled A4 – Domino (${count} karet)`;
    pageElem.appendChild(titleElem);

    const gridElem = document.createElement("div");
    gridElem.className = "domino-grid-2col";

    cards.forEach((cardData) => {
        const cardElem = document.createElement("div");
        cardElem.className = "domino-card";
        
        const color = getColor(cardData.textItem.article);
        const text = getHintText(cardData.textItem, hintType);

        cardElem.innerHTML = `
            <div class="domino-text-side" style="color: ${color};">
                ${text}
            </div>
            <div class="domino-img-side">
                <img src="${cardData.imageItem.image}" alt="Domino">
            </div>
        `;
        gridElem.appendChild(cardElem);
    });

    pageElem.appendChild(gridElem);
    container.appendChild(pageElem);
}

function loadImageAsBase64(url) {
    return new Promise((resolve) => {
        if (!url) { resolve(""); return; }
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = function () {
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

            ctx.fillStyle = "#FFFFFF";
            ctx.fillRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);

            try {
                resolve(canvas.toDataURL("image/jpeg", 0.75));
            } catch (e) {
                resolve("");
            }
        };
        img.onerror = () => resolve("");
        img.src = url;
    });
}

export async function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

    const hintSelect = document.getElementById("hintSelect");
    const hintType = hintSelect.value;

    const cardW = 90;
    const cardH = 32;
    const startX = 12;
    const startY = 12;
    const gapX = 6;
    const gapY = 4;
    const cardsPerPage = 16;

    const exportBtn = document.getElementById("exportBtn");
    if (exportBtn) exportBtn.innerText = "⏳ Generuji PDF...";

    for (let i = 0; i < dominoChain.length; i++) {
        if (i > 0 && i % cardsPerPage === 0) {
            doc.addPage();
        }

        const pageIndex = i % cardsPerPage;
        const col = pageIndex % 2;
        const row = Math.floor(pageIndex / 2);

        const x = startX + col * (cardW + gapX);
        const y = startY + row * (cardH + gapY);

        doc.setDrawColor(160, 160, 160);
        doc.setLineWidth(0.4);
        doc.rect(x, y, cardW, cardH);

        doc.setLineDashPattern([1.5, 1.5], 0);
        doc.line(x + cardW / 2, y, x + cardW / 2, y + cardH);
        doc.setLineDashPattern([], 0);

        const textItem = dominoChain[i].textItem;
        const textColor = getColor(textItem.article);
        const text = getHintText(textItem, hintType);

        doc.setFont("DejaVuSans", "bold");
        doc.setFontSize(10.5);
        doc.setTextColor(textColor);
        doc.text(text, x + cardW / 4, y + cardH / 2 + 1.5, { align: "center", maxWidth: cardW / 2 - 4 });

        const imgData = await loadImageAsBase64(dominoChain[i].imageItem.image);
        if (imgData) {
            const imgSize = 22;
            const imgX = x + (cardW * 0.75) - (imgSize / 2);
            const imgY = y + (cardH / 2) - (imgSize / 2);
            doc.addImage(imgData, "JPEG", imgX, imgY, imgSize, imgSize);
        }
    }

    doc.save("domino_deutschstudio.pdf");

    if (exportBtn) exportBtn.innerText = "🖨️ Stáhnout Domino (PDF)";
}

window.changeMode = changeMode;
window.exportToPDF = exportToPDF;
window.goBack = () => { window.location.href = "../../index.html"; };

loadWords();