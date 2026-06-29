import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const GEMINI_FAST_MODEL = 'gemini-2.5-flash-lite';
const GEMINI_WORKFLOW_MODEL = 'gemini-2.5-flash';

function readJson(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.on('data', (chunk) => { body += chunk; });
    request.on('end', () => {
      try { resolve(JSON.parse(body || '{}')); }
      catch (error) { reject(error); }
    });
    request.on('error', reject);
  });
}

function writeJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.end(JSON.stringify(payload));
}

function readGeminiText(payload) {
  return payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim() || '';
}

function extractJsonString(rawText) {
  if (!rawText) return '';
  const fencedMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fencedMatch?.[1]) return fencedMatch[1].trim();
  const firstBrace = rawText.indexOf('{');
  const lastBrace = rawText.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return rawText.slice(firstBrace, lastBrace + 1).trim();
  }
  return rawText.trim();
}

function normalizeAutomationFromGemini(payload, fallbackName = 'AI automation') {
  const kindMap = new Set(['trigger', 'message', 'ai', 'wait', 'delay', 'randomizer', 'condition', 'action']);
  const steps = Array.isArray(payload?.steps) ? payload.steps : [];
  const fallbackSteps = [
    { id: 'step-1', kind: 'trigger', title: 'Bot started', description: 'Starts when someone opens the bot.', triggerEvent: 'bot_start', status: 'live' },
    { id: 'step-2', kind: 'message', title: 'Welcome message', description: 'Welcome the subscriber and introduce the offer.', buttons: ['Tell me more'] },
  ];
  const safeSteps = (steps.length ? steps : fallbackSteps).map((step, index) => {
    const kind = kindMap.has(step.kind) ? step.kind : 'message';
    const id = step.id || `step-${index + 1}`;
    return {
      id,
      type: 'workflow',
      position: { x: 80 + (index * 320), y: 140 + ((index % 2) * 180) },
      data: {
        kind,
        title: step.title || `Step ${index + 1}`,
        description: step.description || 'AI-generated step',
        buttons: Array.isArray(step.buttons) ? step.buttons.slice(0, 3) : undefined,
        branches: Array.isArray(step.branches) ? step.branches.slice(0, 3) : undefined,
        triggerEvent: step.triggerEvent,
        waitMode: step.waitMode,
        timeout: step.timeout,
        timeoutValue: step.timeoutValue,
        timeoutUnit: step.timeoutUnit,
        delayValue: step.delayValue,
        delayUnit: step.delayUnit,
        splitPercent: step.splitPercent,
        conditionMode: step.conditionMode,
        conditions: Array.isArray(step.conditions) ? step.conditions.map((condition) => ({
          field: condition.field || 'reply_text',
          operator: condition.operator || 'contains',
          value: condition.value || '',
        })) : undefined,
        actionType: step.actionType,
        actionValue: step.actionValue,
        tone: step.tone,
        goal: step.goal,
        aiMode: step.aiMode,
        assistantPrompt: step.assistantPrompt,
        aiKnowledgeMode: step.aiKnowledgeMode,
        status: kind === 'trigger' ? 'live' : step.status,
      },
    };
  });

  const edges = Array.isArray(payload?.connections) ? payload.connections : safeSteps.slice(0, -1).map((step, index) => ({
    source: step.id,
    target: safeSteps[index + 1].id,
  }));

  return {
    name: payload?.name || fallbackName,
    selectedId: safeSteps.find((step) => step.data.kind === 'message')?.id || safeSteps[0]?.id || null,
    nodes: safeSteps,
    edges: edges
      .filter((edge, index) => edge?.source && edge?.target)
      .map((edge, index) => ({
        id: edge.id || `edge-${index + 1}`,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        type: 'smoothstep',
        markerEnd: { type: 'arrowclosed', width: 15, height: 15, color: '#87909f' },
        style: { stroke: '#aab2bf', strokeWidth: 2 },
      })),
  };
}

async function callTelegramApi(token, method, params = {}) {
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
    body: new URLSearchParams(params),
  });
  const payload = await response.json();
  return { response, payload };
}

