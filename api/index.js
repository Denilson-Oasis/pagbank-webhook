export default async function handler(req, res) {
  if (req.method === 'POST') {
    try {
      const body = req.body;

      console.log("📥 Webhook recebido com sucesso:");
      console.log(JSON.stringify(body, null, 2));

      res.status(200).json({ message: 'Webhook recebido com sucesso!' });
    } catch (error) {
      console.error("❌ Erro ao processar webhook:", error);
      res.status(500).json({ error: 'Erro ao processar webhook.' });
    }
  } else {
    res.status(405).json({ error: 'Método não permitido' });
  }
}

