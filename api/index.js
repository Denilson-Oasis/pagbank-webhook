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

  const rawData = Buffer.concat(buffers).toString();
  const params = new URLSearchParams(rawData);
  const data = Object.fromEntries(params.entries());

  // Exibe os dados brutos no log da Vercel
  console.log("📦 Dados brutos recebidos:", data);

  console.log("📨 Nova reserva recebida via Webhook:");
  console.log(`➡️ Nome: ${data.nome || 'Não informado'}`);
  console.log(`📱 Celular com DDD: ${data.celular || 'Não informado'}`);
  console.log(`📅 Dia da Chegada: ${data.dia_da_chegada || 'Não informado'}`);
  console.log(`👥 Número de Pessoas: ${data.numero_de_pessoas || 'Não informado'}`);
  console.log(`📆 Número de Dias: ${data.numero_de_dias || 'Não informado'}`);
  console.log(`🏷️ Tipo de Visita: ${data.tipo_de_visita || 'Não informado'}`);
  console.log(`💰 Valor Total: R$ ${data.valor_total || 'Não informado'}`);

  return res.status(200).json({ status: 'Dados recebidos com sucesso' });
}
