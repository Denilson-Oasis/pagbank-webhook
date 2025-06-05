const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.post('/webhook', (req, res) => {
  console.log('Recebido webhook do Jotform:', req.body);

  // Aqui você pode adicionar o código para enviar a mensagem via WhatsApp

  res.status(200).send('Webhook recebido com sucesso');
});

app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
