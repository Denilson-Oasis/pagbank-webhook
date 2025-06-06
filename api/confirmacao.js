// /api/confirmacao.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const notificacao = req.body;

    console.log('🔔 Notificação recebida do PagBank:', JSON.stringify(notificacao, null, 2));

    // Aqui você pode fazer algo com a confirmação do pagamento.
    // Por exemplo, salvar em uma planilha ou enviar um e-mail.

    return res.status(200).json({ mensagem: 'Confirmação recebida com sucesso' });
  } catch (error) {
    console.error('Erro ao processar confirmação:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
