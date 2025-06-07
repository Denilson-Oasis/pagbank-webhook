// api/gerar-pagamento.js
import https from 'https';

export default async function handler(req, res) {
  try {
    // 🔵 Captura o corpo enviado pelo Jotform
    const rawRequest = JSON.parse(req.body?.rawRequest?.[0] || '{}');

    const nome = `${rawRequest.q47_name?.first || ''} ${rawRequest.q47_name?.last || ''}`.trim();
    const email = rawRequest.q48_email || '';
    const celularRaw = rawRequest.q49_phoneNumber?.full || '';
    const celular = celularRaw.replace(/\D/g, '').replace(/^55/, '');

    const tipoVisita = rawRequest.q53_typeA || 'Visita';
    const valorTotalStr = rawRequest.q62_valorTotal?.replace(/[^\d]/g, '') || '0';
    const valorCentavos = parseInt(valorTotalStr, 10);

    console.log("🟢 Dados extraídos do Jotform:", {
      nome, email, celular, tipoVisita, valorTotalStr
    });

    // 🔐 Monta o payload para o PagBank
    const pagRequestData = JSON.stringify({
      reference_id: `reserva-${Date.now()}`,
      customer: {
        name: nome,
        email: email,
        phones: [
          {
            country: "55",
            area: celular.substring(0, 2),
            number: celular.substring(2),
            type: "MOBILE"
          }
        ]
      },
      items: [
        {
          name: `Visita: ${tipoVisita}`,
          quantity: 1,
          unit_amount: valorCentavos
        }
      ],
      charges: [
        {
          payment_method: {
            type: "PIX"
          }
        }
      ]
    });

    const options = {
      hostname: 'api.pagbank.com.br',
      path: '/orders',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PAGBANK_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    // 🔄 Envia para o PagBank
const response = await fetch('https://api.pagbank.com.br/orders', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.PAGBANK_TOKEN}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  body: pagRequestData
});

const respostaPagBank = await response.json();

    console.log("🔵 Resposta do PagBank:", respostaPagBank);

    return res.status(200).json({
      mensagem: "Reserva recebida e pagamento criado com sucesso!",
      respostaPagBank
    });

  } catch (erro) {
    console.error("❌ Erro ao processar o formulário ou gerar pagamento:", erro);
    return res.status(500).json({ erro: erro.message || "Erro desconhecido" });
  }
}
