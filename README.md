# 🤖 InspectAI Bot

> Bot Telegram para coleta de evidências de vistoria predial com integração ao Google Drive e Google Sheets.

[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Telegraf](https://img.shields.io/badge/Telegraf-4.16-26A5E4?style=flat-square&logo=telegram)](https://telegraf.js.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-339933?style=flat-square&logo=node.js)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?style=flat-square&logo=express)](https://expressjs.com/)
[![Deploy on Render](https://img.shields.io/badge/Deploy-Render-46E3B7?style=flat-square&logo=render)](https://render.com)

---

## 📋 Índice

- [Visão Geral](#visão-geral)
- [Fluxo de Uso](#fluxo-de-uso)
- [Comandos Disponíveis](#comandos-disponíveis)
- [Arquitetura](#arquitetura)
- [Configuração](#configuração)
- [Desenvolvimento Local](#desenvolvimento-local)
- [Deploy em Produção](#deploy-em-produção)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Integrações](#integrações)

---

## 🌐 Visão Geral

O **InspectAI Bot** é o módulo de coleta de dados do ecossistema InspectAI. Ele opera dentro de grupos do Telegram (com suporte a tópicos/fóruns) e permite que inspetores prediais:

1. **Selecionem o setor** a ser vistoriado via menu interativo (Edificação → Bloco → Pavimento → Sala)
2. **Coletem evidências** enviando fotos com legendas e comentários de texto
3. **Sincronizem tudo** com um único comando, realizando upload para o Google Drive e logging no Google Sheets

Os dados ficam armazenados em **memória de sessão (RAM)** durante a coleta e são persistidos na nuvem apenas no momento da sincronização, seguindo um padrão de **batch local-first**.

---

## 🔄 Fluxo de Uso

```
Inspector                    Bot                        Google Cloud
    │                          │                               │
    │──── /setor ──────────────►│                               │
    │◄─── Menu Interativo ─────│                               │
    │                          │                               │
    │──── Seleciona Local ─────►│                               │
    │◄─── ✅ Setor Configurado ─│                               │
    │                          │                               │
    │──── Envia Foto + Legenda ►│                               │
    │◄─── 📸 Salvo na RAM ──────│                               │
    │                          │                               │
    │──── /sincronizar ─────────►│                               │
    │                          │─── Resolve Pastas Drive ──────►│
    │                          │─── Upload Photos ─────────────►│
    │                          │─── Log Metadata Sheets ────────►│
    │◄─── ✅ Processado! ───────│                               │
```

---

## 🤖 Comandos Disponíveis

| Comando | Descrição |
|---|---|
| `/start` | Exibe mensagem de boas-vindas e instruções iniciais |
| `/setor` | Abre o menu interativo de seleção de localização |
| `/sincronizar` | Processa e envia todas as evidências da fila para a nuvem |
| `/cancelar` | Limpa o setor atual e esvazia o buffer de evidências |
| `/ajuda` | Exibe o guia completo de uso do bot |

---

## 🏗️ Arquitetura

```
src/
├── server.ts              # Entry point — Express + inicialização do webhook/polling
├── bot.ts                 # Configuração do Telegraf, middlewares e handlers de comandos
├── config/
│   └── locations.ts       # Árvore de configuração de edificações/blocos/salas
├── scenes/
│   └── sectorWizard.ts    # Máquina de estados (WizardScene) para seleção de setor
└── services/
    └── google.ts          # Integração com Google Drive e Google Sheets APIs
```

### Padrões de Design

- **WizardScene (Telegraf/Telegraf):** O fluxo de seleção de setor é implementado como uma máquina de estados finita recursiva. O wizard navega pela árvore de localizações de forma dinâmica com suporte a "Voltar" em qualquer nível.

- **Session Middleware:** Cada usuário possui uma sessão isolada contendo `currentLocation` (setor ativo) e `mediaBuffer` (fila de evidências em RAM).

- **Dual-mode Server:** Em produção, usa **Webhook** via Express para receber updates do Telegram. Em desenvolvimento, usa **Long Polling** para simplicidade.

- **Webhook Bridge (Apps Script Proxy):** Para contornar a cota de armazenamento de 15GB das Service Accounts gratuitas, o upload de fotos pode ser roteado via Apps Script, que utiliza a cota da conta Google do proprietário da planilha.

---

## ⚙️ Configuração

### Pré-requisitos

- Node.js ≥ 20
- Conta no [Telegram](https://t.me/) com um bot criado via [@BotFather](https://t.me/BotFather)
- Projeto Google Cloud com Drive API e Sheets API habilitadas
- Service Account com permissão de Editor no Drive e na Planilha alvo

### Instalação

```bash
# Na raiz do módulo
cd apps/bot

# Instalar dependências
npm install

# Copiar template de variáveis de ambiente
cp .env.example .env
# Edite o .env com suas credenciais
```

---

## 💻 Desenvolvimento Local

```bash
# Iniciar em modo desenvolvimento (Long Polling + hot-reload)
npm run dev

# Compilar TypeScript para JavaScript
npm run build

# Iniciar build de produção localmente
npm start
```

> Em modo `dev`, o bot usa Long Polling automaticamente — nenhum domínio público é necessário.

---

## 🚀 Deploy em Produção

O bot é hospedado no **Render.com** como um **Web Service**.

### Configurações do Render

| Campo | Valor |
|---|---|
| **Build Command** | `npm install && npm run build` |
| **Start Command** | `npm start` |
| **Branch** | `main` |

### Variáveis de Ambiente no Render

Configure todas as variáveis listadas na seção abaixo diretamente no painel do Render em: `Environment → Environment Variables`.

### Keep-Alive

O endpoint `GET /ping` é exposto pelo servidor Express e retorna:
```json
{ "status": "ok", "timestamp": "..." }
```

Um Apps Script é configurado para chamar este endpoint a cada **5 minutos**, evitando que o serviço do Render (plano gratuito) hiberne por inatividade.

---

## 🔐 Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `TELEGRAM_BOT_TOKEN` | ✅ | Token do bot fornecido pelo @BotFather |
| `GOOGLE_CREDENTIALS_BASE64` | ✅ | JSON da Service Account codificado em Base64 |
| `GOOGLE_DRIVE_ROOT_FOLDER_ID` | ✅ | ID da pasta raiz no Drive onde as evidências serão organizadas |
| `GOOGLE_SHEET_ID` | ✅ | ID da planilha Google Sheets para logging de metadados |
| `NODE_ENV` | ✅ | `production` para ativar modo Webhook, `development` para Long Polling |
| `WEBHOOK_DOMAIN` | Prod | URL pública do servidor (ex: `https://meu-bot.onrender.com`) |
| `APPS_SCRIPT_WEBHOOK_URL` | Opcional | URL do Apps Script para bypass de cota de armazenamento |
| `PORT` | Opcional | Porta HTTP do Express (padrão: `3000`) |

### Gerando o `GOOGLE_CREDENTIALS_BASE64`

```bash
# Baixe o JSON da Service Account do Google Cloud Console e execute:
base64 -w 0 credentials.json
# Cole a saída como valor da variável de ambiente
```

---

## 🔗 Integrações

### Google Drive
- Cria a estrutura de pastas automaticamente: `Raiz → Tópico → Edificação → Bloco → Pavimento → Sala`
- Faz upload de fotos como arquivos JPEG com metadados na `description` do arquivo
- Suporte a dois modos: **Service Account direta** ou **Webhook via Apps Script**

### Google Sheets
- Registra uma linha por evidência com as colunas:
  - `A` — Data/Hora ISO
  - `B` — Usuário Inspetor (username ou nome)
  - `C` — Endereço Completo (`Edificação/Bloco/Pavimento/Sala`)
  - `D` — Comentário do inspetor
  - `E` — Tópico de origem no Telegram
  - `F` — Link direto para o arquivo no Google Drive

---

## 📁 Ecossistema InspectAI

Este módulo faz parte do monorepo **InspectAI**:

```
InspectAI/
├── apps/
│   ├── bot/          # ← Você está aqui
│   └── apps-script/  # Google Apps Script para análise de IA e keep-alive
└── docs/             # Documentação geral do projeto
```

---

*Desenvolvido com ❤️ para automatizar vistorias prediais.*
