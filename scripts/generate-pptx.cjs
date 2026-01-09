const PptxGenJS = require("pptxgenjs");

const pres = new PptxGenJS();

// --- 1. CONFIG & BRANDING ---
const TDC_MAGENTA = "E20074";
const TDC_DARK_BLUE = "002855";
const TDC_WHITE = "FFFFFF";
const TDC_GRAY = "666666";
const TDC_LIGHT_GRAY = "F5F5F5";
const TDC_CYAN = "00B5E2";

// Set Metadata
pres.title = "TDC Erhverv | Strategisk Briefing - Digital Suverænitet";
pres.subject = "Digital Suverænitet 2025";
pres.author = "TDC Erhverv x @dot";
pres.company = "TDC Erhverv";

// Define Master Slide
pres.defineSlideMaster({
    title: "TDC_MASTER",
    background: { color: TDC_WHITE },
    objects: [
        // Top Bar (Magenta)
        { rect: { x: 0, y: 0, w: "100%", h: 0.15, fill: { color: TDC_MAGENTA } } },
        // Footer Line
        { line: { x: 0.5, y: 7.0, w: 9.0, h: 0, line: { color: TDC_LIGHT_GRAY, width: 1 } } },
        // Logo Text
        { text: { text: "TDC Erhverv x @dot", options: { x: 0.5, y: 7.1, w: 3, h: 0.3, fontFace: "Arial", fontSize: 10, color: TDC_MAGENTA, bold: true } } },
        // Slide Number placement handled by slideNumber prop, but we can add fixed text if needed
    ],
    slideNumber: { x: 9.0, y: 7.1, w: 0.5, h: 0.3, color: TDC_GRAY, fontFace: "Arial", fontSize: 10 }
});

// --- SLIDE 1: COVER ---
let slide1 = pres.addSlide({ masterName: "TDC_MASTER" });

// Tag
slide1.addText("Strategisk Briefing", { x: 0.5, y: 1.0, w: 3, h: 0.3, color: TDC_MAGENTA, fontSize: 10, bold: true, caps: true, letterSpacing: 1 });

// Title
slide1.addText("Danmarks Digitale Forsvar & Suverænitet", { x: 0.5, y: 1.5, w: 9, h: 1.5, color: TDC_DARK_BLUE, fontSize: 32, fontFace: "Arial", bold: true });

// Subtitle
slide1.addText("Transformation af teknisk intelligens til forretningsværdi for TDC Erhverv. Baseret på harvested viden (Sovereignty 2025).", { x: 0.5, y: 2.8, w: 9, h: 0.5, color: TDC_GRAY, fontSize: 14 });

// Figures (3 cards)
const cardY = 4.0;
const cardW = 2.5;
const gap = 0.5;
const startX = 0.75; // Centered roughly: 10 wide total. 3*2.5 = 7.5. Gaps 1.0. Margins 0.75

// Card 1
slide1.addShape(pres.ShapeType.rect, { x: startX, y: cardY, w: cardW, h: 2.0, fill: { color: TDC_LIGHT_GRAY }, r: 5 });
slide1.addText("87%", { x: startX, y: cardY + 0.3, w: cardW, h: 0.8, align: 'center', color: TDC_MAGENTA, fontSize: 36, bold: true });
slide1.addText("Cloudmarked styret af USA", { x: startX, y: cardY + 1.1, w: cardW, h: 0.5, align: 'center', color: TDC_DARK_BLUE, fontSize: 12 });

// Card 2
let x2 = startX + cardW + gap;
slide1.addShape(pres.ShapeType.rect, { x: x2, y: cardY, w: cardW, h: 2.0, fill: { color: TDC_LIGHT_GRAY }, r: 5 });
slide1.addText("21 mia", { x: x2, y: cardY + 0.3, w: cardW, h: 0.8, align: 'center', color: TDC_MAGENTA, fontSize: 36, bold: true });
slide1.addText("IT-behov i Forsvaret", { x: x2, y: cardY + 1.1, w: cardW, h: 0.5, align: 'center', color: TDC_DARK_BLUE, fontSize: 12 });

