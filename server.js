import express from "express";
import wppconnect from "@wppconnect-team/wppconnect";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import dotenv from "dotenv";
dotenv.config();

// --- Express ---
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

// --- Supabase ---
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// --- Link de sessão ---
let sessionLink = "";

// --- Gera código de teste ---
function generateTestCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// --- Prompt para IA ---
function buildPrompt(clientData, userMessage) {
  return `
Tu és o assistente virtual da empresa ${clientData.name}.
Tipo de negócio: ${clientData.business_type}.
Idioma principal: ${clientData.language || "pt"}.

Mensagem do cliente:
"${userMessage}"
`;
}

// --- Chamada Groq ---
async function askGroq(prompt) {
  const res = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: "llama3-70b-8192",
      messages: [{ role: "user", content: prompt }]
    },
    { headers: { "Authorization": `Bearer ${process.env.GROQ_API_KEY}` } }
  );
  return res.data.choices[0].message.content;
}

// --- WPPConnect SEM Chrome ---
wppconnect.create({
  session: "bot-session",
  headless: true,
  useChrome: false,       // ❌ Sem Chrome
  authStrategy: "LOCAL",  // ✅ Sessão local
  catchQR: () => {},       // Ignorar QR
  catchLogin: (link) => { // Link de login
    sessionLink = link;
    console.log("🔗 Link de login gerado:", link);
  },
  onStateChange: (state) => console.log("Estado:", state)
})
.then(client => startBot(client))
.catch(err => console.error("Erro ao iniciar bot:", err));

// --- Bot principal ---
async function startBot(client) {
  console.log("🤖 Bot iniciado");

  client.onMessage(async (msg) => {
    if (!msg.body) return;
    const from = msg.from;

    // --- Test code ---
    let { data: clientData } = await supabase
      .from("clients")
      .select("*")
      .eq("test_code", msg.body)
      .single();

    if (clientData) {
      await supabase.from("clients")
        .update({ phone: from })
        .eq("id", clientData.id);

      await client.sendText(from, `Código validado! Dashboard: https://<SEU-APP>.onrender.com/dashboard/${msg.body}`);
      return;
    }

    // --- Novo cliente ---
    let { data: regClient } = await supabase
      .from("clients")
      .select("*")
      .eq("phone", from)
      .single();

    if (!regClient) {
      const code = generateTestCode();
      const { data: newClient } = await supabase
        .from("clients")
        .insert([{
          phone: from,
          name: "Cliente Teste",
          business_type: "Restaurante",
          language: "pt",
          test_code: code
        }])
        .select()
        .single();

      await client.sendText(from, `Bem-vindo! Código: ${code}\nDashboard: https://<SEU-APP>.onrender.com/dashboard/${code}`);
      return;
    }

    // --- IA ---
    const prompt = buildPrompt(regClient, msg.body);
    const aiRes = await askGroq(prompt);

    await supabase.from("messages").insert([
      { client_id: regClient.id, sender: "client", content: msg.body },
      { client_id: regClient.id, sender: "bot", content: aiRes }
    ]);

    await client.sendText(from, aiRes);
  });
}

// --- Dashboard ---
app.get("/dashboard/:code", async (req, res) => {
  const { code } = req.params;
  const { data: clientData } = await supabase
    .from("clients")
    .select("*")
    .eq("test_code", code)
    .single();

  if (!clientData) return res.status(404).send("Código inválido");

  const { data: messages } = await supabase
    .from("messages")
    .select("*")
    .eq("client_id", clientData.id)
    .order("created_at", { ascending: true });

  res.json({ client: clientData, messages });
});

app.get("/", (req, res) => res.send("Servidor ativo 🚀"));

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));