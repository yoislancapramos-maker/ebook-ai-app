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
    plan // ya no lo usamos para calidad, solo se pasa desde el front por si lo necesitas luego
  } = req.body || {};

  if (!tema || !publico || !objetivo || !capitulos) {
    return res.status(400).json({ error: "Faltan datos obligatorios" });
  }

  const autorFinal =
    autor && autor.trim().length > 0 ? autor.trim() : "Autor Anónimo";

  const detalleMap = {
    basico:
      "extensión clara y directa, similar a unas 10-15 páginas en PDF, sin paja, pero con ejemplos y ejercicios útiles",
    medio:
      "extensión media, similar a unas 20-30 páginas en PDF, con explicaciones, ejemplos, casos breves y ejercicios prácticos",
    alto:
      "extensión alta, similar a unas 30-50 páginas en PDF, con marcos conceptuales, ejemplos desarrollados, mini casos de estudio y varios ejercicios por capítulo. El contenido debe ser extenso y profundo, pero siempre práctico"
  };

  const tipoMap = {
    guia: "una guía paso a paso muy práctica y accionable",
    plan: "un plan estructurado por días o semanas con acciones concretas",
    checklist: "una checklist accionable con explicaciones breves y claras",
    mixto:
      "una combinación de guía paso a paso, plan accionable y checklist final"
  };

  const plantillaMap = {
    minimal:
      "Minimal Pro (limpia, profesional, muy legible, estilo editorial moderno)",
    business:
      "Business Blue (corporativa, seria, ideal para negocios y profesionales)",
    creative:
      "Creativa Full Color (llamativa y colorida, ideal para creatividad, marketing y redes sociales)"
  };

  const detalleTexto = detalleMap[profundidad] || detalleMap.medio;
  const tipoTexto = tipoMap[tipo] || tipoMap.guia;
  const plantillaTexto = plantillaMap[plantilla] || plantillaMap.minimal;

  // Misma calidad para todos los planes (como acordamos)
  const model = "gpt-4o";

  const prompt = `
Quiero que actúes como un autor profesional de ebooks en español, especializado en resolver problemas reales de las personas, sin paja y sin relleno aburrido.

DATOS DEL EBOOK
- Tema principal: ${tema}
- Público objetivo: ${publico}
- Objetivo del ebook: ${objetivo}
- Tipo de ebook: ${tipoTexto}
- Nivel de detalle y extensión: ${detalleTexto}
- Número aproximado de capítulos principales: ${capitulos}
- Autor o marca: ${autorFinal}
- Estilo visual de maquetación: ${plantillaTexto}

ESTILO QUE QUIERO (HÍBRIDO PROFESIONAL)
- Debe ser muy práctico y accionable, pero también profundo.
- Cada capítulo debe ayudar al lector a avanzar de forma real sobre su problema.
- Nada de frases genéricas tipo "es muy importante ser constante" sin explicar CÓMO.
- Usa ejemplos, mini casos, pasos claros y ejercicios.
- El lector debe sentir que este ebook VALE DINERO y le resuelve su problema.
- No seas repetitivo ni des vueltas largas, pero sí desarrolla bien cada idea.
- No inventes estadísticas ni porcentajes concretos.
- Tono cercano pero profesional, como un buen mentor.

BLOQUES VISUALES DISPONIBLES
Puedes incluir cuando tenga sentido (pero sin abusar):
- Bloque de idea clave:
  <div class="highlight-box"><strong>Idea clave:</strong> Explicación práctica orientada al problema.</div>

- Bloque de consejo:
  <div class="tip-box"><strong>Tip:</strong> Consejo práctico y específico que el lector pueda aplicar hoy mismo.</div>

- Bloque de ejercicio:
  <div class="exercise-box"><strong>Ejercicio:</strong> Explica paso a paso qué debe hacer el lector.</div>

ESTRUCTURA OBLIGATORIA DEL EBOOK
Devuelve TODO en HTML sencillo, SIN <html>, SIN <body>, SIN <head>, SIN CSS.

1) PORTADA
Debe ser potente, clara y orientada al beneficio:
<h1>Título potente del ebook</h1>
<p class="subtitle">Subtítulo claro, enfocado al beneficio principal para el lector</p>
<p class="author">Por ${autorFinal}</p>

2) INTRODUCCIÓN
<h2>Introducción</h2>
<p>Explica el problema actual del público objetivo, por qué les duele, qué errores cometen normalmente y qué conseguirá el lector si aplica este ebook.</p>

3) ÍNDICE
<h2>Índice</h2>
<ul>
  <li>Capítulo 1: ...</li>
  <li>Capítulo 2: ...</li>
  <li>Capítulo 3: ...</li>
  <!-- ajusta al número de capítulos aproximado ${capitulos} -->
</ul>

4) CAPÍTULOS (ESTRUCTURA HÍBRIDA POR CADA CAPÍTULO)
Para cada uno de los ${capitulos} capítulos, usa SIEMPRE esta estructura y desarróllala con bastante contenido:

<h2>Capítulo X - Título del capítulo</h2>
<p>Texto introductorio que describa la situación típica del lector relacionada con este capítulo.</p>

<h3>Conceptos clave</h3>
<ul>
  <li>Concepto importante + explicación práctica aplicada al público objetivo.</li>
  <li>Otro concepto importante con ejemplo concreto.</li>
  <li>Si es necesario, un tercer concepto para completar la comprensión.</li>
</ul>

<h3>Pasos accionables</h3>
<ol>
  <li>Paso detallado que el lector pueda aplicar, con ejemplos específicos.</li>
  <li>Segundo paso con acciones claras en el día a día.</li>
  <li>Tercer paso que ayude a consolidar el cambio.</li>
</ol>

<h3>Ejemplo aplicado</h3>
<p>Cuenta un ejemplo realista y sencillo donde se vea cómo una persona de este público aplica estos pasos y mejora su situación.</p>

<h3>Mini caso práctico</h3>
<p>Breve caso práctico adicional (puede ser tipo historia resumida) que refuerce el aprendizaje.</p>

<h3>Mini ejercicio</h3>
<ul>
  <li>Ejercicio o reflexión guiada que el lector pueda hacer hoy mismo (incluye instrucciones claras).</li>
</ul>

En algunos capítulos (no en todos), añade uno o varios bloques usando:
- <div class="highlight-box"> para ideas clave
- <div class="tip-box"> para consejos accionables
- <div class="exercise-box"> para ejercicios extra

5) CONCLUSIÓN FINAL
<h2>Conclusión</h2>
<p>Resume las ideas clave de todo el ebook, refuerza el objetivo principal y motiva al lector a aplicar lo aprendido. Incluye una llamada a la acción clara.</p>

6) BONUS FINAL
<h2>Bonus: Checklist o plan accionable</h2>
<ul>
  <li>Punto accionable concreto, breve y claro.</li>
  <li>Otro punto que el lector pueda aplicar esta semana.</li>
  <li>Otro punto para consolidar el hábito o resultado.</li>
</ul>

REGLAS TÉCNICAS IMPORTANTES
- No envuelvas todo en <div class="ebook-page"> ni en ningún <div> global, devuélvelo TAL CUAL en HTML plano. El frontend se encargará de envolverlo.
- Usa solo estas etiquetas: h1, h2, h3, p, ul, ol, li, strong, em, div con las clases highlight-box, tip-box, exercise-box.
- No incluyas estilos CSS, ni <style>, ni <script>, ni enlaces, ni imágenes.
- El contenido debe ser extenso, útil y coherente con el tema: prioriza siempre resolver el problema real del lector.
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
              "Eres un autor experto que escribe ebooks altamente prácticos, accionables y sin paja en español. Tu prioridad es ayudar al lector a resolver un problema real."
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

    // IMPORTANTE: ya no envolvemos en <div class="ebook-page">
    const html = content.trim();

    return res.status(200).json({ html });
  } catch (err) {
    console.error("Error interno del servidor:", err);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
}

