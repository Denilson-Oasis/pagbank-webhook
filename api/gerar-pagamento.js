// /api/gerar-pagamento.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const {
    q47_name,
    q48_email,
    q49_phoneNumber,
    q53_typeA,
    q62_valorTotal,
    event_id,
  } = req.body;

  const nome = `${q47_name.first} ${q47_name.last}`;
  const email = q48_email;
  const telefone = q49_phoneNumber.full;
  const tipoDeVisita = q53_typeA;
  const valor = Number(q62_valorTotal.replace('R$', '').replace(',', '.'));

  const token = process.env.PAGBANK_TOKEN; // Armazenado no ambiente do Vercel

  const body = {
    reference_id: event_id,
    customer: {
      name: nome,
      email: email,
      phones: [
        {
          country: '55',
          area: telefone.substring(1, 3),
          number: telefone.substring(5, telefone.length).replace(/\D/g, ''),
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
      'https://SEU_DOMINIO.vercel.app/api/confirmacao',
    ],
  };

  try {
    const response = await fetch('https://sandbox.api.pagseguro.com/orders', {
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
