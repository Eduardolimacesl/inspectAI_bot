import express from 'express';
import dotenv from 'dotenv';
import { bot } from './bot';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';
const WEBHOOK_DOMAIN = process.env.WEBHOOK_DOMAIN;

// ✅ Endpoint keep-alive - chamado pelo Apps Script a cada 5 min
app.get('/ping', (_req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Inicialização de roteamento
const startServer = async () => {

  // Registra o menu de comandos visível no Telegram (aparece ao digitar "/")
  await bot.telegram.setMyCommands([
    { command: 'start',       description: 'Exibir boas-vindas do InspectAI' },
    { command: 'setor',       description: 'Definir edificação, bloco, pavimento e sala' },
    { command: 'sincronizar', description: 'Enviar evidências para o Drive e Sheets' },
    { command: 'cancelar',    description: 'Limpar setor atual e buffer de evidências' },
    { command: 'ajuda',       description: 'Mostrar instruções de uso do bot' },
  ]);

  if (NODE_ENV === 'production' && WEBHOOK_DOMAIN) {
    // Configura endpoint secreto para receber o Push do Telegram
    const secretPath = `/webhook/${bot.secretPathComponent()}`;
    
    app.use(bot.webhookCallback(secretPath));
    // Informa ao telegram onde enviar as requisições
    await bot.telegram.setWebhook(`${WEBHOOK_DOMAIN}${secretPath}`);
    
    app.listen(PORT, () => {
      console.log(`🚀 [PROD] Servidor Webhook rodando na porta ${PORT}`);
      console.log(`🔗 Webhook vinculado a: ${WEBHOOK_DOMAIN}${secretPath}`);
    });
    
  } else {
    // Configuração para Dev local usando API de polling padrão
    app.listen(PORT, () => {
       console.log(`🌟 [DEV] Servidor Local (Express ping) rodando na porta ${PORT}`);
       console.log(`🚀 Iniciando o Bot via Long-polling...`);
    });
    
    // Deleta webhooks antigos para liberar o long-polling
    await bot.telegram.deleteWebhook({ drop_pending_updates: true });
    bot.launch();
  }

  // Graceful stop settings
  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));
};

startServer().catch(err => console.error("Falha ao iniciar o servidor", err));
