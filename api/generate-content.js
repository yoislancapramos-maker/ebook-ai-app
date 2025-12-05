// /api/generate-content.js
// Versión compatible con Vercel (CommonJS + chat.completions)
// Usa gpt-4.1-mini para texto y gpt-image-1 para imágenes (base64)

const OpenAI = require("openai");

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const {
      title,
      topic, // Marca / Autor
      audience,
      chaptersCount,
      pagesCount,
      tone,
      language,
      extra,
      template,
      plan,
    } = req.body || {};

    if (!title) {
      return res.status(400).json({ error: "Falta el título del ebook." });
    }

    const safeTitle = String(title).trim();
    const safeTopic = (topic || "").trim();
    const safeAudience = (audience || "").trim();

    const chapters = clampInt(chaptersCount, 1, 12);
    const pages = clampInt(pagesCount, 5, 120);

    const toneLabel = mapTone(tone);
    const langCode = language === "en" ? "en" : "es";

    const maxTokens = Math.min(pages * 120, 9000);

    const systemInstructions = buildSystemInstructions(
      chapters,
      toneLabel,
      langCode,
      template
    );

    const userConfigText = buildUserConfigSummary({
      title: safeTitle,
      topic: safeTopic,
      audience: safeAudience,
      chapters,
      pages,
      toneLabel,
      langCode,
      extra,
      template,
      plan,
    });

    // 1) TEXTO HTML
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: systemInstructions },
        { role: "user", content: userConfigText },
      ],
      max_tokens: maxTokens,
      temperature: 0.85,
    });

    const html = extractTextFromCompletion(completion);

    if (!html) {
      return res
        .status(500)
        .json({ error: "La IA no devolvió contenido HTML." });
    }

    let finalHtml = html;

    // 2) PLACEHOLDERS DE IMAGEN
    const placeholders = collectImagePlaceholders(finalHtml, chapters);

    if (placeholders.length === 0) {
      // No hay marcadores de imagen, devolvemos solo texto
      return res.status(200).json({ html: finalHtml });
    }

    // 3) IMÁGENES POR CAPÍTULO (2 por capítulo)
    for (let ch = 1; ch <= chapters; ch++) {
      const chapterMarkers = placeholders.filter((p) => p.chapter === ch);
      if (chapterMarkers.length === 0) continue;

      const imagePromptBase = buildImagePrompt({
        title: safeTitle,
        topic: safeTopic,
        audience: safeAudience,
        chapterNumber: ch,
        langCode,
      });

      const imgResponse = await client.images.generate({
        model: "gpt-image-1",
        prompt: imagePromptBase,
        n: 2,
        size: "1024x1024",
      });

      const imagesB64 = (imgResponse.data || []).map((d) => d.b64_json);

      chapterMarkers.forEach((marker, idx) => {
        const b64 = imagesB64[idx] || imagesB64[0];
        if (!b64) return;

        const figHtml = buildFigureHtml({
          base64: b64,
          chapterNumber: ch,
          slot: marker.slot,
          langCode,
        });

        finalHtml = finalHtml.replace(marker.marker, figHtml);
      });
    }

    return res.status(200).json({ html: finalHtml });
  } catch (error) {
    console.error("Error en /api/generate-content:", error);
    return res.status(500).json({
      error: "Error generando el ebook. Revisa la consola del servidor.",
    });
  }
};

// -------------------- Helpers --------------------

function clampInt(value, min, max) {
  const n = parseInt(value, 10);
  if (Number.isNaN(n)) return min;
  return Math.min(Math.max(n, min), max);
}

function mapTone(tone) {
  switch (tone) {
    case "profesional":
      return "profesional, estructurado y serio";
    case "cercano":
      return "cercano, conversacional y sencillo";
    case "divertido":
      return "dinámico, entretenido y con toques de humor suave";
    case "inspirador":
      return "inspirador, motivador y lleno de energía positiva";
    default:
      return "neutral, claro y fácil de entender";
  }
}

function extractTextFromCompletion(completion) {
  try {
    const choice = completion.choices && completion.choices[0];
    if (!choice || !choice.message) return "";

    const content = choice.message.content;

    if (typeof content === "string") return content;

    if (Array.isArray(content)) {
      return content
        .map((part) => (typeof part === "string" ? part : part.text || ""))
        .join("");
    }

    return String(content || "");
  } catch (e) {
    console.error("Error extrayendo texto:", e);
    return "";
  }
}

