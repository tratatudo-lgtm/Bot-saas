// server.js
import express from "express";
import wppconnect from "@wppconnect-team/wppconnect";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";

// ==============================
// CONFIGURAÇÕES
// ==============================
const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

// Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Variável global do cliente WhatsApp e link de sessão
let whatsappClient = null;
let sessionLink = "";

// ==============================
// FUNÇÕES AUXILIARES
// ==============================
function generateTestCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function buildPrompt(clientData, userMessage) {
  return `
Tu és o assistente virtual da empresa ${clientData.name}.
Tipo de negócio: ${clientData.business_type}.
Idioma principal: ${clientData.language || "pt"}.

Objetivo:
- Adaptar-se ao tipo de negócio
- Fazer vendas, marcações ou outras ações conforme necessário

Mensagem do cliente:
"${userMessage}"
`;
}

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

// ==============================
// ROTAS EXPRESS
// ==============================
app.get("/", (req, res) => res.send("Servidor ativo 🚀"));

app.get("/status", async (req, res) => {
  if (!whatsappClient) return res.send("Cliente ainda não inicializado");
  try {
    const state = await whatsappClient.getConnectionState();
    res.send(`Estado atual: ${state}`);
  } catch (err) {
    res.send("Erro ao obter estado");
  }
});

// Rota para link de sessão
app.get("/session", (req, res) => {
  if (!sessionLink) return res.send("Sessão ainda não gerada. Verifica os logs.");
  res.send(`<a href="${sessionLink}" target="_blank">Clique aqui para iniciar a sessão WhatsApp</a>`);
});

// Dashboard de mensagens do cliente
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

// ==============================
// INICIAR WPPCONNECT SEM CHROME
// ==============================
setTimeout(() => {
  console.log("🟡 A iniciar WPPConnect...");

  wppconnect.create({
    session: "bot-session",
    headless: true,
    useChrome: false,           // ❌ não usa Chrome
    authStrategy: "LOCAL",
    autoClose: 0,
    catchLogin: (link) => {
      sessionLink = link;
      console.log("🔗 Link de login gerado:", link);
    },
    onStateChange: (state) => console.log("📡 Estado da sessão:", state)
  })
  .then(client => {
    whatsappClient = client;
    console.log("✅ WPPConnect iniciado com sucesso");

    client.onMessage(async (message) => {
      if (!message.body) return;
      const from = message.from;

      // Código de teste
      let { data: clientData } = await supabase
        .from("clients")
        .select("*")
        .eq("test_code", message.body)
        .single();

      if (clientData) {
        await supabase.from("clients")
          .update({ phone: from, active_number: "teste" })
          .eq("id", clientData.id);

        await client.sendText(
          from,
          `Código validado! Bot pronto para teste.\nLink dashboard: https://<teu-app>.fly.dev/dashboard/${message.body}`
        );
        return;
      }

      // Cliente já registrado?
      let { data: registeredClient } = await supabase
        .from("clients")
        .select("*")
        .eq("phone", from)
        .single();

      if (!registeredClient) {
        const code = generateTestCode();
        await supabase.from("clients")
          .insert([{
            phone: from,
            name: "Cliente de Teste",
            business_type: "Restaurante",
            language: "pt",
            test_code: code,
            active_number: "teste"
          }]);

        await client.sendText(
          from,
          `Bem-vindo! Código de 6 dígitos: ${code}\nUse-o para validar e acessar sua dashboard: https://<teu-app>.fly.dev/dashboard/${code}`
        );
        return;
      }

      // Chamada IA
      const prompt = buildPrompt(registeredClient, message.body);
      const aiResponse = await askGroq(prompt);

      // Guardar mensagens
      await supabase.from("messages").insert([
        { client_id: registeredClient.id, sender: "client", content: message.body },
        { client_id: registeredClient.id, sender: "bot", content: aiResponse }
      ]);

      await client.sendText(from, aiResponse);
    });

  })
  .catch(err => console.error("❌ ERRO AO INICIAR WPP:", err));

}, 5000);

// ==============================
// INICIAR SERVIDOR
// ==============================
app.listen(PORT, () => console.log(`🚀 Servidor rodando na porta ${PORT}`));