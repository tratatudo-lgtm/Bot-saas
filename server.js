import express from "express";
import wppconnect from "@wppconnect-team/wppconnect";

const app = express();
const PORT = process.env.PORT || 3000;

let whatsappClient = null;
let loginLink = null;

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
  } catch {
    res.send("Erro ao obter estado");
  }
});

app.get("/session", (req, res) => {
  if (!loginLink) {
    return res.send("Link ainda não gerado. Aguarda...");
  }

  res.send(`<a href="${loginLink}" target="_blank">${loginLink}</a>`);
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

setTimeout(() => {
  console.log("🟡 A iniciar WPPConnect...");

  wppconnect.create({
    session: "bot-session",
    headless: true,
    autoClose: 0,
    waitForLogin: true,
    // 🔥 NÃO usar useChrome
    puppeteerOptions: {
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage"
      ]
    },
    catchLinkCode: (link) => {
      console.log("🔗 LINK GERADO:", link);
      loginLink = link;
    }
  })
  .then((client) => {
    whatsappClient = client;
    console.log("✅ WPP iniciado com sucesso");
  })
  .catch((err) => {
    console.error("❌ ERRO AO INICIAR WPP:", err);
  });

}, 5000);