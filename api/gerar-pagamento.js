import https from "https";

// Token do PagBank: deve estar nas variáveis de ambiente da Vercel (ex: process.env.PAGBANK_TOKEN)
const PAGBANK_TOKEN = process.env.PAGBANK_TOKEN;

// Função auxiliar para fazer request HTTPS com Promise
function httpsRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let responseData = "";
      res.on("data", (chunk) => (responseData += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(responseData);
          resolve(json);
        } catch (err) {
          reject(err);
        }
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

// Função handler do webhook Vercel
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método não permitido" });
    }

    // Extrair dados enviados pelo Jotform
    const body = req.body;

    // A requisição do Jotform chega com campos que podem estar em req.body ou em rawRequest dentro de JSON string
    // Se precisar, faça parse:
    // const rawRequest = JSON.parse(body.rawRequest[0]);
    // e extraia os campos do formulário a partir daí, ou use body direto se os campos já forem enviados limpos.

    // Exemplo extração simplificada:
    const nome = body.q47_name?.first + " " + body.q47_name?.last || "Cliente PagBank";
    const email = body.q48_email || "";
    const celularRaw = body.q49_phoneNumber?.full || ""; // Ex: (43) 99129-1020

    // Normalizar celular só números (remover espaços, parênteses e traços)
    const celularNumeros = celularRaw.replace(/\D/g, ""); // Ex: 43991291020

    // Campos customizados do seu formulário:
    const tipoVisita = body.q53_typeA || "Visita";
    const valorTotalStr = body.q62_valorTotal || "R$0,00";

    // Converter valor para centavos
    // Tirar R$, vírgula e pontos, depois converter para int
    // Exemplo "R$20.00" -> 2000 centavos
    const valorLimpo = valorTotalStr.replace(/[R$\.\s]/g, "").replace(",", ".");
    const valorFloat = parseFloat(valorLimpo) || 0;
    const valorCentavos = Math.round(valorFloat * 100);

    // Criar payload para PagBank (API Pix)
    const pagRequestData = JSON.stringify({
      reference_id: `reserva-${Date.now()}`,
      customer: {
        name: nome,
        email: email,
        phones: [
          {
            country: "55",
            area: celularNumeros.substring(0, 2),
            number: celularNumeros.substring(2),
            type: "MOBILE",
          },
        ],
      },
      items: [
        {
          name: `Visita: ${tipoVisita}`,
          quantity: 1,
          unit_amount: valorCentavos,
        },
      ],
      charges: [
        {
          payment_method: {
            type: "PIX",
          },
        },
      ],
    });

    // Configurar request para a API PagBank - endpoint PIX produção:
    const options = {
      hostname: "pix.pagseguro.uol.com.br",
      path: "/v2/orders",
      method: "POST",
      headers: {
        Authorization: `Bearer ${PAGBANK_TOKEN}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    };

    // Enviar request para PagBank
    const respostaPagBank = await httpsRequest(options, pagRequestData);

    // Verificar se retornou erro na resposta
    if (respostaPagBank.error_messages) {
      console.error("Erro PagBank:", respostaPagBank.error_messages);
      return res.status(400).json({
        error: "Erro na API PagBank",
        details: respostaPagBank.error_messages,
      });
    }

    // Resposta OK
    return res.status(200).json({
      mensagem: "Reserva recebida e pagamento criado com sucesso!",
      respostaPagBank,
    });
  } catch (error) {
    console.error("Erro ao processar:", error);
    return res.status(500).json({ error: "Erro interno no servidor" });
  }
}
