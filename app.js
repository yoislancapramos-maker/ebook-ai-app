// ===== CONFIGURACIÓN SIMPLE =====

// Claves de acceso (puedes cambiarlas y usar estas en Hotmart)
const BASIC_KEY = "BASICO-2025";
const PRO_KEY = "PRO-2025";

// Nombre para guardar sesión en localStorage
const ACCESS_STORAGE_KEY = "golden_ebook_access";

// Para recordar el último ebook generado (HTML)
let lastEbookHtml = "";

// ===== TEMA CLARO/OSCURO =====

const themeToggleBtn = document.getElementById("theme-toggle");

// Por defecto: modo claro (NO clase .dark)
// Si quieres detectar el sistema en el futuro, aquí se podría mejorar.

themeToggleBtn.addEventListener("click", () => {
  const html = document.documentElement;
  const isDark = html.classList.toggle("dark");
  themeToggleBtn.textContent = isDark ? "☀️" : "🌙";
});

// ===== ACCESO POR CONTRASEÑA =====

// ===== ACCESO POR CONTRASEÑA =====

const accessCard = document.getElementById("access-card");
const mainApp = document.getElementById("main-app");
const planSelect = document.getElementById("plan");
const accessInput = document.getElementById("access-key");
const accessBtn = document.getElementById("access-submit");
const accessError = document.getElementById("access-error");

// ===== CAMBIAR PLAN =====

const changePlanBtn = document.getElementById("change-plan");

changePlanBtn.addEventListener("click", () => {
  // Borrar la sesión
  localStorage.removeItem("golden_ebook_access");

  // Mostrar pantalla de suscripción
  accessCard.hidden = false;
  mainApp.hidden = true;

  // Reset visual
  accessInput.value = "";
  accessError.textContent = "";
});


// Si ya está validado en esta máquina, saltar acceso
const savedAccess = localStorage.getItem(ACCESS_STORAGE_KEY);
if (savedAccess === "ok") {
  accessCard.hidden = true;
  mainApp.hidden = false;
}

accessBtn.addEventListener("click", () => {
  const plan = planSelect.value;
  const key = (accessInput.value || "").trim();

  let expectedKey = "";
  if (plan === "basic") {
    expectedKey = BASIC_KEY;
  } else {
    expectedKey = PRO_KEY;
  }

  if (!key) {
    accessError.textContent = "Introduce la clave de acceso.";
    return;
  }

  if (key !== expectedKey) {
    accessError.textContent = "Clave incorrecta. Verifica el plan y la clave.";
    return;
  }

  // Acceso correcto
  accessError.textContent = "";
  localStorage.setItem(ACCESS_STORAGE_KEY, "ok");
  accessCard.hidden = true;
  mainApp.hidden = false;
});

// ===== GENERACIÓN DE EBOOK =====

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
  const capitulos = parseInt(
    document.getElementById("capitulos").value,
    10
  );
  const autor = document.getElementById("autor").value.trim();
  const plantilla = document.getElementById("plantilla").value;
  const plan = planSelect.value || "basic";


  if (!tema || !publico || !objetivo || !capitulos || capitulos <= 0) {
    estadoEl.textContent =
      "Por favor completa todos los campos obligatorios (tema, público, objetivo y capítulos).";
    return;
  }

  estadoEl.textContent = "Generando ebook con IA...";
  ebookHtmlEl.innerHTML = `<div class="ebook-page"><p>Generando contenido. Esto puede tardar unos segundos...</p></div>`;

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
})

    });

    if (!resp.ok) {
      throw new Error("Error al generar el ebook");
    }

    const data = await resp.json();
    if (!data.html) {
      throw new Error("Respuesta vacía desde el servidor");
    }

    estadoEl.textContent = "";
    ebookHtmlEl.innerHTML = data.html;
    lastEbookHtml = data.html; // 

   // =========================================
// SISTEMA DE PAGINADO REAL (CORREGIDO)
// =========================================

// Tomar HTML generado
const rawContent = ebookHtmlEl.innerHTML;

// Contenedor temporal
const tempDiv = document.createElement("div");
tempDiv.innerHTML = rawContent;

// Eliminar vista previa anterior y preparar contenedor
ebookHtmlEl.innerHTML = "";

// Crear primera página
let currentPage = createNewPage();

// Función para crear páginas con la plantilla aplicada
function createNewPage() {
  const page = document.createElement("div");
  page.classList.add("ebook-page");

  // Aplicar plantilla visual
  if (plantilla === "minimal") page.classList.add("template-minimal");
  if (plantilla === "business") page.classList.add("template-business");
  if (plantilla === "creative") page.classList.add("template-creative");

  ebookHtmlEl.appendChild(page);
  return page;
}

// Insertar elementos uno por uno
const nodes = Array.from(tempDiv.childNodes);

