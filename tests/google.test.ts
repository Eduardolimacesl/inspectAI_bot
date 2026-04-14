import dotenv from 'dotenv';
import { resolveLocationPath, logToGoogleSheets, findFolder } from '../src/services/google';
import path from 'path';

// Carrega as chaves da raiz do bot
dotenv.config({ path: path.join(__dirname, '../.env') });

async function runTests() {
  console.log("🛠️ Iniciando Suíte de Testes de Integração com Google Cloud...\n");

  const rootId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
  if (!rootId) {
    console.error("❌ ERRO FATAL: GOOGLE_DRIVE_ROOT_FOLDER_ID não encontrado no .env.");
    process.exit(1);
  }

  try {
    // 1. Testa a Autenticação e a Resolução de Caminhos (Criação de Pastas)
    console.log("⏳ Teste 1: Criando hierarquia de pastas (Resolve Location Path)...");
    const testPath = ["Topico_TESTE_AUTOMATIZADO", "Bloco Teste", "Pavimento Teste"];
    const targetFolderId = await resolveLocationPath(testPath, rootId);
    
    if (targetFolderId) {
      console.log(`✅ Sucesso! ID da subpasta final resolvido: ${targetFolderId}`);
    } else {
      throw new Error("Não foi possível resolver ou criar a pasta.");
    }

    // 2. Testa Busca Sem Criação (Anti Duplicidade)
    console.log("\n⏳ Teste 2: Buscando as pastas criadas no Teste 1 pra atestar anti-duplicidade...");
    const duplicatedTest = await findFolder("Pavimento Teste", await resolveLocationPath(["Topico_TESTE_AUTOMATIZADO", "Bloco Teste"], rootId));
    if (duplicatedTest === targetFolderId) {
        console.log("✅ Anti-Duplicidade confirmada! A API retornou a pasta existente ao invés de acionar um novo post para duplicá-la.");
    } else {
        throw new Error("A pasta parece ter sido duplicada ao invés de reutilizada.");
    }

    // 3. Testa LOG no Google Sheets
    console.log("\n⏳ Teste 3: Injetando um Log de Metadados na Planilha (Sheets API)...");
    const testRow = [
      new Date().toISOString(),
      "SCRIPT_TESTE_AUTOMATIZADO",
      testPath.join('/'),
      "Esta é uma linha de teste automatizada injetada para certificar a conectividade (RF01 e RNF01).",
      "Topico_TESTE_AUTOMATIZADO",
      "https://test-link-placeholder.com"
    ];
    await logToGoogleSheets(testRow);
    console.log("✅ Sucesso! A linha foi adicionada com sucesso no fim da sua tabela mestre.");

    console.log("\n🎉 TODOS OS TESTES PASSARAM COM ÊXITO!");

  } catch (err: any) {
    console.error("\n❌ Falha crítica em um dos testes de integração:");
    console.error(err.message || err);
  }
}

runTests();
