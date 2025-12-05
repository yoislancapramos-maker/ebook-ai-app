// app.js
document.addEventListener("DOMContentLoaded", () => {

  // MODO CLARO / OSCURO
  const themeToggleBtn = document.getElementById("themeToggleBtn");
  const themeIcon = document.getElementById("themeIcon");

  themeToggleBtn.addEventListener("click", () => {
    const isLight = document.body.classList.toggle("theme-light");
    themeIcon.textContent = isLight ? "☀️" : "🌙";
  });

  // ACCESO
  const accessPanel = document.getElementById("accessPanel");
  const appMain = document.getElementById("appMain");

  const userNameInput = document.getElementById("userName");
  const planSelect = document.getElementById("planSelect");
  const accessKeyInput = document.getElementById("accessKey");
  const enterAppBtn = document.getElementById("enterAppBtn");
  const accessError = document.getElementById("accessError");

  const backToDashboardBtn = document.getElementById("backToDashboardBtn");
  const currentUserPlan = document.getElementById("currentUserPlan");

  // GENERADOR
  const ebookTitleInput = document.getElementById("ebookTitle");
  const ebookTopicInput = document.getElementById("ebookTopic");
  const ebookAudienceInput = document.getElementById("ebookAudience");

  const chaptersCountInput = document.getElementById("chaptersCount");
  const pagesCountInput = document.getElementById("pagesCount");

  const toneSelect = document.getElementById("toneSelect");
  const languageSelect = document.getElementById("languageSelect");
  const templateSelect = document.getElementById("templateSelect");

  const extraInstructionsInput = document.getElementById("extraInstructions");

  const generateEbookBtn = document.getElementById("generateEbookBtn");
  const newEbookBtn = document.getElementById("newEbookBtn");

  const generationStatus = document.getElementById("generationStatus");
  const ebookEditor = document.getElementById("ebookEditor");
  const exportPdfBtn = document.getElementById("exportPdfBtn");

  const VALID_KEYS = {
    basico: "BASICO-2025",
    pro: "PRO-2025"
  };

  let currentUserName = "";
  let currentPlan = null;

  // LOGIN
  enterAppBtn.addEventListener("click", () => {
    const name = userNameInput.value.trim();
    const plan = planSelect.value;
    const key = accessKeyInput.value.trim();

    if (!name) {
      accessError.textContent = "Escribe tu nombre.";
      accessError.style.display = "block";
      return;
    }

    if (key !== VALID_KEYS[plan]) {
      accessError.textContent = "Clave incorrecta.";
      accessError.style.display = "block";
      return;
    }

    accessError.style.display = "none";
    currentUserName = name;
    currentPlan = plan;

    currentUserPlan.textContent =
      `${currentUserName} · ${plan === "pro" ? "Plan Pro" : "Plan Básico"}`;

    accessPanel.style.display = "none";
    appMain.style.display = "grid";
  });

  backToDashboardBtn.addEventListener("click", () => {
    appMain.style.display = "none";
    accessPanel.style.display = "block";
  });

  // PLANTILLAS
  const TEMPLATE_CLASSES = [
    "template-clasic",
    "template-minimal",
    "template-dark",
    "template-colorful"
  ];

  function applyTemplate(t) {
    TEMPLATE_CLASSES.forEach(cls =>
      ebookEditor.classList.remove(cls)
    );
    ebookEditor.classList.add("template-" + t);
  }

  templateSelect.addEventListener("change", () => {
    applyTemplate(templateSelect.value);
  });

  applyTemplate(templateSelect.value);

  // GENERAR EBOOK (IA)
  generateEbookBtn.addEventListener("click", async () => {
    const payload = {
      title: ebookTitleInput.value.trim(),
      topic: ebookTopicInput.value.trim(),
      audience: ebookAudienceInput.value.trim(),
      chaptersCount: chaptersCountInput.value,
      pagesCount: pagesCountInput.value,
      tone: toneSelect.value,
      language: languageSelect.value,
      extra: extraInstructionsInput.value.trim(),
      template: templateSelect.value,
      plan: currentPlan
    };

    if (!payload.title) {
      alert("Escribe un título para el ebook.");
      return;
    }

    generationStatus.textContent =
      "Generando ebook, puede tardar unos segundos...";
    generateEbookBtn.disabled = true;

    try {
      const response = await fetch("/api/generate-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        generationStatus.textContent =
          "Error al generar el ebook.";
        console.error(data);
        return;
      }

      ebookEditor.innerHTML = data.html;
      generationStatus.textContent =
        "Ebook generado. Puedes editarlo y descargarlo.";
    } catch (err) {
      console.error(err);
      generationStatus.textContent =
        "Ocurrió un error inesperado.";
    }

    generateEbookBtn.disabled = false;
  });

  // NUEVO EBOOK
  newEbookBtn.addEventListener("click", () => {
    if (!confirm("¿Seguro que deseas comenzar un ebook nuevo?")) return;

    ebookEditor.innerHTML = "";
    ebookTitleInput.value = "";
    ebookTopicInput.value = "";
    ebookAudienceInput.value = "";

    chaptersCountInput.value = 8;
    pagesCountInput.value = 40;

    toneSelect.value = "neutral";
    languageSelect.value = "es";
    templateSelect.value = "clasic";

    extraInstructionsInput.value = "";
    applyTemplate("clasic");

    generationStatus.textContent = "";
  });

  // EXPORTAR PDF
  exportPdfBtn.addEventListener("click", async () => {
    const fileName = ebookTitleInput.value
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-") || "ebook";

    await window.pdfExporter.exportElementToPdf(ebookEditor, {
      filename: fileName + ".pdf"
    });
  });
});