function geminiProxy() {
  return {
    name: 'teleflow-gemini-proxy',
    configureServer(server) {
      server.middlewares.use('/api/gemini/generate', async (request, response) => {
        response.setHeader('Content-Type', 'application/json');
        if (request.method !== 'POST') {
          writeJson(response, 405, { error: 'Method not allowed.' });
          return;
        }

        try {
          const { apiKey, prompt, currentMessage, profileContext } = await readJson(request);
          if (!apiKey || !prompt) {
            writeJson(response, 400, { error: 'A Gemini API key and writing prompt are required.' });
            return;
          }

          const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_FAST_MODEL}:generateContent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: 'You write concise, natural Telegram automation messages. Return only the final message. Preserve variables such as {{first_name}} exactly. Do not use markdown unless requested.' }] },
              contents: [{ parts: [{ text: `Writing request: ${prompt}\n\nBusiness context:\n${profileContext || '(none)'}\n\nCurrent message for context: ${currentMessage || '(none)'}` }] }],
              generationConfig: { temperature: 0.8, maxOutputTokens: 300 },
            }),
          });
          const payload = await geminiResponse.json();
          const text = readGeminiText(payload);
          if (!geminiResponse.ok || !text) {
            writeJson(response, geminiResponse.status || 502, { error: payload.error?.message || 'Gemini returned no message.' });
            return;
          }
          writeJson(response, 200, { text });
        } catch (error) {
          writeJson(response, 500, { error: error.message || 'Could not contact Gemini.' });
        }
      });

      server.middlewares.use('/api/gemini/automation', async (request, response) => {
        response.setHeader('Content-Type', 'application/json');
        if (request.method !== 'POST') {
          writeJson(response, 405, { error: 'Method not allowed.' });
          return;
        }

        try {
          const { apiKey, name, goal, prompt, profileContext } = await readJson(request);
          if (!apiKey || !prompt || !name) {
            writeJson(response, 400, { error: 'A Gemini API key, automation name, and prompt are required.' });
            return;
          }

          const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_WORKFLOW_MODEL}:generateContent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{
                  text: 'You design Telegram automations. Return valid JSON only with this shape: {"name":"string","steps":[{"id":"string","kind":"trigger|message|ai|wait|delay|randomizer|condition|action","title":"string","description":"string","buttons":["string"],"branches":["string"],"triggerEvent":"string","waitMode":"string","timeout":"string","timeoutValue":number,"timeoutUnit":"minutes|hours|days","delayValue":number,"delayUnit":"minutes|hours|days","conditionMode":"string","conditions":[{"field":"string","operator":"string","value":"string"}],"actionType":"string","actionValue":"string","tone":"string","goal":"string","aiMode":"general|sales|support|qualification","assistantPrompt":"string","aiKnowledgeMode":"profile_only|profile_and_docs|profile_docs_links"}],"connections":[{"source":"step-id","target":"step-id","sourceHandle":"a|b|branch-2"}]}. Keep it to 4-8 steps. Always include at least one trigger step and two message steps.',
                }],
              },
              contents: [{
                parts: [{
                  text: `Automation name: ${name}\nObjective: ${goal || '(none)'}\nPrompt: ${prompt}\n\nBusiness context:\n${profileContext || '(none)'}`,
                }],
              }],
              generationConfig: { temperature: 0.8, maxOutputTokens: 1600 },
            }),
          });

          const payload = await geminiResponse.json();
          const rawText = readGeminiText(payload);
          if (!geminiResponse.ok || !rawText) {
            writeJson(response, geminiResponse.status || 502, { error: payload.error?.message || 'Gemini returned no automation.' });
            return;
          }

          let parsed;
          try {
            parsed = JSON.parse(extractJsonString(rawText));
          } catch (error) {
            writeJson(response, 502, {
              error: 'Gemini returned invalid automation JSON.',
              detail: error.message,
              rawText,
            });
            return;
          }

          writeJson(response, 200, { automation: normalizeAutomationFromGemini(parsed, name) });
        } catch (error) {
          writeJson(response, 500, { error: error.message || 'Could not contact Gemini.' });
        }
      });

      server.middlewares.use('/api/gemini/operator', async (request, response) => {
        response.setHeader('Content-Type', 'application/json');
        if (request.method !== 'POST') {
          writeJson(response, 405, { error: 'Method not allowed.' });
          return;
        }

        try {
          const { apiKey, prompt, profileContext, automationSummary, selectedNodeSummary } = await readJson(request);
          if (!apiKey || !prompt) {
            writeJson(response, 400, { error: 'A Gemini API key and operator prompt are required.' });
            return;
          }

          const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_WORKFLOW_MODEL}:generateContent`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
            body: JSON.stringify({
              systemInstruction: {
                parts: [{
                  text: 'You are the internal operator for a Telegram automation builder called Teleflow. Return JSON only in this shape: {"reply":"string","actions":[{"type":"create_automation|load_template|rename_active_automation|update_selected_node|rewrite_selected_message|add_step_after_selected|update_profile|open_settings","name":"string","goal":"string","prompt":"string","template":"sales|nurture","patch":{},"kind":"trigger|message|wait|delay|randomizer|condition|action","title":"string","description":"string","buttons":["string"],"tab":"profile|telegram|gemini|onboarding"}]}. Use at most 4 actions. If the request is unclear, ask a clarifying question in reply and return no actions. Prefer operating on the selected node when the user asks to rewrite, change, or refine a step.',
                }],
              },
              contents: [{
                parts: [{
                  text: `Operator request:\n${prompt}\n\nBusiness context:\n${profileContext || '(none)'}\n\nActive automation summary:\n${automationSummary || '(none)'}\n\nSelected node summary:\n${selectedNodeSummary || '(none)'}`,
                }],
              }],
              generationConfig: { temperature: 0.5, maxOutputTokens: 1400 },
            }),
          });

          const payload = await geminiResponse.json();
          const rawText = readGeminiText(payload);
          if (!geminiResponse.ok || !rawText) {
            writeJson(response, geminiResponse.status || 502, { error: payload.error?.message || 'Gemini returned no operator response.' });
            return;
          }

          let parsed;
          try {
            parsed = JSON.parse(extractJsonString(rawText));
          } catch (error) {
            writeJson(response, 502, { error: 'Gemini returned invalid operator JSON.', detail: error.message, rawText });
            return;
          }

          writeJson(response, 200, {
            reply: parsed.reply || 'Done.',
            actions: Array.isArray(parsed.actions) ? parsed.actions : [],
          });
        } catch (error) {
          writeJson(response, 500, { error: error.message || 'Could not contact Gemini.' });
        }
      });

      server.middlewares.use('/api/telegram/validate', async (request, response) => {
        response.setHeader('Content-Type', 'application/json');
        if (request.method !== 'POST') {
          writeJson(response, 405, { error: 'Method not allowed.' });
          return;
        }

        try {
          const { botToken } = await readJson(request);
          if (!botToken) {
            writeJson(response, 400, { error: 'A Telegram bot token is required.' });
            return;
          }

          const { response: telegramResponse, payload } = await callTelegramApi(botToken, 'getMe');
          if (!telegramResponse.ok || !payload.ok) {
            writeJson(response, telegramResponse.status || 502, { error: payload.description || 'Telegram bot token could not be validated.' });
            return;
          }

          writeJson(response, 200, { bot: payload.result });
        } catch (error) {
          writeJson(response, 500, { error: error.message || 'Could not contact Telegram.' });
        }
      });

      server.middlewares.use('/api/telegram/set-webhook', async (request, response) => {
        response.setHeader('Content-Type', 'application/json');
        if (request.method !== 'POST') {
          writeJson(response, 405, { error: 'Method not allowed.' });
          return;
        }

        try {
          const { botToken, webhookUrl, secretToken } = await readJson(request);
          if (!botToken || !webhookUrl) {
            writeJson(response, 400, { error: 'A bot token and webhook URL are required.' });
            return;
          }

          const { response: telegramResponse, payload } = await callTelegramApi(botToken, 'setWebhook', {
            url: webhookUrl,
            ...(secretToken ? { secret_token: secretToken } : {}),
          });

          if (!telegramResponse.ok || !payload.ok) {
            writeJson(response, telegramResponse.status || 502, { error: payload.description || 'Telegram webhook could not be configured.' });
            return;
          }

          writeJson(response, 200, { ok: true, webhookUrl });
        } catch (error) {
          writeJson(response, 500, { error: error.message || 'Could not configure the Telegram webhook.' });
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), geminiProxy()],
});
