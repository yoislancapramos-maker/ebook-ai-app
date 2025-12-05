// pdf.js
// Módulo de exportación a PDF de Golden Ebook Studio
// Requiere jsPDF 2.5+ y html2canvas 1.4+

window.pdfExporter = (function () {
  const { jsPDF } = window.jspdf;

  async function exportElementToPdf(element, options = {}) {
    const filename = options.filename || "ebook.pdf";

    if (!element) {
      alert("No se encontró el contenido del ebook para exportar.");
      return;
    }

    // Clon “oculto” para capturar todo el contenido
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
        scale: 2,
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

      const ratio = pdfWidth / imgWidthPx;
      const pageHeightPx = pdfHeight / ratio;

      let renderedHeight = 0;
      let page = 0;

      while (renderedHeight < imgHeightPx) {
        const remainingHeight = imgHeightPx - renderedHeight;
        const sliceHeight = Math.min(pageHeightPx, remainingHeight);

        const pageCanvas = document.createElement("canvas");
        pageCanvas.width = imgWidthPx;
        pageCanvas.height = sliceHeight;

        const ctx = pageCanvas.getContext("2d");
        ctx.drawImage(
          canvas,
          0,
          renderedHeight,
          imgWidthPx,
          sliceHeight,
          0,
          0,
          imgWidthPx,
          sliceHeight
        );

        const imgData = pageCanvas.toDataURL("image/jpeg", 0.9);
        const sliceHeightMm = sliceHeight * ratio;

        if (page > 0) {
          pdf.addPage();
        }

        pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, sliceHeightMm);

        renderedHeight += sliceHeight;
        page++;
      }

      pdf.save(filename);
    } catch (error) {
      console.error("Error al generar el PDF:", error);
      alert("Ocurrió un problema al generar el PDF. Revisa la consola para más detalles.");
    } finally {
      document.body.removeChild(cloneContainer);
    }
  }

  return {
    exportElementToPdf
  };
})();


