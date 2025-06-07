import formidable from 'formidable';

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

    // A string JSON completa vem em rawRequest[0]
    const rawData = JSON.parse(fields.rawRequest[0]);

    const nome = `${rawData.q47_name.first} ${rawData.q47_name.last}`;
    const email = rawData.q48_email;
    const celular = rawData.q49_phoneNumber.full;
    const tipoVisita = rawData.q53_typeA;
    const dataChegada = `${rawData.q50_date.day}/${rawData.q50_date.month}/${rawData.q50_date.year}`;
    const numeroDias = rawData.q51_number;
    const numeroPessoas = rawData.q52_number52;
    const valorTotal = rawData.q62_valorTotal;

    console.log("🟢 Dados extraídos do Jotform:", {
      nome,
      email,
      celular,
      tipoVisita,
      dataChegada,
      numeroDias,
      numeroPessoas,
      valorTotal
    });

    // Apenas retorno de teste, depois podemos substituir por chamada ao PagBank
    return res.status(200).json({
      mensagem: "Dados recebidos e extraídos com sucesso!",
      nome,
      email,
      celular,
      tipoVisita,
      dataChegada,
      numeroDias,
      numeroPessoas,
      valorTotal
    });

  } catch (erro) {
    console.error("❌ Erro ao processar o formulário:", erro);
    return res.status(500).json({ error: "Erro ao processar o formulário" });
  }
}
