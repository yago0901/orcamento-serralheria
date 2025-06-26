const fs = require("fs");
const path = require("path");
const PDFDocument = require("pdfkit");
const { PassThrough } = require("stream");

function generatePdf(data, res) {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  const dataFormatada = new Date(data.dataEmissao).toLocaleDateString("pt-BR");

  // Criar streams: um para resposta HTTP, outro para salvar no arquivo
  const passthrough1 = new PassThrough();
  const passthrough2 = new PassThrough();

  // Pipe do PDF para ambos os passthroughs
  doc.pipe(passthrough1);
  doc.pipe(passthrough2);

  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "attachment; filename=orcamento.pdf");

  passthrough1.pipe(res);

  // Salvar em arquivo (ex: "pdfs/orcamento_TIMESTAMP.pdf")
  const filename = `orcamento_${Date.now()}.pdf`;
  const outputPath = path.join(__dirname, "..", "pdfs", filename);
  const writeStream = fs.createWriteStream(outputPath);
  passthrough2.pipe(writeStream);

  // Inserir logo (base64)
  if (data.empresa && data.empresa.logo && data.empresa.logo.type === "base64") {
    const logoBase64 = data.empresa.logo.data;
    const logoBuffer = Buffer.from(logoBase64, "base64");
    doc.image(logoBuffer, 50, 45, { width: 150 });
  }

  // Título
  doc.moveDown(6);

  // Dados da empresa
  doc.moveDown();
  doc.fontSize(10).text(`Empresa: ${data.empresa.nome}`, { width: 495, align: "left" });
  doc.moveDown(0.2);
  doc.text(`CNPJ: ${data.empresa.cnpj}`, { width: 495, align: "left" });
  doc.moveDown(0.2);
  doc.text(`Endereço: ${data.empresa.endereco}`, { width: 495, align: "left" });
  doc.moveDown(0.2);
  doc.text(`Telefone: ${data.empresa.telefone}`, { width: 495, align: "left" });
  doc.moveDown(0.2);
  doc.text(`E-mail: ${data.empresa.email}`, { width: 495, align: "left" });

  // Linha separadora
  doc.moveDown().moveTo(50, doc.y).lineTo(545, doc.y).stroke();

  // Dados do cliente
  doc.moveDown();
  doc.fontSize(12).text("Cliente:", { underline: true });

  doc.moveDown(0.5);
  doc.fontSize(10).text(`Nome: ${data.cliente.nome}`, { width: 495, align: "left" });
  doc.moveDown(0.2);
  doc.text(`Telefone: ${data.cliente.telefone}`, { width: 495, align: "left" });
  doc.moveDown(0.2);
  doc.text(`E-mail: ${data.cliente.email}`, { width: 495, align: "left" });
  doc.moveDown(0.2);
  doc.text(`Endereço: ${data.cliente.endereco}`, { width: 495, align: "left" });

  // Itens do orçamento (descrição serviço)
  doc.moveDown();
  doc.fontSize(12).text("Descrição do Serviço:", { underline: true });

  // Cabeçalho da tabela
  doc.moveDown(0.5);
  const y = doc.y; // guarda o y atual

  doc.text("Item", 50, y, { width: 30 });
  doc.text("Descrição", 90, y, { width: 180 });
  doc.text("Qtd", 200, y, { width: 50, align: "right" });
  doc.text("Unidade", 265, y, { width: 50, align: "right" });
  doc.text("Valor Unit.", 340, y, { width: 70, align: "right" });
  doc.text("Valor Total", 415, y, { width: 90, align: "right" });

  doc.moveDown();

  doc.font("Helvetica").fontSize(10);

  data.descricaoServico.forEach((item) => {
    const y = doc.y;

    doc.text(item.item.toString(), 50, y, { width: 30 });
    doc.text(item.descricao, 90, y, { width: 180 });
    doc.text(item.quantidade.toString(), 200, y, {
      width: 50,
      align: "right",
    });
    doc.text(item.unidade, 265, y, { width: 50, align: "right" });
    doc.text(item.valorUnitario.toFixed(2), 340, y, {
      width: 70,
      align: "right",
    });
    doc.text(item.valorTotal.toFixed(2), 415, y, {
      width: 90,
      align: "right",
    });

    // Avança a linha após a linha inteira
    doc.moveDown(1); // ou use `doc.y += 15` se quiser um controle fixo
  });

  // Materiais Utilizados
  doc.moveDown(1);
  doc.fontSize(12).font("Helvetica").text("Materiais Utilizados:", 50, 480);
  doc.moveDown(0.3);

  doc.x = 50;
  doc.fontSize(10).font("Helvetica").list(data.materiaisUtilizados, {
    x: 50,
    width: 495,
    align: "left",
    indent: 20,
  });

  // Valor total
  doc.moveDown(2);
  doc
    .fontSize(14)
    .font("Helvetica-Bold")
    .text(`Valor Total: R$ ${data.valorTotal.toFixed(2)}`, {
      align: "left",
      width: 495,
    });

  // Condições
  doc.moveDown(1);
  doc.fontSize(14).font("Helvetica-Bold").text("Condições:", { width: 495, underline: true });

  doc.moveDown(0.2);
  doc.fontSize(10).font("Helvetica");
  doc.fontSize(12).text(`Prazo para execução: ${data.condicoes.prazoExecucao}`, {
    width: 495,
  });
  doc.moveDown(0.2);
  doc.fontSize(12).text(`Forma de pagamento: ${data.condicoes.formaPagamento}`, {
    width: 495,
  });
  doc.moveDown(0.2);
  doc.fontSize(12).text(`Validade do orçamento: ${data.condicoes.validadeOrcamento}`, {
    width: 495,
  });
  doc.moveDown(0.2);
  doc.fontSize(12).text(`Transporte e instalação: ${data.condicoes.transporteInstalacao}`, {
    width: 495,
  });

  // Data emissão
  doc.moveDown(1);
  doc.fontSize(12).text(`Data de emissão: ${dataFormatada}`, { width: 495 });

  doc.end();
  return outputPath;
}

module.exports = generatePdf;
