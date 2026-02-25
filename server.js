import 'dotenv/config';
import express from "express";
import wppconnect from "@wppconnect-team/wppconnect";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

let sessionLink = "";

function generateTestCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function buildPrompt(clientData, userMessage) {
  return `
Tu és o assistente virtual da empresa ${clientData.name}.
Tipo de negócio: ${clientData.business_type}.
Idioma principal: ${clientData.language || "pt"}.

Objetivo:
- Atender clientes
- Fazer vendas ou marcações
- Responder de forma simpática e profissional

Mensagem do cliente:
"${userMessage}"
`;
}

async function askGroq(prompt) {
  const response = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    { model: "llama3-70b-8192", messages: [{ role: "user", content: prompt }] },
    { headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}`, "Content-Type": "application/json" } }
  );
  return response.data.choices[0].message.content;
}

wppconnect.create({
  session: "bot-session",
  headless: true,
  useChrome: false,
  puppeteerOptions: { args: ["--no-sandbox", "--disable-setuid-sandbox"] },
  catchQR: (base64Qr) => console.log("⚠️ Use link de sessão no Render"),
  authStrategy: "LOCAL",
  onStateChange: async (state) => console.log("Estado da sessão:", state),
  catchLogin: (link) => { sessionLink = link; console.log("🔗 Link de login gerado:", link); }
}).then(client => startBot(client))
  .catch(err => console.error("Erro ao iniciar bot:", err));

async function startBot(client) {
  console.log("🤖 Bot iniciado no número de teste");
  client.onMessage(async (message) => {
    if (!message.body) return;
    const from = message.from;

    let { data: clientData } = await supabase.from("clients").select("*").eq("test_code", message.body).single();

    if (clientData) {
      await supabase.from("clients").update({ phone: from, active_number: "teste" }).eq("id", clientData.id);
      await client.sendText(from, `Código validado! Dashboard: https://<render-app>.onrender.com/dashboard/${message.body}`);
      return;
    }

    let { data: registeredClient } = await supabase.from("clients").select("*").eq("phone", from).single();
    if (!registeredClient) {
      const code = generateTestCode();
      const { data: newClient } = await supabase.from("clients").insert([{ phone: from, name: "Cliente de Teste", business_type: "Restaurante", language: "pt", test_code: code, active_number: "teste" }]).select().single();
      await client.sendText(from, `Bem-vindo! Código de 6 dígitos: ${code}\nDashboard: https://<render-app>.onrender.com/dashboard/${code}`);
      return;
    }

    const prompt = buildPrompt(registeredClient, message.body);
    const aiResponse = await askGroq(prompt);
    await supabase.from("messages").insert([{ client_id: registeredClient.id, sender: "client", content: message.body }, { client_id: registeredClient.id, sender: "bot", content: aiResponse }]);
    await client.sendText(from, aiResponse);
  });
}

app.get("/dashboard/:code", async (req, res) => {
  const { code } = req.params;
  const { data: clientData } = await supabase.from("clients").select("*").eq("test_code", code).single();
  if (!clientData) return res.status(404).send("Código inválido");
  const { data: messages } = await supabase.from("messages").select("*").eq("client_id", clientData.id).order("created_at", { ascending: true });
  res.json({ client: clientData, messages });
});

app.get("/", (req, res) => res.send("Servidor ativo 🚀"));
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));