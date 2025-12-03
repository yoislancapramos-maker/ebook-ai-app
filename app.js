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

function paginarEbook(plantilla) {
  const container = document.getElementById("ebook-html");
  const raw = container.innerHTML;

  // contenedor temporal
  const temp = document.createElement("div");
  temp.innerHTML = raw;

  container.innerHTML = "";

  let pages = [];
  let currentPage = createPage();

  function createPage() {
    const page = document.createElement("div");
    page.classList.add("ebook-page");

    if (plantilla === "minimal") page.classList.add("template-minimal");
    if (plantilla === "business") page.classList.add("template-business");
    if (plantilla === "creative") page.classList.add("template-creative");

    container.appendChild(page);
    return page;
  }

  const nodes = Array.from(temp.childNodes);

  nodes.forEach(node => {
    const clone = node.cloneNode(true);

    // Inicio de capítulo
    if (clone.tagName === "H2" && currentPage.childNodes.length > 0) {
      currentPage = createPage();
    }

    currentPage.appendChild(clone);

    // Si se desborda, mover último elemento a nueva página
    if (currentPage.scrollHeight > 1380) {
      const last = currentPage.lastChild;
      currentPage.removeChild(last);

      currentPage = createPage();
      currentPage.appendChild(last);
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

/* ============================
    GENERAR PDF — A4 / Carta / 6x9
============================ */

btnPdf.addEventListener("click", async () => {
  const page = ebookHtmlEl.querySelector(".ebook-page");
  if (!page) {
    estadoEl.textContent = "Genera un ebook primero.";
    return;
  }

  estadoEl.textContent = "Generando PDF...";

  try {
    const { jsPDF } = window.jspdf;

    const size = document.getElementById("pdf-size").value;

    let format;
    if (size === "letter") format = "letter";
    else if (size === "kdp6x9") format = [152, 229];
    else format = "a4";

    const pdf = new jsPDF({
      unit: "mm",
      format,
      orientation: "p",
      compress: true
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 12;

    const canvas = await html2canvas(page, {
      scale: 3,
      useCORS: true,
      backgroundColor: "#ffffff"
    });

    const cropHeight = canvas.height - 40;
    const cut = document.createElement("canvas");
    cut.width = canvas.width;
    cut.height = cropHeight;
    cut.getContext("2d").drawImage(canvas, 0, 0);

    const imgData = cut.toDataURL("image/jpeg", 0.8);

    const usableWidth = pageWidth - margin * 2;
    const imgWidth = usableWidth;
    const imgHeight = (cut.height * imgWidth) / cut.width;

    const pageHeightPx =
      (pageHeight - margin * 2) * (cut.width / imgWidth);

    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, "JPEG", margin, position, imgWidth, imgHeight);
    heightLeft -= pageHeightPx;

    while (heightLeft > 0) {
      pdf.addPage();
      position = margin - (imgHeight - heightLeft);
      pdf.addImage(imgData, "JPEG", margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeightPx;
    }

    const tema = document.getElementById("tema").value.trim();
    let name = tema ? tema.replace(/\s+/g, "-").toLowerCase() : "ebook";

    pdf.save(`${name}-${size}.pdf`);

    estadoEl.textContent = "PDF generado con éxito.";

  } catch (err) {
    console.error(err);
    estadoEl.textContent = "Error al generar PDF.";
  }
});
