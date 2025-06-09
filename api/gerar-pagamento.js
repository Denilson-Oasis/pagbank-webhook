const fetch = require('node-fetch');
const formidable = require('formidable');

module.exports = async (req, res) => {
  const form = new formidable.IncomingForm();

  form.parse(req, async (err, fields) => {
    if (err) {
      console.error("❌ Erro ao fazer parse do corpo da requisição:", err);
      return res.status(400).json({ erro: "Erro ao processar os dados enviados." });
    }

    console.log("🔍 Dados recebidos do Jotform:", fields);

    const nome = `${fields.nome?.first || ''} ${fields.nome?.last || ''}`.trim();
    const email = fields.email || '';
    const celular = fields.celular || '';
    const tipoVisita = fields.typeA || '';
    const valorTotalStr = fields.valorTotal || '0';

    const valorCentavos = Math.round(parseFloat(valorTotalStr.replace(',', '.')) * 100);

    // 🔹 Requisição ao PagBank
    const response = await fetch('https://api.pagseguro.com/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': '05e08ae1-dc81-42f6-999f-bf1309c86f0a7faff224496396544e9fd225911b4b62e9d0-e1d1-4a25-ad34-4b18e4aecdf5'
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

    // 🔹 Montar dados para o Google Sheets
    const dadosConfirmados = {
      nome,
      email,
      telefone: celular,
      tipoDeVisita: tipoVisita,
      numeroDias: rawRequest.numeroDias || '',
      numeroPessoas: rawRequest.numeroPessoas || '',
      valorTotal: valorTotalStr,
      diaChegada: rawRequest.diaChegada || ''
    };

    // 🔹 Enviar para o Google Sheets
    await fetch('https://script.google.com/macros/s/AKfycbwPky0n-XYy4N5Tb8-JtJlQoywac7Y32chhAJ9zfRv_wdzGaVq3TEwqhOF7WJGnyzAydw/exec', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dadosConfirmados)
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
