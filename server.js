import express from "express";
import wppconnect from "@wppconnect-team/wppconnect";

const app = express();
const PORT = process.env.PORT || 3000;

let whatsappClient = null;
let currentQR = null;

/* =====================================
   INICIAR WPPCONNECT
===================================== */

async function startWPP() {
  try {
    const client = await wppconnect.create({
      session: "bot-session",
      headless: true,
      useChrome: true,
      autoClose: 0,
      waitForLogin: true,
      puppeteerOptions: {
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu"
        ]
      }
    });

    whatsappClient = client;

    console.log("✅ Bot iniciado");

    client.onStateChange((state) => {
      console.log("📡 Estado da sessão:", state);
    });

    client.onStreamChange((state) => {
      console.log("🌐 Estado da conexão:", state);
    });

    client.onMessage((message) => {
      console.log("📩 Mensagem recebida:", message.body);
    });

  } catch (error) {
    console.error("❌ Erro ao iniciar WPP:", error);
  }
}

/* =====================================
   ROTAS
===================================== */

app.get("/", (req, res) => {
  res.send("Servidor ativo 🚀");
});

app.get("/status", async (req, res) => {
  if (!whatsappClient) {
    return res.send("Cliente ainda não inicializado");
  }

  try {
    const state = await whatsappClient.getConnectionState();
    res.send(`Estado atual: ${state}`);
  } catch (err) {
    res.send("Erro ao obter estado");
  }
});

app.get("/qr", async (req, res) => {
  if (!whatsappClient) {
    return res.send("Cliente ainda não iniciado");
  }

  try {
    const qr = await whatsappClient.getQrCode();
    res.send(`<pre>${qr}</pre>`);
  } catch (err) {
    res.send("QR ainda não disponível");
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  startWPP();
});