nodes.forEach(node => {
  const clone = node.cloneNode(true);

  // Regla 1 → Nuevo capítulo inicia página
  if (clone.tagName === "H2" && currentPage.childNodes.length > 0) {
    currentPage = createNewPage();
  }

  currentPage.appendChild(clone);

  // Regla 2 → Si la página se desborda → dividir
  if (currentPage.scrollHeight > 1300) {
    const lastChild = currentPage.lastChild;
    currentPage.removeChild(lastChild);

    currentPage = createNewPage();
    currentPage.appendChild(lastChild);
  }
});


    // Aplicar clase de plantilla al contenedor principal del ebook
const page = ebookHtmlEl.querySelector(".ebook-page");
if (page) {
  page.classList.remove(
    "template-minimal",
    "template-business",
    "template-creative"
  );
  if (plantilla === "minimal") {
    page.classList.add("template-minimal");
  } else if (plantilla === "business") {
    page.classList.add("template-business");
  } else if (plantilla === "creative") {
    page.classList.add("template-creative");
  }
}

  } catch (err) {
    console.error(err);
    estadoEl.textContent =
      "Hubo un error al generar el ebook. Intenta de nuevo más tarde.";
    ebookHtmlEl.innerHTML =
      '<div class="ebook-page"><p>No se pudo generar el contenido.</p></div>';
  }
});

// Copiar HTML
btnCopiar.addEventListener("click", async () => {
  const html = ebookHtmlEl.innerHTML;
  if (!html || html.includes("Configura el ebook")) return;

  try {
    await navigator.clipboard.writeText(html);
    btnCopiar.textContent = "¡HTML copiado!";
    setTimeout(() => (btnCopiar.textContent = "Copiar HTML"), 1600);
  } catch (err) {
    console.error(err);
    btnCopiar.textContent = "Error al copiar";
    setTimeout(() => (btnCopiar.textContent = "Copiar HTML"), 1600);
  }
});


// ===== DESCARGAR PDF (A4 / CARTA / 6x9) =====
if (btnPdf) {
  btnPdf.addEventListener("click", async () => {
    const page = ebookHtmlEl.querySelector(".ebook-page");
    if (!page) {
      estadoEl.textContent = "Primero genera un ebook antes de descargar el PDF.";
      return;
    }

    estadoEl.textContent = "Generando PDF, espera...";

    try {
      const { jsPDF } = window.jspdf;

      // LEER FORMATO
      const format = document.getElementById("pdf-size").value || "a4";

      let pdfOptions;
      if (format === "letter") pdfOptions = { unit: "mm", format: "letter" };
      else if (format === "kdp6x9") pdfOptions = { unit: "mm", format: [152, 229] };
      else pdfOptions = { unit: "mm", format: "a4" };

      const pdf = new jsPDF({
        orientation: "p",
        compress: true,
        ...pdfOptions
      });

      // MEDIDAS DEL PDF
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 12;
      const usableWidth = pageWidth - margin * 2;

      // ===== GENERAR CANVAS =====
      const canvas = await html2canvas(page, {
        scale: 3,
        backgroundColor: "#ffffff",
        useCORS: true,
        windowWidth: page.scrollWidth,
        windowHeight: page.scrollHeight
      });

      // ===== RECORTE DE ESPACIO INFERIOR =====
      const cropHeight = canvas.height - 40;
      const croppedCanvas = document.createElement("canvas");
      croppedCanvas.width = canvas.width;
      croppedCanvas.height = cropHeight;

      const ctx = croppedCanvas.getContext("2d");
      ctx.drawImage(canvas, 0, 0);

      // ===== CONVERTIR A IMAGEN =====
      const imgData = croppedCanvas.toDataURL("image/jpeg", 0.80);

      // ESCALADO REAL SEGÚN FORMATO DEL PDF
      const imgWidth = usableWidth;
      const imgHeight = (croppedCanvas.height * imgWidth) / croppedCanvas.width;

      // ALTURA REAL DE UNA PÁGINA EN PIXELES
      const pageHeightPx =
        (pageHeight - margin * 2) * (croppedCanvas.width / imgWidth);

      let heightLeft = imgHeight;
      let position = margin;

      // PRIMERA PÁGINA
      pdf.addImage(imgData, "JPEG", margin, position, imgWidth, imgHeight);
      heightLeft -= pageHeightPx;

      // RESTO DE PÁGINAS
      while (heightLeft > 0) {
        pdf.addPage();
        position = margin - (imgHeight - heightLeft);
        pdf.addImage(imgData, "JPEG", margin, position, imgWidth, imgHeight);
        heightLeft -= pageHeightPx;
      }

      // NOMBRE FINAL
      const tema = document.getElementById("tema").value.trim();
      const base = tema ? tema.replace(/\s+/g, "-").toLowerCase() : "ebook";

      let suffix =
        format === "letter" ? "-carta" :
        format === "kdp6x9" ? "-6x9" : "-a4";

      pdf.save(`${base}${suffix}.pdf`);

      estadoEl.textContent = "PDF generado correctamente.";

    } catch (error) {
      console.error(error);
      estadoEl.textContent = "Error al generar el PDF.";
    }
  });
}
