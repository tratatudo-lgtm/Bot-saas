// server.js
import express from "express";
import wppconnect from "@wppconnect-team/wppconnect";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// --- Supabase ---
const supabase = createClient(
  process.env.SUPABASE_URL,      // tua Supabase URL
  process.env.SUPABASE_SERVICE_ROLE_KEY // tua Supabase Key
);

// --- Variáveis ---
let sessionLink = "";

// --- Gera código de teste automático ---
function generateTestCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// --- Cria prompt para IA Groq ---
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

// --- Chamada IA Groq ---
async function askGroq(prompt) {
  const response = await axios.post(
    "https://api.groq.com/openai/v1/chat/completions",
    {
      model: "llama3-70b-8192",
      messages: [{ role: "user", content: prompt }]
    },
    {
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      }
    }
  );
  return response.data.choices[0].message.content;
}

// --- Inicializa WPPConnect com Chromium interno ---
wppconnect.create({
  session: "bot-session",
  headless: true,
  useChrome: false, // usa Chromium interno
  puppeteerOptions: {
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-gpu"
    ]
  },
  authStrategy: "LOCAL",
  catchQR: (base64Qr) => {
    console.log("⚠️ Primeiro login: use link de sessão");
  },
  catchLogin: (link) => {
    sessionLink = link;
    console.log("🔗 Link de login gerado (primeira vez):", link);
  },
  onStateChange: async (state) => {
    console.log("Estado da sessão:", state);
    if (state === "CONNECTED") console.log("✅ Bot conectado sem QR Code!");
    if (state === "SYNCING") console.log("🔄 Sincronizando histórico de mensagens...");
  }
})
.then(client => startBot(client))
.catch(err => console.error("Erro ao iniciar bot:", err));

// --- Função principal do bot ---
async function startBot(client) {
  console.log("🤖 Bot iniciado no número de teste");

  client.onMessage(async (message) => {
    if (!message.body) return;
    const from = message.from;

    // --- Verifica se é código de teste enviado pelo cliente ---
    let { data: clientData } = await supabase
      .from("clients")
      .select("*")
      .eq("test_code", message.body)
      .single();

    if (clientData) {
      // Salva número do cliente associado ao código
      await supabase.from("clients")
        .update({ phone: from, active_number: "teste" })
        .eq("id", clientData.id);

      await client.sendText(
        from,
        `Código validado! Agora o bot do seu negócio está pronto para testar.\nSeu link da dashboard: https://<seu-app-render>.onrender.com/dashboard/${message.body}`
      );
      return;
    }

    // --- Verifica se número já está cadastrado ---
    let { data: registeredClient } = await supabase
      .from("clients")
      .select("*")
      .eq("phone", from)
      .single();

    if (!registeredClient) {
      // Cria cliente de teste automático com código gerado
      const code = generateTestCode();
      const { data: newClient } = await supabase
        .from("clients")
        .insert([
          {
            phone: from,
            name: "Cliente de Teste",
            business_type: "Restaurante",
            language: "pt",
            test_code: code,
            active_number: "teste"
          }
        ])
        .select()
        .single();

      await client.sendText(
        from,
        `Bem-vindo ao teste do bot! Seu código de 6 dígitos é: ${code}\nUse-o para validar o seu teste e acessar sua dashboard: https://<seu-app-render>.onrender.com/dashboard/${code}`
      );
      return;
    }

    // --- Cria prompt e envia para IA ---
    const prompt = buildPrompt(registeredClient, message.body);
    const aiResponse = await askGroq(prompt);

    // --- Guarda mensagens ---
    await supabase.from("messages").insert([
      { client_id: registeredClient.id, sender: "client", content: message.body },
      { client_id: registeredClient.id, sender: "bot", content: aiResponse }
    ]);

    // --- Envia resposta ---
    await client.sendText(from, aiResponse);
  });
}

// --- Rota dashboard do cliente ---
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

// --- Rota teste simples ---
app.get("/", (req, res) => res.send("Servidor ativo 🚀"));

app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));