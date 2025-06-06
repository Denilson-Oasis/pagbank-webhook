export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const buffers = [];
  for await (const chunk of req) {
    buffers.push(chunk);
  }

  const rawBody = Buffer.concat(buffers).toString();

  // Extrai o campo rawRequest do corpo multipart
  const rawRequestMatch = rawBody.match(/name="rawRequest"\r\n\r\n([\s\S]*?)\r\n--/);

  if (!rawRequestMatch) {
    console.log("❌ Campo 'rawRequest' não encontrado");
    return res.status(400).json({ error: "Campo 'rawRequest' não encontrado" });
  }

  let rawJson;
  try {
    rawJson = JSON.parse(rawRequestMatch[1]);
  } catch (e) {
    console.log("❌ Erro ao interpretar JSON do campo 'rawRequest':", e);
    return res.status(400).json({ error: "Erro ao interpretar JSON do campo 'rawRequest'" });
  }

  // Exibe os dados decodificados
  console.log("📦 Dados decodificados:", rawJson);

  // Campos relevantes
  const nome = `${rawJson.q47_name?.first || ''} ${rawJson.q47_name?.last || ''}`.trim();
  const celular = rawJson.q49_phoneNumber?.full;
  const tipo_de_visita = rawJson.q53_typeA;
  const dia_da_chegada = `${rawJson.q50_date?.day}/${rawJson.q50_date?.month}/${rawJson.q50_date?.year}`;
  const numero_de_dias = rawJson.q51_number;
  const numero_de_pessoas = rawJson.q52_number52;
  const valor_total = rawJson.q62_valorTotal;

  // Log formatado
  console.log("📨 Nova reserva recebida via Webhook:");
  console.log(`➡️ Nome: ${nome || 'Não informado'}`);
  console.log(`📱 Celular com DDD: ${celular || 'Não informado'}`);
  console.log(`📅 Dia da Chegada: ${dia_da_chegada || 'Não informado'}`);
  console.log(`👥 Número de Pessoas: ${numero_de_pessoas || 'Não informado'}`);
  console.log(`📆 Número de Dias: ${numero_de_dias || 'Não informado'}`);
  console.log(`🏷️ Tipo de Visita: ${tipo_de_visita || 'Não informado'}`);
  console.log(`💰 Valor Total: ${valor_total || 'Não informado'}`);

  return res.status(200).json({ status: 'Dados recebidos com sucesso' });
}
