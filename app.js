/* ============================================================
   AI GOLDEN EBOOK STUDIO — app.js
   Archivo completamente reestructurado, limpio y funcional
   Incluye: acceso, generación, paginado real y exportación PDF
============================================================ */

/* ============================
      CONFIGURACIÓN
============================ */

const BASIC_KEY = "BASICO-2025";
const PRO_KEY = "PRO-2025";
const ACCESS_STORAGE_KEY = "golden_ebook_access";

let lastEbookHtml = "";

/* ============================
      TEMA CLARO/OSCURO
============================ */

const themeToggleBtn = document.getElementById("theme-toggle");

themeToggleBtn.addEventListener("click", () => {
  const html = document.documentElement;
  const isDark = html.classList.toggle("dark");
  themeToggleBtn.textContent = isDark ? "☀️" : "🌙";
});

/* ============================
      ACCESO POR CLAVE
============================ */

const accessCard = document.getElementById("access-card");
const mainApp = document.getElementById("main-app");
const planSelect = document.getElementById("plan");
const accessInput = document.getElementById("access-key");
const accessBtn = document.getElementById("access-submit");
const accessError = document.getElementById("access-error");
const changePlanBtn = document.getElementById("change-plan");

// Si ya está logueado → entrar directo
if (localStorage.getItem(ACCESS_STORAGE_KEY) === "ok") {
  accessCard.hidden = true;
  mainApp.hidden = false;
}

// Botón Cambiar Plan
changePlanBtn.addEventListener("click", () => {
  localStorage.removeItem(ACCESS_STORAGE_KEY);
  accessCard.hidden = false;
  mainApp.hidden = true;
  accessInput.value = "";
  accessError.textContent = "";
});

// Validación de acceso
accessBtn.addEventListener("click", () => {
  const plan = planSelect.value;
  const key = accessInput.value.trim();

  if (!key) {
    accessError.textContent = "Introduce la clave de acceso.";
    return;
  }

  const expected = plan === "basic" ? BASIC_KEY : PRO_KEY;

  if (key !== expected) {
    accessError.textContent = "Clave incorrecta. Verifica el plan y la clave.";
    return;
  }

  accessError.textContent = "";
  localStorage.setItem(ACCESS_STORAGE_KEY, "ok");
  accessCard.hidden = true;
  mainApp.hidden = false;
});

/* ============================
      GENERACIÓN DE EBOOK
============================ */

const btnGenerar = document.getElementById("btn-generar");
const estadoEl = document.getElementById("estado");
const ebookHtmlEl = document.getElementById("ebook-html");
const btnCopiar = document.getElementById("btn-copiar");
const btnPdf = document.getElementById("btn-pdf");

btnGenerar.addEventListener("click", async () => {
  const tema = document.getElementById("tema").value.trim();
  const publico = document.getElementById("publico").value.trim();
  const objetivo = document.getElementById("objetivo").value.trim();
  const tipo = document.getElementById("tipo").value;
  const profundidad = document.getElementById("profundidad").value;
  const capitulos = parseInt(document.getElementById("capitulos").value, 10);
  const autor = document.getElementById("autor").value.trim();
  const plantilla = document.getElementById("plantilla").value;
  const plan = planSelect.value;

  if (!tema || !publico || !objetivo || !capitulos || capitulos <= 0) {
    estadoEl.textContent = "Completa tema, público, objetivo y capítulos.";
    return;
  }

  estadoEl.textContent = "Generando ebook con IA...";
  ebookHtmlEl.innerHTML = `<div class="ebook-page"><p>Generando contenido...</p></div>`;

  try {
    const resp = await fetch("/api/generate-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tema,
        publico,
        objetivo,
        tipo,
        profundidad,
        capitulos,
        autor,
        plantilla,
        plan
      }),
    });

    if (!resp.ok) throw new Error("Error al generar contenido");

    const data = await resp.json();
    if (!data.html) throw new Error("Contenido vacío");

    lastEbookHtml = data.html;

    // Insertamos contenido y paginamos
    ebookHtmlEl.innerHTML = data.html;

    paginarEbook(plantilla);

    estadoEl.textContent = "Ebook generado correctamente.";

  } catch (err) {
    console.error(err);
    estadoEl.textContent = "Error al generar el ebook.";
    ebookHtmlEl.innerHTML = `<div class="ebook-page"><p>Error al generar.</p></div>`;
  }
});

/* ============================
      SISTEMA DE PAGINADO REAL
============================ */

function paginarEbook() {
  const ebookHtmlEl = document.getElementById("ebook-html");
  const rawContent = ebookHtmlEl.innerHTML;

  // Contenedor temporal
  const temp = document.createElement("div");
  temp.innerHTML = rawContent;

  ebookHtmlEl.innerHTML = "";

  const MAX_HEIGHT = 1050; // altura realista de una página visual

  let currentPage = crearPagina();
  let pages = [];

  function crearPagina() {
    const page = document.createElement("div");
    page.classList.add("ebook-page");
    ebookHtmlEl.appendChild(page);
    return page;
  }

  const elementos = Array.from(temp.childNodes);

  elementos.forEach(el => {
    const clone = el.cloneNode(true);

    // Regla: si viene un H2 → nueva página
    if (clone.tagName === "H2" && currentPage.childNodes.length > 0) {
      currentPage = crearPagina();
    }

    currentPage.appendChild(clone);

    // Regla de desborde
    if (currentPage.scrollHeight > MAX_HEIGHT) {
      currentPage.removeChild(clone);

      currentPage = crearPagina();
      currentPage.appendChild(clone);
    }
  });
}

/* ============================
      COPIAR HTML
============================ */

btnCopiar.addEventListener("click", async () => {
  if (!lastEbookHtml) return;

  try {
    await navigator.clipboard.writeText(lastEbookHtml);
    btnCopiar.textContent = "¡Copiado!";
    setTimeout(() => (btnCopiar.textContent = "Copiar HTML"), 1500);
  } catch {
    btnCopiar.textContent = "Error";
  }
});

// =========================
// EXPORTAR PDF CORRECTO
// =========================

btnPdf.addEventListener("click", async () => {
  const pages = Array.from(document.querySelectorAll(".ebook-page"));

  if (!pages.length) {
    estadoEl.textContent = "Genera un ebook antes de exportar.";
    return;
  }

  estadoEl.textContent = "Generando PDF, espera...";

  const { jsPDF } = window.jspdf;

  // FORMATO PDF
  const format = document.getElementById("pdf-size").value || "a4";
  let pdfOpt;

  if (format === "letter") pdfOpt = { unit: "mm", format: "letter" };
  else if (format === "kdp6x9") pdfOpt = { unit: "mm", format: [152, 229] };
  else pdfOpt = { unit: "mm", format: "a4" };

  const pdf = new jsPDF({ orientation: "p", ...pdfOpt });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 12;
  const usableWidth = pageWidth - margin * 2;

  let first = true;

  for (let p of pages) {
    // Render page to canvas
    const canvas = await html2canvas(p, {
      scale: 3,
      backgroundColor: "#ffffff",
      useCORS: true
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.85);
    const imgWidth = usableWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    if (!first) pdf.addPage();
    first = false;

    pdf.addImage(imgData, "JPEG", margin, margin, imgWidth, imgHeight);
  }

  const tema = document.getElementById("tema").value.trim() || "ebook";
  pdf.save(`${tema.replace(/\s+/g, "-").toLowerCase()}.pdf`);

  estadoEl.textContent = "PDF generado correctamente.";
});
