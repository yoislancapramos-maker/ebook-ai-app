// app.js
// Lógica principal de Golden Ebook Studio

document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;

  // Elementos de la UI
  const accessPanel = document.getElementById("accessPanel");
  const appMain = document.getElementById("appMain");
  const userNameInput = document.getElementById("userName");
  const planSelect = document.getElementById("planSelect");
  const accessKeyInput = document.getElementById("accessKey");
  const enterAppBtn = document.getElementById("enterAppBtn");
  const accessError = document.getElementById("accessError");
  const changePlanBtn = document.getElementById("changePlanBtn");
  const themeToggleBtn = document.getElementById("themeToggleBtn");

  const ebookTitleInput = document.getElementById("ebookTitle");
  const ebookTopicInput = document.getElementById("ebookTopic");
  const depthLevelSelect = document.getElementById("depthLevel");
  const extraInstructionsInput = document.getElementById("extraInstructions");
  const generateEbookBtn = document.getElementById("generateEbookBtn");
  const newEbookBtn = document.getElementById("newEbookBtn");
  const generationStatus = document.getElementById("generationStatus");

  const ebookEditor = document.getElementById("ebookEditor");
  const exportPdfBtn = document.getElementById("exportPdfBtn");
  const currentPlanLabel = document.getElementById("currentPlanLabel");

  // "Base de datos" de claves válidas (front-end)
  const VALID_KEYS = {
    basico: "BASICO-2025",
    pro: "PRO-2025"
  };

  let currentPlan = null;

  // -------------------------
  // MODO CLARO / OSCURO
  // -------------------------
  themeToggleBtn.addEventListener("click", () => {
    const isLight = body.classList.contains("theme-light");
    if (isLight) {
      body.classList.remove("theme-light");
      themeToggleBtn.textContent = "☀️ Modo claro";
    } else {
      body.classList.add("theme-light");
      themeToggleBtn.textContent = "🌙 Modo oscuro";
    }
  });

  // -------------------------
  // CONTROL DE ACCESO
  // -------------------------
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

    const expectedKey = VALID_KEYS[plan];
    if (key !== expectedKey) {
      accessError.textContent = "Clave incorrecta. Verifica tu plan y clave.";
      accessError.style.display = "block";
      return;
    }

    currentPlan = plan;
    updatePlanLabel(name, plan);
    accessPanel.style.display = "none";
    appMain.style.display = "grid";
    changePlanBtn.style.display = "inline-flex";
  });

  function updatePlanLabel(name, plan) {
    const planName = plan === "pro" ? "Plan Pro" : "Plan Básico";
    currentPlanLabel.textContent = `${name} · ${planName}`;
  }

  changePlanBtn.addEventListener("click", () => {
    // Volver al panel de acceso sin recargar
    appMain.style.display = "none";
    accessPanel.style.display = "block";
    changePlanBtn.style.display = "none";
    currentPlan = null;
  });

  // -------------------------
  // GENERACIÓN DE EBOOK (stub IA)
  // -------------------------
  generateEbookBtn.addEventListener("click", async () => {
    const title = (ebookTitleInput.value || "").trim();
    const topic = (ebookTopicInput.value || "").trim();
    const depth = depthLevelSelect.value;
    const extra = (extraInstructionsInput.value || "").trim();

    if (!title) {
      alert("Escribe un título para el ebook.");
      return;
    }
    if (!topic) {
      alert("Escribe el tema o nicho del ebook.");
      return;
    }

    const depthConfig = {
      basico: {
        label: "Básico",
        targetWords: 1500 // equivalente aprox. a pocas páginas
      },
      medio: {
        label: "Medio",
        targetWords: 3000 // ebook estándar
      },
      alto: {
        label: "Alto",
        targetWords: 5000 // más extenso
      }
    };

    const config = depthConfig[depth] || depthConfig.basico;

    generationStatus.textContent =
      "Generando contenido con IA... Esto puede tardar unos segundos.";
    generateEbookBtn.disabled = true;

    try {
      // 🔴 IMPORTANTE:
      // Aquí es donde tú conectarías tu backend / API real.
      //
      // Ejemplo imaginario (AJUSTA A TU /api/generate-content.js):
      //
      // const response = await fetch("/api/generate-content.js", {
      //   method: "POST",
      //   headers: { "Content-Type": "application/json" },
      //   body: JSON.stringify({
      //     title,
      //     topic,
      //     depth: config.label,
      //     targetWords: config.targetWords,
      //     extra
      //   })
      // });
      // const data = await response.json();
      // const generatedText = data.content;
      //
      // ebookEditor.innerHTML = generatedText;

      // Mientras tanto (para no romper nada), dejo un texto de ejemplo:
      const fakeContent = buildExampleEbook(title, topic, config, extra);
      ebookEditor.innerHTML = fakeContent;

      generationStatus.textContent =
        "Ebook generado. Puedes editar el texto antes de descargar el PDF.";
    } catch (error) {
      console.error("Error generando ebook:", error);
      generationStatus.textContent =
        "Hubo un error generando el ebook. Revisa la consola.";
    } finally {
      generateEbookBtn.disabled = false;
    }
  });

  function buildExampleEbook(title, topic, config, extra) {
    const extrasBlock = extra
      ? `<p><em>Instrucciones aplicadas: ${escapeHtml(extra)}</em></p>`
      : "";

    return `
      <h1>${escapeHtml(title)}</h1>
      <p><strong>Nivel:</strong> ${config.label} · ~${config.targetWords} palabras objetivo</p>
      ${extrasBlock}
      <h2>Introducción</h2>
      <p>
        Este ebook sobre <strong>${escapeHtml(
          topic
        )}</strong> ha sido generado como ejemplo. 
        Aquí podrás ver cómo se verá el formato final antes de exportarlo a PDF. 
        Completa, edita y mejora este contenido según tus necesidades.
      </p>
      <h2>Capítulo 1 · Fundamentos</h2>
      <p>
        Aquí podrías introducir los conceptos básicos, definiciones y contexto del tema.
        Divide las ideas en párrafos cortos para una lectura más amigable, 
        especialmente en dispositivos móviles.
      </p>
      <h2>Capítulo 2 · Estrategias prácticas</h2>
      <ul>
        <li>Punto 1 práctico relacionado con ${escapeHtml(topic)}</li>
        <li>Punto 2 con un ejemplo concreto.</li>
        <li>Punto 3 con una mini guía paso a paso.</li>
      </ul>
      <h2>Conclusión y próximos pasos</h2>
      <p>
        Cierra el ebook con una conclusión clara, un resumen de lo aprendido 
        y un llamado a la acción (por ejemplo, aplicar una lista de tareas, 
        seguir un calendario, o adquirir otro recurso premium de tu catálogo).
      </p>
    `;
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // -------------------------
  // NUEVO EBOOK (reinicia contenido)
  // -------------------------
  newEbookBtn.addEventListener("click", () => {
    if (!confirm("¿Seguro que quieres borrar el contenido actual y empezar otro ebook?")) {
      return;
    }
    ebookTitleInput.value = "";
    ebookTopicInput.value = "";
    extraInstructionsInput.value = "";
    depthLevelSelect.value = "basico";
    generationStatus.textContent = "";
    ebookEditor.innerHTML = `
      <h1>Título del ebook</h1>
      <p>
        Escribe o genera tu contenido aquí. Este texto se utilizará tal
        cual para el PDF final.
      </p>
    `;
  });

  // -------------------------
  // EXPORTAR PDF
  // -------------------------
  exportPdfBtn.addEventListener("click", async () => {
    const title = (ebookTitleInput.value || "ebook").trim();
    const safeTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9áéíóúüñ\s]/gi, "")
      .replace(/\s+/g, "-");

    await window.pdfExporter.exportElementToPdf(ebookEditor, {
      filename: `${safeTitle || "ebook"}.pdf`
    });
  });
});
