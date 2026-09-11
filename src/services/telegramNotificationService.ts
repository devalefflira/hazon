// src/services/telegramNotificationService.ts

interface EnviarTelegramProps {
  chatId?: string;
  mensagemHtml: string;
  textoBotao?: string;
  urlBotao?: string;
}

const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID_PADRAO = import.meta.env.VITE_TELEGRAM_CHAT_ID_PADRAO;
const APP_URL = import.meta.env.VITE_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');

export async function dispararNotificacaoTelegram({
  chatId = TELEGRAM_CHAT_ID_PADRAO,
  mensagemHtml,
  textoBotao,
  urlBotao
}: EnviarTelegramProps): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !chatId) {
    console.warn('Telegram Bot Token ou Chat ID não configurados no .env.');
    return false;
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  const payload: Record<string, any> = {
    chat_id: chatId,
    text: mensagemHtml,
    parse_mode: 'HTML',
    disable_web_page_preview: true
  };

  if (textoBotao && urlBotao) {
    payload.reply_markup = {
      inline_keyboard: [
        [
          {
            text: textoBotao,
            url: urlBotao.startsWith('http') ? urlBotao : `${APP_URL}${urlBotao}`
          }
        ]
      ]
    };
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    return res.ok;
  } catch (error) {
    console.error('Falha ao disparar notificação no Telegram:', error);
    return false;
  }
}