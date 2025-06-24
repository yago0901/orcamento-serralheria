require('dotenv').config(); // carrega variáveis do .env

const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function enviarEmailComPdf(destinatario, anexoBuffer, nomeArquivo) {
  const mailOptions = {
    from: `"Serralheria Exemplo" <${process.env.EMAIL_USER}>`,
    to: destinatario,
    subject: "Orçamento solicitado",
    html: `<p>Olá! Segue em anexo o orçamento solicitado.</p>`,
    attachments: [
      {
        filename: nomeArquivo,
        content: anexoBuffer,
      },
    ],
  };

  await transporter.sendMail(mailOptions);
}


module.exports = enviarEmailComPdf;