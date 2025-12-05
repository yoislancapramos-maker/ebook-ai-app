// /api/generate-content.js
// Endpoint para generar ebooks premium con texto + imágenes en HTML
// Pensado para Vercel (Node + ESM)
// Requiere: npm install openai

import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Método no permitido" });
  }

  try {
    const {
      title,
      topic,          // en tu UI ahora será Marca / Autor
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

    const chapters = clampInt(chaptersCount, 1, 20);
    const pages = clampInt(pagesCount, 5, 120);

    const toneLabel = mapTone(tone);
    const langCode = language === "en" ? "en" : "es";

    // Tokens aproximados para no gastar de más
    // ~120 tokens por página como referencia
    const maxOutputTokens = Math.min(pages * 120, 12000);

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

    // 1) GENERAR TEXTO HTML CON PLACEHOLDERS DE IMAGEN
    const textResponse = await client.responses.create({
      model: "gpt-4.1-mini",
      instructions: systemInstructions,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: userConfigText,
            },
          ],
        },
      ],
      max_output_tokens: maxOutputTokens,
      temperature: 0.85,
    });

    let html = textResponse.output_text;

    // 2) DETECTAR PLACEHOLDERS DE IMAGEN EN EL HTML
    // Formato esperado: <!--IMAGE_CH1_SLOT1-->
    const placeholders = collectImagePlaceholders(html, chapters);

    // Si por alguna razón el modelo no puso los marcadores,
    // seguimos devolviendo al menos el HTML de texto.
    if (placeholders.length === 0) {
      return res.status(200).json({ html });
    }

    // 3) GENERAR IMÁGENES CON gpt-image-1 (Base64) POR CAPÍTULO
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

      // 2 imágenes por capítulo
      const imgResponse = await client.images.generate({
        model: "gpt-image-1",
        prompt: imagePromptBase,
        n: 2,
        size: "1024x1024",
        // gpt-image-1 ya devuelve base64 por defecto
      });

      const imagesB64 = (imgResponse.data || []).map((d) => d.b64_json);

      // Reemplazar marcadores por <figure><img ... /></figure>
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
  } catch (error) {
    console.error("Error en /api/generate-content:", error);
    return res.status(500).json({
      error: "Error generando el ebook. Revisa la consola del servidor.",
    });
  }
}

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

function buildSystemInstructions(chapters, toneLabel, langCode, template) {
  const langName = langCode === "en" ? "inglés" : "español";

  const templateHint =
    template === "dark"
      ? "Estilo visual pensado para fondo oscuro: usa títulos claros y secciones bien separadas."
      : template === "minimal"
      ? "Estilo visual minimalista, como un libro editorial limpio y moderno."
      : template === "colorful"
      ? "Estilo visual creativo a color, como materiales de marketing modernos."
      : "Estilo visual clásico dorado, elegante, como un libro premium.";

  return `
Eres un ghostwriter experto en ebooks para info-productores y creadores de contenido.
Tu misión es escribir un ebook COMPLETO, de ALTA CALIDAD, con capítulos desarrollados y lenguaje natural,
preparado para ser vendido como producto digital.

Escribe SIEMPRE en ${langName}, con un tono ${toneLabel}.
No expliques lo que estás haciendo, solo devuelve el CONTENIDO del ebook en HTML.

Requisitos IMPORTANTES:

1) OUTPUT
   - Devuelve SOLO HTML válido, sin <html>, <head>, <body> ni estilos embebidos.
   - Usa esta estructura:
     - <h1> para el título principal.
     - Una sección de introducción con <h2>Introducción</h2> y varios párrafos.
     - Para cada capítulo, usa <h2>Capítulo X: ...</h2>, seguido de varios párrafos, listas, ejemplos, etc.
     - Usa <ul><li>...</li></ul> donde tenga sentido.
     - Termina con una sección <h2>Conclusión</h2> bien desarrollada.
   - No incluyas textos de ejemplo tipo "Aquí va el contenido...", escribe contenido real.

2) LARGO
   - Cada capítulo debe estar bien desarrollado: al menos varios párrafos (puedes asumir 400-600 palabras por capítulo).
   - La introducción y la conclusión también deben aportar valor real.

3) PLACEHOLDERS DE IMÁGENES
   - Después del título de cada capítulo (solo los capítulos, no la introducción ni la conclusión),
     inserta exactamente DOS comentarios HTML como marcadores de imagen:
       <!--IMAGE_CH1_SLOT1-->
       <!--IMAGE_CH1_SLOT2-->
       <!--IMAGE_CH2_SLOT1-->
       <!--IMAGE_CH2_SLOT2-->
       ...
     para cada capítulo del 1 al ${chapters}.
   - No pongas texto visible explicando esos marcadores, solo los comentarios.
   - Escribe el resto del contenido normalmente debajo de esos comentarios.

4) ESTILO
   - El contenido debe sentirse como un ebook profesional: ejemplos, pasos, consejos accionables,
     historias breves y resúmenes al final de capítulos.
   - Evita repetir literalmente la misma frase en cada capítulo.
   - Piensa en un lector que ha pagado por un producto premium.

5) DISEÑO / PLANTILLA
   - Ten en mente este enfoque visual: ${templateHint}
   - Puedes usar subtítulos con <h3> cuando tenga sentido.

De nuevo: devuelve solo el HTML del ebook, respetando los marcadores <!--IMAGE_CHX_SLOTY--> para las imágenes.
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

Usa toda esta información para decidir qué capítulos, subtemas, ejemplos y consejos incluir.
Responde ahora con el HTML completo del ebook, siguiendo las instrucciones del sistema.
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
      ? "Illustration for an ebook in English."
      : "Ilustración para un ebook en español.";

  const base = `
${langPrefix}
Ebook title: "${title}".
Brand / author: ${topic || "no especificado"}.
Target audience: ${audience || "lectores interesados en el tema"}.
This should be a clean, modern illustration for chapter ${chapterNumber},
with simple visual metaphors, soft gradients, subtle golden accents and a style similar
to modern presentation tools like Gamma or Canva.

Include a composition that could work dentro de un libro digital: sin texto grande dentro de la imagen,
sin logos de marcas, sin marcas registradas. 
Iconos, objetos, personajes o escenas simples que ayuden a visualizar el contenido del capítulo.
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

