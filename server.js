import express from "express";
import wppconnect from "@wppconnect-team/wppconnect";
import { createClient } from "@supabase/supabase-js";
import axios from "axios";
import crypto from "crypto";

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Função para gerar códigos de teste (6 dígitos)
function generateTestCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Função para criar prompt para IA Groq
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

// Função para chamar IA Groq
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

// Inicializar WPPConnect
wppconnect.create({
  session: "bot-session",
  headless: true,
  useChrome: false,
  puppeteerOptions: {
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
  }
})
.then((client) => startBot(client))
.catch((error) => console.error("Erro ao iniciar bot:", error));

async function startBot(client) {
  console.log("🤖 Bot iniciado");

  // Ouvir mensagens recebidas
  client.onMessage(async (message) => {
    if (!message.body) return;

    console.log("Mensagem recebida:", message.body);

    const from = message.from;

    // Verifica se é código de teste
    let { data: clientData } = await supabase
      .from("clients")
      .select("*")
      .eq("test_code", message.body)
      .single();

    if (clientData) {
      await client.sendText(from, `Olá! 👋 Teste do bot ativado para ${clientData.name}.`);
      return;
    }

    // Se não for código, verifica se já temos cliente associado ao número
    let { data: registeredClient } = await supabase
      .from("clients")
      .select("*")
      .eq("phone", from)
      .single();

    if (!registeredClient) {
      // Cria cliente teste automaticamente
      const code = generateTestCode();
      const { data: newClient } = await supabase
        .from("clients")
        .insert([
          { phone: from, name: "Cliente de Teste", business_type: "Restaurante", language: "pt", test_code: code }
        ])
        .select()
        .single();

      await client.sendText(from, `Bem-vindo ao teste do bot! Seu código de 6 dígitos é: ${code}`);
      return;
    }

    // Criar prompt e chamar IA
    const prompt = buildPrompt(registeredClient, message.body);
    const aiResponse = await askGroq(prompt);

    // Guardar mensagens no Supabase
    await supabase.from("messages").insert([
      { client_id: registeredClient.id, sender: "client", content: message.body },
      { client_id: registeredClient.id, sender: "bot", content: aiResponse }
    ]);

    // Enviar resposta
    await client.sendText(from, aiResponse);
  });
}

// Rota para dashboard básica (teste)
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

// Rota teste simples
app.get("/", (req, res) => {
  res.send("Servidor ativo 🚀");
});

app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});