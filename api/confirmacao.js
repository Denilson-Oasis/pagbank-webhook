import { google } from 'googleapis';

export default async function handler(req, res) {
  try {
    const payload = req.body;

    // ⚠️ AJUSTE AQUI: Verifique se esse é o caminho certo do e-mail no JSON do PagBank
    const emailCliente = payload.email;  // Ex: payload.customer.email
    const statusPagamento = payload.status; // Ex: 'PAID'

    if (statusPagamento !== 'PAID') {
      return res.status(200).json({ message: 'Pagamento ainda não confirmado.' });
    }

    // Conexão com a Google Sheets API
    const auth = new google.auth.JWT(
      process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      null,
      process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      ['https://www.googleapis.com/auth/spreadsheets']
    );

    const sheets = google.sheets({ version: 'v4', auth });
    const spreadsheetId = process.env.SHEET_ID;
    const sheetName = 'Página1';

    // Ler todas as linhas da planilha (exceto o cabeçalho)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${sheetName}!A2:I`,
    });

    const rows = response.data.values || [];

    // Localizar a linha correspondente ao e-mail
    const rowIndex = rows.findIndex(row => row[1] === emailCliente);

    if (rowIndex === -1) {
      return res.status(404).json({ message: 'Reserva não encontrada na planilha.' });
    }

    // Atualizar a coluna I (índice 8) da linha correta
    const rangeToUpdate = `${sheetName}!I${rowIndex + 2}`; // +2 por causa do cabeçalho
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: rangeToUpdate,
      valueInputOption: 'RAW',
      requestBody: {
        values: [['Pagamento Realizado / Visita Liberada']],
      },
    });

    return res.status(200).json({ message: 'Status atualizado com sucesso!' });

  } catch (error) {
    console.error('❌ Erro ao processar confirmação de pagamento:', error);
    return res.status(500).json({ error: 'Erro interno no servidor.' });
  }
}
