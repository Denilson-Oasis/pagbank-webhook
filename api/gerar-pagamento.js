const fetch = require('node-fetch');

// Função auxiliar para coletar o corpo raw da requisição
async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => (body += chunk));
    req.on('end', () => resolve(body));
    req.on('error', err => reject(err));
  });
}

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ erro: 'Método não permitido' });
    }

    // ⚠️ CAPTURA O BODY MESMO QUE NÃO VENHA PARSEADO
    let rawBody = await getRawBody(req);
    let rawRequest;

    try {
      rawRequest = JSON.parse(rawBody);
    } catch (err) {
      console.error("❌ Erro ao fazer JSON.parse:", err);
      console.log("📦 RAW BODY BRUTO:", rawBody);
      return res.status(400).json({ erro: 'JSON inválido recebido' });
    }

    console.log("📦 RAW BODY DEPOIS DO PARSE:", rawRequest);

    // 🔁 Suporte a nome como string OU como objeto
    let nome = '';
    if (typeof rawRequest.nome === 'object') {
      nome = `${rawRequest.nome.first || ''} ${rawRequest.nome.last || ''}`.trim();
    } else {
      nome = rawRequest.nome || '';
    }

    const email = rawRequest.email || '';
    const celular = rawRequest.celular || '';
    const tipoVisita = rawRequest.tipoDeVisita || rawRequest.typeA || ''; // aceita os dois
    const valorTotalStr = rawRequest.valorTotal || '0';
    const numeroDias = rawRequest.numeroDias || '';
    const numeroPessoas = rawRequest.numeroPessoas || '';
    const diaChegada = rawRequest.diaChegada || '';

    console.log("🟢 Dados extraídos:", {
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
        'Authorization': 'SUA_CHAVE_PAGBANK_AQUI'
      },
      body: JSON.stringify({
        reference_id: `reserva-${Date.now()}`,
        customer: {
          name: nome,
          email: email,
          phones: celular
            ? [{
                country: "55",
                area: celular.substring(0, 2),
                number: celular.substring(2),
                type: "MOBILE"
              }]
            : []
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

    const dadosConfirmados = {
      nome,
      email,
      celular: formatarCelular(celular),
      tipoDeVisita: tipoVisita,
      numeroDias,
      numeroPessoas,
      valorTotal: valorTotalStr,
      diaChegada
    };

    // Envia os dados para sua planilha do Google
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

  } catch (erro) {
    console.error("❌ Erro no processamento:", erro);
    return res.status(500).json({ erro: 'Erro interno no servidor' });
  }
}; 
