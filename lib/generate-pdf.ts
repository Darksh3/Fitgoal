const generatePdf = async (element) => {
  if (typeof window === "undefined") return;

  const mod = await import("html2pdf.js");
  const html2pdf = mod.default || mod; // <- importante

  const options = {
    filename: `plano-dieta-${new Date().toLocaleDateString("pt-BR").replace(/\//g, "-")}.pdf`,
    image: { type: "jpeg", quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
  };

  await html2pdf().set(options).from(element).save();
};
