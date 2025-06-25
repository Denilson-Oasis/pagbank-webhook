import { google } from 'googleapis';
import sgMail from '@sendgrid/mail';
import formidable from 'formidable';
import fs from 'fs';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  try {
    const form = formidable({});
    const data = await new Promise((resolve, reject) => {
      form.parse(req, (err, fields) => {
        if (err) reject(err);
        resolve(fields);
      });
    });

    // Extrair o campo rawRequest
    const rawRequest = JSON.parse(data.rawRequest[0]);
    const nome = `${rawRequest.q47_name.first} ${rawRequest.q47_name.last}`;
    const email = rawRequest.q48_email;
    const celular = rawRequest.q49_phoneNumber.full || '';
    const tipoVisita = rawRequest.q53_typeA;
    const dias = rawRequest.q51_number;
    const pessoas = rawRequest.q52_number52;
    const valor = rawRequest.q62_valorTotal;
    const dataChegada = `${rawRequest.q50_date.day}/${rawRequest.q50_date.month}/${rawRequest.q50_date.year}`;

    // 1. Gerar link de pagamento com PagBank (PIX via QR Code)
    const valorCentavos = Math.round(
      parseFloat(
        valor.replace('R$', '').replace(/\./g, '').replace(',', '.').trim()
      ) * 100
    );

    const pagamentoResponse = await fetch('https://sandbox.api.pagseguro.com/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.PAGBANK_SANDBOX_TOKEN}`
      },
      body: JSON.stringify({
        reference_id: `reserva-${Date.now()}`,
        customer: {
          name: nome,
          email: email,
          tax_id: '11144477735' // Substitua por CPF real em produção
        },
        items: [
          {
            name: 'Reserva Camping Oásis',
            quantity: 1,
            unit_amount: valorCentavos
          }
        ],
        qr_codes: [
          {
            amount: {
              value: valorCentavos
            }
          }
        ]
      })
    });

    const pagamentoData = await pagamentoResponse.json();
    console.log('📥 Resposta do PagBank:', JSON.stringify(pagamentoData, null, 2));

    let linkPagamento = 'Link indisponível';
    
    if (pagamentoData.qr_codes && pagamentoData.qr_codes.length > 0) {
      const links = pagamentoData.qr_codes[0].links || [];
    
    const linkQrCodePng = links.find(link => link.rel === 'QRCODE.PNG')?.href;
    linkPagamento = linkQrCodePng || 'Link indisponível';
    }

    // 2. Enviar para a Planilha
    const auth = new google.auth.JWT(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth });
    await sheets.spreadsheets.values.append({
      spreadsheetId: process.env.SHEET_ID,
      range: 'Página1!A1:I1', // Agora com 9 colunas (A até I)
      valueInputOption: 'RAW',
      requestBody: {
        values: [[
          nome,
          email,
          celular,
          tipoVisita,
          dias,
          pessoas,
          valor,
          dataChegada,
          "Aguardando Pagamento"
        ]],
      },
    });

    // 3. Enviar e-mail via SendGrid
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    try {
      console.log('📨 Enviando e-mail para:', email);
      const msg = {
        to: email,
        from: process.env.FROM_EMAIL,
        subject: process.env.RESERVA_ASSUNTO || 'Confirmação de Reserva - Camping Oásis',
        text: `Olá ${nome},\n\nSua reserva foi recebida com sucesso!\n\nValor: ${valor}\nData de chegada: ${dataChegada}\nLink para pagamento: ${linkPagamento !== 'Link indisponível' ? linkPagamento : 'Você receberá o link em breve por e-mail ou WhatsApp.'}\n\nCódigo da Reserva: ${referenceId}\n\nDeus abençoe!\nEquipe Camping Oásis`,
      };
      const response = await sgMail.send(msg);
      console.log('✅ E-mail enviado com status:', response[0].statusCode);
    } catch (error) {
      console.error('❌ Erro ao enviar e-mail:', error);
      if (error.response) {
        console.error('📩 Corpo da resposta do erro:', error.response.body);
      }
    }

    return res.status(200).json({ message: 'Processado com sucesso!', linkPagamento });
  } catch (err) {
    console.error('❌ Erro geral:', err);
    return res.status(500).json({ error: 'Erro ao processar a solicitação.' });
  }
}
