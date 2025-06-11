const fetch = require('node-fetch');
const { IncomingForm } = require('formidable');

function formatarCelular(celular) {
  const numeros = celular.replace(/\D/g, '');
  if (numeros.length === 11) {
    return `(${numeros.substring(0, 2)}) ${numeros.substring(2, 7)}-${numeros.substring(7)}`;
  }
  return celular;
}

module.exports = async (req, res) => {
  try {
    const form = new IncomingForm();
    form.parse(req, async (err, fields) => {
      if (err) {
        console.error("❌ Erro ao fazer parse do formulário:", err);
        return res.status(400).json({ erro: 'Erro ao processar os dados' });
      }

      const rawRequest = fields;

      const nome = `${rawRequest.nome?.first || ''} ${rawRequest.nome?.last || ''}`.trim();
      const email = rawRequest.email || '';
      const celular = rawRequest.celular || '';
      const tipoVisita = rawRequest.typeA || '';
      const valorTotalStr = rawRequest.valorTotal || '0';
      const numeroDias = rawRequest.numeroDias || '';
      const numeroPessoas = rawRequest.numeroPessoas || '';
      const diaChegada = rawRequest.diaChegada || '';

      console.log("🟢 Dados extraídos do Jotform:", {
        nome,
        email,
        celular,
        tipoVisita,
        valorTotalStr,
        numeroDias,
        numeroPessoas,
        diaChegada
      });

      const valorCentavos = Math.round(parseFloat(valorTotalStr.replace(',', '.')) * 100);

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

      // 🔹 Envio para planilha via Google Apps Script
      const dadosConfirmados = {
        nome,
        email,
        celular: formatarCelular(celular),
        tipoDeVisita: tipoVisita,
        numeroDias: rawRequest.numeroDias || '',
        numeroPessoas: rawRequest.numeroPessoas || '',
        valorTotal: valorTotalStr,
        diaChegada: rawRequest.diaChegada || ''
      };

      console.log("📤 Enviando para planilha:", dadosConfirmados);
      await fetch('https://script.google.com/macros/s/AKfycbwFOM7sieQa7ItP0z5vRch5-Cb4LW4ntm2FaI9tf4w2pguArtmcXGjikmeA7K_SFn-MpA/exec', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dadosConfirmados)
      });

      return res.status(200).json({
        status: 'sucesso',
        mensagem: 'Pagamento criado e reserva registrada.',
        pagamento
      });
    });

  } catch (erro) {
    console.error("❌ Erro no processamento:", erro);
    return res.status(500).json({ erro: 'Erro interno no servidor' });
  }
};

