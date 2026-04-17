const axios = require('axios');
const dotenv = require('dotenv');
dotenv.config();

async function test() {
  const url = process.env.APPS_SCRIPT_WEBHOOK_URL;
  try {
    const res = await axios.post(url, {
      action: 'createSpreadsheet',
      parentId: '1AuBmYz34eGccxaEOXto7q92yPfWyhwiP',
      fileName: 'TestSheet'
    });
    console.log("Webhook data:", res.data);
  } catch(e) {
    console.log("Webhook error:", e.message);
  }
}
test();
