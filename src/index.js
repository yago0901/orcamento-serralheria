const express = require("express");
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("baileys");
const P = require("pino");
const QRCode = require("qrcode");
const { Boom } = require("@hapi/boom");
const PDFDocument = require("pdfkit");

const bodyParser = require("body-parser");
const generatePdf = require("./services/generatePdf");

const fs = require("fs");
const path = require("path");
const mime = require("mime-types");

require('dotenv').config();
const enviarEmailComPdf = require("./services/sendEmail");

const deleteOldestPdf = require('./deleteOldestPdf');

const app = express();
app.use(express.json({ limit: "10mb" }));

const cors = require("cors");
app.use(
  cors({
    origin: ["http://127.0.0.1:5500", "http://localhost:5500"],
  })
);

let sock;

// Função para iniciar o WhatsApp

let currentQR = null;
let isConnected = false;
async function startWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState("./auth_info_baileys");

  sock = makeWASocket({
    auth: state,
    logger: P({ level: "silent" }), // ou 'debug' se quiser ver mais logs
    printQRInTerminal: false, // desabilita o QR bruto no terminal
  });

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      currentQR = await QRCode.toDataURL(qr); // base64 format
      isConnected = false;
    }

    if (connection === "close") {
      const shouldReconnect = lastDisconnect?.error instanceof Boom && lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut;

      isConnected = false;
      if (shouldReconnect) await startWhatsApp();
    }

    if (connection === "open") {
      isConnected = true;
      currentQR = null;
      console.log("✅ Conectado ao WhatsApp!");
    }
  });

  sock.ev.on("creds.update", saveCreds);
}

startWhatsApp();

// Endpoint para frontend pegar o status e QR se necessário
app.get("/whatsapp-status", (req, res) => {
  if (isConnected) {
    return res.json({ connected: true });
  }

  if (currentQR) {
    return res.json({ connected: false, qrCode: currentQR });
  }

  return res.json({ connected: false });
});

//Gerar pdf
app.post("/generate-pdf", (req, res) => {
  generatePdf(req.body, res);
});

// Endpoint para envio de pdf
app.post("/send-pdf", async (req, res) => {
  try {
    const { number, email } = req.body;
    if (!number) return res.status(400).json({ error: "Número é obrigatório" });
    if (!email) return res.status(400).json({ error: "E-mail é obrigatório" });

    const folder = path.join(__dirname, "pdfs");
    const files = fs
      .readdirSync(folder)
      .filter((file) => file.endsWith(".pdf"))
      .map((file) => ({
        name: file,
        time: fs.statSync(path.join(folder, file)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time); // mais recente primeiro

    if (files.length === 0) {
      return res.status(404).json({ error: "Nenhum PDF encontrado" });
    }

    const latestFileName = files[0].name;
    const filePath = path.join(folder, latestFileName);
    const buffer = fs.readFileSync(filePath);
    const mimetype = mime.lookup(filePath) || "application/pdf";

    // Enviar via WhatsApp
    const jid = `${number}@s.whatsapp.net`;
    await sock.sendMessage(jid, {
      document: buffer,
      mimetype,
      fileName: latestFileName,
    });

    // Enviar via E-mail
    await enviarEmailComPdf(email, buffer, latestFileName);

    //Deletar o mais antigo    
    deleteOldestPdf(folder);

    res.json({ success: true, message: "PDF enviado com sucesso via WhatsApp" });
  } catch (err) {
    console.error("Erro ao enviar PDF:", err);
    res.status(500).json({ error: "Erro ao enviar PDF via WhatsApp" });
  }
});

// Rota básica
app.get("/", (req, res) => {
  res.send("✅ Backend do orçamento funcionando!");
});

// Iniciar servidor
app.listen(3003, () => {
  console.log("🚀 Servidor rodando na porta 3003");
});
