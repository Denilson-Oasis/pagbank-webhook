import { IncomingForm } from 'formidable';
import fs from 'fs';
import https from 'https';

export const config = {
  api: {
    bodyParser: false,
  },
};

const PAGBANK_TOKEN = '05e08ae1-dc81-42f6-999f-bf1309c86f0a7faff224496396544e9fd225911b4b62e9d0-e1d1-4a25-ad34-4b18e4aecdf5';
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwFOM7sieQa7ItP0z5vRch5-Cb4LW4ntm2FaI9tf4w2pguArtmcXGjikmeA7K_SFn-MpA/exec';

function parsePretty(pretty) {
  const dados = {};
  const campos = pretty.split(',').map(c => c.trim());
  for (const campo of campos) {
    const [chave, ...valor] = campo.split(':');
    dados[chave.toLowerCase()] = valor.join(':').trim();
  }
  return dados;
}

export default async function handler(req, res) {
  try {
    const form = new IncomingForm();
    form.parse(req, async (err, fields) => {
      if (err) return res.status(500).json({ error: 'Erro ao ler o formulário' });

      const rawPretty = fields.pretty?.[0] || fields.pretty;
      if (!rawPretty) return res.status(400).json({ error: 'Dados do formulário ausentes' });

      const dados = parsePretty(rawPretty);

      // Gerar link de pagamento via PagBank
      const paymentData = {
        reference_id: Date.now().toString(),
        customer: {
          name: dados.nome,
          email: dados['e-mail'],
        },
        items: [
          {
            name: dados['tipo de visita'],
            quantity: 1,
            unit_amount: parseInt(dados['valor total'].replace(/\D/g, '')),
          },
        ],
        charges: [
          {
            payment_method: {
              type: 'PIX',
            },
          },
        ],
      };

      const pagbankLink = await gerarPagamentoPagBank(paymentData);

      // Enviar dados para a planilha Google
      await fetch(SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: dados.nome,
          email: dados['e-mail'],
          celular: dados['celular'],
          tipo: dados['tipo de visita'],
          dias: dados['número de dias'],
          pessoas: dados['número de pessoas'],
          valor: dados['valor total'],
          chegada: dados['data'],
          pagamento: pagbankLink,
        }),
      });

      // Enviar e-mail de confirmação (simulado)
      await enviarEmailConfirmacao(dados['e-mail'], pagbankLink, dados.nome);

      // Enviar mensagem via WhatsApp (simulado)
      await enviarWhatsApp(dados['celular'], dados.nome, pagbankLink);

      res.status(200).json({ status: 'ok', pagamento: pagbankLink });
    });
  } catch (error) {
    console.error('❌ Erro no processamento:', error);
    res.status(500).json({ error: 'Erro interno' });
  }
}

// ----------------------------
// Funções auxiliares
// ----------------------------

async function gerarPagamentoPagBank(data) {
  return new Promise((resolve, reject) => {
    const json = JSON.stringify(data);
    const options = {
      hostname: 'sandbox.api.pagseguro.com',
      path: '/orders',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${PAGBANK_TOKEN}`,
      },
    };

    const req = https.request(options, (res) => {
      let responseBody = '';
      res.on('data', (chunk) => (responseBody += chunk));
      res.on('end', () => {
        try {
          const result = JSON.parse(responseBody);
          resolve(result.charges?.[0]?.payment_method?.qr_code_url || '');
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(json);
    req.end();
  });
}

async function enviarEmailConfirmacao(email, linkPagamento, nome) {
  console.log(`📧 Enviando e-mail para ${email} com link ${linkPagamento}`);
  // Aqui entra sua integração com SendGrid, Nodemailer, Resend, etc.
}

async function enviarWhatsApp(numero, nome, linkPagamento) {
  console.log(`📲 Enviando WhatsApp para ${numero} com link ${linkPagamento}`);
  // Aqui entrará a integração com a API de WhatsApp oficial ou Z-API.
}
