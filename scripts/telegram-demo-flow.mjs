import fs from 'node:fs';
import path from 'node:path';

const token = process.env.TELEGRAM_BOT_TOKEN;

if (!token) {
  console.error('Missing TELEGRAM_BOT_TOKEN');
  process.exit(1);
}

const statePath = path.resolve('.teleflow-demo-state.json');

function loadState() {
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch {
    return { offset: null, chats: {} };
  }
}

function saveState(state) {
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
}

async function api(method, payload = {}) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const json = await response.json();
  if (!json.ok) {
    throw new Error(json.description || `Telegram ${method} failed`);
  }
  return json.result;
}

async function sendMessage(chatId, text, extra = {}) {
  return api('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    ...extra,
  });
}

async function answerCallbackQuery(callbackQueryId, text = '') {
  return api('answerCallbackQuery', {
    callback_query_id: callbackQueryId,
    ...(text ? { text } : {}),
  });
}

function setChatState(state, chatId, patch) {
  state.chats[String(chatId)] = {
    stage: 'idle',
    ...state.chats[String(chatId)],
    ...patch,
  };
  saveState(state);
}

function getChatState(state, chatId) {
  return state.chats[String(chatId)] || { stage: 'idle' };
}

function mainKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: 'Get the offer', callback_data: 'offer' },
        { text: 'See pricing', callback_data: 'pricing' },
      ],
      [
        { text: 'Ask a question', callback_data: 'question' },
      ],
    ],
  };
}

async function sendWelcome(chatId) {
  await sendMessage(
    chatId,
    [
      'Welcome to <b>Autopilot Moneybag</b>.',
      '',
      'This is a live demo flow from your Teleflow setup.',
      'What would you like to do first?',
    ].join('\n'),
    { reply_markup: mainKeyboard() },
  );
}

async function handleCallback(state, callbackQuery) {
  const chatId = callbackQuery.message?.chat?.id;
  if (!chatId) return;
  const data = callbackQuery.data || '';
  await answerCallbackQuery(callbackQuery.id);

  if (data === 'offer') {
    setChatState(state, chatId, { stage: 'offer' });
    await sendMessage(
      chatId,
      [
        'Here is the quick version:',
        '',
        'We help businesses turn Telegram into a cleaner sales and follow-up channel with guided automations, AI-assisted copy, and profile-based messaging.',
        '',
        'Which best fits you?',
      ].join('\n'),
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'Services', callback_data: 'segment_services' },
              { text: 'Creator', callback_data: 'segment_creator' },
            ],
            [
              { text: 'Local business', callback_data: 'segment_local' },
            ],
          ],
        },
      },
    );
    return;
  }

  if (data === 'pricing') {
    setChatState(state, chatId, { stage: 'pricing' });
    await sendMessage(
      chatId,
      [
        'Simple demo pricing path:',
        '',
        '1. Starter setup',
        '2. Done-for-you workflow build',
        '3. Ongoing optimization',
        '',
        'Want the bonus stack too?',
      ].join('\n'),
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'Send the bonus', callback_data: 'bonus' },
              { text: 'Not right now', callback_data: 'later' },
            ],
          ],
        },
      },
    );
    return;
  }

  if (data === 'question') {
    setChatState(state, chatId, { stage: 'awaiting_question' });
    await sendMessage(
      chatId,
      [
        'Perfect. Send me your question as a normal reply here.',
        '',
        'Example: "How would this help me get more leads?"',
      ].join('\n'),
    );
    return;
  }

  if (data.startsWith('segment_')) {
    const segment = data.replace('segment_', '');
    setChatState(state, chatId, { stage: 'segmented', segment });
    await sendMessage(
      chatId,
      [
        `Got it. You picked <b>${segment}</b>.`,
        '',
        'That means your best flow usually starts with:',
        '- a strong welcome',
        '- one qualifying question',
        '- a branch for warm vs curious leads',
        '- a direct CTA when intent is high',
        '',
        'Next step:',
      ].join('\n'),
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'Show pricing', callback_data: 'pricing' },
              { text: 'Ask a question', callback_data: 'question' },
            ],
            [
              { text: 'Open bot link', url: 'https://t.me/Autopilotmoneybagbot' },
            ],
          ],
        },
      },
    );
    return;
  }

  if (data === 'bonus') {
    setChatState(state, chatId, { stage: 'bonus' });
    await sendMessage(
      chatId,
      [
        'Bonus stack unlocked:',
        '',
        '- onboarding checklist',
        '- first welcome sequence outline',
        '- CTA ideas for Telegram follow-up',
        '',
        'Reply with any question or tap below to restart the flow.',
      ].join('\n'),
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'Restart flow', callback_data: 'restart' },
              { text: 'Ask a question', callback_data: 'question' },
            ],
          ],
        },
      },
    );
    return;
  }

  if (data === 'later') {
    setChatState(state, chatId, { stage: 'later' });
    await sendMessage(
      chatId,
      [
        'No problem.',
        '',
        'A good nurture path here would wait a bit, share one proof point, then bring you back to the offer with a softer CTA.',
        '',
        'You can still ask a question any time.',
      ].join('\n'),
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'Ask a question', callback_data: 'question' },
              { text: 'Restart flow', callback_data: 'restart' },
            ],
          ],
        },
      },
    );
    return;
  }

  if (data === 'restart') {
    setChatState(state, chatId, { stage: 'idle' });
    await sendWelcome(chatId);
  }
}

async function handleMessage(state, message) {
  const chatId = message.chat?.id;
  const text = (message.text || '').trim();
  if (!chatId || !text) return;

  if (text === '/start') {
    setChatState(state, chatId, { stage: 'idle' });
    await sendWelcome(chatId);
    return;
  }

  const chatState = getChatState(state, chatId);

  if (chatState.stage === 'awaiting_question') {
    setChatState(state, chatId, { stage: 'question_answered', lastQuestion: text });
    await sendMessage(
      chatId,
      [
        `Good question: "${text}"`,
        '',
        'Short answer: this kind of Telegram flow works best when it opens with a clear promise, asks one simple intent question, and moves warmer replies toward a direct next step.',
        '',
        'Want to keep exploring?',
      ].join('\n'),
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: 'See pricing', callback_data: 'pricing' },
              { text: 'Restart flow', callback_data: 'restart' },
            ],
          ],
        },
      },
    );
    return;
  }

  await sendMessage(
    chatId,
    [
      'I caught your message.',
      '',
      'For this demo, tap one of the buttons below so we can keep you on the sample workflow.',
    ].join('\n'),
    { reply_markup: mainKeyboard() },
  );
}

async function bootstrapOffset(state) {
  if (state.offset !== null) return;
  const result = await api('getUpdates', { timeout: 0, limit: 20 });
  const lastUpdateId = result.at(-1)?.update_id;
  state.offset = lastUpdateId ? lastUpdateId + 1 : 0;
  saveState(state);
}

async function poll() {
  const state = loadState();
  await bootstrapOffset(state);

  while (true) {
    try {
      const updates = await api('getUpdates', {
        offset: state.offset,
        timeout: 25,
        allowed_updates: ['message', 'callback_query'],
      });

      for (const update of updates) {
        state.offset = update.update_id + 1;
        saveState(state);

        if (update.callback_query) {
          await handleCallback(state, update.callback_query);
        } else if (update.message) {
          await handleMessage(state, update.message);
        }
      }
    } catch (error) {
      console.error(new Date().toISOString(), error.message);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}

poll();
