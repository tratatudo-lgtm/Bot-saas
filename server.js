import express from "express";
import wppconnect from "@wppconnect-team/wppconnect";

const app = express();
const PORT = process.env.PORT || 3000;

let whatsappClient = null;

/* ================================
   START EXPRESS PRIMEIRO
================================ */

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
});

/* ================================
   INICIAR WPPCONNECT SEM BLOQUEAR
================================ */

setTimeout(() => {
  console.log("🟡 A iniciar WPPConnect...");

  wppconnect.create({
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
  })
  .then((client) => {
    whatsappClient = client;

    console.log("✅ WPPConnect iniciado com sucesso");

    client.onStateChange((state) => {
      console.log("📡 Estado da sessão:", state);
    });

    client.onStreamChange((state) => {
      console.log("🌐 Estado da conexão:", state);
    });

  })
  .catch((err) => {
    console.error("❌ ERRO AO INICIAR WPP:", err);
  });

}, 5000); // espera 5 segundos antes de iniciar