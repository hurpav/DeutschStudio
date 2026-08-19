console.log("Domino modul načten.");

// 1) Načtení JSON souboru z URL parametru
const params = new URLSearchParams(window.location.search);
const file = params.get("file");

let words = [];

fetch("../../" + file)
    .then(res => res.json())
    .then(data => {
        words = data.words || [];
        console.log("Načteno slov:", words.length);
        generatePreview();
    })
    .catch(err => console.error("Chyba při načítání JSON:", err));


// 2) Generování náhledu
function generatePreview() {
    const countSelect = document.getElementById("countSelect").value;
    let selectedWords = [...words];

    if (countSelect !== "all") {
        selectedWords = selectedWords.slice(0, Number(countSelect));
    }

    const grid = document.getElementById("dominoGrid");
    grid.innerHTML = "";

    selectedWords.forEach(word => {
        const artikel = word.artikel || "";
        const de = word.de || "";
        const img = word.image?.file || "";

        let genderClass = "neuter";
        if (artikel === "der") genderClass = "masculine";
        if (artikel === "die") genderClass = "feminine";
        if (artikel === "das") genderClass = "neuter";

        const card = document.createElement("div");
        card.className = `domino-card ${genderClass}`;

        card.innerHTML = `
            <img src="../../assets/images/${img}" class="domino-img">
            <div style="font-size: 1.2em; font-weight: bold;">${artikel} ${de}</div>
        `;

        grid.appendChild(card);
    });
}


// 3) Export do PDF
function exportToPDF() {
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ unit: "pt", format: "a4" });

    pdf.setFont("DejaVuSans");

    let y = 40;

    words.forEach((word, index) => {
        const artikel = word.artikel || "";
        const de = word.de || "";
        const img = word.image?.file || "";

        pdf.text(`${artikel} ${de}`, 40, y);

        pdf.addImage(`../../assets/images/${img}`, "PNG", 200, y - 30, 80, 80);

        y += 120;
        if (y > 750) {
            pdf.addPage();
            y = 40;
        }
    });

    pdf.save("domino.pdf");
}


// 4) Zpět na dashboard
function goBack() {
    window.location.href = "../../index.html";
}