// Card 3
let x3 = x2 + cardW + gap;
slide1.addShape(pres.ShapeType.rect, { x: x3, y: cardY, w: cardW, h: 2.0, fill: { color: TDC_LIGHT_GRAY }, r: 5 });
slide1.addText("100%", { x: x3, y: cardY + 0.3, w: cardW, h: 0.8, align: 'center', color: TDC_MAGENTA, fontSize: 36, bold: true });
slide1.addText("Dansk Suverænitet med @dot", { x: x3, y: cardY + 1.1, w: cardW, h: 0.5, align: 'center', color: TDC_DARK_BLUE, fontSize: 12 });


// --- SLIDE 2: THE PROBLEM ---
let slide2 = pres.addSlide({ masterName: "TDC_MASTER" });
slide2.addText("Udfordringen", { x: 0.5, y: 1.0, w: 3, h: 0.3, color: TDC_MAGENTA, fontSize: 10, bold: true, caps: true, letterSpacing: 1 });
slide2.addText("Den Sikkerhedspolitiske Krise", { x: 0.5, y: 1.4, w: 9, h: 0.6, color: TDC_DARK_BLUE, fontSize: 24, fontFace: "Arial", bold: true });

slide2.addText('Rusland udgør en stigende cybertrussel mod dansk kritisk infrastruktur. Forsvarets IT-sikkerhed er i "strukturel ubalance" ifølge Statsrevisorerne.',
    { x: 0.5, y: 2.2, w: 9, h: 0.8, color: TDC_GRAY, fontSize: 14 });

slide2.addText([
    { text: "Schrems II & GDPR skaber juridisk usikkerhed for cloud.", options: { bullet: true, color: TDC_GRAY, fontSize: 14 } },
    { text: "NIS2 kravene stiller nye strenge krav til ledelsesansvar.", options: { bullet: true, color: TDC_GRAY, fontSize: 14 } },
    { text: "Behov for suveræn dansk infrastruktur har aldrig været større.", options: { bullet: true, color: TDC_GRAY, fontSize: 14 } }
], { x: 0.8, y: 3.2, w: 8.5, h: 2.0, lineSpacing: 24 });


// --- SLIDE 3: THE SOLUTION ---
let slide3 = pres.addSlide({ masterName: "TDC_MASTER" });
slide3.addText("Løsningen", { x: 0.5, y: 1.0, w: 3, h: 0.3, color: TDC_MAGENTA, fontSize: 10, bold: true, caps: true, letterSpacing: 1 });
slide3.addText("Det Suveræne Output (The Stack)", { x: 0.5, y: 1.4, w: 9, h: 0.6, color: TDC_DARK_BLUE, fontSize: 24, fontFace: "Arial", bold: true });

// Grid of 4
const solW = 4.2;
const solH = 1.5;
const solGap = 0.4;
const solY1 = 2.5;
const solY2 = solY1 + solH + solGap;

// Sol 1
slide3.addShape(pres.ShapeType.rect, { x: 0.5, y: solY1, w: solW, h: solH, fill: { color: TDC_LIGHT_GRAY }, r: 5 });
slide3.addText("CloudKey®", { x: 0.6, y: solY1 + 0.2, w: 3, h: 0.4, color: TDC_MAGENTA, fontSize: 16, bold: true });
slide3.addText("BYOK/HYOK løsning, der sikrer 100% kontrol over krypteringsnøgler på dansk jord.", { x: 0.6, y: solY1 + 0.6, w: 3.8, h: 0.8, color: TDC_GRAY, fontSize: 11 });

