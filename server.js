import express from "express";
import wppconnect from "@wppconnect-team/wppconnect";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Inicializar WPPConnect
wppconnect.create({
  session: "bot-session",
  headless: true,
  puppeteerOptions: {
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  }
})
.then((client) => start(client))
.catch((error) => console.log(error));

function start(client) {
  console.log("Bot iniciado");

  client.onMessage(async (message) => {
    if (!message.body) return;

    console.log("Mensagem recebida:", message.body);

    await client.sendText(message.from, "Bot ativo 🚀");
  });
}

app.get("/", (req, res) => {
  res.send("Servidor ativo 🚀");
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
