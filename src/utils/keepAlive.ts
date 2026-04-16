import axios from 'axios';

export function startKeepAlive() {
  const domain = process.env.WEBHOOK_DOMAIN;
  if (!domain) {
    console.warn("⚠️ WEBHOOK_DOMAIN não definido. Self-ping não iniciado.");
    return;
  }

  // Define a URL apontando para a sua rota de ping existente
  const pingUrl = `${domain}/ping`;
  
  // Intervalo de 14 minutos (14 * 60 * 1000 milisegundos)
  const interval = 14 * 60 * 1000; 

  // Executa o ping em intervalos
  setInterval(async () => {
    try {
      const response = await axios.get(pingUrl);
      console.log(`[SELF-PING] ♻️ Reloaded at ${new Date().toISOString()}: Status Code ${response.status}`);
    } catch (error: any) {
      console.error(`[SELF-PING] ❌ Error reloading at ${new Date().toISOString()}:`, error.message);
    }
  }, interval);
  
  console.log(`♻️ Self-ping configurado para rodar a cada 14 minutos em: ${pingUrl}`);
}
