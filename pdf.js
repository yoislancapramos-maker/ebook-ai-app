// pdf.js
// Exportador de PDF para Golden Ebook Studio
// Requiere: jsPDF 2.5+ y html2canvas 1.4+

window.pdfExporter = (function () {
  const { jsPDF } = window.jspdf;

  /**
   * Exporta un elemento DOM a PDF multi-página.
   * - Paginado automático en función de la altura del contenido.
   * - Última página sin espacio blanco excesivo.
   */
  async function exportElementToPdf(element, options = {}) {
    const filename = options.filename || "ebook.pdf";

    if (!element) {
      console.error("No se encontró el elemento del ebook para exportar.");
      alert("No se encontró el contenido del ebook para exportar.");
      return;
    }

    // Clonamos el contenido para que html2canvas capture TODO sin scroll.
    const cloneContainer = document.createElement("div");
    cloneContainer.style.position = "fixed";
    cloneContainer.style.left = "-99999px";
    cloneContainer.style.top = "0";
    cloneContainer.style.width = "800px";
    cloneContainer.style.padding = "40px";
    cloneContainer.style.background = "#ffffff";
    cloneContainer.style.color = "#111827";
    cloneContainer.style.zIndex = "-1";

    const clone = element.cloneNode(true);
    clone.style.boxShadow = "none";
    clone.style.borderRadius = "0";
    clone.style.margin = "0";
    clone.style.maxWidth = "100%";

    cloneContainer.appendChild(clone);
    document.body.appendChild(cloneContainer);

    try {
      const canvas = await html2canvas(cloneContainer, {
        scale: 2, // mejor calidad pero PDF razonable
        useCORS: true,
        backgroundColor: "#ffffff",
        scrollX: 0,
        scrollY: 0,
        windowWidth: cloneContainer.offsetWidth,
        windowHeight: cloneContainer.offsetHeight
      });

      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      const imgWidthPx = canvas.width;
      const imgHeightPx = canvas.height;

      // Relación entre px del canvas y mm del PDF
      const ratio = pdfWidth / imgWidthPx;
      const pageHeightPx = pdfHeight / ratio;

      let renderedHeight = 0;
      let page = 0;

      while (renderedHeight < imgHeightPx) {
        const remainingHeightPx = imgHeightPx - renderedHeight;
        const sliceHeightPx = Math.min(pageHeightPx, remainingHeightPx);

        // Canvas temporal para cada página
        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = imgWidthPx;
        pageCanvas.height = sliceHeightPx;

        const ctx = pageCanvas.getContext("2d");

        ctx.drawImage(
          canvas,
          0,
          renderedHeight,
          imgWidthPx,
          sliceHeightPx,
          0,
          0,
          imgWidthPx,
          sliceHeightPx
        );

        const imgData = pageCanvas.toDataURL("image/jpeg", 0.9);
        const sliceHeightMm = sliceHeightPx * ratio;

        if (page > 0) {
          pdf.addPage();
        }

        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, sliceHeightMm);

        renderedHeight += sliceHeightPx;
        page++;
      }

      pdf.save(filename);
    } catch (err) {
      console.error("Error al generar el PDF:", err);
      alert(
        "Ocurrió un problema al generar el PDF. Revisa la consola para más detalles."
      );
    } finally {
      document.body.removeChild(cloneContainer);
    }
  }

  return {
    exportElementToPdf
  };
})();

