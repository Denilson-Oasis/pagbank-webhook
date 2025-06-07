export default async function handler(req, res) {
  try {
    // 🔎 Extrai os dados do Jotform
    const rawRequest = JSON.parse(req.body?.rawRequest?.[0] || '{}');

    const nome = `${rawRequest.#first_47 || ''} ${rawRequest.#last_47 || ''}`.trim();
    const email = rawRequest.#input_48 || '';
    const celularRaw = rawRequest.#input_49_full || '';
    const celular = celularRaw.replace(/\D/g, '').replace(/^55/, '');

    const tipoVisita = rawRequest.#input_53 || 'Visita';
    const valorTotalStr = rawRequest.#input_62(/[^\d]/g, '') || '0';
    const valorCentavos = parseInt(valorTotalStr, 10);

    console.log("🟢 Dados extraídos do Jotform:", {
      nome, email, celular, tipoVisita, valorTotalStr
    });

    // 🔐 Monta o payload para o PagBank
    const pagRequestData = JSON.stringify({
      reference_id: `reserva-${Date.now()}`,
      customer: {
        name: nome || "Cliente Oásis",
        email: email || "cliente@exemplo.com",
        phones: celular
          ? [
              {
                country: "55",
                area: celular.substring(0, 2),
                number: celular.substring(2),
                type: "MOBILE"
              }
            ]
          : []
      },
      items: [
        {
          name: `Visita: ${tipoVisita}`,
          quantity: 1,
          unit_amount: valorCentavos || 1000 // valor mínimo de segurança
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

    // 🌐 Faz a requisição à API PagBank
    const response = await fetch('https://api.pagseguro.com/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.PAGBANK_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: pagRequestData
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("❌ Erro na resposta do PagBank:", responseData);
      return res.status(500).json({ error: "Erro ao gerar pagamento", detalhes: responseData });
    }

    console.log("✅ Pagamento gerado com sucesso:", responseData);
    res.status(200).json({ status: "Pagamento gerado", data: responseData });

  } catch (error) {
    console.error("❌ Erro ao processar o formulário ou gerar pagamento:", error);
    res.status(500).json({ error: "Erro interno", detalhes: error.message });
  }
}
