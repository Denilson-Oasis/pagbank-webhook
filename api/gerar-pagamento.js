const fetch = require('node-fetch');

module.exports = async (req, res) => {
  try {
    const rawRequest = req.body;

    // 🔹 Campos do formulário Jotform
    const nome = `${rawRequest.nome.first || ''} ${rawRequest.nome.last || ''}`.trim();
    const email = rawRequest.email || '';
    const celular = rawRequest.celular || '';
    const tipoVisita = rawRequest.typeA || '';
    const valorTotalStr = rawRequest.valorTotal || '0';

    console.log("🟢 Dados extraídos do Jotform:", {
      nome,
      email,
      celular,
      tipoVisita,
      valorTotalStr
    });

    // 🔹 Convertendo valor
    const valorCentavos = Math.round(parseFloat(valorTotalStr.replace(',', '.')) * 100);

    // 🔹 Requisição ao PagBank
    const response = await fetch('https://sandbox.api.pagseguro.com/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer SEU_TOKEN_DO_PAGBANK_AQUI'
      },
      body: JSON.stringify({
        reference_id: `reserva-${Date.now()}`,
        customer: {
          name: nome,
          email: email,
          phones: [{
            country: "55",
            area: celular.substring(0, 2),
            number: celular.substring(2),
            type: "MOBILE"
          }]
        },
        items: [{
          name: tipoVisita,
          quantity: 1,
          unit_amount: valorCentavos
        }],
        charges: [{
          payment_method: {
            type: "PIX"
          }
        }]
      })
    });

    const pagamento = await response.json();

    if (pagamento.error_messages) {
      console.error("❌ Erro na resposta do PagBank:", pagamento);
      return res.status(500).json({ erro: 'Erro ao criar pagamento' });
    }

    console.log('✅ Pagamento criado com sucesso');

    // 🔹 Enviar para o Google Sheets
    await fetch('https://script.google.com/macros/s/AKfycbwPky0n-XYy4N5Tb8-JtJlQoywac7Y32chhAJ9zfRv_wdzGaVq3TEwqhOF7WJGnyzAydw/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nome,
        email,
        telefone: celular,
        tipoDeVisita: tipoVisita,
        numeroDias: rawRequest.numeroDias || '',
        numeroPessoas: rawRequest.numeroPessoas || '',
        valorTotal: valorTotalStr,
        diaChegada: rawRequest.diaChegada || ''
      })
    });

    return res.status(200).json({
      status: 'sucesso',
      mensagem: 'Pagamento criado e reserva registrada.',
      pagamento
    });

  } catch (erro) {
    console.error("❌ Erro no processamento:", erro);
    return res.status(500).json({ erro: 'Erro interno no servidor' });
  }
};

