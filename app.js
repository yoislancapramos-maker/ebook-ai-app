// app.js
// Lógica principal de Golden Ebook Studio

document.addEventListener("DOMContentLoaded", () => {
  // DASHBOARD / ACCESO
  const accessPanel = document.getElementById("accessPanel");
  const appMain = document.getElementById("appMain");

  const userNameInput = document.getElementById("userName");
  const planSelect = document.getElementById("planSelect");
  const accessKeyInput = document.getElementById("accessKey");
  const enterAppBtn = document.getElementById("enterAppBtn");
  const accessError = document.getElementById("accessError");
  const currentUserPlan = document.getElementById("currentUserPlan");

  const backToDashboardBtn = document.getElementById("backToDashboardBtn");

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
  const currentTemplateLabel = document.getElementById("currentTemplateLabel");

  // Claves de ejemplo
  const VALID_KEYS = {
    basico: "BASICO-2025",
    pro: "PRO-2025"
  };

  let currentUserName = "";
  let currentPlan = null;

  // -----------------------
  // ACCESO
  // -----------------------
  enterAppBtn.addEventListener("click", () => {
    const name = (userNameInput.value || "").trim();
    const plan = planSelect.value;
    const key = (accessKeyInput.value || "").trim();

    accessError.style.display = "none";

    if (!name) {
      accessError.textContent = "Escribe tu nombre.";
      accessError.style.display = "block";
      return;
    }
    if (!key) {
      accessError.textContent = "Escribe la clave de suscripción.";
      accessError.style.display = "block";
      return;
    }

    const expected = VALID_KEYS[plan];
    if (key !== expected) {
      accessError.textContent = "Clave incorrecta. Verifica tu plan y clave.";
      accessError.style.display = "block";
      return;
    }

    currentUserName = name;
    currentPlan = plan;

    const planText = plan === "pro" ? "Plan Pro" : "Plan Básico";
    currentUserPlan.textContent = `${currentUserName} · ${planText}`;

    accessPanel.style.display = "none";
    appMain.style.display = "grid";
  });

  backToDashboardBtn.addEventListener("click", () => {
    appMain.style.display = "none";
    accessPanel.style.display = "block";
  });

  // -----------------------
  // PLANTILLAS TIPO GAMMA
  // -----------------------
  const TEMPLATE_CLASSES = ["template-clasic", "template-minimal", "template-dark", "template-colorful"];

  function applyTemplate(templateValue) {
    TEMPLATE_CLASSES.forEach(cls => ebookEditor.classList.remove(cls));

    let cssClass = "template-clasic";
    let labelText = "Plantilla: Clásica dorada (equilibrada y elegante)";

    if (templateValue === "minimal") {
      cssClass = "template-minimal";
      labelText = "Plantilla: Minimal blanca (limpia y editorial)";
    } else if (templateValue === "dark") {
      cssClass = "template-dark";
      labelText = "Plantilla: Oscura elegante (para nichos serios o tech)";
    } else if (templateValue === "colorful") {
      cssClass = "template-colorful";
      labelText = "Plantilla: Creativa por nicho (colores vivos)";
    }

    ebookEditor.classList.add(cssClass);
    currentTemplateLabel.textContent = labelText;
  }

  templateSelect.addEventListener("change", () => {
    applyTemplate(templateSelect.value);
  });

  // Aplicar plantilla inicial
  applyTemplate(templateSelect.value);

  // -----------------------
  // GENERAR EBOOK (IA / EJEMPLO)
  // -----------------------
  generateEbookBtn.addEventListener("click", async () => {
  const title = (ebookTitleInput.value || "").trim();
  const topic = (ebookTopicInput.value || "").trim();
  const audience = (ebookAudienceInput.value || "").trim();
  const chaptersCount = parseInt(chaptersCountInput.value || "0", 10);
  const pagesCount = parseInt(pagesCountInput.value || "0", 10);
  const tone = toneSelect.value;
  const language = languageSelect.value;
  const extra = (extraInstructionsInput.value || "").trim();
  const template = templateSelect.value;

  if (!title) {
    alert("Escribe un título para el ebook.");
    return;
  }
  if (!chaptersCount || chaptersCount < 1) {
    alert("Indica la cantidad de capítulos.");
    return;
  }

  const payload = {
    title,
    topic,
    audience,
    chaptersCount,
    pagesCount,
    tone,
    language,
    extra,
    template,
    plan: currentPlan || "basico",
  };

  generationStatus.textContent = "Generando ebook con IA, esto puede tardar unos segundos...";
  generateEbookBtn.disabled = true;

  try {
    const response = await fetch("/api/generate-content", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Error en la API:", errorData);
      generationStatus.textContent =
        "Error al generar el ebook. Revisa tu backend o la consola.";
      return;
    }

    const data = await response.json();
    if (!data || !data.html) {
      generationStatus.textContent =
        "La respuesta de la IA no tiene contenido HTML.";
      return;
    }

    ebookEditor.innerHTML = data.html;
    generationStatus.textContent =
      "Ebook generado. Puedes editarlo y luego descargar el PDF.";
  } catch (error) {
    console.error("Error generando ebook:", error);
    generationStatus.textContent =
      "Ocurrió un error al generar el ebook. Revisa la consola.";
  } finally {
    generateEbookBtn.disabled = false;
  }
});


  function buildExampleEbook(config) {
    const {
      title,
      topic,
      audience,
      chaptersCount,
      pagesCount,
      tone,
      language,
      extra
    } = config;

    const toneLabel = {
      neutral: "neutral y claro",
      profesional: "profesional",
      cercano: "cercano y conversacional",
      divertido: "dinámico y entretenido",
      inspirador: "inspirador y motivador"
    }[tone] || "neutral y claro";

    const langLabel = language === "en" ? "Inglés" : "Español";

    const safe = (str) =>
      (str || "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

    let chaptersHtml = "";

    for (let i = 1; i <= chaptersCount; i++) {
      chaptersHtml += `
        <h2>Capítulo ${i}: Título del capítulo ${i}</h2>
        <p>
          Aquí va el contenido desarrollado del capítulo ${i}. En tu versión con IA real,
          cada capítulo abordará un subtema importante de <strong>${safe(topic)}</strong>,
          con ejemplos, pasos concretos y explicaciones claras adaptadas a
          <strong>${safe(audience)}</strong>.
        </p>
        <p>
          Añade historias, casos reales, listas y resúmenes breves al final de cada capítulo
          para que el lector pueda aplicar lo aprendido.
        </p>
      `;
    }

    const extraBlock = extra
      ? `<p><em>Notas aplicadas del autor: ${safe(extra)}</em></p>`
      : "";

    return `
      <h1>${safe(title)}</h1>
      <p><strong>Nicho / tema:</strong> ${safe(topic)}</p>
      ${
        audience
          ? `<p><strong>Público objetivo:</strong> ${safe(audience)}</p>`
          : ""
      }
      <p><strong>Idioma pensado para este ebook:</strong> ${langLabel}</p>
      <p><strong>Objetivo aproximado:</strong> ${pagesCount || 40} páginas · ${chaptersCount} capítulos · tono ${toneLabel}.</p>
      ${extraBlock}
      <h2>Introducción</h2>
      <p>
        En esta introducción se presenta el contexto general del tema, por qué es importante para
        <strong>${safe(audience || "tu lector ideal")}</strong> y qué beneficios obtendrá al leer este ebook
        sobre <strong>${safe(topic)}</strong>.
      </p>
      ${chaptersHtml}
      <h2>Conclusión</h2>
      <p>
        La conclusión retoma las ideas más importantes, anima al lector a pasar a la acción y puede
        incluir una invitación a otros recursos, cursos o productos relacionados.
      </p>
    `;
  }

  // -----------------------
  // NUEVO EBOOK (RESET)
  // -----------------------
  newEbookBtn.addEventListener("click", () => {
    const confirmReset = confirm(
      "¿Seguro que quieres borrar el contenido actual y empezar un nuevo ebook?"
    );
    if (!confirmReset) return;

    ebookTitleInput.value = "";
    ebookTopicInput.value = "";
    ebookAudienceInput.value = "";
    chaptersCountInput.value = 8;
    pagesCountInput.value = 40;
    toneSelect.value = "neutral";
    languageSelect.value = "es";
    extraInstructionsInput.value = "";
    templateSelect.value = "clasic";
    applyTemplate("clasic");
    currentTemplateLabel.textContent = "";

    generationStatus.textContent = "";
    ebookEditor.innerHTML = `
      <h1>Título del ebook</h1>
      <p>
        Escribe o genera tu contenido aquí. Este texto se utilizará tal cual para el PDF final.
      </p>
    `;
  });

  // -----------------------
  // EXPORTAR PDF
  // -----------------------
  exportPdfBtn.addEventListener("click", async () => {
    const rawTitle = (ebookTitleInput.value || "ebook").trim();
    const safeFileName = rawTitle
      .toLowerCase()
      .replace(/[^a-z0-9áéíóúüñ\s]/gi, "")
      .replace(/\s+/g, "-");

    await window.pdfExporter.exportElementToPdf(ebookEditor, {
      filename: `${safeFileName || "ebook"}.pdf`
    });
  });
});

