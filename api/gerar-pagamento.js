import formidable from 'formidable';
import https from 'https';

const PAGBANK_TOKEN = process.env.PAGBANK_TOKEN;

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
    const form = formidable({});
    const [fields, files] = await form.parse(req);

    console.log("Campos recebidos do Jotform (raw):", fields);

    const rawData = JSON.parse(fields.rawRequest[0]);

    const nome = `${rawData.q47_name.first} ${rawData.q47_name.last}`;
    const email = rawData.q48_email;
    const celular = rawData.q49_phoneNumber.full.replace(/\D/g, ''); // Remove parênteses e traços
    const tipoVisita = rawData.q53_typeA;
    const dataChegada = `${rawData.q50_date.day}/${rawData.q50_date.month}/${rawData.q50_date.year}`;
    const numeroDias = rawData.q51_number;
    const numeroPessoas = rawData.q52_number52;
    const valorTotalStr = rawData.q62_valorTotal.replace(/[^\d,]/g, '').replace(',', '.');
    const valorCentavos = Math.round(parseFloat(valorTotalStr) * 100); // PagBank exige valor em centavos

    console.log("🟢 Dados extraídos do Jotform:", {
      nome, email, celular, tipoVisita, dataChegada, numeroDias, numeroPessoas, valorTotalStr
    });

    // 🔁 Requisição para gerar pagamento no PagBank
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
      hostname: 'sandbox.api.pagseguro.com',
      path: '/orders',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAGBANK_TOKEN}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };

    const respostaPagBank = await new Promise((resolve, reject) => {
      const request = https.request(options, (response) => {
        let data = '';
        response.on('data', (chunk) => (data += chunk));
        response.on('end', () => resolve(JSON.parse(data)));
      });

      request.on('error', reject);
      request.write(pagRequestData);
      request.end();
    });

    console.log("🔵 Resposta do PagBank:", respostaPagBank);

    return res.status(200).json({
      mensagem: "Reserva recebida e pagamento criado com sucesso!",
      respostaPagBank
    });

  } catch (erro) {
    console.error("❌ Erro ao processar o formulário ou gerar pagamento:", erro);
    return res.status(500).json({ error: "Erro ao processar o formulário ou gerar pagamento" });
  }
}
