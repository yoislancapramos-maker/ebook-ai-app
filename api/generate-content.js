// /api/generate-content.js
// Serverless function para Vercel (Node) sin dependencias externas.
// Usa fetch para llamar a la API de OpenAI.

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

module.exports = async function handler(req, res) {
  // Habilitar JSON siempre
  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido" });
  }

  if (!OPENAI_API_KEY) {
    return res
      .status(500)
      .json({ error: "Falta OPENAI_API_KEY en las variables de entorno." });
  }

  try {
    const body = await readJsonBody(req);

    const {
      title,
      topic,
      audience,
      chaptersCount,
      pagesCount,
      tone,
      language,
      extra,
      template,
      plan,
    } = body || {};

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

    const systemPrompt = buildSystemInstructions(
      chapters,
      toneLabel,
      langCode,
      template
    );

    const userPrompt = buildUserConfigSummary({
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

    // 1) TEXTO
    const chatRes = await callOpenAIChat({
      system: systemPrompt,
      user: userPrompt,
      maxTokens,
    });

    let html = (chatRes || "").trim();
    if (!html) {
      return res
        .status(500)
        .json({ error: "La IA no devolvió contenido HTML." });
    }

    // 2) PLACEHOLDERS DE IMAGEN
    const placeholders = collectImagePlaceholders(html, chapters);
    if (placeholders.length === 0) {
      return res.status(200).json({ html });
    }

    // 3) IMÁGENES POR CAPÍTULO (2 por capítulo)
    for (let ch = 1; ch <= chapters; ch++) {
      const chapterMarkers = placeholders.filter((p) => p.chapter === ch);
      if (chapterMarkers.length === 0) continue;

      const imagePrompt = buildImagePrompt({
        title: safeTitle,
        topic: safeTopic,
        audience: safeAudience,
        chapterNumber: ch,
        langCode,
      });

      const imagesB64 = await callOpenAIImages(imagePrompt, 2);

      chapterMarkers.forEach((marker, idx) => {
        const b64 = imagesB64[idx] || imagesB64[0];
        if (!b64) return;
        const figHtml = buildFigureHtml({
          base64: b64,
          chapterNumber: ch,
          slot: marker.slot,
          langCode,
        });
        html = html.replace(marker.marker, figHtml);
      });
    }

    return res.status(200).json({ html });
  } catch (err) {
    console.error("Error en /api/generate-content:", err);
    return res.status(500).json({
      error: "Error generando el ebook. Revisa los logs del servidor.",
    });
  }
};

// ----------- Helpers básicos -----------

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

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8") || "{}";
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

// ----------- Prompts -----------

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
Eres un ghostwriter experto en ebooks premium para creadores y lanzamientos digitales.
Escribe SIEMPRE en ${langName}, con un tono ${toneLabel}.
Devuelve SOLO el contenido del ebook en HTML (sin <html>, <head> ni <body>).

Estructura:

- <h1> para el título del ebook.
- Introducción: <h2>Introducción</h2> + varios párrafos útiles.
- Para cada capítulo del 1 al ${chapters}:
  - <h2>Capítulo X: Título del capítulo...</h2>
  - Inmediatamente debajo, inserta EXACTAMENTE estos comentarios HTML como marcadores de imagen:
    <!--IMAGE_CHX_SLOT1-->
    <!--IMAGE_CHX_SLOT2-->
    (cambia X por el número de capítulo)
  - Luego, desarrolla el capítulo con varios párrafos (400-600 palabras), listas y ejemplos.
- Conclusión: <h2>Conclusión</h2> bien desarrollada y accionable.

Reglas:

- No escribas frases tipo "aquí va el contenido...". Escribe contenido REAL y útil.
- Usa ejemplos, pasos, listas <ul><li>...</li></ul>, resúmenes al final de los capítulos.
- Evita repetir exactamente las mismas frases en todos los capítulos.
- Puedes usar <h3> como subtítulos internos.
- El estilo debe sentirse como un ebook premium por el que el lector pagó.

Ten en mente el enfoque visual: ${templateHint}
Devuelve ÚNICAMENTE el HTML del ebook, con los comentarios <!--IMAGE_CHX_SLOTY--> donde corresponda.
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
DATOS DEL EBOOK A GENERAR

Título: ${title}
Marca o Autor: ${topic || "No especificado"}
Público objetivo: ${audience || "No especificado"}
Número de capítulos: ${chapters}
Páginas aproximadas: ${pages}
Tono deseado: ${toneLabel}
Idioma: ${langName}
Plantilla visual seleccionada: ${template || "clasic"}
Plan del usuario: ${plan || "basico"}

Notas adicionales del creador:
${extra || "(sin notas adicionales)"}

Usa esta información para decidir qué temas, estructura, ejemplos y profundidad tendrá el ebook.
`;
}

// ----------- Manejo de placeholders -----------

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

// ----------- Prompts de imagen + HTML de figure -----------

function buildImagePrompt({ title, topic, audience, chapterNumber, langCode }) {
  const langPrefix =
    langCode === "en"
      ? "Illustration for an English ebook."
      : "Ilustración para un ebook en español.";

  return `
${langPrefix}
Ebook title: "${title}".
Brand/author: ${topic || "no especificado"}.
Target audience: ${audience || "lectores interesados en el tema"}.
Illustration for chapter ${chapterNumber} of the ebook.

Estilo: limpio, moderno, con degradados suaves y acentos dorados sutiles,
similar a presentaciones modernas tipo Gamma o Canva.

Sin texto grande dentro de la imagen, sin logos, sin marcas registradas.
Iconos, personajes o escenas simples que apoyen visualmente el contenido del capítulo.
`.trim();
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

// ----------- Llamadas a la API de OpenAI -----------

async function callOpenAIChat({ system, user, maxTokens }) {
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      max_tokens: maxTokens,
      temperature: 0.85,
    }),
  });

  if (!resp.ok) {
    const errorBody = await resp.text().catch(() => "");
    console.error("Error chat OpenAI:", resp.status, errorBody);
    throw new Error("Error en la llamada a OpenAI Chat");
  }

  const data = await resp.json();
  const choice = data.choices && data.choices[0];
  return choice && choice.message && choice.message.content;
}

async function callOpenAIImages(prompt, n) {
  const resp = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      n,
      size: "1024x1024",
      response_format: "b64_json",
    }),
  });

  if (!resp.ok) {
    const errorBody = await resp.text().catch(() => "");
    console.error("Error imágenes OpenAI:", resp.status, errorBody);
    // Si falla imágenes, devolvemos array vacío para no romper el ebook
    return [];
  }

  const data = await resp.json();
  return (data.data || []).map((d) => d.b64_json).filter(Boolean);
}