// Sol 2
slide3.addShape(pres.ShapeType.rect, { x: 0.5 + solW + solGap, y: solY1, w: solW, h: solH, fill: { color: TDC_LIGHT_GRAY }, r: 5 });
slide3.addText("Gefion AI", { x: 0.6 + solW + solGap, y: solY1 + 0.2, w: 3, h: 0.4, color: TDC_MAGENTA, fontSize: 16, bold: true });
slide3.addText("Suveræn AI compute i Danmark, synkroniseret med @dot agenter.", { x: 0.6 + solW + solGap, y: solY1 + 0.6, w: 3.8, h: 0.8, color: TDC_GRAY, fontSize: 11 });

// Sol 3
slide3.addShape(pres.ShapeType.rect, { x: 0.5, y: solY2, w: solW, h: solH, fill: { color: TDC_LIGHT_GRAY }, r: 5 });
slide3.addText("5G Private Networks", { x: 0.6, y: solY2 + 0.2, w: 3, h: 0.4, color: TDC_MAGENTA, fontSize: 16, bold: true });
slide3.addText("Isoleret, sikker konnektivitet til militærbaser og kritisk industri.", { x: 0.6, y: solY2 + 0.6, w: 3.8, h: 0.8, color: TDC_GRAY, fontSize: 11 });

// Sol 4
slide3.addShape(pres.ShapeType.rect, { x: 0.5 + solW + solGap, y: solY2, w: solW, h: solH, fill: { color: TDC_LIGHT_GRAY }, r: 5 });
slide3.addText("@dot Constellation", { x: 0.6 + solW + solGap, y: solY2 + 0.2, w: 3, h: 0.4, color: TDC_MAGENTA, fontSize: 16, bold: true });
slide3.addText("Autonom orkestrering af viden og sikkerhed i realtid.", { x: 0.6 + solW + solGap, y: solY2 + 0.6, w: 3.8, h: 0.8, color: TDC_GRAY, fontSize: 11 });


// --- SLIDE 4: NEXT STEPS ---
let slide4 = pres.addSlide({ masterName: "TDC_MASTER" });
slide4.addText("Next Steps", { x: 0.5, y: 1.0, w: 3, h: 0.3, color: TDC_MAGENTA, fontSize: 10, bold: true, caps: true, letterSpacing: 1 });
slide4.addText("Fra Strategi til Eksekvering", { x: 0.5, y: 1.4, w: 9, h: 0.6, color: TDC_DARK_BLUE, fontSize: 24, fontFace: "Arial", bold: true });
slide4.addText("Phase 4 er nu operationaliseret og klar til briefing af interessenter.", { x: 0.5, y: 2.2, w: 9, h: 0.5, color: TDC_GRAY, fontSize: 14 });

// Indented list
slide4.addShape(pres.ShapeType.rect, { x: 0.8, y: 3.0, w: 0.05, h: 2.5, fill: { color: TDC_MAGENTA } }); // Vertical bar

slide4.addText([
    { text: "Q1 2026: ", options: { bold: true, color: TDC_DARK_BLUE } },
    { text: "Etablering af Forsvars-salgsteam og POC-opstart.", options: { color: TDC_GRAY } }
], { x: 1.0, y: 3.0, w: 8, h: 0.5, fontSize: 14 });

slide4.addText([
    { text: "Q2 2026: ", options: { bold: true, color: TDC_DARK_BLUE } },
    { text: "Fuld integration af Gefion AI i CloudKey økosystemet.", options: { color: TDC_GRAY } }
], { x: 1.0, y: 3.7, w: 8, h: 0.5, fontSize: 14 });

slide4.addText([
    { text: "End-goal: ", options: { bold: true, color: TDC_DARK_BLUE } },
    { text: "Et suverænt Danmark, understøttet af @dot intelligens.", options: { color: TDC_GRAY } }
], { x: 1.0, y: 4.4, w: 8, h: 0.5, fontSize: 14 });


// --- EXPORT ---
console.log("Generating PPTX...");
pres.writeFile({ fileName: "exports/TDC_Erhverv_Strategi_Brief_2025.pptx" })
    .then(fileName => {
        console.log(`Created file: ${fileName}`);
    })
    .catch(err => {
        console.error("Error creating PPTX:", err);
    });
