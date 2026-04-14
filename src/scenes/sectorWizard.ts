import { Context, Scenes, Markup } from 'telegraf';
import { BUILDINGS_CONFIG, LocationNode } from '../config/locations';

export interface MyBotContext extends Context {
  session: Scenes.SceneSession<Scenes.SceneSessionData> & {
    currentLocation?: string;
    mediaBuffer: any[];
    sectorPath: string[]; // Pilha de seleção atual
    [key: string]: any;
  };
  scene: any;
  wizard: any;
}

/**
 * Navega recursivamente no objeto de configurações baseado no array de chaves
 */
function getNodeAtPath(path: string[]): LocationNode | string[] {
  let current: any = BUILDINGS_CONFIG;
  for (const key of path) {
    if (current[key]) {
      current = current[key];
    } else {
      return current; // Fallback ou erro
    }
  }
  return current;
}

/**
 * Renderiza o estado atual do Wizard baseado no path da sessão
 */
async function renderCurrentStep(ctx: MyBotContext) {
  const path = ctx.session.sectorPath || [];
  const currentNode = getNodeAtPath(path);

  // Se o nó atual for um Array, estamos na fase final de selecionar a Sala/Setor
  const isLastLevel = Array.isArray(currentNode);
  const options = isLastLevel ? (currentNode as string[]) : Object.keys(currentNode as LocationNode);

  const title = path.length === 0 
    ? '🏢 **Passo 1:** Selecione a Edificação:' 
    : `📍 Caminho: \`${path.join(' > ')}\`\n\n🔍 Próximo passo:`;

  const buttons = options.map((opt, idx) => [
    Markup.button.callback(opt, `IDX_${idx}`)
  ]);

  if (path.length > 0) {
    buttons.push([Markup.button.callback('🔙 Voltar', 'ACTION_BACK')]);
  }
  buttons.push([Markup.button.callback('❌ Cancelar', 'ACTION_CANCELAR')]);

  const keyboard = Markup.inlineKeyboard(buttons);

  if (ctx.callbackQuery) {
    await ctx.editMessageText(title, { parse_mode: 'Markdown', ...keyboard });
  } else {
    await ctx.reply(title, { parse_mode: 'Markdown', ...keyboard });
  }
}

const sectorWizard = new Scenes.WizardScene<MyBotContext>(
  'SECTOR_WIZARD',
  // ÚNICO PASSO DINÂMICO: Ele se auto-reinicia até o final
  async (ctx) => {
    ctx.session.sectorPath = [];
    await renderCurrentStep(ctx);
    return ctx.wizard.next();
  },
  async (ctx) => {
    if (!ctx.callbackQuery || !('data' in ctx.callbackQuery)) return;

    const data = ctx.callbackQuery.data;

    // Ação: Cancelar
    if (data === 'ACTION_CANCELAR') {
      await ctx.answerCbQuery();
      await ctx.reply('❌ Seleção de setor cancelada.');
      return ctx.scene.leave();
    }

    // Ação: Voltar
    if (data === 'ACTION_BACK') {
      await ctx.answerCbQuery();
      ctx.session.sectorPath.pop();
      await renderCurrentStep(ctx);
      return; 
    }

    // Ação: Seleção de Opção (usando índice para evitar limite de 64 chars)
    if (data.startsWith('IDX_')) {
      const idx = parseInt(data.replace('IDX_', ''), 10);
      const path = ctx.session.sectorPath || [];
      const currentNode = getNodeAtPath(path);
      const options = Array.isArray(currentNode) ? currentNode : Object.keys(currentNode);
      const selectedOption = options[idx];

      if (!selectedOption) {
        return ctx.answerCbQuery('Erro: Opção não encontrada.');
      }

      // Se for o nível final (sala), salvamos tudo
      if (Array.isArray(currentNode)) {
        await ctx.answerCbQuery('Setor definido!');
        const finalLocation = [...path, selectedOption].join('/');
        ctx.session.currentLocation = finalLocation;
        
        await ctx.editMessageText(
          `✅ **Setor Configurado com Sucesso!**\n\n📌 Local: \`${finalLocation}\`\n\n📷 Agora envie fotos ou comentários. Use /sincronizar para finalizar a vistoria.`,
          { parse_mode: 'Markdown' }
        );
        return ctx.scene.leave();
      }

      // Caso contrário, descemos mais um nível na árvore
      ctx.session.sectorPath.push(selectedOption);
      await ctx.answerCbQuery();
      await renderCurrentStep(ctx);
      return;
    }
  }
);

export default sectorWizard;
