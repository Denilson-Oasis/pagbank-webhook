import formidable from 'formidable';

// Impede o Next.js de processar o body automaticamente
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

    console.log("Campos recebidos do Jotform:", fields);

    const nome = `${fields.nome[0]} ${fields.sobrenome[0]}`;
    const email = fields.email[0];
    const celular = fields.celular[0];
    const valorTotal = fields.valorTotal[0];

    // Apenas exibe os dados por enquanto
    return res.status(200).json({
      mensagem: "Dados recebidos com sucesso!",
      nome,
      email,
      celular,
      valorTotal
    });

  } catch (erro) {
    console.error("Erro ao processar o formulário:", erro);
    return res.status(500).json({ error: "Erro ao processar o formulário" });
  }
}