function buildSystemInstructions(chapters, toneLabel, langCode, template) {
  const langName = langCode === "en" ? "inglés" : "español";

  const templateHint =
    template === "dark"
      ? "Estilo visual pensado para fondo oscuro: títulos claros y secciones bien separadas."
      : template === "minimal"
      ? "Estilo visual minimalista, como un libro editorial limpio y moderno."
      : template === "colorful"
      ? "Estilo visual creativo a color, como materiales de marketing modernos."
      : "Estilo visual clásico dorado, elegante, como un libro premium.";

  return `
Eres un ghostwriter experto en ebooks premium. 
Escribe SIEMPRE en ${langName}, con un tono ${toneLabel}.
Tu tarea es devolver SOLO el contenido del ebook en HTML (sin <html>, <head>, <body>).

Estructura:

- <h1> para el título del ebook.
- Introducción: <h2>Introducción</h2> + varios párrafos útiles.
- Para cada capítulo del 1 al ${chapters}:
  - <h2>Capítulo X: Título...</h2>
  - Inmediatamente debajo, inserta EXACTAMENTE estos comentarios HTML como marcadores de imagen:
    <!--IMAGE_CHX_SLOT1-->
    <!--IMAGE_CHX_SLOT2-->
    (cambia X por el número de capítulo)
  - Luego, varios párrafos con contenido real (400-600 palabras por capítulo), listas y ejemplos.
- Conclusión: <h2>Conclusión</h2> bien desarrollada.

Reglas:

- NO escribas frases tipo "aquí va el contenido", escribe contenido real y útil.
- Evita repetir siempre la misma frase en todos los capítulos.
- Usa listas <ul><li>...</li></ul> cuando tenga sentido.
- Puedes usar <h3> como subtítulos internos.
- El estilo debe sentirse como un ebook premium por el que el lector ha pagado.

Ten en mente el enfoque visual: ${templateHint}
Devuelve ÚNICAMENTE el HTML del ebook, con los comentarios <!--IMAGE_CHX_SLOTY--> donde corresponde.
`;
}

function buildUserConfigSummary({
  title,
  topic,
  audience,
  chapters,
  pages,
  toneLabel,
  langCode,
  extra,
  template,
  plan,
}) {
  const langName = langCode === "en" ? "Inglés" : "Español";

  return `
DATOS DEL EBOOK

Título: ${title}
Marca o Autor: ${topic || "No especificado"}
Público objetivo: ${audience || "No especificado"}
Capítulos: ${chapters}
Páginas aproximadas: ${pages}
Tono: ${toneLabel}
Idioma: ${langName}
Plantilla visual: ${template || "clasic"}
Plan del usuario: ${plan || "basico"}

Notas extra del creador:
${extra || "(sin notas adicionales)"}

Usa todo esto para elegir qué temas, ejemplos y estructura tendrá el ebook.
`;
}

function collectImagePlaceholders(html, chapters) {
  const placeholders = [];
  for (let ch = 1; ch <= chapters; ch++) {
    for (let slot = 1; slot <= 2; slot++) {
      const marker = `<!--IMAGE_CH${ch}_SLOT${slot}-->`;
      if (html.includes(marker)) {
        placeholders.push({ chapter: ch, slot, marker });
      }
    }
  }
  return placeholders;
}

function buildImagePrompt({ title, topic, audience, chapterNumber, langCode }) {
  const langPrefix =
    langCode === "en"
      ? "Illustration for an English ebook."
      : "Ilustración para un ebook en español.";

  const base = `
${langPrefix}
Ebook title: "${title}".
Brand/author: ${topic || "no especificado"}.
Target audience: ${audience || "lectores interesados en el tema"}.
Illustration for chapter ${chapterNumber} of the ebook.

Clean, modern, soft gradients, subtle golden accents, style similar to Gamma/Canva.
No big text inside the image, no logos or trademarks. 
Use simple icons, objects or scenes that visually support the chapter.
`;

  return base.trim();
}

function buildFigureHtml({ base64, chapterNumber, slot, langCode }) {
  const alt =
    langCode === "en"
      ? `Illustration for chapter ${chapterNumber} of the ebook.`
      : `Ilustración para el capítulo ${chapterNumber} del ebook.`;

  return `
<figure class="ebook-figure">
  <img src="data:image/png;base64,${base64}" alt="${alt}" />
</figure>
`.trim();
}

