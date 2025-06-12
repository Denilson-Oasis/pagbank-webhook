// /api/gerar-pagamento.js

const https = require('https');
const { GoogleSpreadsheet } = require('google-spreadsheet');
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).send({ error: 'Método não permitido' });
    }

    // Tratamento do body (form-data)
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const rawBody = Buffer.concat(chunks).toString();

    const match = rawBody.match(/name="rawRequest"\s+([\s\S]*?)\s+[-]{10,}/);
    if (!match) throw new Error('Campo rawRequest não encontrado no corpo da requisição.');

    const json = JSON.parse(match[1].trim());
    const dados = {
      nome: `${json.q47_name.first || ''} ${json.q47_name.last || ''}`.trim(),
      email: json.q48_email || '',
      celular: json.q49_phoneNumber?.full || '',
      tipoVisita: json.q53_typeA || '',
      numeroDias: json.q51_number || '',
      numeroPessoas: json.q52_number52 || '',
      valorTotal: json.q62_valorTotal || '',
      dataChegada: `${json.q50_date.day}/${json.q50_date.month}/${json.q50_date.year}`
    };

    console.log("📩 Dados extraídos:", dados);

    // Envio de e-mail real com SendGrid
    const msg = {
      to: dados.email,
      from: process.env.FROM_EMAIL,
      subject: process.env.RESERVA_ASSUNTO || 'Confirmação de Reserva - Camping Oásis',
      html: `
        <h2>Olá ${dados.nome},</h2>
        <p>Sua reserva foi recebida com sucesso!</p>
        <ul>
          <li><strong>Tipo de Visita:</strong> ${dados.tipoVisita}</li>
          <li><strong>Data de Chegada:</strong> ${dados.dataChegada}</li>
          <li><strong>Nº de Dias:</strong> ${dados.numeroDias}</li>
          <li><strong>Nº de Pessoas:</strong> ${dados.numeroPessoas}</li>
          <li><strong>Valor Total:</strong> ${dados.valorTotal}</li>
        </ul>
        <p>Traga este e-mail no dia da sua chegada.</p>
        <p>Deus abençoe sua visita! 🙏</p>
      `
    };

    await sgMail.send(msg);
    console.log("✅ E-mail enviado para:", dados.email);

    // Envio para planilha (como você já tem, pode manter esse bloco abaixo)
    const doc = new GoogleSpreadsheet(process.env.SHEET_ID);
    await doc.useServiceAccountAuth({
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    });
    await doc.loadInfo();
    const sheet = doc.sheetsByIndex[0];

    await sheet.addRow({
      Nome: dados.nome,
      E_mail: dados.email,
      Celular: dados.celular,
      Tipo_de_Visita: dados.tipoVisita,
      Número_de_Dias: dados.numeroDias,
      Número_de_Pessoas: dados.numeroPessoas,
      Valor_Total: dados.valorTotal,
      Data_de_Chegada: dados.dataChegada
    });

    console.log("📊 Dados salvos na planilha com sucesso");

    res.status(200).json({ message: 'Reserva processada e e-mail enviado com sucesso.' });

  } catch (error) {
    console.error("❌ Erro:", error.message);
    res.status(500).json({ error: 'Erro ao processar a reserva.' });
  }
};
