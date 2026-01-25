o mesmo erro, só que agora aparece no bundle “real” do site:

✅ TypeError: a.set is not a function (linha 111)

Ou seja: você ainda está chamando:

await a.set(...).from(...).save()


mas a não é a instância do html2pdf (ou a lib não está sendo importada do jeito certo).

✅ Conserto garantido (Next.js/React)

Troca sua chamada para import dinâmico + default fallback e chama html2pdf():

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


📌 O detalhe chave:

não é a.set(...)

é html2pdf().set(...)

✅ Se você já fez isso e mesmo assim dá erro…

Então você provavelmente está fazendo algo assim sem querer:

const a = html2pdf; // errado se você não chama ()
await a.set(...)


ou importando errado:

import * as html2pdf from "html2pdf.js" // pode virar objeto módulo

Teste rápido pra confirmar (2 segundos)

Antes do set, coloca:

console.log("html2pdf typeof:", typeof html2pdf, html2pdf);


Se aparecer object em vez de function, é import errado.

Me manda o trecho e eu te digo exatamente a linha

Cola aqui (ou print) apenas:

os imports do arquivo

a função que gera o PDF (10–30 linhas)

Aí eu te devolvo a versão corrigida já no seu padrão do projeto.
