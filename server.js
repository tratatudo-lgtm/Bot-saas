import express from "express";
import wppconnect from "@wppconnect-team/wppconnect";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

// --- Supabase ---
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// --- Variável global para link de sessão ---
let sessionLink = "";

// --- Funções ---
function generateTestCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function buildPrompt(clientData, userMessage) {
  return `
Tu és o assistente virtual da empresa ${clientData.name}.
Tipo de negócio: ${clientData.business_type}.
Idioma principal: ${clientData.language || "pt"}.

Objetivo:
- Adaptar respostas e ações ao tipo de negócio
- Se for vendas ou marcações, realiza
- Se for outro tipo de negócio, executa conforme necessidade
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

// --- Iniciar WPPConnect headless ---
wppconnect.create({
  session: "bot-session",
  headless: true,
  useChrome: false,       // não precisa de Chrome completo
  authStrategy: "LOCAL",  // salva sessão local
  catchQR: (qrCode, asciiQR) => {
    console.log("📷 QR gerado (ASCII):\n", asciiQR);
  },
  catchLogin: (link) => {
    sessionLink = link;
    console.log("🔗 Link de login gerado:", link);
  },
  onStateChange: (state) => console.log("Estado da sessão:", state)
})
.then(client => startBot(client))
.catch(err => console.error("Erro ao iniciar bot:", err));

// --- Função principal ---
async function startBot(client) {
  console.log("🤖 Bot iniciado");

  client.onMessage(async (message) => {
    if (!message.body) return;
    const from = message.from;

    // --- Código de teste ---
    let { data: clientData } = await supabase.from("clients").select("*").eq("test_code", message.body).single();

    if (clientData) {
      await supabase.from("clients").update({ phone: from, active_number: "teste" }).eq("id", clientData.id);
      await client.sendText(from, `Código validado! Dashboard: https://<seu-app-render>.onrender.com/dashboard/${message.body}`);
      return;
    }

    // --- Cliente novo ---
    let { data: registeredClient } = await supabase.from("clients").select("*").eq("phone", from).single();

    if (!registeredClient) {
      const code = generateTestCode();
      const { data: newClient } = await supabase.from("clients")
        .insert([{ phone: from, name: "Cliente de Teste", business_type: "Restaurante", language: "pt", test_code: code, active_number: "teste" }])
        .select()
        .single();

      await client.sendText(from, `Bem-vindo! Código: ${code}\nDashboard: https://<seu-app-render>.onrender.com/dashboard/${code}`);
      return;
    }

    // --- IA adaptativa ---
    const prompt = buildPrompt(registeredClient, message.body);
    const aiResponse = await askGroq(prompt);

    await supabase.from("messages").insert([
      { client_id: registeredClient.id, sender: "client", content: message.body },
      { client_id: registeredClient.id, sender: "bot", content: aiResponse }
    ]);

    await client.sendText(from, aiResponse);
  });
}

// --- Dashboard ---
app.get("/dashboard/:code", async (req, res) => {
  const { code } = req.params;
  const { data: clientData } = await supabase.from("clients").select("*").eq("test_code", code).single();
  if (!clientData) return res.status(404).send("Código inválido");

  const { data: messages } = await supabase.from("messages").select("*").eq("client_id", clientData.id).order("created_at", { ascending: true });
  res.json({ client: clientData, messages });
});

// --- Link de sessão ---
app.get("/session", (req, res) => {
  if (!sessionLink) return res.send("Sessão ainda não gerada.");
  res.send(`<h2>🔗 Link de login / número teste</h2><pre>${sessionLink}</pre>`);
});

// --- Teste ---
app.get("/", (req, res) => res.send("Servidor ativo 🚀"));

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));