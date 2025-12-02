// api/generate-content.js

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido" });
  }

  const {
    tema,
    publico,
    objetivo,
    tipo,
    profundidad,
    capitulos,
    autor,
    plantilla,
    plan
  } = req.body || {};

  if (!tema || !publico || !objetivo || !capitulos) {
    return res.status(400).json({ error: "Faltan datos obligatorios" });
  }

  const autorFinal =
    autor && autor.trim().length > 0 ? autor.trim() : "Autor Anónimo";

  const detalleMap = {
    basico:
      "extensión clara y directa, 10-15 páginas aproximadas en formato PDF, equivalente a un contenido moderado",
    medio:
      "extensión media, con explicaciones, ejemplos y ejercicios, 20-30 páginas aproximadas en formato PDF, equivalente a un contenido amplio",
    alto:
      "extensión alta, muy detallada, con marcos conceptuales, ejemplos, casos y ejercicios, 30-50 páginas aproximadas en formato PDF. El contenido debe ser extenso."
  };

  const tipoMap = {
    guia: "una guía paso a paso muy práctica",
    plan: "un plan detallado organizado por días o semanas",
    checklist: "una checklist accionable acompañada de consejos prácticos",
    mixto:
      "una combinación de guía paso a paso, plan de días y checklist final accionable"
  };

  const plantillaMap = {
    minimal: "Minimal Pro (limpia, profesional, muy legible)",
    business: "Business Blue (corporativa, seria, ideal para negocios)",
    creative: "Creativa Full Color (más llamativa y colorida, ideal para creatividad y redes sociales)"
  };

  const detalleTexto = detalleMap[profundidad] || detalleMap.medio;
  const tipoTexto = tipoMap[tipo] || tipoMap.guia;
  const plantillaTexto = plantillaMap[plantilla] || plantillaMap.minimal;

  // Ambos modelos dan buena calidad, solo cambiamos capacidad interna
  const model = plan === "pro" ? "gpt-4o" : "gpt-4o-mini";

  const prompt = `
Quiero que actúes como un autor experto que escribe ebooks prácticos en español, con mucho valor real y sin paja.

Datos del ebook:
- Tema principal: ${tema}
- Público objetivo: ${publico}
- Objetivo del ebook: ${objetivo}
- Tipo de ebook: ${tipoTexto}
- Nivel de detalle: ${detalleTexto}
- Número aproximado de capítulos principales: ${capitulos}
- Autor o marca: ${autorFinal}
- Estilo visual (plantilla): ${plantillaTexto}

Instrucciones de estilo:
- Sé muy práctico: incluye pasos concretos, ejemplos aplicados al público objetivo y mini ejercicios.
- Evita frases genéricas, relleno y repeticiones innecesarias.
- No inventes estadísticas ni porcentajes falsos.
- Usa un tono cercano pero profesional.
- No hables de que eres una IA ni menciones modelos de lenguaje.
- El contenido debe ser relativamente extenso y detallado; no resumas demasiado.

Puedes usar estos bloques visuales cuando tenga sentido:
- Para una idea muy importante, usa:
  <div class="highlight-box"><strong>Título breve del bloque:</strong> Explicación práctica.</div>
- Para consejos específicos, usa:
  <div class="tip-box"><strong>Tip:</strong> Consejo práctico que el lector pueda aplicar.</div>
- Para actividades y ejercicios, usa:
  <div class="exercise-box"><strong>Ejercicio:</strong> Explica qué debe hacer el lector paso a paso.</div>

Estructura obligatoria del ebook (EN HTML SENCILLO, SIN <html> NI <body>):

1) Portada:
<h1>Título potente del ebook</h1>
<p class="subtitle">Subtítulo claro, orientado al beneficio principal</p>
<p class="author">Por ${autorFinal}</p>

2) Introducción:
<h2>Introducción</h2>
<p>Explica el problema, por qué importa para este público y qué conseguirá el lector al aplicar el contenido.</p>

3) Índice:
<h2>Índice</h2>
<ul>
  <li>Capítulo 1: ...</li>
  <li>Capítulo 2: ...</li>
  ...
</ul>

4) Capítulos:
Para cada capítulo, respeta este esquema y desarrolla de forma detallada:
<h2>Capítulo X - Título del capítulo</h2>
<p>Texto introductorio que conecta con la realidad del lector.</p>

<h3>Conceptos clave</h3>
<ul>
  <li>Concepto + explicación práctica orientada al público objetivo.</li>
  <li>Otro concepto importante con ejemplo breve.</li>
</ul>

<h3>Pasos accionables</h3>
<ol>
  <li>Paso concreto que el lector pueda aplicar.</li>
  <li>Otro paso concreto que se pueda hacer en poco tiempo.</li>
</ol>

<h3>Ejemplo aplicado</h3>
<p>Ejemplo sencillo y realista aplicando el contenido del capítulo al público objetivo.</p>

<h3>Mini ejercicio</h3>
<ul>
  <li>Ejercicio o pregunta que el lector pueda hacer hoy mismo para avanzar.</li>
</ul>

Cuando tenga sentido, añade uno o varios bloques usando las clases highlight-box, tip-box o exercise-box para destacar ideas clave, tips o ejercicios adicionales.

5) Conclusión:
<h2>Conclusión</h2>
<p>Resumen de ideas clave, recordatorio del objetivo y mensaje final motivador.</p>

6) Bonus:
<h2>Bonus: Checklist o plan accionable</h2>
<ul>
  <li>Punto accionable concreto, breve y claro.</li>
  <li>Otro punto accionable que el lector pueda aplicar de inmediato.</li>
</ul>

REGLAS IMPORTANTES:
- Devuelve SOLO el contenido interno como si ya estuviera dentro de <div class="ebook-page">...</div>, pero NO añadas esa etiqueta, yo la envolveré después.
- Usa solo etiquetas HTML básicas: h1, h2, h3, p, ul, ol, li, strong, em, y los div con clases highlight-box, tip-box, exercise-box.
- No incluyas CSS, ni scripts, ni estilos en línea.
- Asegúrate de que el contenido sea útil, coherente, práctico y con suficiente extensión.
`;

  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res
        .status(500)
        .json({ error: "No está configurada la API KEY de OpenAI" });
    }

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "Eres un autor experto que escribe ebooks altamente prácticos y accionables en español."
          },
          { role: "user", content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    if (!openaiRes.ok) {
      const errorText = await openaiRes.text();
      console.error("Error al llamar a OpenAI:", errorText);
      return res
        .status(500)
        .json({ error: "Error al llamar a la API de OpenAI" });
    }

    const json = await openaiRes.json();
    const content = json.choices?.[0]?.message?.content || "";

    const html = `<div class="ebook-page">\n${content.trim()}\n</div>`;

    return res.status(200).json({ html });
  } catch (err) {
    console.error("Error interno del servidor:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}
