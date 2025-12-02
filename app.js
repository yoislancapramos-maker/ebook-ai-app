// ===== CONFIGURACIÓN SIMPLE =====

// Claves de acceso (puedes cambiarlas y usar estas en Hotmart)
const BASIC_KEY = "BASICO-2025";
const PRO_KEY = "PRO-2025";

// Nombre para guardar sesión en localStorage
const ACCESS_STORAGE_KEY = "golden_ebook_access";

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

const accessCard = document.getElementById("access-card");
const mainApp = document.getElementById("main-app");
const planSelect = document.getElementById("plan");
const accessInput = document.getElementById("access-key");
const accessBtn = document.getElementById("access-submit");
const accessError = document.getElementById("access-error");

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
