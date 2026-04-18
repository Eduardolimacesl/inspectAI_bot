const axios = require('axios');
const dns = require('dns');

// Configuração idêntica ao bot
dns.setDefaultResultOrder('ipv4first');

const services = [
  { name: 'Telegram API', url: 'https://api.telegram.org' },
  { name: 'Google Sheets API', url: 'https://sheets.googleapis.com/$discovery/rest?version=v4' },
  { name: 'Google Drive API', url: 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest' },
  { name: 'Gemini AI API', url: 'https://generativelanguage.googleapis.com' }
];

async function testConnectivity() {
  console.log('🔍 Iniciando teste de conectividade...\n');
  
  for (const service of services) {
    try {
      const start = Date.now();
      await axios.get(service.url, { timeout: 10000 });
      const duration = Date.now() - start;
      console.log(`✅ ${service.name}: OK (${duration}ms)`);
    } catch (error) {
      if (error.response) {
        // Se o servidor respondeu com erro (ex: 401 ou 404), a conexão em si FUNCIONOU
        console.log(`✅ ${service.name}: OK (Servidor respondeu, conexão estabelecida)`);
      } else {
        console.log(`❌ ${service.name}: FALHA - ${error.message}`);
        if (error.code) console.log(`   Código: ${error.code}`);
      }
    }
  }
  
  console.log('\n🏁 Teste finalizado.');
}

testConnectivity();
