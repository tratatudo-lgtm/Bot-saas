import express from "express";
import wppconnect from "@wppconnect-team/wppconnect";

const app = express();
const PORT = process.env.PORT || 3000;

let whatsappClient = null;
let loginLink = null;

/* ==============================
   ROTAS
============================== */

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

app.get("/session", (req, res) => {
  if (!loginLink) {
    return res.send("Link ainda não gerado. Aguarda...");
  }

  res.send(`
    <h2>🔗 Link para ligar WhatsApp</h2>
    <a href="${loginLink}" target="_blank">${loginLink}</a>
  `);
});

/* ==============================
   START SERVIDOR
============================== */

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

/* ==============================
   INICIAR WPP
============================== */

setTimeout(() => {
  console.log("🟡 A iniciar WPPConnect...");

  wppconnect.create({
    session: "bot-session",
    headless: true,
    useChrome: false, // usa chromium do sistema
    autoClose: 0,
    waitForLogin: true,
    puppeteerOptions: {
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu"
      ]
    },

    // 🔥 ISTO GERA O LINK EM VEZ DO QR
    catchLinkCode: (link) => {
      console.log("🔗 LINK GERADO:");
      console.log(link);
      loginLink = link;
    },

    onStateChange: (state) => {
      console.log("📡 Estado da sessão:", state);
    }
  })
  .then((client) => {
    whatsappClient = client;
    console.log("✅ WPPConnect iniciado com sucesso");
  })
  .catch((err) => {
    console.error("❌ ERRO AO INICIAR WPP:", err);
  });

}, 5000);