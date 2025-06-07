export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const rawBody = await getRawBody(req);
    const bodyText = rawBody.toString();
    const formData = parseUrlEncoded(bodyText);

    console.log('Dados recebidos do Jotform:', formData);

    const {
      q47_name,
      q48_email,
      q49_phoneNumber,
      q53_typeA,
      q62_valorTotal,
      event_id,
    } = formData;

    const nome = `${q47_name.first} ${q47_name.last}`;
    const email = q48_email;
    const telefone = q49_phoneNumber.full;
    const tipoDeVisita = q53_typeA;
    const valor = Number(q62_valorTotal.replace('R$', '').replace(',', '.'));

    const token = process.env.PAGBANK_TOKEN;

    const body = {
      reference_id: event_id,
      customer: {
        name: nome,
        email: email,
        phones: [
          {
            country: '55',
            area: telefone.substring(1, 3),
            number: telefone.substring(5).replace(/\D/g, ''),
            type: 'MOBILE',
          },
        ],
      },
      items: [
        {
          name: `Reserva ${tipoDeVisita}`,
          quantity: 1,
          unit_amount: Math.round(valor * 100),
        },
      ],
      notification_urls: [
        'https://pagbank-webhook.vercel.app/api/confirmacao',
      ],
    };

    const response = await fetch('https://api.pagseguro.com/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Erro ao criar pedido:', result);
      return res.status(500).json({ error: 'Erro ao criar pagamento', detalhes: result });
    }

    const paymentLink = result.checkout_url;
    return res.status(200).json({ paymentLink });

  } catch (error) {
    console.error('Erro geral:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}

// Função auxiliar para pegar o corpo da requisição
import getRawBody from 'raw-body';

// Função para converter x-www-form-urlencoded em objeto
function parseUrlEncoded(body) {
  const data = {};
  body.split('&').forEach((pair) => {
    const [key, value] = pair.split('=');
    const decodedKey = decodeURIComponent(key);
    const decodedValue = decodeURIComponent(value || '');
    const keys = decodedKey.split('[').map(k => k.replace(']', ''));
    if (keys.length === 1) {
      data[keys[0]] = decodedValue;
    } else {
      if (!data[keys[0]]) data[keys[0]] = {};
      data[keys[0]][keys[1]] = decodedValue;
    }
  });
  return data;
}
