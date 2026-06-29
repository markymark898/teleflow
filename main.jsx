import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  ReactFlow,
  Background,
  Controls,
  Handle,
  MiniMap,
  MarkerType,
  Position,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  addEdge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import {
  Activity,
  ArrowRight,
  BarChart3,
  Bell,
  Bot,
  BriefcaseBusiness,
  ChevronDown,
  CircleHelp,
  Clock3,
  Copy,
  Eye,
  EyeOff,
  GitBranch,
  KeyRound,
  LayoutGrid,
  Link2,
  ListFilter,
  LoaderCircle,
  MessageCircleMore,
  MousePointerClick,
  FileText,
  Package,
  PencilLine,
  Play,
  Plus,
  Radio,
  Save,
  Search,
  Send,
  Settings,
  Shuffle,
  Sparkles,
  Split,
  Target,
  Trash2,
  Upload,
  Users,
  X,
  Zap,
} from 'lucide-react';
import './styles.css';

const nodeMeta = {
  trigger: { label: 'Trigger', icon: Zap, tone: 'green' },
  message: { label: 'Send message', icon: Send, tone: 'blue' },
  ai: { label: 'AI assistant', icon: Bot, tone: 'violet' },
  wait: { label: 'Wait for reply', icon: MessageCircleMore, tone: 'violet' },
  delay: { label: 'Delay', icon: Clock3, tone: 'amber' },
  randomizer: { label: 'Randomizer', icon: Shuffle, tone: 'coral' },
  condition: { label: 'Condition', icon: GitBranch, tone: 'cyan' },
  action: { label: 'Action', icon: MousePointerClick, tone: 'slate' },
};

const baseNodes = [
  {
    id: 'trigger-1', type: 'workflow', position: { x: 40, y: 205 },
    data: { kind: 'trigger', title: 'New subscriber', description: 'Starts when someone opens the bot and taps Start', status: 'live' },
  },
  {
    id: 'message-1', type: 'workflow', position: { x: 340, y: 120 },
    data: { kind: 'message', title: 'Welcome message', description: 'Hey {{first_name}}! Welcome to StudioBot. What would you like help with?', buttons: ['Explore services', 'Ask a question'] },
  },
  {
    id: 'reply-1', type: 'workflow', position: { x: 340, y: 390 },
    data: { kind: 'wait', title: 'Wait for a reply', description: 'Continue when the subscriber sends any text', timeout: '24 hours' },
  },
  {
    id: 'random-1', type: 'workflow', position: { x: 720, y: 220 },
    data: { kind: 'randomizer', title: 'Split welcome path', description: 'Send subscribers down one of two paths', branches: ['A  50%', 'B  50%'] },
  },
  {
    id: 'delay-1', type: 'workflow', position: { x: 1040, y: 70 },
    data: { kind: 'delay', title: 'Wait 10 minutes', description: 'Give the subscriber a little breathing room' },
  },
  {
    id: 'message-2', type: 'workflow', position: { x: 1360, y: 45 },
    data: { kind: 'message', title: 'Offer a quick tour', description: 'Here is the fastest way to get value from StudioBot.', buttons: ['Show me around'] },
  },
  {
    id: 'message-3', type: 'workflow', position: { x: 1040, y: 400 },
    data: { kind: 'message', title: 'Start a conversation', description: 'What is the biggest thing you want help with today?', buttons: ['Sales', 'Support', 'Something else'] },
  },
  {
    id: 'condition-1', type: 'workflow', position: { x: 1360, y: 390 },
    data: { kind: 'condition', title: 'Check reply', description: 'Route based on the button the subscriber tapped', branches: ['Sales', 'Support', 'Other'] },
  },
];

const baseEdges = [
  ['trigger-1', 'message-1', 'edge-a'],
  ['trigger-1', 'reply-1', 'edge-b'],
  ['message-1', 'random-1', 'edge-c'],
  ['reply-1', 'random-1', 'edge-d'],
  ['random-1', 'delay-1', 'edge-e', 'a'],
  ['random-1', 'message-3', 'edge-f', 'b'],
  ['delay-1', 'message-2', 'edge-g'],
  ['message-3', 'condition-1', 'edge-h'],
].map(([source, target, id, sourceHandle]) => ({
  id, source, target, sourceHandle,
  type: 'smoothstep',
  markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15, color: '#87909f' },
  style: { stroke: '#aab2bf', strokeWidth: 2 },
}));

const cloneNodes = (nodes) => nodes.map((node) => ({
  ...node,
  position: { ...node.position },
  data: {
    ...node.data,
    buttons: node.data.buttons ? [...node.data.buttons] : undefined,
    branches: node.data.branches ? [...node.data.branches] : undefined,
    conditions: node.data.conditions ? node.data.conditions.map((condition) => ({ ...condition })) : undefined,
  },
}));
const cloneEdges = (edges) => edges.map((edge) => ({ ...edge, markerEnd: edge.markerEnd ? { ...edge.markerEnd } : undefined, style: edge.style ? { ...edge.style } : undefined }));

function edgeLabelFor(nodes, edge) {
  const sourceNode = nodes.find((node) => node.id === edge.source);
  if (!sourceNode) return '';
  if (sourceNode.data.kind === 'randomizer') {
    if (edge.sourceHandle === 'a') return sourceNode.data.branches?.[0] || 'Path A';
    if (edge.sourceHandle === 'b') return sourceNode.data.branches?.[1] || 'Path B';
  }
  if (sourceNode.data.kind === 'condition') {
    if (edge.sourceHandle === 'a') return sourceNode.data.branches?.[0] || 'Match';
    if (edge.sourceHandle === 'b') return sourceNode.data.branches?.[1] || 'Fallback';
  }
  return '';
}

function decorateEdges(nodes, edges) {
  return edges.map((edge) => {
    const label = edge.label || edgeLabelFor(nodes, edge);
    return {
      ...edge,
      label,
      labelBgPadding: [6, 3],
      labelBgBorderRadius: 999,
      labelBgStyle: { fill: '#ffffff', fillOpacity: 0.95 },
      labelStyle: { fill: '#546172', fontSize: 10, fontWeight: 700 },
    };
  });
}

function createAutomation(id, name, overrides = {}) {
  return {
    id,
    name,
    nodes: cloneNodes(baseNodes),
    edges: cloneEdges(baseEdges),
    selectedId: 'message-1',
    createdWith: 'manual',
    prompt: '',
    ...overrides,
  };
}

function normalizeAutomations(profile) {
  if (Array.isArray(profile.automations) && profile.automations.length > 0) {
    const automations = profile.automations.map((automation, index) => createAutomation(
      automation.id || `automation-${index + 1}`,
      automation.name || `Automation ${index + 1}`,
      {
        ...automation,
        nodes: cloneNodes(automation.nodes?.length ? automation.nodes : baseNodes),
        edges: cloneEdges(automation.edges?.length ? automation.edges : baseEdges),
      },
    ));
    return {
      automations,
      activeAutomationId: profile.activeAutomationId && automations.some((item) => item.id === profile.activeAutomationId)
        ? profile.activeAutomationId
        : automations[0].id,
    };
  }

  const legacyAutomation = createAutomation(
    'automation-default',
    profile.workflowName || 'New subscriber welcome',
    {
      nodes: cloneNodes(profile.nodes?.length ? profile.nodes : baseNodes),
      edges: cloneEdges(profile.edges?.length ? profile.edges : baseEdges),
      selectedId: profile.selectedId || 'message-1',
      createdWith: 'legacy',
    },
  );

  return {
    automations: [legacyAutomation],
    activeAutomationId: legacyAutomation.id,
  };
}

function normalizeContextDocument(doc = {}) {
  return {
    name: doc.name || 'context.txt',
    size: doc.size || 0,
    content: doc.content || '',
    access: doc.access || 'both',
  };
}

function contextAccessLabel(access) {
  if (access === 'automation_ai') return 'Automation AI only';
  if (access === 'standalone_bot') return 'Standalone bot only';
  return 'Both AI systems';
}

function standaloneModeLabel(standaloneAi = {}) {
  if (standaloneAi.mode === 'custom' && standaloneAi.customMode?.trim()) {
    return standaloneAi.customMode.trim();
  }
  if (standaloneAi.mode === 'support') return 'Support helper';
  if (standaloneAi.mode === 'general') return 'General guide';
  return 'Sales assistant';
}

function readSavedTemplates() {
  try {
    const stored = JSON.parse(localStorage.getItem('teleflow_saved_templates') || 'null');
    if (!Array.isArray(stored)) return [];
    return stored.map((template, index) => ({
      id: template.id || `template-${index + 1}`,
      name: template.name || `Saved template ${index + 1}`,
      sourceProfileName: template.sourceProfileName || 'Unknown profile',
      createdAt: template.createdAt || '',
      prompt: template.prompt || '',
      nodes: cloneNodes(template.nodes || []),
      edges: cloneEdges(template.edges || []),
      selectedId: template.selectedId || template.nodes?.[0]?.id || null,
    })).filter((template) => template.nodes.length > 0);
  } catch {
    return [];
  }
}

function createProfile(id, name, overrides = {}) {
  return {
    id,
    name,
    website: '',
    audience: '',
    offerSummary: '',
    products: ['Core offer'],
    promoLinks: ['https://'],
    promoItems: ['Limited-time bonus'],
    mediaLinks: [],
    mediaAssets: [],
    contextBullets: [],
    contextDocuments: [],
    sellingApproach: '',
    psychologyTriggers: '',
    brandVoice: '',
    onboardingComplete: false,
    geminiKey: '',
    standaloneAi: {
      enabled: false,
      mode: 'sales',
      customMode: '',
      scope: 'outside_automation',
      handoffMessage: 'You are now talking with our AI assistant. Ask anything and I will help from here.',
      assistantPrompt: 'Answer clearly, stay on-brand, and help the subscriber move toward the most relevant next step.',
    },
    telegram: {
      botToken: '',
      webhookUrl: '',
      secretToken: '',
      botInfo: null,
      simulation: {
        subscribers: [],
        replies: 0,
        clicks: 0,
        conversions: 0,
        lastEventAt: '',
      },
    },
    operatorMessages: [
      {
        id: 'operator-welcome',
        role: 'assistant',
        text: 'I can help build workflows, rewrite steps, update profile strategy, and guide Telegram setup. Try: "build a welcome flow for cold leads" or "rewrite the selected message to sound more premium."',
      },
    ],
    automations: [createAutomation('automation-default', 'New subscriber welcome')],
    activeAutomationId: 'automation-default',
    ...overrides,
  };
}

function readProfiles() {
  try {
    const stored = JSON.parse(sessionStorage.getItem('teleflow_profiles') || 'null');
    if (Array.isArray(stored) && stored.length > 0) {
      return stored.map((profile, index) => ({
        ...createProfile(profile.id || `profile-${index + 1}`, profile.name || `Business ${index + 1}`),
        ...profile,
        ...normalizeAutomations(profile),
        telegram: {
          botToken: profile.telegram?.botToken || '',
          webhookUrl: profile.telegram?.webhookUrl || '',
          secretToken: profile.telegram?.secretToken || '',
          botInfo: profile.telegram?.botInfo || null,
          simulation: {
            subscribers: Array.isArray(profile.telegram?.simulation?.subscribers) ? profile.telegram.simulation.subscribers : [],
            replies: profile.telegram?.simulation?.replies || 0,
            clicks: profile.telegram?.simulation?.clicks || 0,
            conversions: profile.telegram?.simulation?.conversions || 0,
            lastEventAt: profile.telegram?.simulation?.lastEventAt || '',
          },
        },
        products: Array.isArray(profile.products) ? profile.products : [],
        promoLinks: Array.isArray(profile.promoLinks) ? profile.promoLinks : [],
        promoItems: Array.isArray(profile.promoItems) ? profile.promoItems : [],
        mediaLinks: Array.isArray(profile.mediaLinks) ? profile.mediaLinks : [],
        mediaAssets: Array.isArray(profile.mediaAssets) ? profile.mediaAssets : [],
        contextBullets: Array.isArray(profile.contextBullets) ? profile.contextBullets : [],
        contextDocuments: Array.isArray(profile.contextDocuments) ? profile.contextDocuments.map(normalizeContextDocument) : [],
        standaloneAi: {
          enabled: Boolean(profile.standaloneAi?.enabled),
          mode: profile.standaloneAi?.mode || 'sales',
          customMode: profile.standaloneAi?.customMode || '',
          scope: profile.standaloneAi?.scope || 'outside_automation',
          handoffMessage: profile.standaloneAi?.handoffMessage || 'You are now talking with our AI assistant. Ask anything and I will help from here.',
          assistantPrompt: profile.standaloneAi?.assistantPrompt || 'Answer clearly, stay on-brand, and help the subscriber move toward the most relevant next step.',
        },
        operatorMessages: Array.isArray(profile.operatorMessages) && profile.operatorMessages.length
          ? profile.operatorMessages
          : createProfile(profile.id || `profile-${index + 1}`, profile.name || `Business ${index + 1}`).operatorMessages,
      }));
    }
  } catch {}

  return [
    createProfile('profile-acme', 'Acme Studio', {
      website: 'https://acmestudio.co',
      audience: 'Founders and small business teams who want a cleaner Telegram sales funnel.',
      offerSummary: 'We sell automation setup services, launch support, and premium growth playbooks.',
      products: ['Done-for-you automation build', 'Telegram growth playbook', 'Launch consulting'],
      promoLinks: ['https://acmestudio.co/start', 'https://acmestudio.co/case-studies'],
      promoItems: ['Free onboarding audit', '48-hour setup bonus'],
      mediaLinks: ['https://youtube.com/watch?v=acme-demo', 'https://instagram.com/acmestudio'],
      contextBullets: ['Push for fast clarity in the first two lines', 'Use proof before urgency', 'Always include a direct next step'],
      contextDocuments: [{ name: 'offer-notes.txt', size: 842, content: 'Acme Studio focuses on automation setup, launch support, and premium growth systems. The buyer wants speed, clarity, and a trustworthy guide.', access: 'both' }],
      sellingApproach: 'Lead with clarity, trust, and speed to first result. Keep the call to action direct.',
      psychologyTriggers: 'Specificity, social proof, urgency, low-friction next step, outcome-focused framing.',
      brandVoice: 'Warm, confident, crisp, practical, never spammy.',
      onboardingComplete: true,
    }),
    createProfile('profile-harbor', 'Harbor Fitness', {
      website: 'https://harborfit.example',
      audience: 'Busy professionals looking for a simple at-home fitness reset.',
      offerSummary: 'We sell small-group challenges, coaching subscriptions, and digital workout plans.',
      products: ['21-day reset challenge', 'Monthly coaching membership'],
      promoLinks: ['https://harborfit.example/join'],
      promoItems: ['Nutrition checklist', 'Accountability messages'],
      mediaLinks: ['https://youtube.com/watch?v=harbor-reset'],
      contextBullets: ['Make the reader feel they can start today', 'Emphasize consistency over intensity'],
      contextDocuments: [{ name: 'fitness-positioning.txt', size: 612, content: 'Harbor Fitness sells simple momentum for busy adults. Keep the tone encouraging and practical, not intimidating.', access: 'both' }],
      sellingApproach: 'Use motivation plus accountability. Focus on immediate wins and consistency.',
      psychologyTriggers: 'Identity, momentum, commitment, easy first step, loss aversion around waiting.',
      brandVoice: 'Energetic, encouraging, simple, action-first.',
      onboardingComplete: true,
    }),
  ];
}

function profileContext(profile) {
  return [
    `Business: ${profile.name}`,
    profile.website ? `Website: ${profile.website}` : '',
    profile.audience ? `Audience: ${profile.audience}` : '',
    profile.offerSummary ? `What we sell: ${profile.offerSummary}` : '',
    profile.products.length ? `Products: ${profile.products.join('; ')}` : '',
    profile.promoLinks.length ? `Links: ${profile.promoLinks.join('; ')}` : '',
    profile.mediaLinks.length ? `Media and social links: ${profile.mediaLinks.join('; ')}` : '',
    profile.mediaAssets.length ? `Uploaded media assets: ${profile.mediaAssets.map((item) => `${item.kind} ${item.name}`).join('; ')}` : '',
    profile.promoItems.length ? `Promotional items: ${profile.promoItems.join('; ')}` : '',
    profile.contextBullets.length ? `Context bullets: ${profile.contextBullets.join('; ')}` : '',
    profile.contextDocuments.length ? `Text file context: ${profile.contextDocuments.map((item) => `${item.name} [${contextAccessLabel(item.access)}]: ${item.content}`).join(' | ')}` : '',
    profile.sellingApproach ? `Selling approach: ${profile.sellingApproach}` : '',
    profile.psychologyTriggers ? `Psychology triggers: ${profile.psychologyTriggers}` : '',
    profile.brandVoice ? `Brand voice: ${profile.brandVoice}` : '',
  ].filter(Boolean).join('\n');
}

function nodeSummary(node) {
  if (!node) return 'No node selected.';
  return [
    `Selected node id: ${node.id}`,
    `Kind: ${node.data.kind}`,
    `Title: ${node.data.title}`,
    `Description: ${node.data.description}`,
    node.data.goal ? `Goal: ${node.data.goal}` : '',
    node.data.tone ? `Tone: ${node.data.tone}` : '',
    node.data.buttons?.length ? `Buttons: ${node.data.buttons.join('; ')}` : '',
  ].filter(Boolean).join('\n');
}

function automationSummary(automation) {
  if (!automation) return 'No active automation.';
  return [
    `Automation: ${automation.name}`,
    ...automation.nodes.slice(0, 8).map((node) => `${node.id}: ${node.data.kind} - ${node.data.title}`),
  ].join('\n');
}

function createOperatorMessage(role, text, meta = {}) {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text,
    ...meta,
  };
}

function automationKindLabel(automation) {
  if (automation.createdWith === 'gemini') return 'AI-built';
  if (automation.createdWith === 'template') return 'Template';
  if (automation.createdWith === 'fallback') return 'AI fallback';
  if (automation.createdWith === 'legacy') return 'Imported';
  return 'Custom';
}

function automationPreview(automation) {
  const kinds = automation.nodes.map((node) => node.data.kind);
  if (kinds.includes('randomizer')) return 'Split path';
  if (kinds.includes('condition')) return 'Branching flow';
  if (kinds.includes('wait') && kinds.includes('delay')) return 'Nurture sequence';
  if (kinds.includes('wait')) return 'Reply-driven';
  return 'Linear flow';
}

function automationStepCount(automation) {
  return automation.nodes.length;
}

function contextReadiness(profile) {
  const checks = [
    profile.audience,
    profile.offerSummary,
    profile.products.length,
    profile.promoLinks.length,
    profile.sellingApproach,
    profile.psychologyTriggers,
    profile.brandVoice,
  ];
  const complete = checks.filter(Boolean).length;
  return `${complete} / ${checks.length}`;
}

function textToLines(value) {
  return value.split('\n').map((item) => item.trim()).filter(Boolean);
}

function liveAutomationReady(profile) {
  return Boolean(profile.telegram?.botToken && profile.telegram?.webhookUrl);
}

function simulationMetrics(profile) {
  const simulation = profile.telegram?.simulation || {};
  const subscribers = Array.isArray(simulation.subscribers) ? simulation.subscribers : [];
  return {
    total: subscribers.length,
    active: subscribers.filter((item) => item.status !== 'cold').length,
    newLeads: subscribers.filter((item) => item.source === 'simulated').length,
    replies: simulation.replies || 0,
    clicks: simulation.clicks || 0,
    conversions: simulation.conversions || 0,
    lastEventAt: simulation.lastEventAt || '',
  };
}

function starterWorkflow(profile, template = 'sales') {
  const offer = profile.products[0] || 'your main offer';
  const nextStep = profile.promoLinks[0] || 'your checkout or booking link';
  const voice = profile.brandVoice || 'warm and direct';

  if (template === 'nurture') {
    return {
      name: `${profile.name} follow-up path`,
      selectedId: 'message-1',
      nodes: cloneNodes([
        {
          id: 'trigger-1', type: 'workflow', position: { x: 40, y: 220 },
          data: { kind: 'trigger', title: 'Bot started', description: 'When a new subscriber starts the bot', triggerEvent: 'bot_start', status: 'live' },
        },
        {
          id: 'message-1', type: 'workflow', position: { x: 340, y: 140 },
          data: { kind: 'message', title: 'Warm intro', description: `Welcome them in a ${voice} way and introduce ${offer}.`, buttons: ['Show me', 'Ask a question'], tone: 'warm', goal: 'Build trust' },
        },
        {
          id: 'delay-1', type: 'workflow', position: { x: 700, y: 110 },
          data: { kind: 'delay', title: 'Give them space', description: 'Pause before the next touchpoint.', delayValue: 4, delayUnit: 'hours' },
        },
        {
          id: 'message-2', type: 'workflow', position: { x: 1040, y: 90 },
          data: { kind: 'message', title: 'Proof + value', description: `Share a useful tip or proof point connected to ${offer}.`, buttons: ['Send details'], tone: 'practical', goal: 'Educate' },
        },
        {
          id: 'condition-1', type: 'workflow', position: { x: 1380, y: 210 },
          data: { kind: 'condition', title: 'Intent check', description: 'Branch based on subscriber behavior.', conditionMode: 'button', branches: ['Clicked CTA', 'No click'], conditions: [{ field: 'button', operator: 'contains', value: 'details' }] },
        },
        {
          id: 'message-3', type: 'workflow', position: { x: 1720, y: 120 },
          data: { kind: 'message', title: 'Direct CTA', description: `Invite them to take the next step here: ${nextStep}`, buttons: ['Open link'], tone: 'direct', goal: 'Convert' },
        },
      ]),
      edges: cloneEdges([
        ['trigger-1', 'message-1', 'edge-a'],
        ['message-1', 'delay-1', 'edge-b'],
        ['delay-1', 'message-2', 'edge-c'],
        ['message-2', 'condition-1', 'edge-d'],
        ['condition-1', 'message-3', 'edge-e', 'a'],
      ].map(([source, target, id, sourceHandle]) => ({
        id, source, target, sourceHandle, type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15, color: '#87909f' },
        style: { stroke: '#aab2bf', strokeWidth: 2 },
      }))),
      createdWith: 'template',
      prompt: 'Build a nurture automation from the onboarding context.',
    };
  }

  return {
    name: `${profile.name} intro and qualify`,
    selectedId: 'message-1',
    nodes: cloneNodes([
      {
        id: 'trigger-1', type: 'workflow', position: { x: 40, y: 220 },
        data: { kind: 'trigger', title: 'New Telegram start', description: 'Starts when someone opens the bot and taps Start', triggerEvent: 'bot_start', status: 'live' },
      },
      {
        id: 'message-1', type: 'workflow', position: { x: 330, y: 140 },
        data: { kind: 'message', title: 'Welcome + promise', description: `Welcome the subscriber and tease the value of ${offer}.`, buttons: ['Show me the offer', 'I have a question'], tone: 'warm', goal: 'Open the conversation' },
      },
      {
        id: 'random-1', type: 'workflow', position: { x: 720, y: 220 },
        data: { kind: 'randomizer', title: 'Split test angle', description: 'Test two opening angles.', splitPercent: 50, branches: ['Value-first 50%', 'Curiosity-first 50%'] },
      },
      {
        id: 'message-2', type: 'workflow', position: { x: 1060, y: 70 },
        data: { kind: 'message', title: 'Value-first pitch', description: `Lead with clarity, outcome, and the next step for ${offer}.`, buttons: ['See pricing'], tone: 'direct', goal: 'Drive clicks' },
      },
      {
        id: 'message-3', type: 'workflow', position: { x: 1060, y: 370 },
        data: { kind: 'message', title: 'Curiosity-first pitch', description: `Open a curiosity loop, then point them toward ${nextStep}.`, buttons: ['Send me details'], tone: 'curious', goal: 'Drive replies' },
      },
      {
        id: 'wait-1', type: 'workflow', position: { x: 1420, y: 210 },
        data: { kind: 'wait', title: 'Wait for engagement', description: 'Continue when they reply or click.', waitMode: 'any_reply', timeout: '24 hours', timeoutValue: 24, timeoutUnit: 'hours' },
      },
      {
        id: 'condition-1', type: 'workflow', position: { x: 1760, y: 210 },
        data: { kind: 'condition', title: 'Route by intent', description: 'Send warmer leads to the offer and colder leads to more context.', conditionMode: 'text_match', branches: ['Ready to buy', 'Need more context'], conditions: [{ field: 'reply_text', operator: 'contains', value: 'price' }] },
      },
    ]),
    edges: cloneEdges([
      ['trigger-1', 'message-1', 'edge-a'],
      ['message-1', 'random-1', 'edge-b'],
      ['random-1', 'message-2', 'edge-c', 'a'],
      ['random-1', 'message-3', 'edge-d', 'b'],
      ['message-2', 'wait-1', 'edge-e'],
      ['message-3', 'wait-1', 'edge-f'],
      ['wait-1', 'condition-1', 'edge-g'],
    ].map(([source, target, id, sourceHandle]) => ({
      id, source, target, sourceHandle, type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15, color: '#87909f' },
      style: { stroke: '#aab2bf', strokeWidth: 2 },
    }))),
    createdWith: 'template',
    prompt: 'Build a sales-focused conversion automation from the onboarding context.',
  };
}

function fallbackAutomationFromPrompt(profile, name, goal, prompt) {
  const offer = profile.products[0] || 'your offer';
  const primaryLink = profile.promoLinks[0] || 'your primary CTA link';
  const branchB = goal?.toLowerCase().includes('lead') ? 'Needs nurturing' : 'Follow-up later';
  return {
    name,
    createdWith: 'fallback',
    prompt,
    selectedId: 'message-1',
    nodes: cloneNodes([
      {
        id: 'trigger-1', type: 'workflow', position: { x: 40, y: 220 },
        data: { kind: 'trigger', title: 'Bot started', description: 'Starts when someone opens the bot and taps Start.', triggerEvent: 'bot_start', status: 'live' },
      },
      {
        id: 'message-1', type: 'workflow', position: { x: 340, y: 120 },
        data: { kind: 'message', title: 'Welcome + intent', description: `Welcome the subscriber, introduce ${offer}, and ask one short qualifying question.`, buttons: ['I want details', 'Just browsing'], tone: 'warm', goal: 'Open the conversation' },
      },
      {
        id: 'wait-1', type: 'workflow', position: { x: 720, y: 220 },
        data: { kind: 'wait', title: 'Wait for reply', description: 'Hold until the subscriber replies or taps a button.', waitMode: 'any_reply', timeout: '24 hours', timeoutValue: 24, timeoutUnit: 'hours' },
      },
      {
        id: 'condition-1', type: 'workflow', position: { x: 1080, y: 220 },
        data: { kind: 'condition', title: 'Route by intent', description: goal || 'Use the first response to separate warm intent from general curiosity.', conditionMode: 'button', branches: ['Warm lead', branchB], conditions: [{ field: 'button', operator: 'contains', value: 'details' }] },
      },
      {
        id: 'message-2', type: 'workflow', position: { x: 1440, y: 80 },
        data: { kind: 'message', title: 'Direct CTA', description: `Send the strongest next step and point them to ${primaryLink}.`, buttons: ['Open offer'], tone: 'direct', goal: 'Drive clicks' },
      },
      {
        id: 'message-3', type: 'workflow', position: { x: 1440, y: 360 },
        data: { kind: 'message', title: 'Nurture follow-up', description: `Share helpful context tied to ${offer} and invite them back when ready. Prompt basis: ${prompt}`, buttons: ['Send more info'], tone: 'practical', goal: 'Build trust' },
      },
    ]),
    edges: cloneEdges([
      ['trigger-1', 'message-1', 'edge-a'],
      ['message-1', 'wait-1', 'edge-b'],
      ['wait-1', 'condition-1', 'edge-c'],
      ['condition-1', 'message-2', 'edge-d', 'a'],
      ['condition-1', 'message-3', 'edge-e', 'b'],
    ].map(([source, target, id, sourceHandle]) => ({
      id, source, target, sourceHandle,
      type: 'smoothstep',
      markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15, color: '#87909f' },
      style: { stroke: '#aab2bf', strokeWidth: 2 },
    }))),
  };
}

async function fetchJsonWithTimeout(url, options, timeoutMs = 20000) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    const payload = await response.json();
    return { response, payload };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

const WorkflowNode = memo(({ id, data, selected }) => {
  const meta = nodeMeta[data.kind];
  const Icon = meta.icon;
  const hasBranches = data.branches?.length > 0;
  const telegramLabel = data.kind === 'trigger'
    ? 'Telegram update'
    : data.kind === 'message'
      ? 'sendMessage'
      : data.kind === 'ai'
        ? 'Gemini chat'
      : data.kind === 'wait'
        ? 'Webhook wait'
        : data.kind === 'delay'
          ? 'Scheduled pause'
          : data.kind === 'randomizer'
            ? 'Path split'
            : data.kind === 'condition'
              ? 'Reply routing'
              : 'Automation action';
  const detailLabel = data.kind === 'delay'
    ? `${data.delayValue || 10} ${data.delayUnit || 'minutes'}`
    : data.kind === 'wait'
      ? data.timeout || `${data.timeoutValue || 24} ${data.timeoutUnit || 'hours'}`
      : data.kind === 'trigger'
        ? (data.triggerEvent || 'bot_start').replaceAll('_', ' ')
        : data.kind === 'action'
          ? `${data.actionType || 'tag'}: ${data.actionValue || 'Configured'}`
          : data.kind === 'ai'
            ? data.aiMode === 'sales'
              ? 'sales guide'
              : data.aiMode === 'support'
                ? 'support mode'
                : 'open conversation'
          : data.kind === 'condition'
            ? `${data.conditions?.length || 0} rule${data.conditions?.length === 1 ? '' : 's'}`
            : '';

  return (
    <div className={`flow-node ${selected ? 'is-selected' : ''}`}>
      <Handle type="target" position={Position.Left} />
      <div className={`node-head tone-${meta.tone}`}>
        <span className="node-icon"><Icon size={15} /></span>
        <span>{meta.label}</span>
        {data.status && <span className="node-status">{data.status}</span>}
      </div>
      <div className="node-body">
        <span className="node-api-label">{telegramLabel}</span>
        <strong>{data.title}</strong>
        <p>{data.description}</p>
        {data.buttons?.map((button) => (
          <span className="message-button" key={button}>{button}</span>
        ))}
        {detailLabel && (
          <button
            className={`node-detail ${selected ? 'is-clickable' : ''}`}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              window.dispatchEvent(new CustomEvent('teleflow-quick-add', { detail: { anchorId: id, anchorKind: data.kind } }));
            }}
            title="Add the next workflow step"
          >
            <span><Clock3 size={13} /> {detailLabel}</span>
            <ArrowRight size={13} />
          </button>
        )}
      </div>
      {hasBranches ? (
        <div className="branch-list">
          {data.branches.map((branch, index) => (
            <div className="branch-row" key={branch}>
              <span><i style={{ background: ['#f26c5b', '#2ebf91', '#3b82f6'][index] }} />{branch}</span>
              <div className="branch-actions">
                {selected && (
                  <button
                    className="branch-add"
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      window.dispatchEvent(new CustomEvent('teleflow-quick-add', {
                        detail: {
                          anchorId: id,
                          anchorKind: data.kind,
                          sourceHandle: index === 0 ? 'a' : index === 1 ? 'b' : `branch-${index}`,
                          branchLabel: branch,
                        },
                      }));
                    }}
                    title={`Add a step on ${branch}`}
                  >
                    <Plus size={12} />
                  </button>
                )}
                <Handle type="source" id={index === 0 ? 'a' : index === 1 ? 'b' : `branch-${index}`} position={Position.Right} style={{ top: 'auto', position: 'relative', right: -7 }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="node-footer-actions">
          {selected && (
            <button
              className="node-add-next"
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                window.dispatchEvent(new CustomEvent('teleflow-quick-add', { detail: { anchorId: id, anchorKind: data.kind } }));
              }}
            >
              <Plus size={13} /> Add next step
            </button>
          )}
          <Handle type="source" position={Position.Right} />
        </div>
      )}
      <span className="node-id">#{id.split('-').at(-1)}</span>
    </div>
  );
});

const nodeTypes = { workflow: WorkflowNode };

function fieldCopy(kind) {
  if (kind === 'message') return 'Send text and buttons';
  if (kind === 'ai') return 'Let subscribers talk with Gemini';
  if (kind === 'randomizer') return 'Split contacts by percentage';
  if (kind === 'delay') return 'Pause for an amount of time';
  if (kind === 'wait') return 'Pause until they respond';
  if (kind === 'condition') return 'Branch using rules';
  return 'Update data or notify';
}

function Sidebar({
  active,
  setActive,
  automationsCount,
  onOpenSettings,
  onOpenTelegram,
  geminiConnected,
  telegramConnected,
}) {
  const main = [
    ['Overview', LayoutGrid], ['Automations', Split], ['Broadcasts', Radio],
    ['Subscribers', Users], ['Analytics', BarChart3], ['Files', FileText],
  ];

  return (
    <aside className="sidebar">
      <div className="brand"><span><Send size={18} /></span><b>Teleflow</b></div>
      <nav>
        <small>Workspace</small>
        {main.map(([label, Icon]) => (
          <button key={label} className={active === label ? 'active' : ''} onClick={() => setActive(label)}>
            <Icon size={18} /><span>{label}</span>{label === 'Automations' && <em>{automationsCount}</em>}
          </button>
        ))}
        <small>Manage</small>
        <button className={active === 'Telegram bot' ? 'active' : ''} onClick={() => { setActive('Telegram bot'); onOpenTelegram(); }}>
          <Bot size={18} /><span>Telegram bot</span><i className={telegramConnected ? 'integration-dot' : 'online-dot'} />
        </button>
        <button className={active === 'Activity log' ? 'active' : ''} onClick={() => setActive('Activity log')}><Activity size={18} /><span>Activity log</span></button>
      </nav>
      <div className="sidebar-bottom">
        <button className={active === 'Help center' ? 'active' : ''} onClick={() => setActive('Help center')}><CircleHelp size={18} /><span>Help center</span></button>
        <button onClick={onOpenSettings}><Settings size={18} /><span>Settings</span>{(geminiConnected || telegramConnected) && <i className="integration-dot" />}</button>
        <div className="user-row"><span className="avatar">AM</span><div><b>Alex Morgan</b><small>Acme Studio</small></div><ChevronDown size={15} /></div>
      </div>
    </aside>
  );
}

function ProfileTabs({
  profiles,
  activeProfileId,
  onSelectProfile,
  onCreateProfile,
  onEditProfile,
  onDeleteProfile,
  canDeleteProfiles,
}) {
  return (
    <div className="profile-tabs">
      <div className="profile-tabs-scroll">
        {profiles.map((profile) => {
          const isActive = profile.id === activeProfileId;
          return (
            <button className={`profile-tab ${isActive ? 'active' : ''}`} key={profile.id} onClick={() => onSelectProfile(profile.id)}>
              <span className="profile-tab-mark">{profile.name.slice(0, 2).toUpperCase()}</span>
              <span className="profile-tab-copy">
                <b>{profile.name}</b>
                <small>{profile.telegram.botInfo?.username ? `@${profile.telegram.botInfo.username}` : 'Draft profile'}</small>
              </span>
              {isActive && (
                <span className="profile-tab-actions">
                  <span className="mini-icon" onClick={(event) => { event.stopPropagation(); onEditProfile(profile); }} title="Edit profile"><PencilLine size={13} /></span>
                  {canDeleteProfiles && <span className="mini-icon" onClick={(event) => { event.stopPropagation(); onDeleteProfile(profile); }} title="Delete profile"><Trash2 size={13} /></span>}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <button className="profile-tab-create" title="Create profile" onClick={onCreateProfile}><Plus size={15} /> New business</button>
    </div>
  );
}

function AutomationShelf({ automations, activeAutomationId, onSelect, onCreateAi, onCreateTemplate, onDuplicate }) {
  return (
    <section className="automation-shelf">
      <div className="automation-shelf-head">
        <div>
          <b>Automation library</b>
          <p>See each workflow type for this business and jump between them fast.</p>
        </div>
        <div className="automation-shelf-actions">
          <button className="secondary-action" onClick={onCreateTemplate}><Sparkles size={14} /> Template</button>
          <button className="secondary-action" onClick={onCreateAi}><Bot size={14} /> AI automation</button>
          <button className="secondary-action" onClick={onDuplicate}><Copy size={14} /> Duplicate current</button>
        </div>
      </div>
      <div className="automation-shelf-grid">
        {automations.map((automation) => {
          const active = automation.id === activeAutomationId;
          return (
            <button key={automation.id} className={`automation-card ${active ? 'active' : ''}`} onClick={() => onSelect(automation.id)}>
              <div className="automation-card-top">
                <span className="automation-kind">{automationKindLabel(automation)}</span>
                <span className="automation-meta">{automationStepCount(automation)} steps</span>
              </div>
              <strong>{automation.name}</strong>
              <p>{automationPreview(automation)}</p>
              <div className="automation-card-foot">
                <span>{automation.prompt ? 'Prompt-backed' : 'Manual structure'}</span>
                {active && <em>Open</em>}
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function SectionPanel({ title, copy, action, children }) {
  return (
    <section className="workspace-section">
      <div className="section-head">
        <div>
          <b>{title}</b>
          <p>{copy}</p>
        </div>
        {action}
      </div>
      <div className="section-body">{children}</div>
    </section>
  );
}

function GeminiModal({ profileName, currentKey, onSave, onClose }) {
  const [draftKey, setDraftKey] = useState(currentKey);
  const [showKey, setShowKey] = useState(false);

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="integration-modal" role="dialog" aria-modal="true" aria-labelledby="gemini-title">
        <div className="modal-head">
          <div className="gemini-mark"><Sparkles size={19} /></div>
          <div><h2 id="gemini-title">Connect Gemini</h2><p>{profileName} uses its own API key for message generation.</p></div>
          <button className="icon-button" onClick={onClose} title="Close Gemini settings"><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div className="integration-state">
            <span><Sparkles size={18} /></span>
            <div><b>Gemini AI writer</b><p>Connected only for this profile and its workflow drafts.</p></div>
            <em className={currentKey ? 'connected' : ''}>{currentKey ? 'Connected' : 'Optional'}</em>
          </div>
          <label className="field-label" htmlFor="gemini-key">Gemini API key</label>
          <div className="secret-input">
            <KeyRound size={16} />
            <input id="gemini-key" type={showKey ? 'text' : 'password'} value={draftKey} onChange={(event) => setDraftKey(event.target.value)} placeholder="AIza..." autoComplete="off" />
            <button onClick={() => setShowKey(!showKey)} title={showKey ? 'Hide API key' : 'Show API key'}>{showKey ? <EyeOff size={16} /> : <Eye size={16} />}</button>
          </div>
          <p className="security-note">For this prototype, the key stays in the current browser session. In production, each profile should store its key securely on the backend with access control.</p>
          <div className="model-row"><div><b>Model</b><small>2.5 family for lower-cost drafting and workflow generation</small></div><span>2.5 Flash-Lite + 2.5 Flash</span></div>
        </div>
        <div className="modal-footer">
          {currentKey && <button className="disconnect-button" onClick={() => onSave('')}>Disconnect</button>}
          <button className="cancel-button" onClick={onClose}>Cancel</button>
          <button className="connect-button" disabled={!draftKey.trim()} onClick={() => onSave(draftKey.trim())}>{currentKey ? 'Update key' : 'Connect Gemini'}</button>
        </div>
      </section>
    </div>
  );
}

function TelegramModal({ profileName, currentToken, currentWebhookUrl, currentSecretToken, currentBotInfo, profiles, linkedProfileId, onChangeLinkedProfile, onSave, onClose }) {
  const [draftToken, setDraftToken] = useState(currentToken);
  const [draftWebhookUrl, setDraftWebhookUrl] = useState(currentWebhookUrl);
  const [draftSecretToken, setDraftSecretToken] = useState(currentSecretToken);
  const [showToken, setShowToken] = useState(false);
  const [checking, setChecking] = useState(false);
  const [botInfo, setBotInfo] = useState(currentBotInfo);
  const [error, setError] = useState('');
  const [advancedOpen, setAdvancedOpen] = useState(Boolean(currentWebhookUrl || currentSecretToken));

  const validate = async () => {
    setChecking(true);
    setError('');
    try {
      const response = await fetch('/api/telegram/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken: draftToken.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Telegram validation failed.');
      setBotInfo(payload.bot);
      return payload.bot;
    } catch (validationError) {
      setError(validationError.message || 'Telegram validation failed.');
      return null;
    } finally {
      setChecking(false);
    }
  };

  const save = async () => {
    if (!draftToken.trim()) return;
    let nextBotInfo = botInfo;
    if (!nextBotInfo) {
      nextBotInfo = await validate();
      if (!nextBotInfo) return;
    }
    onSave({
      botToken: draftToken.trim(),
      webhookUrl: draftWebhookUrl.trim(),
      secretToken: draftSecretToken.trim(),
      botInfo: nextBotInfo,
    });
  };

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="integration-modal telegram-modal" role="dialog" aria-modal="true" aria-labelledby="telegram-title">
        <div className="modal-head">
          <div className="gemini-mark"><Bot size={19} /></div>
          <div><h2 id="telegram-title">Connect Telegram</h2><p>{profileName} connects through one simple BotFather setup flow.</p></div>
          <button className="icon-button" onClick={onClose} title="Close Telegram settings"><X size={18} /></button>
        </div>
        <div className="modal-body">
          <label className="field-label" htmlFor="telegram-linked-profile">Link this bot to profile</label>
          <select id="telegram-linked-profile" className="text-input compact-input" value={linkedProfileId} onChange={(event) => onChangeLinkedProfile(event.target.value)}>
            {profiles.map((profile) => <option key={profile.id} value={profile.id}>{profile.name}</option>)}
          </select>
          <div className="integration-state">
            <span><Bot size={18} /></span>
            <div>
              <b>{botInfo?.username ? `@${botInfo.username}` : 'Telegram bot'}</b>
              <p>{botInfo?.first_name || `This connection will be saved to ${profileName}.`}</p>
            </div>
            <em className={draftToken.trim() ? 'connected' : ''}>{draftToken.trim() ? 'Ready' : 'Optional'}</em>
          </div>
          <div className="telegram-steps">
            <div className="telegram-step"><span>1</span><div><b>Create the bot in BotFather</b><p>Use `/newbot` in Telegram and finish the name + username setup there.</p></div></div>
            <div className="telegram-step"><span>2</span><div><b>Paste the BotFather token here</b><p>We validate it immediately and tie that bot to this profile.</p></div></div>
            <div className="telegram-step"><span>3</span><div><b>Optionally add a webhook later</b><p>Only needed once you want live incoming Telegram events.</p></div></div>
          </div>
          <div className="guided-actions">
            <button className="secondary-action" onClick={() => window.open('https://t.me/BotFather', '_blank', 'noopener,noreferrer')}><Bot size={14} /> Open BotFather</button>
          </div>
          <label className="field-label" htmlFor="telegram-token">Bot token</label>
          <div className="secret-input">
            <KeyRound size={16} />
            <input id="telegram-token" type={showToken ? 'text' : 'password'} value={draftToken} onChange={(event) => setDraftToken(event.target.value)} placeholder="123456:ABC..." autoComplete="off" />
            <button onClick={() => setShowToken(!showToken)} title={showToken ? 'Hide token' : 'Show token'}>{showToken ? <EyeOff size={16} /> : <Eye size={16} />}</button>
          </div>
          <p className="security-note">This is the only required field for the basic connection. Webhook settings can wait until you want live incoming updates.</p>
          <div className="advanced-telegram">
            <button className="advanced-telegram-toggle" onClick={() => setAdvancedOpen(!advancedOpen)}>
              <span>Advanced webhook settings</span>
              <ChevronDown size={15} className={advancedOpen ? 'rotated' : ''} />
            </button>
            {advancedOpen && (
              <div className="advanced-telegram-fields">
                <label className="field-label" htmlFor="telegram-webhook">Webhook URL</label>
                <input id="telegram-webhook" className="text-input" value={draftWebhookUrl} onChange={(event) => setDraftWebhookUrl(event.target.value)} placeholder="https://your-domain.com/api/telegram/webhook" />
                <label className="field-label" htmlFor="telegram-secret">Webhook secret token</label>
                <input id="telegram-secret" className="text-input" value={draftSecretToken} onChange={(event) => setDraftSecretToken(event.target.value)} placeholder="Optional shared secret" />
              </div>
            )}
          </div>
          <div className="model-row"><div><b>Webhook setup</b><small>Needed only for live incoming updates</small></div><span>{currentWebhookUrl ? 'Configured' : 'Not set'}</span></div>
          {error && <p className="ai-error">{error}</p>}
          {botInfo?.username && <div className="telegram-bot-card"><b>Validated bot</b><p>Username: @{botInfo.username}</p><p>Type: {botInfo.can_join_groups ? 'Can join groups' : 'Direct bot'}</p></div>}
        </div>
        <div className="modal-footer">
          {currentToken && <button className="disconnect-button" onClick={() => onSave({ botToken: '', webhookUrl: '', secretToken: '', botInfo: null })}>Disconnect</button>}
          <button className="cancel-button" onClick={onClose}>Cancel</button>
          <button className="connect-button" disabled={!draftToken.trim() || checking} onClick={save}>{checking ? 'Checking...' : currentToken ? 'Update Telegram' : 'Connect Telegram'}</button>
        </div>
      </section>
    </div>
  );
}

function ProfileModal({ profile, onSave, onDelete, onClose, canDelete }) {
  const [draft, setDraft] = useState({
    name: profile.name || '',
    website: profile.website || '',
    audience: profile.audience || '',
    offerSummary: profile.offerSummary || '',
    products: (profile.products || []).join('\n'),
    promoLinks: (profile.promoLinks || []).join('\n'),
    promoItems: (profile.promoItems || []).join('\n'),
    sellingApproach: profile.sellingApproach || '',
    psychologyTriggers: profile.psychologyTriggers || '',
    brandVoice: profile.brandVoice || '',
    standaloneAiEnabled: Boolean(profile.standaloneAi?.enabled),
    standaloneAiMode: profile.standaloneAi?.mode || 'sales',
    standaloneAiCustomMode: profile.standaloneAi?.customMode || '',
    standaloneAiScope: profile.standaloneAi?.scope || 'outside_automation',
    standaloneAiHandoffMessage: profile.standaloneAi?.handoffMessage || 'You are now talking with our AI assistant. Ask anything and I will help from here.',
    standaloneAiPrompt: profile.standaloneAi?.assistantPrompt || 'Answer clearly, stay on-brand, and help the subscriber move toward the most relevant next step.',
  });
  const [documents, setDocuments] = useState((profile.contextDocuments || []).map(normalizeContextDocument));
  const [mediaAssets, setMediaAssets] = useState(profile.mediaAssets || []);

  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));

  const updateDocument = (index, key, value) => {
    setDocuments((current) => current.map((doc, docIndex) => (docIndex === index ? { ...doc, [key]: value } : doc)));
  };

  const handleDocumentFiles = async (event) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md'));
    const loaded = await Promise.all(files.map(async (file) => normalizeContextDocument({
      name: file.name,
      size: file.size,
      content: await file.text(),
      access: 'both',
    })));
    setDocuments((current) => [...current, ...loaded]);
    event.target.value = '';
  };

  const handleMediaFiles = async (event) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('video/') || file.type.startsWith('image/') || file.type.startsWith('audio/'));
    const loaded = await Promise.all(files.map(async (file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
      kind: file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'image' : 'audio',
    })));
    setMediaAssets((current) => [...current, ...loaded]);
    event.target.value = '';
  };

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="integration-modal profile-modal" role="dialog" aria-modal="true" aria-labelledby="profile-title">
        <div className="modal-head">
          <div className="gemini-mark"><BriefcaseBusiness size={19} /></div>
          <div><h2 id="profile-title">Profile strategy</h2><p>Tell the AI what this business sells and how it should sell it.</p></div>
          <button className="icon-button" onClick={onClose} title="Close profile settings"><X size={18} /></button>
        </div>
        <div className="modal-body profile-form">
          <div className="form-grid two-up">
            <div>
              <label className="field-label" htmlFor="profile-name">Profile name</label>
              <input id="profile-name" className="text-input" value={draft.name} onChange={(event) => update('name', event.target.value)} placeholder="Acme Studio" />
            </div>
            <div>
              <label className="field-label" htmlFor="profile-website">Primary site</label>
              <input id="profile-website" className="text-input" value={draft.website} onChange={(event) => update('website', event.target.value)} placeholder="https://yourbrand.com" />
            </div>
          </div>
          <label className="field-label" htmlFor="profile-audience">Audience</label>
          <textarea id="profile-audience" className="big-textarea" rows="3" value={draft.audience} onChange={(event) => update('audience', event.target.value)} placeholder="Who this business is selling to and what they care about." />
          <label className="field-label" htmlFor="profile-offer">What you sell</label>
          <textarea id="profile-offer" className="big-textarea" rows="3" value={draft.offerSummary} onChange={(event) => update('offerSummary', event.target.value)} placeholder="High-level offer, value proposition, and desired outcome." />
          <div className="form-grid three-up">
            <div>
              <label className="field-label" htmlFor="profile-products">Products or services</label>
              <textarea id="profile-products" className="big-textarea" rows="5" value={draft.products} onChange={(event) => update('products', event.target.value)} placeholder={'One per line\nVIP consulting\nStarter plan'} />
            </div>
            <div>
              <label className="field-label" htmlFor="profile-links">Promotional links</label>
              <textarea id="profile-links" className="big-textarea" rows="5" value={draft.promoLinks} onChange={(event) => update('promoLinks', event.target.value)} placeholder={'One per line\nhttps://yourbrand.com/offer'} />
            </div>
            <div>
              <label className="field-label" htmlFor="profile-promo-items">Promotional items</label>
              <textarea id="profile-promo-items" className="big-textarea" rows="5" value={draft.promoItems} onChange={(event) => update('promoItems', event.target.value)} placeholder={'One per line\nBonus call\nDiscount code'} />
            </div>
          </div>
          <div className="upload-panel">
            <div className="upload-copy">
              <b>Upload media assets</b>
              <p>Add videos, images, or audio files that represent the offer, product demos, testimonials, or brand material.</p>
            </div>
            <label className="upload-button">
              <Play size={14} />
              Add media files
              <input type="file" accept="video/*,image/*,audio/*" multiple onChange={handleMediaFiles} />
            </label>
          </div>
          <div className="document-list">
            {mediaAssets.length > 0 ? mediaAssets.map((asset, index) => (
              <div className="document-row" key={`${asset.name}-${index}`}>
                <div><b>{asset.name}</b><p>{mediaAssetLabel(asset)}</p></div>
                <button className="mini-icon" onClick={() => setMediaAssets((current) => current.filter((_, assetIndex) => assetIndex !== index))} title="Remove media"><X size={13} /></button>
              </div>
            )) : <div className="empty-upload">No media assets added yet.</div>}
          </div>
          <div className="upload-panel">
            <div className="upload-copy">
              <b>Upload text context files</b>
              <p>Add notes, positioning docs, bullet lists, or internal copy docs and choose which Gemini systems can use each file.</p>
            </div>
            <label className="upload-button">
              <Upload size={14} />
              Add text files
              <input type="file" accept=".txt,.md,text/plain,text/markdown" multiple onChange={handleDocumentFiles} />
            </label>
          </div>
          <div className="document-list">
            {documents.length > 0 ? documents.map((doc, index) => (
              <div className="document-row stacked" key={`${doc.name}-${index}`}>
                <div className="document-row-main">
                  <div><b>{doc.name}</b><p>{Math.max(1, Math.round(doc.size / 1000))} KB · {doc.content.slice(0, 96)}{doc.content.length > 96 ? '...' : ''}</p></div>
                  <button className="mini-icon" onClick={() => setDocuments((current) => current.filter((_, docIndex) => docIndex !== index))} title="Remove file"><X size={13} /></button>
                </div>
                <div className="document-controls">
                  <div>
                    <label className="field-label small-label" htmlFor={`profile-doc-access-${index}`}>Gemini access</label>
                    <select id={`profile-doc-access-${index}`} className="text-input compact-input" value={doc.access} onChange={(event) => updateDocument(index, 'access', event.target.value)}>
                      <option value="both">Both AI systems</option>
                      <option value="automation_ai">Automation AI only</option>
                      <option value="standalone_bot">Standalone bot only</option>
                    </select>
                  </div>
                </div>
              </div>
            )) : <div className="empty-upload">No text context files added yet.</div>}
          </div>
          <label className="field-label" htmlFor="profile-selling">Selling approach</label>
          <textarea id="profile-selling" className="big-textarea" rows="3" value={draft.sellingApproach} onChange={(event) => update('sellingApproach', event.target.value)} placeholder="How the copy should guide the reader toward action." />
          <label className="field-label" htmlFor="profile-triggers">Psychology triggers</label>
          <textarea id="profile-triggers" className="big-textarea" rows="3" value={draft.psychologyTriggers} onChange={(event) => update('psychologyTriggers', event.target.value)} placeholder="Scarcity, identity, proof, momentum, urgency, trust, clarity..." />
          <label className="field-label" htmlFor="profile-voice">Brand voice</label>
          <textarea id="profile-voice" className="big-textarea" rows="3" value={draft.brandVoice} onChange={(event) => update('brandVoice', event.target.value)} placeholder="Warm, premium, practical, punchy, luxury, playful..." />
          <div className="setup-card soft">
            <b>Bot-level Gemini fallback</b>
            <p>Use this when the subscriber messages outside the active automation path and you want Gemini to step in automatically.</p>
            <label className="toggle-row">
              <span>Enable standalone AI replies</span>
              <input type="checkbox" checked={draft.standaloneAiEnabled} onChange={(event) => update('standaloneAiEnabled', event.target.checked)} />
            </label>
            <div className="form-grid two-up">
              <div>
                <label className="field-label" htmlFor="profile-standalone-mode">Mode</label>
                <select id="profile-standalone-mode" className="text-input compact-input" value={draft.standaloneAiMode} onChange={(event) => update('standaloneAiMode', event.target.value)}>
                  <option value="sales">Sales assistant</option>
                  <option value="support">Support helper</option>
                  <option value="general">General guide</option>
                  <option value="custom">Custom mode</option>
                </select>
              </div>
              <div>
                <label className="field-label" htmlFor="profile-standalone-scope">Scope</label>
                <select id="profile-standalone-scope" className="text-input compact-input" value={draft.standaloneAiScope} onChange={(event) => update('standaloneAiScope', event.target.value)}>
                  <option value="outside_automation">Only outside automation</option>
                  <option value="handoff_anytime">Allow manual handoff anytime</option>
                </select>
              </div>
            </div>
            {draft.standaloneAiMode === 'custom' && (
              <>
                <label className="field-label" htmlFor="profile-standalone-custom-mode">Custom mode description</label>
                <textarea id="profile-standalone-custom-mode" className="big-textarea" rows="3" value={draft.standaloneAiCustomMode} onChange={(event) => update('standaloneAiCustomMode', event.target.value)} placeholder="For example: high-ticket closer, onboarding coach, wellness concierge, compliance-first support rep..." />
              </>
            )}
            <label className="field-label" htmlFor="profile-standalone-message">Handoff message</label>
            <textarea id="profile-standalone-message" className="big-textarea" rows="3" value={draft.standaloneAiHandoffMessage} onChange={(event) => update('standaloneAiHandoffMessage', event.target.value)} placeholder="What the subscriber sees when the bot hands them to Gemini." />
            <label className="field-label" htmlFor="profile-standalone-prompt">Assistant instructions</label>
            <textarea id="profile-standalone-prompt" className="big-textarea" rows="4" value={draft.standaloneAiPrompt} onChange={(event) => update('standaloneAiPrompt', event.target.value)} placeholder="Tell Gemini how to behave when it takes over outside the workflow." />
          </div>
        </div>
        <div className="modal-footer">
          {canDelete && <button className="disconnect-button" onClick={() => onDelete(profile.id)}>Delete profile</button>}
          <button className="cancel-button" onClick={onClose}>Cancel</button>
          <button
            className="connect-button"
            disabled={!draft.name.trim()}
            onClick={() => onSave({
              ...profile,
              name: draft.name.trim(),
              website: draft.website.trim(),
              audience: draft.audience.trim(),
              offerSummary: draft.offerSummary.trim(),
              products: textToLines(draft.products),
              promoLinks: textToLines(draft.promoLinks),
              promoItems: textToLines(draft.promoItems),
              mediaAssets,
              contextDocuments: documents.map(normalizeContextDocument),
              sellingApproach: draft.sellingApproach.trim(),
              psychologyTriggers: draft.psychologyTriggers.trim(),
              brandVoice: draft.brandVoice.trim(),
              standaloneAi: {
                enabled: Boolean(draft.standaloneAiEnabled),
                mode: draft.standaloneAiMode,
                customMode: draft.standaloneAiCustomMode.trim(),
                scope: draft.standaloneAiScope,
                handoffMessage: draft.standaloneAiHandoffMessage.trim(),
                assistantPrompt: draft.standaloneAiPrompt.trim(),
              },
            })}
          >
            Save profile
          </button>
        </div>
      </section>
    </div>
  );
}

function OnboardingModal({ profile, onSave, onClose }) {
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState({
    name: profile.name || '',
    website: profile.website || '',
    audience: profile.audience || '',
    offerSummary: profile.offerSummary || '',
    products: (profile.products || []).join('\n'),
    promoLinks: (profile.promoLinks || []).join('\n'),
    mediaLinks: (profile.mediaLinks || []).join('\n'),
    promoItems: (profile.promoItems || []).join('\n'),
    contextBullets: (profile.contextBullets || []).join('\n'),
    sellingApproach: profile.sellingApproach || '',
    psychologyTriggers: profile.psychologyTriggers || '',
    brandVoice: profile.brandVoice || '',
  });
  const [documents, setDocuments] = useState((profile.contextDocuments || []).map(normalizeContextDocument));
  const [mediaAssets, setMediaAssets] = useState(profile.mediaAssets || []);

  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));
  const updateDocument = (index, key, value) => {
    setDocuments((current) => current.map((doc, docIndex) => (docIndex === index ? { ...doc, [key]: value } : doc)));
  };

  const handleFiles = async (event) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md'));
    const loaded = await Promise.all(files.map(async (file) => normalizeContextDocument({
      name: file.name,
      size: file.size,
      content: await file.text(),
      access: 'both',
    })));
    setDocuments((current) => [...current, ...loaded]);
    event.target.value = '';
  };

  const handleMediaFiles = async (event) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('video/') || file.type.startsWith('image/') || file.type.startsWith('audio/'));
    const loaded = await Promise.all(files.map(async (file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
      kind: file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'image' : 'audio',
    })));
    setMediaAssets((current) => [...current, ...loaded]);
    event.target.value = '';
  };

  const save = (starterTemplate = '') => onSave({
    ...profile,
    name: draft.name.trim() || profile.name,
    website: draft.website.trim(),
    audience: draft.audience.trim(),
    offerSummary: draft.offerSummary.trim(),
    products: textToLines(draft.products),
    promoLinks: textToLines(draft.promoLinks),
    mediaLinks: textToLines(draft.mediaLinks),
    mediaAssets,
    promoItems: textToLines(draft.promoItems),
    contextBullets: textToLines(draft.contextBullets),
    contextDocuments: documents.map(normalizeContextDocument),
    sellingApproach: draft.sellingApproach.trim(),
    psychologyTriggers: draft.psychologyTriggers.trim(),
    brandVoice: draft.brandVoice.trim(),
    onboardingComplete: true,
    starterTemplate,
  });

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="integration-modal onboarding-modal" role="dialog" aria-modal="true" aria-labelledby="onboarding-title">
        <div className="modal-head">
          <div className="gemini-mark"><Upload size={19} /></div>
          <div><h2 id="onboarding-title">Profile onboarding</h2><p>Upload products, links, and context so the AI understands what this business sells.</p></div>
          <button className="icon-button" onClick={onClose} title="Close onboarding"><X size={18} /></button>
        </div>
        <div className="onboarding-progress">
          {['Business', 'Products', 'Context'].map((label, index) => <span key={label} className={index === step ? 'active' : index < step ? 'done' : ''}>{label}</span>)}
        </div>
        <div className="modal-body profile-form">
          {step === 0 && (
            <div className="form-stack">
              <div className="form-grid two-up">
                <div>
                  <label className="field-label" htmlFor="onboard-name">Profile name</label>
                  <input id="onboard-name" className="text-input" value={draft.name} onChange={(event) => update('name', event.target.value)} placeholder="Acme Studio" />
                </div>
                <div>
                  <label className="field-label" htmlFor="onboard-site">Primary site</label>
                  <input id="onboard-site" className="text-input" value={draft.website} onChange={(event) => update('website', event.target.value)} placeholder="https://yourbrand.com" />
                </div>
              </div>
              <label className="field-label" htmlFor="onboard-audience">Audience</label>
              <textarea id="onboard-audience" className="big-textarea" rows="4" value={draft.audience} onChange={(event) => update('audience', event.target.value)} placeholder="Who is this business selling to?" />
              <label className="field-label" htmlFor="onboard-offer">What you sell</label>
              <textarea id="onboard-offer" className="big-textarea" rows="4" value={draft.offerSummary} onChange={(event) => update('offerSummary', event.target.value)} placeholder="Offer summary, promise, and core value." />
            </div>
          )}
          {step === 1 && (
            <div className="form-stack">
              <div className="form-grid three-up">
                <div>
                  <label className="field-label" htmlFor="onboard-products">Products or services</label>
                  <textarea id="onboard-products" className="big-textarea" rows="6" value={draft.products} onChange={(event) => update('products', event.target.value)} placeholder={'One per line\nCourse\nConsulting\nMembership'} />
                </div>
                <div>
                  <label className="field-label" htmlFor="onboard-links">Promo or checkout links</label>
                  <textarea id="onboard-links" className="big-textarea" rows="6" value={draft.promoLinks} onChange={(event) => update('promoLinks', event.target.value)} placeholder={'One per line\nhttps://yourbrand.com/offer'} />
                </div>
                <div>
                  <label className="field-label" htmlFor="onboard-items">Promotional items</label>
                  <textarea id="onboard-items" className="big-textarea" rows="6" value={draft.promoItems} onChange={(event) => update('promoItems', event.target.value)} placeholder={'One per line\nBonus call\nDiscount\nLead magnet'} />
                </div>
              </div>
              <label className="field-label" htmlFor="onboard-media">YouTube or social links</label>
              <textarea id="onboard-media" className="big-textarea" rows="4" value={draft.mediaLinks} onChange={(event) => update('mediaLinks', event.target.value)} placeholder={'One per line\nhttps://youtube.com/...\nhttps://instagram.com/...'} />
              <div className="upload-panel">
                <div className="upload-copy">
                  <b>Upload media files</b>
                  <p>Add product videos, screenshots, audio clips, or testimonial assets so the AI knows what media exists for this business.</p>
                </div>
                <label className="upload-button">
                  <Play size={14} />
                  Add media files
                  <input type="file" accept="video/*,image/*,audio/*" multiple onChange={handleMediaFiles} />
                </label>
              </div>
              <div className="document-list">
                {mediaAssets.length > 0 ? mediaAssets.map((asset, index) => (
                  <div className="document-row" key={`${asset.name}-${index}`}>
                    <div><b>{asset.name}</b><p>{mediaAssetLabel(asset)}</p></div>
                    <button className="mini-icon" onClick={() => setMediaAssets((current) => current.filter((_, assetIndex) => assetIndex !== index))} title="Remove media"><X size={13} /></button>
                  </div>
                )) : <div className="empty-upload">No media files added yet.</div>}
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="form-stack">
              <label className="field-label" htmlFor="onboard-bullets">Bullet-point context</label>
              <textarea id="onboard-bullets" className="big-textarea" rows="5" value={draft.contextBullets} onChange={(event) => update('contextBullets', event.target.value)} placeholder={'One per line\nBig differentiator\nWhat buyers care about\nWhat tone to avoid'} />
              <div className="form-grid two-up">
                <div>
                  <label className="field-label" htmlFor="onboard-selling">Selling approach</label>
                  <textarea id="onboard-selling" className="big-textarea" rows="4" value={draft.sellingApproach} onChange={(event) => update('sellingApproach', event.target.value)} placeholder="How should the copy move people toward action?" />
                </div>
                <div>
                  <label className="field-label" htmlFor="onboard-triggers">Psychology triggers</label>
                  <textarea id="onboard-triggers" className="big-textarea" rows="4" value={draft.psychologyTriggers} onChange={(event) => update('psychologyTriggers', event.target.value)} placeholder="Urgency, proof, identity, simplicity..." />
                </div>
              </div>
              <label className="field-label" htmlFor="onboard-voice">Brand voice</label>
              <textarea id="onboard-voice" className="big-textarea" rows="3" value={draft.brandVoice} onChange={(event) => update('brandVoice', event.target.value)} placeholder="Warm, premium, direct, playful..." />
              <div className="upload-panel">
                <div className="upload-copy">
                  <b>Upload text files for context</b>
                  <p>Use `.txt` or `.md` files with product notes, positioning, bullet points, or offer explanations.</p>
                </div>
                <label className="upload-button">
                  <Upload size={14} />
                  Add text files
                  <input type="file" accept=".txt,.md,text/plain,text/markdown" multiple onChange={handleFiles} />
                </label>
              </div>
              <div className="document-list">
                {documents.length > 0 ? documents.map((doc, index) => (
                  <div className="document-row stacked" key={`${doc.name}-${index}`}>
                    <div className="document-row-main">
                      <div><b>{doc.name}</b><p>{Math.max(1, Math.round(doc.size / 1000))} KB · {doc.content.slice(0, 96)}{doc.content.length > 96 ? '...' : ''}</p></div>
                      <button className="mini-icon" onClick={() => setDocuments((current) => current.filter((_, docIndex) => docIndex !== index))} title="Remove file"><X size={13} /></button>
                    </div>
                    <div className="document-controls">
                      <div>
                        <label className="field-label small-label" htmlFor={`onboard-doc-access-${index}`}>Gemini access</label>
                        <select id={`onboard-doc-access-${index}`} className="text-input compact-input" value={doc.access} onChange={(event) => updateDocument(index, 'access', event.target.value)}>
                          <option value="both">Both AI systems</option>
                          <option value="automation_ai">Automation AI only</option>
                          <option value="standalone_bot">Standalone bot only</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )) : <div className="empty-upload">No text files added yet.</div>}
              </div>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button className="cancel-button" onClick={onClose}>Skip for now</button>
          {step > 0 && <button className="cancel-button" onClick={() => setStep(step - 1)}>Back</button>}
          {step < 2 ? (
            <button className="connect-button" disabled={step === 0 && !draft.name.trim()} onClick={() => setStep(step + 1)}>Next</button>
          ) : (
            <>
              <button className="cancel-button" disabled={!draft.name.trim()} onClick={() => save('nurture')}>Save + build nurture flow</button>
              <button className="connect-button" disabled={!draft.name.trim()} onClick={() => save('sales')}>Save + build starter flow</button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function IntegrationModal(props) {
  if (props.tab === 'onboarding') {
    return <OnboardingModal profile={props.profile} onSave={props.onSaveProfile} onClose={props.onClose} />;
  }
  if (props.tab === 'telegram') {
    return (
      <TelegramModal
        profileName={props.profile.name}
        currentToken={props.profile.telegram.botToken}
        currentWebhookUrl={props.profile.telegram.webhookUrl}
        currentSecretToken={props.profile.telegram.secretToken}
        currentBotInfo={props.profile.telegram.botInfo}
        profiles={props.profiles}
        linkedProfileId={props.profile.id}
        onChangeLinkedProfile={props.onChangeLinkedProfile}
        onSave={props.onSaveTelegram}
        onClose={props.onClose}
      />
    );
  }

  if (props.tab === 'profile') {
    return (
      <ProfileModal
        profile={props.profile}
        onSave={props.onSaveProfile}
        onDelete={props.onDeleteProfile}
        onClose={props.onClose}
        canDelete={props.canDeleteProfile}
      />
    );
  }

  return <GeminiModal profileName={props.profile.name} currentKey={props.profile.geminiKey} onSave={props.onSaveGemini} onClose={props.onClose} />;
}

function OverviewCard({ title, value, note }) {
  return (
    <article className="overview-card">
      <b>{title}</b>
      <strong>{value}</strong>
      <p>{note}</p>
    </article>
  );
}

function StatTile({ label, value, note, trend }) {
  return (
    <article className="stat-tile">
      <div className="stat-label-row">
        <b>{label}</b>
        {trend && <span className={`trend-pill ${trend.startsWith('+') ? 'up' : 'down'}`}>{trend}</span>}
      </div>
      <strong>{value}</strong>
      <p>{note}</p>
    </article>
  );
}

function ListCard({ title, items, icon: Icon }) {
  return (
    <section className="detail-card">
      <div className="detail-card-head">
        <b>{title}</b>
        {Icon && <Icon size={14} />}
      </div>
      <div className="detail-list">
        {items.map((item, index) => <div className="detail-list-row" key={`${title}-${index}`}>{item}</div>)}
      </div>
    </section>
  );
}

function subscriberMetrics(profile) {
  const sim = simulationMetrics(profile);
  const total = sim.total;
  const active = sim.active;
  const conversions = sim.conversions;
  const replyRate = total > 0 ? `${Math.round((sim.replies / total) * 100)}%` : '0%';
  return {
    total: total.toLocaleString(),
    active: active.toLocaleString(),
    newLeads: sim.newLeads,
    conversions,
    replyRate,
  };
}

function analyticsMetrics(profile) {
  const sim = simulationMetrics(profile);
  const base = sim.total || 0;
  const viewRate = base > 0 ? `${Math.round((sim.active / base) * 100)}%` : '0%';
  const clickRate = base > 0 ? `${Math.round((sim.clicks / base) * 100)}%` : '0%';
  const salesRate = base > 0 ? `${Math.round((sim.conversions / base) * 100)}%` : '0%';
  const topTrigger = profile.psychologyTriggers ? profile.psychologyTriggers.split(',')[0].trim() : 'Clarity';
  return { viewRate, clickRate, salesRate, topTrigger };
}

function mediaAssetLabel(asset) {
  const kind = asset.kind || 'media';
  const size = asset.size ? `${Math.max(1, Math.round(asset.size / 1000))} KB` : '';
  return `${kind[0].toUpperCase()}${kind.slice(1)} · ${asset.name}${size ? ` · ${size}` : ''}`;
}

function automationAnalyticsRows(profile) {
  const sim = simulationMetrics(profile);
  const total = Math.max(sim.total, 1);
  const automationCount = Math.max(profile.automations.length, 1);
  return profile.automations.map((automation, index) => {
    const weight = automation.createdWith === 'gemini' ? 1.15 : automation.createdWith === 'template' ? 1.05 : 0.95;
    const subscribers = Math.max(1, Math.round((total / automationCount) * weight));
    const clicks = Math.min(subscribers, Math.round((sim.clicks / automationCount) * weight));
    const conversions = Math.min(clicks || subscribers, Math.round((sim.conversions / automationCount) * weight));
    const replyRate = `${Math.max(8, Math.round((sim.replies || subscribers) / (subscribers || 1) * 100))}%`;
    return {
      id: automation.id,
      name: automation.name,
      kind: automationKindLabel(automation),
      preview: automationPreview(automation),
      subscribers,
      replyRate,
      clicks,
      conversions,
      active: profile.activeAutomationId === automation.id,
      index,
    };
  });
}

function stepAnalyticsRows(profile, automation) {
  if (!automation) return [];
  const sim = simulationMetrics(profile);
  const steps = automation.nodes || [];
  const total = Math.max(sim.total, 1);
  return steps.map((node, index) => {
    const dropoff = Math.max(0.3, 1 - (index * 0.11));
    const reached = Math.max(1, Math.round(total * dropoff));
    const engaged = node.data.kind === 'message'
      ? Math.max(0, Math.round(reached * 0.42))
      : node.data.kind === 'ai'
        ? Math.max(0, Math.round(reached * 0.58))
        : node.data.kind === 'condition'
          ? Math.max(0, Math.round(reached * 0.36))
          : Math.max(0, Math.round(reached * 0.24));
    const clickShare = node.data.kind === 'message' ? Math.max(0, Math.round((sim.clicks || 0) * dropoff)) : 0;
    return {
      id: node.id,
      title: node.data.title,
      kind: nodeMeta[node.data.kind]?.label || node.data.kind,
      reached,
      engaged,
      clickShare,
      note: node.data.goal || node.data.aiMode || node.data.waitMode || node.data.conditionMode || 'Flow step',
    };
  });
}

function broadcastRows(profile) {
  return [
    { name: 'Launch follow-up', audience: 'Warm leads', goal: 'Book calls', status: 'Scheduled' },
    { name: `${profile.name} social proof push`, audience: 'Recent replies', goal: 'Drive clicks', status: 'Draft' },
    { name: 'Offer reminder', audience: 'Clicked but not bought', goal: 'Recover sales', status: 'Queued' },
  ];
}

function subscriberSegments(profile) {
  return [
    `New leads from ${profile.products[0] || 'main offer'}`,
    'Clicked offer link but did not convert',
    'Highly engaged readers from recent broadcasts',
    'Requested details or pricing',
  ];
}

function activityItems(profile) {
  return [
    `Updated ${profile.name} profile strategy and offer positioning`,
    `${profile.telegram.botInfo?.username ? `Validated @${profile.telegram.botInfo.username}` : 'Telegram bot still needs validation'}`,
    `${profile.standaloneAi.enabled ? `Standalone Gemini replies enabled in ${standaloneModeLabel(profile.standaloneAi)} mode` : 'Standalone Gemini replies are currently off'}`,
    `${profile.products.length} product lines available for AI-assisted promotion`,
    `${profile.promoLinks.length} promotional links ready for message insertion`,
  ];
}

function supportItems(profile) {
  return [
    `Best next step for ${profile.name}: tighten the selling approach and psychology triggers before scaling broadcasts.`,
    profile.standaloneAi.enabled
      ? 'Standalone Gemini fallback is on, so outside-of-flow messages can still get a helpful response.'
      : 'If subscribers often go off-script, turn on standalone Gemini fallback so the bot can still reply intelligently.',
    'Telegram bots can only message people who started the bot or are reachable in a valid chat context.',
    'Use one profile per business if you want clean billing, bot separation, and brand-specific copy rules.',
  ];
}

function WorkspacePage({ active, profile, profiles, profilesCount, onOpenSettings, onOpenTelegram, onSelectProfile, geminiConnected, telegramConnected, onSaveProfilePatch }) {
  const subscribers = subscriberMetrics(profile);
  const analytics = analyticsMetrics(profile);
  const automationAnalytics = automationAnalyticsRows(profile);
  const activeAutomation = profile.automations.find((automation) => automation.id === profile.activeAutomationId) || profile.automations[0];
  const stepAnalytics = stepAnalyticsRows(profile, activeAutomation);
  const liveReady = liveAutomationReady(profile);
  const sim = simulationMetrics(profile);
  const hasMeasuredData = sim.total > 0 || sim.replies > 0 || sim.clicks > 0 || sim.conversions > 0;

  const addContextFiles = async (event) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md'));
    if (!files.length) return;
    const loaded = await Promise.all(files.map(async (file) => normalizeContextDocument({
      name: file.name,
      size: file.size,
      content: await file.text(),
      access: 'both',
    })));
    onSaveProfilePatch({
      contextDocuments: [...profile.contextDocuments, ...loaded],
      onboardingComplete: true,
    });
    event.target.value = '';
  };

  const addMediaFiles = async (event) => {
    const files = Array.from(event.target.files || []).filter((file) => file.type.startsWith('video/') || file.type.startsWith('image/') || file.type.startsWith('audio/'));
    if (!files.length) return;
    const loaded = files.map((file) => ({
      name: file.name,
      size: file.size,
      type: file.type,
      kind: file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'image' : 'audio',
    }));
    onSaveProfilePatch({
      mediaAssets: [...profile.mediaAssets, ...loaded],
      onboardingComplete: true,
    });
    event.target.value = '';
  };

  const updateDocumentAccess = (index, access) => {
    onSaveProfilePatch({
      contextDocuments: profile.contextDocuments.map((doc, docIndex) => (
        docIndex === index ? normalizeContextDocument({ ...doc, access }) : normalizeContextDocument(doc)
      )),
    });
  };

  const removeContextDocument = (index) => {
    onSaveProfilePatch({
      contextDocuments: profile.contextDocuments.filter((_, docIndex) => docIndex !== index),
    });
  };

  const removeMediaAsset = (index) => {
    onSaveProfilePatch({
      mediaAssets: profile.mediaAssets.filter((_, mediaIndex) => mediaIndex !== index),
    });
  };

  if (active === 'Overview') {
    return (
      <div className="workspace-grid">
        <SectionPanel
          title={`${profile.name} overview`}
          copy="A compact summary of profile health, audience movement, and sales-readiness for this business."
          action={<button className="secondary-action" onClick={() => onOpenSettings('profile')}><PencilLine size={14} /> Edit profile</button>}
        >
          {!liveReady && (
            <div className="honesty-callout">
              <div><b>Prototype data mode</b><p>This profile is not receiving live Telegram events yet. Connect a public webhook or use the Telegram test simulator to populate real numbers inside this prototype.</p></div>
              <button className="secondary-action" onClick={() => onOpenTelegram()}><Bot size={14} /> Open Telegram setup</button>
            </div>
          )}
          <div className="overview-grid">
            <OverviewCard title="Profiles" value={`${profilesCount}`} note="Charge and manage each business separately." />
            <OverviewCard title="Context readiness" value={contextReadiness(profile)} note="The AI gets stronger when this profile is filled out." />
            <OverviewCard title="Gemini writer" value={geminiConnected ? 'Connected' : 'Optional'} note="Per-profile key for drafting messages." />
            <OverviewCard title="Telegram bot" value={telegramConnected ? 'Connected' : 'Needs setup'} note="Each profile can run its own bot and webhook." />
          </div>
          {!profile.onboardingComplete && (
            <div className="onboarding-callout">
              <div><b>Finish onboarding</b><p>Add products, YouTube or social links, text files, and bullet-point context so the AI can write smarter copy for this business.</p></div>
              <button className="primary-action" onClick={() => onOpenSettings('onboarding')}><Upload size={14} /> Start onboarding</button>
            </div>
          )}
          <div className="analytics-strip">
            <StatTile label="Total subscribers" value={subscribers.total} note={hasMeasuredData ? 'Measured from simulated or live bot events.' : 'No tracked subscriber events yet.'} />
            <StatTile label="Active readers" value={subscribers.active} note={hasMeasuredData ? 'Contacts with recent engagement or open activity.' : 'Waiting for first events.'} />
            <StatTile label="Click rate" value={analytics.clickRate} note={hasMeasuredData ? 'Calculated from tracked CTA clicks.' : 'No CTA click data yet.'} />
            <StatTile label="Sales conversion" value={analytics.salesRate} note={hasMeasuredData ? 'Calculated from tracked conversions.' : 'No conversion data yet.'} />
          </div>
          <div className="profile-brief">
            <div className="setup-card">
              <b>Business summary</b>
              <p>{profile.audience || 'Add your target audience to sharpen campaign and subscriber segmentation.'}</p>
              <p>{profile.offerSummary || 'Add what this business sells so AI posts can stay aligned to the actual offer.'}</p>
            </div>
            <div className="setup-card">
              <b>Psychology and voice</b>
              <p>{profile.psychologyTriggers || 'Define the triggers you want the copy to use.'}</p>
              <p>{profile.brandVoice || 'Set the tone so messages feel like the right brand.'}</p>
            </div>
          </div>
          <div className="detail-grid">
            <ListCard title="Products in rotation" icon={Package} items={profile.products.length ? profile.products : ['No products added yet']} />
            <ListCard title="Promotional links" icon={Link2} items={profile.promoLinks.length ? profile.promoLinks : ['No promotional links added yet']} />
            <ListCard title="Media and social context" icon={Play} items={profile.mediaLinks.length ? profile.mediaLinks : ['No YouTube or social links added yet']} />
            <ListCard title="Uploaded media assets" icon={Upload} items={profile.mediaAssets.length ? profile.mediaAssets.map(mediaAssetLabel) : ['No media files uploaded yet']} />
            <ListCard title="Business objective" icon={Target} items={[profile.sellingApproach || 'Define the sales objective and path to action for this profile.']} />
          </div>
        </SectionPanel>
      </div>
    );
  }

  if (active === 'Telegram bot') {
    return (
      <div className="workspace-grid">
        <SectionPanel
          title={`${profile.name} Telegram connection`}
          copy="This profile's bot token controls sending and receiving messages for this business."
          action={<button className="primary-action" onClick={() => onOpenSettings('telegram')}><KeyRound size={14} /> Open setup</button>}
        >
          <div className="telegram-setup">
            <div className="setup-column">
              <div className="setup-card">
                <b>What this profile needs</b>
                <ul>
                  <li>Its own bot token from BotFather.</li>
                  <li>A public webhook URL for incoming updates.</li>
                  <li>A user who has already started the bot.</li>
                </ul>
              </div>
              <div className="setup-card">
                <b>Current status</b>
                <p>{telegramConnected ? `Connected${profile.telegram.botInfo?.username ? ` as @${profile.telegram.botInfo.username}` : ''}` : 'Not connected yet.'}</p>
                <p>{profile.telegram.webhookUrl ? 'Webhook saved locally.' : 'Webhook URL still needs to be configured.'}</p>
              </div>
              <div className="setup-card soft">
                <b>Live event note</b>
                <p>Telegram bots usually respond to `/start` in a private bot chat, not in a Telegram channel. Inside this prototype, replies and analytics only update automatically after a public webhook is connected.</p>
              </div>
              <div className="setup-card">
                <b>Standalone Gemini replies</b>
                <p>{profile.standaloneAi.enabled ? `On in ${standaloneModeLabel(profile.standaloneAi)} mode.` : 'Off right now.'}</p>
                <p>{profile.standaloneAi.scope === 'handoff_anytime' ? 'Gemini can be used as a broader bot handoff layer.' : 'Gemini only steps in when messages fall outside the active automation.'}</p>
                <p>{profile.standaloneAi.handoffMessage}</p>
              </div>
              <div className="setup-card">
                <b>Linked profile</b>
                <p>This Telegram bot connection currently belongs to <strong>{profile.name}</strong>.</p>
                <p>Use the setup modal if you want to switch the target profile before saving a different bot.</p>
              </div>
            </div>
            <div className="setup-card soft">
              <b>Why separate profiles matter</b>
              <p>Each business can keep its own bot identity, offers, and copy rules. That makes billing, context, and delivery cleaner when one account runs multiple brands.</p>
            </div>
          </div>
          <div className="detail-grid single">
            <section className="setup-card simulator-card">
              <b>Telegram test simulator</b>
              <p>Use this while the webhook is not live. It simulates a subscriber starting the bot, replying, clicking a CTA, or converting so your workflow and dashboards show believable behavior.</p>
              <div className="simulator-actions">
                <button className="secondary-action" onClick={() => window.dispatchEvent(new CustomEvent('teleflow-simulate-event', { detail: { type: 'start' } }))}><Play size={14} /> Simulate /start</button>
                <button className="secondary-action" onClick={() => window.dispatchEvent(new CustomEvent('teleflow-simulate-event', { detail: { type: 'reply' } }))}><MessageCircleMore size={14} /> Simulate reply</button>
                <button className="secondary-action" onClick={() => window.dispatchEvent(new CustomEvent('teleflow-simulate-event', { detail: { type: 'click' } }))}><MousePointerClick size={14} /> Simulate CTA click</button>
                <button className="secondary-action" onClick={() => window.dispatchEvent(new CustomEvent('teleflow-simulate-event', { detail: { type: 'convert' } }))}><Target size={14} /> Simulate conversion</button>
              </div>
              <p className="simulator-meta">{sim.lastEventAt ? `Last simulated event: ${sim.lastEventAt}` : 'No simulated events yet.'}</p>
            </section>
          </div>
          <div className="detail-grid single">
            <section className="table-card">
              <div className="table-head">
                <b>Profile to bot map</b>
                <span>{profiles.length} profiles</span>
              </div>
              <div className="campaign-table">
                {profiles.map((linkedProfile) => (
                  <div className="campaign-row bot-map-row" key={linkedProfile.id}>
                    <strong>{linkedProfile.name}</strong>
                    <span>{linkedProfile.telegram.botInfo?.username ? `@${linkedProfile.telegram.botInfo.username}` : 'No bot connected'}</span>
                    <span>{linkedProfile.telegram.webhookUrl ? 'Webhook saved' : 'No webhook yet'}</span>
                    <button className="secondary-action" onClick={() => { onSelectProfile(linkedProfile.id); onOpenTelegram(); }}>Manage link</button>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </SectionPanel>
      </div>
    );
  }

  if (active === 'Files') {
    return (
      <div className="workspace-grid">
        <SectionPanel
          title={`${profile.name} context files`}
          copy="Upload the source files Gemini should use for business context, messaging guidance, and media awareness."
          action={<button className="secondary-action" onClick={() => onOpenSettings('onboarding')}><Upload size={14} /> Open full onboarding</button>}
        >
          <div className="overview-grid">
            <OverviewCard title="Text context files" value={`${profile.contextDocuments.length}`} note="Used to teach Gemini the offer, positioning, and internal notes." />
            <OverviewCard title="Media assets" value={`${profile.mediaAssets.length}`} note="Images, videos, and audio available to reference in messaging." />
            <OverviewCard title="Gemini access modes" value="3" note="Each file can be shared with automation AI, the standalone bot, or both." />
            <OverviewCard title="Profile status" value={profile.onboardingComplete ? 'Ready' : 'Needs context'} note="More source material usually means stronger outputs." />
          </div>
          <div className="detail-grid">
            <section className="setup-card">
              <b>Upload text files</b>
              <p>Add `.txt` or `.md` notes, offer docs, positioning docs, bullet points, FAQs, or internal copy references.</p>
              <label className="upload-button">
                <Upload size={14} />
                Add text context
                <input type="file" accept=".txt,.md,text/plain,text/markdown" multiple onChange={addContextFiles} />
              </label>
            </section>
            <section className="setup-card">
              <b>Upload media files</b>
              <p>Add product videos, screenshots, testimonials, images, or audio so the business profile has stronger creative context.</p>
              <label className="upload-button">
                <Play size={14} />
                Add media files
                <input type="file" accept="video/*,image/*,audio/*" multiple onChange={addMediaFiles} />
              </label>
            </section>
            <section className="setup-card soft">
              <b>How context works</b>
              <p>These files are not public downloads. They are internal context for Gemini so the bot writes with better awareness of what this business sells and how it should sound.</p>
              <p>Use the Gemini access selector on each text file to decide which AI systems can use it.</p>
            </section>
          </div>
          <div className="detail-grid single">
            <section className="table-card">
              <div className="table-head">
                <b>Text context library</b>
                <span>{profile.contextDocuments.length} files</span>
              </div>
              <div className="document-list table-pad">
                {profile.contextDocuments.length > 0 ? profile.contextDocuments.map((doc, index) => (
                  <div className="document-row stacked" key={`${doc.name}-${index}`}>
                    <div className="document-row-main">
                      <div>
                        <b>{doc.name}</b>
                        <p>{Math.max(1, Math.round(doc.size / 1000))} KB · {doc.content.slice(0, 140)}{doc.content.length > 140 ? '...' : ''}</p>
                      </div>
                      <button className="mini-icon" onClick={() => removeContextDocument(index)} title="Remove file"><X size={13} /></button>
                    </div>
                    <div className="document-controls">
                      <div>
                        <label className="field-label small-label" htmlFor={`files-doc-access-${index}`}>Gemini access</label>
                        <select id={`files-doc-access-${index}`} className="text-input compact-input" value={doc.access || 'both'} onChange={(event) => updateDocumentAccess(index, event.target.value)}>
                          <option value="both">Both AI systems</option>
                          <option value="automation_ai">Automation AI only</option>
                          <option value="standalone_bot">Standalone bot only</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )) : <div className="empty-upload">No text context files uploaded yet.</div>}
              </div>
            </section>
          </div>
          <div className="detail-grid single">
            <section className="table-card">
              <div className="table-head">
                <b>Media context library</b>
                <span>{profile.mediaAssets.length} assets</span>
              </div>
              <div className="document-list table-pad">
                {profile.mediaAssets.length > 0 ? profile.mediaAssets.map((asset, index) => (
                  <div className="document-row" key={`${asset.name}-${index}`}>
                    <div><b>{asset.name}</b><p>{mediaAssetLabel(asset)}</p></div>
                    <button className="mini-icon" onClick={() => removeMediaAsset(index)} title="Remove media"><X size={13} /></button>
                  </div>
                )) : <div className="empty-upload">No media assets uploaded yet.</div>}
              </div>
            </section>
          </div>
        </SectionPanel>
      </div>
    );
  }

  if (active === 'Broadcasts' || active === 'Subscribers' || active === 'Analytics' || active === 'Activity log' || active === 'Help center') {
    if (active === 'Subscribers') {
      return (
        <div className="workspace-grid">
          <SectionPanel
            title={`${profile.name} subscribers`}
            copy="A profile-specific view of audience size, engagement, and the segments your workflow can act on."
            action={<button className="secondary-action" onClick={() => onOpenSettings('profile')}><Users size={14} /> Edit audience context</button>}
          >
            <div className="analytics-strip">
              <StatTile label="Total subscribers" value={subscribers.total} note="Tracked from simulated or live bot starts." />
              <StatTile label="New this week" value={`${subscribers.newLeads}`} note="New starts recorded for this profile." />
              <StatTile label="Reply rate" value={subscribers.replyRate} note="Based on tracked reply events." />
              <StatTile label="Conversions" value={`${subscribers.conversions}`} note="Based on tracked conversion events." />
            </div>
            <div className="detail-grid">
              <ListCard title="Core segments" icon={Users} items={subscriberSegments(profile)} />
              <ListCard title="Highest-intent signals" icon={Target} items={['Clicked pricing or checkout link', 'Asked a question about the offer', 'Came back after a reminder', 'Consumed social proof and clicked again']} />
              <ListCard title="Profile guidance" icon={BriefcaseBusiness} items={[profile.audience || 'Add audience notes to improve segmentation and message relevance.', ...(profile.contextBullets.length ? profile.contextBullets.slice(0, 2) : [])]} />
            </div>
          </SectionPanel>
        </div>
      );
    }

    if (active === 'Analytics') {
      return (
        <div className="workspace-grid">
          <SectionPanel
            title={`${profile.name} analytics`}
            copy="A simple top-layer view of message performance, click behavior, and what kind of persuasion is landing."
            action={<button className="secondary-action" onClick={() => onOpenSettings('profile')}><Target size={14} /> Refine selling strategy</button>}
          >
            <div className="analytics-strip">
              <StatTile label="View rate" value={analytics.viewRate} note="Calculated from tracked engaged readers." />
              <StatTile label="Offer clicks" value={analytics.clickRate} note="Measured CTA clicks from tracked events." />
              <StatTile label="Sales rate" value={analytics.salesRate} note="Measured conversion rate from tracked events." />
              <StatTile label="Top trigger" value={analytics.topTrigger} note="The first persuasion angle currently defined in the profile." />
            </div>
            <div className="detail-grid">
              <ListCard title="What is working" icon={BarChart3} items={['Clear offer framing beats vague curiosity hooks', 'Short CTA lines are easier to act on in Telegram', `Readers respond best when copy sounds ${profile.brandVoice || 'on-brand and specific'}`]} />
              <ListCard title="Optimization ideas" icon={Sparkles} items={['Test a stronger social-proof message', 'Create one path for warm clicks and one for cold readers', 'Add urgency only where the offer truly supports it']} />
              <ListCard title="Strategy alignment" icon={Target} items={[profile.sellingApproach || 'Add a selling approach so analytics can tie back to a clear business objective.', ...(profile.contextDocuments.length ? profile.contextDocuments.slice(0, 2).map((doc) => `${doc.name} (${contextAccessLabel(doc.access)}): ${doc.content.slice(0, 80)}${doc.content.length > 80 ? '...' : ''}`) : [])]} />
            </div>
            <div className="detail-grid single">
              <section className="table-card">
                <div className="table-head">
                  <b>Automation performance</b>
                  <span>{automationAnalytics.length} automations</span>
                </div>
                <div className="campaign-table">
                  {automationAnalytics.map((row) => (
                    <div className="campaign-row analytics-row" key={row.id}>
                      <strong>{row.name}</strong>
                      <span>{row.kind}</span>
                      <span>{row.preview}</span>
                      <span>{row.subscribers} reached</span>
                      <span>{row.replyRate} reply rate</span>
                      <em>{row.active ? 'Open' : `${row.conversions} conversions`}</em>
                    </div>
                  ))}
                </div>
              </section>
            </div>
            <div className="detail-grid single">
              <section className="table-card">
                <div className="table-head">
                  <b>Step analytics for {activeAutomation?.name || 'current automation'}</b>
                  <span>{stepAnalytics.length} steps</span>
                </div>
                <div className="campaign-table">
                  {stepAnalytics.map((row) => (
                    <div className="campaign-row analytics-row step-row" key={row.id}>
                      <strong>{row.title}</strong>
                      <span>{row.kind}</span>
                      <span>{row.reached} reached</span>
                      <span>{row.engaged} engaged</span>
                      <span>{row.clickShare} clicks</span>
                      <em>{row.note}</em>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </SectionPanel>
        </div>
      );
    }

    if (active === 'Broadcasts') {
      return (
        <div className="workspace-grid">
          <SectionPanel
            title={`${profile.name} broadcasts`}
            copy="A lightweight campaign board for the promotional messages this business wants to send."
            action={<button className="secondary-action" onClick={() => onOpenTelegram()}><Bot size={14} /> Telegram setup</button>}
          >
            <div className="table-card">
              <div className="table-head">
                <b>Campaign queue</b>
                <span>{broadcastRows(profile).length} items</span>
              </div>
              <div className="campaign-table">
                {broadcastRows(profile).map((row) => (
                  <div className="campaign-row" key={row.name}>
                    <strong>{row.name}</strong>
                    <span>{row.audience}</span>
                    <span>{row.goal}</span>
                    <em>{row.status}</em>
                  </div>
                ))}
              </div>
            </div>
            <div className="detail-grid">
              <ListCard title="Promo assets" icon={Package} items={profile.promoItems.length ? profile.promoItems : ['Add bonuses, lead magnets, or promotional items for this profile.']} />
              <ListCard title="Linked destinations" icon={Link2} items={profile.promoLinks.length ? profile.promoLinks : ['Add promotional URLs so broadcasts can send readers somewhere useful.']} />
              <ListCard title="Content sources" icon={FileText} items={profile.contextDocuments.length ? profile.contextDocuments.map((doc) => `${doc.name} · ${contextAccessLabel(doc.access)}`) : ['No text files uploaded yet']} />
              <ListCard title="Media assets" icon={Play} items={profile.mediaAssets.length ? profile.mediaAssets.map(mediaAssetLabel) : ['No videos, images, or audio uploaded yet']} />
              <ListCard title="Copy angle" icon={PencilLine} items={[profile.sellingApproach || 'Define how broadcasts should move readers toward the offer.']} />
            </div>
          </SectionPanel>
        </div>
      );
    }

    if (active === 'Activity log') {
      return (
        <div className="workspace-grid">
          <SectionPanel
            title={`${profile.name} activity log`}
            copy="Recent business-profile changes and operational notes that affect copy, campaigns, and delivery."
            action={<button className="secondary-action" onClick={() => onOpenSettings('profile')}><PencilLine size={14} /> Update profile</button>}
          >
            <div className="activity-feed">
              {activityItems(profile).map((item, index) => (
                <div className="activity-item" key={`${item}-${index}`}>
                  <span className="activity-dot" />
                  <div>
                    <b>{item}</b>
                    <p>{['Just now', '12 minutes ago', 'Today at 11:20 AM', 'Yesterday'][index] || 'Recently'}</p>
                  </div>
                </div>
              ))}
            </div>
          </SectionPanel>
        </div>
      );
    }

    return (
      <div className="workspace-grid">
        <SectionPanel
          title={`${profile.name} help center`}
          copy="A short operational guide grounded in how this profile is configured right now."
          action={<button className="secondary-action" onClick={() => onOpenSettings('profile')}><BriefcaseBusiness size={14} /> Review profile</button>}
        >
          <div className="detail-grid single">
            <ListCard title="Recommended next steps" icon={CircleHelp} items={supportItems(profile)} />
          </div>
        </SectionPanel>
      </div>
    );
  }

  return (
    <div className="workspace-grid">
      <SectionPanel
        title={profile.name}
        copy="Switch profiles from the sidebar to move between different businesses."
        action={<button className="secondary-action" onClick={() => onOpenSettings('gemini')}><Sparkles size={14} /> Gemini setup</button>}
      >
        <div className="placeholder-grid">
          <div className="placeholder-card">
            <b>Automations live here</b>
            <p>This workflow now belongs to {profile.name}, including its bot connection and AI writing context.</p>
          </div>
          <div className="placeholder-card muted">
            <b>Profile pricing logic</b>
            <p>Each profile can map cleanly to a separate subscription, workspace seat, or usage bucket.</p>
          </div>
        </div>
      </SectionPanel>
    </div>
  );
}

function ContextRail({ active, profile, geminiConnected, telegramConnected, onOpenSettings }) {
  if (active === 'Telegram bot') {
    return (
      <aside className="inspector context-rail">
        <div className="panel-title">
          <div><b>{profile.name}</b><p>Telegram setup</p></div>
        </div>
        <div className="rail-card">
          <b>Connection status</b>
          <p>{telegramConnected ? `Connected${profile.telegram.botInfo?.username ? ` as @${profile.telegram.botInfo.username}` : ''}` : 'Not connected'}</p>
        </div>
        <div className="rail-card">
          <b>Webhook</b>
          <p>{profile.telegram.webhookUrl ? 'Saved locally' : 'Not configured'}</p>
        </div>
        <div className="rail-card">
          <b>Next action</b>
          <button className="secondary-action full" onClick={() => onOpenSettings('telegram')}><Bot size={14} /> Open Telegram settings</button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="inspector context-rail">
      <div className="panel-title">
        <div><b>{profile.name}</b><p>{active}</p></div>
      </div>
      <div className="rail-card">
        <b>AI context</b>
        <p>{profile.offerSummary || 'Add offer context so Gemini writes like it understands the business.'}</p>
      </div>
      <div className="rail-card">
        <b>Gemini</b>
        <p>{geminiConnected ? 'Connected and ready for profile-specific drafts.' : 'Optional helper for writing flow messages.'}</p>
      </div>
      <div className="rail-card">
        <b>Telegram</b>
        <p>{telegramConnected ? 'Profile bot token saved.' : 'Connect a bot token to send live messages.'}</p>
      </div>
      <div className="rail-card">
        <button className="secondary-action full" onClick={() => onOpenSettings('profile')}><BriefcaseBusiness size={14} /> Edit profile</button>
      </div>
    </aside>
  );
}

function NodeLibrary({ onAdd, onClose }) {
  const [openGroup, setOpenGroup] = useState('Core');
  const groups = {
    Core: [
      { kind: 'trigger', label: 'Trigger', copy: 'Start from a Telegram event' },
      { kind: 'message', label: 'Message', copy: 'Send text and buttons' },
      { kind: 'ai', label: 'AI assistant', copy: 'Let people chat with Gemini', preset: { title: 'AI assistant handoff', description: 'You are now chatting with our AI guide. Ask anything and I will help based on this business profile.', aiMode: 'general', assistantPrompt: 'Answer clearly, stay on-brand, and guide the subscriber toward the most relevant next step.' } },
      { kind: 'action', label: 'Action', copy: 'Tag, note, or notify' },
    ],
    FollowUp: [
      { kind: 'message', label: 'Follow-up CTA', copy: 'Direct next-step message', preset: { title: 'Follow-up CTA', description: 'Bring the subscriber back to the offer with a clear call to action.', buttons: ['See details'], tone: 'direct', goal: 'Drive clicks' } },
      { kind: 'message', label: 'Reminder', copy: 'Short reminder message', preset: { title: 'Reminder', description: 'Gently remind the subscriber about the offer and the next step.', buttons: ['Open offer'], tone: 'practical', goal: 'Build trust' } },
      { kind: 'action', label: 'Tag lead', copy: 'Mark interest or intent', preset: { title: 'Apply lead tag', description: 'Mark this subscriber based on what they did.', actionType: 'tag', actionValue: 'Warm lead' } },
    ],
    Logic: [
      { kind: 'wait', label: 'Wait', copy: 'Pause until they respond' },
      { kind: 'condition', label: 'Condition', copy: 'Branch using rules' },
      { kind: 'randomizer', label: 'Randomizer', copy: 'Split contacts by percentage' },
      { kind: 'delay', label: 'Delay', copy: 'Pause for an amount of time' },
    ],
    Conversion: [
      { kind: 'message', label: 'Pricing push', copy: 'Move to pricing', preset: { title: 'Pricing push', description: 'Show the offer clearly and invite them to view pricing.', buttons: ['See pricing'], tone: 'direct', goal: 'Drive clicks' } },
      { kind: 'condition', label: 'Intent check', copy: 'Separate warm vs cold interest', preset: { title: 'Intent check', description: 'Route people based on pricing questions or purchase signals.', conditionMode: 'text_match', branches: ['High intent', 'Needs context'], conditions: [{ field: 'reply_text', operator: 'contains', value: 'price' }] } },
      { kind: 'message', label: 'Social proof', copy: 'Share proof before CTA', preset: { title: 'Social proof', description: 'Share one proof point, then point them to the next step.', buttons: ['Show me'], tone: 'premium', goal: 'Educate' } },
    ],
  };

  return (
    <div className="node-library">
      <div className="panel-title">
        <div><b>Add a step</b><p>Choose what happens next</p></div>
        <button className="icon-button" onClick={onClose} title="Close"><X size={18} /></button>
      </div>
      <div className="library-search"><Search size={16} /><input placeholder="Search steps" /></div>
      <div className="library-sections">
        {Object.entries(groups).map(([group, ids]) => (
          <div className="library-section" key={group}>
            <button className="library-section-head" onClick={() => setOpenGroup(openGroup === group ? '' : group)}>
              <span>{group}</span>
              <ChevronDown size={15} className={openGroup === group ? 'rotated' : ''} />
            </button>
            {openGroup === group && (
              <div className="library-grid">
                {ids.map((item) => {
                  const meta = nodeMeta[item.kind];
                  const Icon = meta.icon;
                  return (
                    <button key={`${group}-${item.label}`} onClick={() => onAdd(item)}>
                      <span className={`node-icon tone-${meta.tone}`}><Icon size={17} /></span>
                      <span>
                        <b>{item.label}</b>
                        <small>{item.copy || fieldCopy(item.kind)}</small>
                      </span>
                      <Plus size={16} />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AutomationGeneratorModal({ profile, onGenerate, onClose, generating, error }) {
  const [name, setName] = useState(`${profile.name} AI automation`);
  const [goal, setGoal] = useState('Turn new subscribers into qualified leads');
  const [prompt, setPrompt] = useState('Create a Telegram automation that welcomes new subscribers, segments them by intent, nurtures them with useful copy, and moves warm leads toward the main offer.');

  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="integration-modal profile-modal" role="dialog" aria-modal="true" aria-labelledby="automation-generator-title">
        <div className="modal-head">
          <div className="gemini-mark"><Sparkles size={19} /></div>
          <div><h2 id="automation-generator-title">Generate automation with Gemini</h2><p>Use onboarding context plus your prompt to draft a full workflow for this profile.</p></div>
          <button className="icon-button" onClick={onClose} title="Close generator"><X size={18} /></button>
        </div>
        <div className="modal-body profile-form">
          <div className="integration-state">
            <span><BriefcaseBusiness size={18} /></span>
            <div><b>{profile.name}</b><p>{profile.offerSummary || 'Add more profile context for stronger AI-generated workflows.'}</p></div>
            <em className={profile.geminiKey ? 'connected' : ''}>{profile.geminiKey ? 'Gemini ready' : 'Needs key'}</em>
          </div>
          <label className="field-label" htmlFor="automation-name">Automation name</label>
          <input id="automation-name" className="text-input" value={name} onChange={(event) => setName(event.target.value)} placeholder="Spring launch nurture flow" />
          <label className="field-label" htmlFor="automation-goal">Business objective</label>
          <textarea id="automation-goal" className="big-textarea" rows="3" value={goal} onChange={(event) => setGoal(event.target.value)} placeholder="What should this automation achieve?" />
          <label className="field-label" htmlFor="automation-prompt">Workflow prompt</label>
          <textarea id="automation-prompt" className="big-textarea" rows="7" value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="Describe the sequence, tone, branches, timing, and CTA strategy you want." />
          {error && <p className="inline-error">{error}</p>}
        </div>
        <div className="modal-footer">
          <button className="cancel-button" onClick={onClose}>Cancel</button>
          <button className="connect-button" disabled={!profile.geminiKey || !name.trim() || !prompt.trim() || generating} onClick={() => onGenerate({ name: name.trim(), goal: goal.trim(), prompt: prompt.trim() })}>
            {generating ? 'Generating...' : 'Generate automation'}
          </button>
        </div>
      </section>
    </div>
  );
}

function AIOperatorModal({ profile, selectedNode, activeAutomation, messages, input, onInputChange, onSend, onClose, running, onQuickAction }) {
  return (
    <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="integration-modal operator-modal" role="dialog" aria-modal="true" aria-labelledby="operator-title">
        <div className="modal-head">
          <div className="gemini-mark"><Bot size={19} /></div>
          <div><h2 id="operator-title">AI operator</h2><p>Gemini can create workflows, edit the selected step, and update profile strategy from chat.</p></div>
          <button className="icon-button" onClick={onClose} title="Close operator"><X size={18} /></button>
        </div>
        <div className="modal-body operator-body">
          <div className="operator-context">
            <div className="operator-context-card">
              <b>{profile.name}</b>
              <p>{profile.offerSummary || 'Add more offer context for sharper operator decisions.'}</p>
            </div>
            <div className="operator-context-card">
              <b>Active automation</b>
              <p>{activeAutomation?.name || 'No automation selected'}</p>
            </div>
            <div className="operator-context-card">
              <b>Selected step</b>
              <p>{selectedNode ? `${selectedNode.data.title} (${selectedNode.data.kind})` : 'No step selected'}</p>
            </div>
          </div>
          <div className="operator-quick-actions">
            <button className="secondary-action" onClick={() => onQuickAction('Build a new welcome automation that qualifies leads and moves warm ones to a direct CTA.')}>Build workflow</button>
            <button className="secondary-action" onClick={() => onQuickAction('Rewrite the selected message to feel more premium and concise.')}>Rewrite selected step</button>
            <button className="secondary-action" onClick={() => onQuickAction('Review this profile and suggest one stronger selling approach, then update it.')}>Tighten strategy</button>
          </div>
          <div className="operator-thread">
            {messages.map((message) => (
              <div key={message.id} className={`operator-message ${message.role}`}>
                <span className="operator-role">{message.role === 'assistant' ? 'Operator' : 'You'}</span>
                <p>{message.text}</p>
                {message.applied?.length ? <small>Applied: {message.applied.join(', ')}</small> : null}
              </div>
            ))}
          </div>
          <div className="operator-compose">
            <textarea
              rows="4"
              value={input}
              onChange={(event) => onInputChange(event.target.value)}
              placeholder="Tell the operator what to do. Example: create a nurture automation, add a delay after the welcome message, and rewrite the CTA."
            />
            <div className="operator-compose-row">
              <span>{selectedNode ? 'Selected step context included' : 'Using automation-level context'}</span>
              <button className="connect-button" disabled={running || !input.trim()} onClick={onSend}>
                {running ? 'Working...' : 'Run operator'}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function Inspector({ node, onChange, onDelete, onDuplicate, onClose, geminiConnected, onOpenGemini, onGenerate, profile }) {
  const [aiOpen, setAiOpen] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('Write a warm, concise welcome message that asks what the subscriber needs help with.');
  const [aiDraft, setAiDraft] = useState('');
  const [aiError, setAiError] = useState('');
  const [generating, setGenerating] = useState(false);

  const generateMessage = async () => {
    setGenerating(true);
    setAiError('');
    try {
      setAiDraft(await onGenerate(aiPrompt, node.data.description));
    } catch (error) {
      setAiError(error.message || 'Gemini could not generate a message.');
    } finally {
      setGenerating(false);
    }
  };

  if (!node) {
    return <aside className="inspector empty-inspector"><span><MousePointerClick size={23} /></span><b>Select a step</b><p>Click a workflow step to edit its message, timing, and rules.</p></aside>;
  }

  const meta = nodeMeta[node.data.kind];
  const Icon = meta.icon;
  const conditions = node.data.conditions || [];

  return (
    <aside className="inspector">
      <div className="panel-title">
        <div className="selection-title"><span className={`node-icon tone-${meta.tone}`}><Icon size={17} /></span><div><b>{meta.label}</b><p>{profile.name} step settings</p></div></div>
        <button className="icon-button" title="Close inspector" onClick={onClose}><X size={18} /></button>
      </div>
      <div className="form-section">
        <label>Step name</label>
        <input value={node.data.title} onChange={(event) => onChange({ title: event.target.value })} />
      </div>
      <div className="form-section">
        <label>Step objective</label>
        <select className="text-input compact-input" value={node.data.goal || ''} onChange={(event) => onChange({ goal: event.target.value })}>
          <option value="">Choose an objective</option>
          <option>Open the conversation</option>
          <option>Build trust</option>
          <option>Educate</option>
          <option>Drive clicks</option>
          <option>Drive replies</option>
          <option>Convert</option>
        </select>
      </div>
      {node.data.kind === 'message' && (
        <div className={`ai-writer ${aiOpen ? 'is-open' : ''}`}>
          <button className="ai-writer-head" onClick={() => setAiOpen(!aiOpen)}>
            <span><Sparkles size={15} /></span><div><b>Write with Gemini</b><small>{profile.name} context loaded</small></div>
            {geminiConnected && <em>Connected</em>}<ChevronDown size={15} />
          </button>
          {aiOpen && (
            <div className="ai-writer-body">
              <div className="profile-context-banner">
                <b>{profile.name}</b>
                <p>{profile.offerSummary || 'Add profile strategy to give Gemini stronger message context.'}</p>
              </div>
              {!geminiConnected ? (
                <div className="connect-ai"><p>Connect this profile's Gemini key to generate or rewrite the message.</p><button onClick={onOpenGemini}><KeyRound size={14} /> Connect Gemini</button></div>
              ) : (
                <>
                  <label>What should Gemini write?</label>
                  <textarea rows="3" value={aiPrompt} onChange={(event) => setAiPrompt(event.target.value)} />
                  <div className="tone-options"><button onClick={() => setAiPrompt(`${aiPrompt} Keep the tone friendly.`)}>Friendly</button><button onClick={() => setAiPrompt(`${aiPrompt} Keep it short.`)}>Shorter</button><button onClick={() => setAiPrompt(`${aiPrompt} Make it more persuasive.`)}>Persuasive</button><button onClick={() => setAiPrompt(`Write three variations for this ${node.data.goal || 'message'} in a ${node.data.tone || 'warm'} tone.`)}>3 variants</button></div>
                  <button className="generate-button" disabled={generating || !aiPrompt.trim()} onClick={generateMessage}>{generating ? <LoaderCircle className="spin" size={15} /> : <Sparkles size={15} />}{generating ? 'Writing...' : 'Generate message'}</button>
                  {aiError && <p className="ai-error">{aiError}</p>}
                  {aiDraft && <div className="ai-result"><p>{aiDraft}</p><div><button onClick={() => setAiDraft('')}>Discard</button><button onClick={() => { onChange({ description: aiDraft }); setAiDraft(''); }}>Use this message</button></div></div>}
                </>
              )}
            </div>
          )}
        </div>
      )}
      {node.data.kind === 'ai' && (
        <div className="form-section">
          <label>AI conversation mode</label>
          <select className="text-input compact-input" value={node.data.aiMode || 'general'} onChange={(event) => onChange({ aiMode: event.target.value })}>
            <option value="general">General guide</option>
            <option value="sales">Sales assistant</option>
            <option value="support">Support helper</option>
            <option value="qualification">Lead qualification</option>
          </select>
          <label className="field-label" htmlFor="ai-knowledge-mode">Context source</label>
          <select id="ai-knowledge-mode" className="text-input compact-input" value={node.data.aiKnowledgeMode || 'profile_only'} onChange={(event) => onChange({ aiKnowledgeMode: event.target.value })}>
            <option value="profile_only">Business profile only</option>
            <option value="profile_and_docs">Profile plus uploaded docs</option>
            <option value="profile_docs_links">Profile, docs, and promo links</option>
          </select>
          <label className="field-label" htmlFor="ai-system-prompt">Assistant instructions</label>
          <textarea
            id="ai-system-prompt"
            rows="5"
            value={node.data.assistantPrompt || ''}
            onChange={(event) => onChange({ assistantPrompt: event.target.value })}
            placeholder="Tell Gemini how to speak, what to prioritize, what to avoid, and how to guide the subscriber."
          />
        </div>
      )}
      <div className="form-section">
        <div className="label-row"><label>{node.data.kind === 'message' ? 'Message' : node.data.kind === 'ai' ? 'Handoff message' : 'Description'}</label>{node.data.kind === 'message' && <button>{'{ }'} Variables</button>}</div>
        <textarea rows="6" value={node.data.description} onChange={(event) => onChange({ description: event.target.value })} />
        {node.data.kind === 'message' && <span className="char-count">{node.data.description.length} / 4,096</span>}
      </div>
      {node.data.kind === 'message' && (
        <div className="form-section">
          <label>Tone preset</label>
          <div className="chip-row">
            {['warm', 'direct', 'curious', 'premium', 'practical'].map((tone) => (
              <button key={tone} className={`tone-chip ${node.data.tone === tone ? 'active' : ''}`} onClick={() => onChange({ tone })}>{tone}</button>
            ))}
          </div>
        </div>
      )}
      {node.data.kind === 'message' && (
        <div className="form-section">
          <label>Buttons</label>
          {(node.data.buttons || []).map((button, index) => (
            <div className="button-input" key={`${button}-${index}`}>
              <MousePointerClick size={15} />
              <input value={button} onChange={(event) => { const buttons = [...node.data.buttons]; buttons[index] = event.target.value; onChange({ buttons }); }} />
              <button title="Remove button" onClick={() => onChange({ buttons: node.data.buttons.filter((_, buttonIndex) => buttonIndex !== index) })}><X size={14} /></button>
            </div>
          ))}
          <button className="add-inline" onClick={() => onChange({ buttons: [...(node.data.buttons || []), 'New button'] })}><Plus size={15} /> Add button</button>
        </div>
      )}
      {node.data.kind === 'trigger' && (
        <div className="form-section">
          <label>Trigger event</label>
          <select className="text-input compact-input" value={node.data.triggerEvent || 'bot_start'} onChange={(event) => onChange({ triggerEvent: event.target.value })}>
            <option value="bot_start">Bot start</option>
            <option value="button_click">Button click</option>
            <option value="tag_applied">Tag applied</option>
          </select>
        </div>
      )}
      {node.data.kind === 'wait' && (
        <div className="form-section">
          <label>Wait until</label>
          <select className="text-input compact-input" value={node.data.waitMode || 'any_reply'} onChange={(event) => onChange({ waitMode: event.target.value })}>
            <option value="any_reply">Any reply</option>
            <option value="button_click">Specific button click</option>
            <option value="keyword">Keyword match</option>
          </select>
          <div className="inline-grid">
            <input value={node.data.timeoutValue || 24} onChange={(event) => onChange({ timeoutValue: Number(event.target.value) || 1, timeout: `${Number(event.target.value) || 1} ${node.data.timeoutUnit || 'hours'}` })} />
            <select value={node.data.timeoutUnit || 'hours'} onChange={(event) => onChange({ timeoutUnit: event.target.value, timeout: `${node.data.timeoutValue || 24} ${event.target.value}` })}>
              <option value="minutes">minutes</option>
              <option value="hours">hours</option>
              <option value="days">days</option>
            </select>
          </div>
        </div>
      )}
      {node.data.kind === 'delay' && (
        <div className="form-section">
          <label>Delay length</label>
          <div className="inline-grid">
            <input value={node.data.delayValue || 10} onChange={(event) => onChange({ delayValue: Number(event.target.value) || 1 })} />
            <select value={node.data.delayUnit || 'minutes'} onChange={(event) => onChange({ delayUnit: event.target.value })}>
              <option value="minutes">minutes</option>
              <option value="hours">hours</option>
              <option value="days">days</option>
            </select>
          </div>
        </div>
      )}
      {node.data.kind === 'randomizer' && (
        <div className="form-section">
          <label>Distribution</label>
          <div className="split-control">
            <span>A</span>
            <input
              type="range"
              min="10"
              max="90"
              value={node.data.splitPercent || 50}
              onChange={(event) => {
                const splitPercent = Number(event.target.value);
                onChange({ splitPercent, branches: [`A ${splitPercent}%`, `B ${100 - splitPercent}%`] });
              }}
            />
            <span>B</span>
          </div>
          <div className="split-values"><b>{node.data.splitPercent || 50}%</b><b>{100 - (node.data.splitPercent || 50)}%</b></div>
        </div>
      )}
      {node.data.kind === 'condition' && (
        <div className="form-section">
          <label>Routing logic</label>
          <select className="text-input compact-input" value={node.data.conditionMode || 'text_match'} onChange={(event) => onChange({ conditionMode: event.target.value })}>
            <option value="text_match">Reply text match</option>
            <option value="button">Button clicked</option>
            <option value="tag">Tag exists</option>
          </select>
          <div className="condition-list">
            {conditions.map((condition, index) => (
              <div className="condition-row" key={`${condition.field}-${index}`}>
                <select value={condition.field || 'reply_text'} onChange={(event) => onChange({ conditions: conditions.map((item, itemIndex) => itemIndex === index ? { ...item, field: event.target.value } : item) })}>
                  <option value="reply_text">Reply text</option>
                  <option value="button">Button</option>
                  <option value="tag">Tag</option>
                </select>
                <select value={condition.operator || 'contains'} onChange={(event) => onChange({ conditions: conditions.map((item, itemIndex) => itemIndex === index ? { ...item, operator: event.target.value } : item) })}>
                  <option value="contains">contains</option>
                  <option value="equals">equals</option>
                  <option value="starts_with">starts with</option>
                </select>
                <input value={condition.value || ''} onChange={(event) => onChange({ conditions: conditions.map((item, itemIndex) => itemIndex === index ? { ...item, value: event.target.value } : item) })} placeholder="Value" />
              </div>
            ))}
          </div>
          <button className="add-inline" onClick={() => onChange({ conditions: [...conditions, { field: 'reply_text', operator: 'contains', value: '' }], branches: [...(node.data.branches || ['Yes', 'No']), `Rule ${conditions.length + 1}`] })}><Plus size={15} /> Add rule</button>
        </div>
      )}
      {node.data.kind === 'action' && (
        <div className="form-section">
          <label>Action</label>
          <select className="text-input compact-input" value={node.data.actionType || 'tag'} onChange={(event) => onChange({ actionType: event.target.value })}>
            <option value="tag">Apply tag</option>
            <option value="note">Add note</option>
            <option value="notify">Internal notify</option>
          </select>
          <input value={node.data.actionValue || ''} onChange={(event) => onChange({ actionValue: event.target.value })} placeholder="Interested lead" />
        </div>
      )}
      <div className="form-section advanced">
        <button onClick={() => setAdvancedOpen(!advancedOpen)}><Settings size={15} /> Advanced settings <ChevronDown size={15} className={advancedOpen ? 'rotated' : ''} /></button>
        {advancedOpen && (
          <div className="advanced-fields">
            <label>Internal note</label>
            <textarea rows="3" value={node.data.internalNote || ''} onChange={(event) => onChange({ internalNote: event.target.value })} placeholder="How the team should think about this step." />
            <label>Preview status</label>
            <select className="text-input compact-input" value={node.data.status || 'draft'} onChange={(event) => onChange({ status: event.target.value })}>
              <option value="draft">Draft</option>
              <option value="live">Live</option>
              <option value="paused">Paused</option>
            </select>
          </div>
        )}
      </div>
      <div className="inspector-footer"><button className="delete-button" onClick={onDelete}>Delete step</button><button className="test-button" onClick={onDuplicate}><Copy size={14} /> Duplicate</button><button className="done-button" onClick={onClose}>Done</button></div>
    </aside>
  );
}

function App() {
  const [active, setActive] = useState('Automations');
  const [settingsTab, setSettingsTab] = useState('profile');
  const [profiles, setProfiles] = useState(readProfiles);
  const [activeProfileId, setActiveProfileId] = useState(() => sessionStorage.getItem('teleflow_active_profile') || readProfiles()[0].id);
  const [nodes, setNodes, onNodesChange] = useNodesState(baseNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(baseEdges);
  const [selectedId, setSelectedId] = useState(null);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [published, setPublished] = useState(true);
  const [toast, setToast] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState(null);
  const [templateMenuOpen, setTemplateMenuOpen] = useState(false);
  const [savedTemplates, setSavedTemplates] = useState(readSavedTemplates);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [generatingAutomation, setGeneratingAutomation] = useState(false);
  const [automationGeneratorError, setAutomationGeneratorError] = useState('');
  const [operatorOpen, setOperatorOpen] = useState(false);
  const [operatorInput, setOperatorInput] = useState('');
  const [operatorRunning, setOperatorRunning] = useState(false);

  const activeProfile = useMemo(() => profiles.find((profile) => profile.id === activeProfileId) || profiles[0], [profiles, activeProfileId]);
  const activeAutomation = useMemo(
    () => activeProfile?.automations?.find((automation) => automation.id === activeProfile.activeAutomationId) || activeProfile?.automations?.[0] || null,
    [activeProfile],
  );
  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedId), [nodes, selectedId]);
  const renderedEdges = useMemo(() => decorateEdges(nodes, edges), [nodes, edges]);
  const geminiConnected = Boolean(activeProfile?.geminiKey);
  const telegramConnected = Boolean(activeProfile?.telegram.botToken);

  const patchActiveProfile = useCallback((patch) => {
    setProfiles((current) => current.map((profile) => (
      profile.id === activeProfileId ? { ...profile, ...patch } : profile
    )));
  }, [activeProfileId]);

  const replaceActiveProfile = useCallback((transform) => {
    setProfiles((current) => current.map((profile) => (
      profile.id === activeProfileId ? transform(profile) : profile
    )));
  }, [activeProfileId]);

  const replaceActiveAutomation = useCallback((transform) => {
    if (!activeAutomation) return;
    setProfiles((current) => current.map((profile) => (
      profile.id === activeProfileId
        ? {
            ...profile,
            automations: profile.automations.map((automation) => (
              automation.id === activeAutomation.id ? transform(automation) : automation
            )),
          }
        : profile
    )));
  }, [activeAutomation, activeProfileId]);

  const onConnect = useCallback((params) => setEdges((current) => addEdge({ ...params, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } }, current)), [setEdges]);

  const updateNode = useCallback((changes) => setNodes((current) => current.map((node) => node.id === selectedId ? { ...node, data: { ...node.data, ...changes } } : node)), [selectedId, setNodes]);

  const duplicateSelected = useCallback(() => {
    if (!selectedId) return;
    const original = nodes.find((node) => node.id === selectedId);
    if (!original) return;
    const copyId = `${original.data.kind}-${Date.now()}`;
    const duplicated = {
      ...original,
      id: copyId,
      position: { x: original.position.x + 48, y: original.position.y + 48 },
      data: cloneNodes([{ ...original }])[0].data,
    };
    setNodes((current) => [...current, duplicated]);
    setSelectedId(copyId);
    showToast(`${original.data.title} duplicated`);
  }, [nodes, selectedId, setNodes]);

  const addNode = useCallback((input) => {
    const item = typeof input === 'string' ? { kind: input } : input;
    const kind = item.kind;
    const id = `${kind}-${Date.now()}`;
    const count = nodes.length;
    const defaults = {
      kind,
      title: kind === 'message' ? 'New message' : nodeMeta[kind].label,
      description: kind === 'message' ? 'Write your Telegram message here.' : `Configure this ${nodeMeta[kind].label.toLowerCase()} step.`,
      ...(kind === 'trigger' ? { triggerEvent: 'bot_start' } : {}),
      ...(kind === 'message' ? { buttons: [], tone: 'warm', goal: 'Start the conversation' } : {}),
      ...(kind === 'ai' ? { aiMode: 'general', assistantPrompt: 'Answer clearly, stay on-brand, and use the business profile context.', aiKnowledgeMode: 'profile_only', goal: 'Drive replies' } : {}),
      ...(kind === 'wait' ? { waitMode: 'any_reply', timeoutValue: 24, timeoutUnit: 'hours', timeout: '24 hours' } : {}),
      ...(kind === 'delay' ? { delayValue: 10, delayUnit: 'minutes' } : {}),
      ...(kind === 'randomizer' ? { splitPercent: 50, branches: ['A 50%', 'B 50%'] } : {}),
      ...(kind === 'condition' ? { conditionMode: 'text_match', branches: ['Yes', 'No'], conditions: [{ field: 'reply_text', operator: 'contains', value: '' }] } : {}),
      ...(kind === 'action' ? { actionType: 'tag', actionValue: 'Interested' } : {}),
      ...(item.preset || {}),
    };
    setNodes((current) => [...current, { id, type: 'workflow', position: { x: 760 + (count % 3) * 290, y: 140 + (count % 4) * 170 }, data: defaults }]);
    setSelectedId(id);
    setLibraryOpen(false);
  }, [nodes.length, setNodes]);

  const removeSelected = useCallback(() => {
    setNodes((current) => current.filter((node) => node.id !== selectedId));
    setEdges((current) => current.filter((edge) => edge.source !== selectedId && edge.target !== selectedId));
    setSelectedId(null);
  }, [selectedId, setEdges, setNodes]);

  const showToast = (message) => { setToast(message); window.setTimeout(() => setToast(''), 2600); };

  useEffect(() => {
    sessionStorage.setItem('teleflow_profiles', JSON.stringify(profiles));
  }, [profiles]);

  useEffect(() => {
    if (activeProfileId) sessionStorage.setItem('teleflow_active_profile', activeProfileId);
  }, [activeProfileId]);

  useEffect(() => {
    localStorage.setItem('teleflow_saved_templates', JSON.stringify(savedTemplates));
  }, [savedTemplates]);

  useEffect(() => {
    const handleSimulation = (event) => {
      const type = event.detail?.type;
      if (!type) return;
      const now = new Date().toLocaleString();
      replaceActiveProfile((profile) => {
        const currentSimulation = profile.telegram?.simulation || { subscribers: [], replies: 0, clicks: 0, conversions: 0, lastEventAt: '' };
        const subscribers = [...(currentSimulation.subscribers || [])];

        if (type === 'start') {
          subscribers.unshift({
            id: `sub-${Date.now()}`,
            source: 'simulated',
            status: 'active',
            startedAt: now,
          });
        }

        return {
          ...profile,
          telegram: {
            ...profile.telegram,
            simulation: {
              subscribers,
              replies: currentSimulation.replies + (type === 'reply' ? 1 : 0),
              clicks: currentSimulation.clicks + (type === 'click' ? 1 : 0),
              conversions: currentSimulation.conversions + (type === 'convert' ? 1 : 0),
              lastEventAt: now,
            },
          },
        };
      });
      showToast(`Simulated Telegram ${type}`);
    };

    window.addEventListener('teleflow-simulate-event', handleSimulation);
    return () => window.removeEventListener('teleflow-simulate-event', handleSimulation);
  }, [replaceActiveProfile]);

  useEffect(() => {
    if (!activeAutomation) return;
    setNodes(cloneNodes(activeAutomation.nodes));
    setEdges(cloneEdges(activeAutomation.edges));
    setSelectedId(null);
  }, [activeAutomation?.id, setEdges, setNodes]);

  useEffect(() => {
    if (!activeProfile || !activeAutomation) return;
    setProfiles((current) => current.map((profile) => (
      profile.id === activeProfile.id
        ? {
            ...profile,
            automations: profile.automations.map((automation) => (
              automation.id === activeAutomation.id
                ? { ...automation, nodes: cloneNodes(nodes), edges: cloneEdges(edges), selectedId }
                : automation
            )),
          }
        : profile
    )));
  }, [nodes, edges, selectedId, activeProfile?.id, activeAutomation?.id]);

  const updateOperatorMessages = (transform) => {
    replaceActiveProfile((profile) => ({
      ...profile,
      operatorMessages: transform(profile.operatorMessages || []),
    }));
  };

  const appendOperatorMessage = (message) => {
    updateOperatorMessages((messages) => [...messages, message]);
  };

  const openSettings = (tab, profileId = activeProfileId) => {
    setEditingProfileId(profileId);
    setSettingsTab(tab);
    setSettingsOpen(true);
  };

  const createNewProfile = () => {
    const nextId = `profile-${Date.now()}`;
    const nextProfile = createProfile(nextId, `Business ${profiles.length + 1}`);
    setProfiles((current) => [...current, nextProfile]);
    setActiveProfileId(nextId);
    setEditingProfileId(nextId);
    setSettingsTab('onboarding');
    setSettingsOpen(true);
    showToast('New profile created');
  };

  const createAutomationForProfile = (automationInput) => {
    const automationId = `automation-${Date.now()}`;
    const automation = createAutomation(automationId, automationInput.name || `Automation ${activeProfile.automations.length + 1}`, {
      ...automationInput,
      id: automationId,
      nodes: cloneNodes(automationInput.nodes?.length ? automationInput.nodes : baseNodes),
      edges: cloneEdges(automationInput.edges?.length ? automationInput.edges : baseEdges),
      selectedId: automationInput.selectedId || automationInput.nodes?.[0]?.id || 'message-1',
    });
    replaceActiveProfile((profile) => ({
      ...profile,
      automations: [...profile.automations, automation],
      activeAutomationId: automation.id,
    }));
    setNodes(cloneNodes(automation.nodes));
    setEdges(cloneEdges(automation.edges));
    setSelectedId(automation.selectedId);
    setActive('Automations');
    return automation;
  };

  const duplicateActiveAutomation = () => {
    if (!activeAutomation) return;
    createAutomationForProfile({
      ...activeAutomation,
      name: `${activeAutomation.name} copy`,
      nodes: cloneNodes(activeAutomation.nodes),
      edges: cloneEdges(activeAutomation.edges),
      selectedId: activeAutomation.selectedId,
      createdWith: 'manual',
    });
    showToast(`${activeAutomation.name} duplicated`);
  };

  const saveCurrentAutomationAsTemplate = () => {
    if (!activeAutomation) return;
    const suggested = `${activeAutomation.name} template`;
    const name = window.prompt('Template name', suggested)?.trim();
    if (!name) return;
    const nextTemplate = {
      id: `template-${Date.now()}`,
      name,
      sourceProfileName: activeProfile.name,
      createdAt: new Date().toLocaleDateString(),
      prompt: activeAutomation.prompt || '',
      nodes: cloneNodes(nodes),
      edges: cloneEdges(edges),
      selectedId: selectedId || activeAutomation.selectedId || nodes[0]?.id || null,
    };
    setSavedTemplates((current) => [nextTemplate, ...current]);
    setTemplateMenuOpen(false);
    showToast(`${name} saved as template`);
  };

  const addStepAfterAnchor = useCallback((anchorId, spec = {}) => {
    const anchor = nodes.find((node) => node.id === anchorId) || selectedNode || nodes[nodes.length - 1];
    const kind = spec.kind || 'message';
    const id = `${kind}-${Date.now()}`;
    const newNode = {
      id,
      type: 'workflow',
      position: anchor ? { x: anchor.position.x + 320, y: anchor.position.y } : { x: 340, y: 140 },
      data: {
        kind,
        title: spec.title || (kind === 'message' ? 'New message' : nodeMeta[kind].label),
        description: spec.description || (kind === 'message' ? 'Write your Telegram message here.' : `Configure this ${nodeMeta[kind].label.toLowerCase()} step.`),
        goal: spec.goal || '',
        tone: spec.tone || (kind === 'message' ? 'warm' : undefined),
        buttons: Array.isArray(spec.buttons) ? spec.buttons : (kind === 'message' ? [] : undefined),
        aiMode: kind === 'ai' ? (spec.aiMode || 'general') : undefined,
        assistantPrompt: kind === 'ai' ? (spec.assistantPrompt || 'Answer clearly, stay on-brand, and use the business profile context.') : undefined,
        aiKnowledgeMode: kind === 'ai' ? (spec.aiKnowledgeMode || 'profile_only') : undefined,
        triggerEvent: kind === 'trigger' ? (spec.triggerEvent || 'bot_start') : undefined,
        waitMode: kind === 'wait' ? (spec.waitMode || 'any_reply') : undefined,
        timeoutValue: kind === 'wait' ? (spec.timeoutValue || 24) : undefined,
        timeoutUnit: kind === 'wait' ? (spec.timeoutUnit || 'hours') : undefined,
        timeout: kind === 'wait' ? `${spec.timeoutValue || 24} ${spec.timeoutUnit || 'hours'}` : undefined,
        delayValue: kind === 'delay' ? (spec.delayValue || 10) : undefined,
        delayUnit: kind === 'delay' ? (spec.delayUnit || 'minutes') : undefined,
        conditionMode: kind === 'condition' ? (spec.conditionMode || 'text_match') : undefined,
        branches: kind === 'condition'
          ? (spec.branches || ['Yes', 'No'])
          : kind === 'randomizer'
            ? (spec.branches || ['A 50%', 'B 50%'])
            : undefined,
        conditions: kind === 'condition' ? (spec.conditions || [{ field: 'reply_text', operator: 'contains', value: '' }]) : undefined,
        actionType: kind === 'action' ? (spec.actionType || 'tag') : undefined,
        actionValue: kind === 'action' ? (spec.actionValue || 'Interested') : undefined,
      },
    };

    setNodes((current) => [...current, newNode]);
    if (anchor) {
      setEdges((current) => [...current, {
        id: `edge-${Date.now()}`,
        source: anchor.id,
        target: id,
        sourceHandle: spec.sourceHandle,
        type: 'smoothstep',
        markerEnd: { type: MarkerType.ArrowClosed, width: 15, height: 15, color: '#87909f' },
        style: { stroke: '#aab2bf', strokeWidth: 2 },
      }]);
    }
    setSelectedId(id);
    return newNode;
  }, [nodes, selectedNode, setEdges, setNodes]);

  const addStepAfterCurrentSelection = (spec) => addStepAfterAnchor(selectedNode?.id, spec);

  useEffect(() => {
    const handleQuickAdd = (event) => {
      const detail = event.detail || {};
      const anchorKind = detail.anchorKind;
      const quickSpec = anchorKind === 'condition'
        ? { kind: 'message', title: `${detail.branchLabel || 'Branch'} follow-up`, description: `Continue the ${detail.branchLabel || 'selected'} path with a clear next step.`, buttons: ['Continue'], tone: 'direct', goal: 'Drive replies', sourceHandle: detail.sourceHandle }
        : anchorKind === 'wait'
          ? { kind: 'condition', title: 'Reply decision', description: 'Route based on what the subscriber sent back.', conditionMode: 'text_match', branches: ['Interested', 'Need more help'], conditions: [{ field: 'reply_text', operator: 'contains', value: 'price' }] }
          : anchorKind === 'message'
            ? { kind: 'ai', title: 'AI assistant handoff', description: 'If they want a back-and-forth conversation, let the AI continue from here.', aiMode: 'general', assistantPrompt: 'Answer clearly, stay on-brand, and guide the subscriber toward the most relevant next step.' }
          : anchorKind === 'delay'
            ? { kind: 'message', title: 'Timed follow-up', description: 'Follow up after the pause with a focused next step.', buttons: ['Show me'], tone: 'practical', goal: 'Build trust' }
            : { kind: 'message', title: 'Next message', description: 'Continue the automation with the next message in the sequence.', buttons: ['Continue'], tone: 'warm', goal: 'Open the conversation' };
      addStepAfterAnchor(detail.anchorId, quickSpec);
    };

    window.addEventListener('teleflow-quick-add', handleQuickAdd);
    return () => window.removeEventListener('teleflow-quick-add', handleQuickAdd);
  }, [addStepAfterAnchor]);

  const selectAutomation = (automationId) => {
    replaceActiveProfile((profile) => ({ ...profile, activeAutomationId: automationId }));
    setTemplateMenuOpen(false);
  };

  const deleteProfile = (profileId) => {
    if (profiles.length <= 1) {
      showToast('You need at least one profile');
      return;
    }

    const targetProfile = profiles.find((profile) => profile.id === profileId);
    if (!targetProfile) return;

    const confirmed = window.confirm(`Delete "${targetProfile.name}"? This removes its workflow, context, and integrations from this session.`);
    if (!confirmed) return;

    const nextProfiles = profiles.filter((profile) => profile.id !== profileId);
    setProfiles(nextProfiles);

    if (activeProfileId === profileId) {
      setActiveProfileId(nextProfiles[0].id);
    }

    if (editingProfileId === profileId) {
      setSettingsOpen(false);
      setEditingProfileId(null);
    }

    showToast(`${targetProfile.name} deleted`);
  };

  const saveGeminiKey = (key) => {
    replaceActiveProfile((profile) => ({ ...profile, geminiKey: key }));
    setSettingsOpen(false);
    showToast(key ? `${activeProfile.name} Gemini connected` : `${activeProfile.name} Gemini disconnected`);
  };

  const saveTelegramConnection = async ({ botToken, webhookUrl, secretToken, botInfo }) => {
    if (!botToken) {
      replaceActiveProfile((profile) => ({ ...profile, telegram: { botToken: '', webhookUrl: '', secretToken: '', botInfo: null } }));
      setSettingsOpen(false);
      showToast(`${activeProfile.name} Telegram disconnected`);
      return;
    }

    const validationResponse = await fetch('/api/telegram/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botToken }),
    });
    const validationPayload = await validationResponse.json();
    if (!validationResponse.ok) throw new Error(validationPayload.error || 'Telegram validation failed.');

    if (webhookUrl) {
      const webhookResponse = await fetch('/api/telegram/set-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ botToken, webhookUrl, secretToken }),
      });
      const webhookPayload = await webhookResponse.json();
      if (!webhookResponse.ok) throw new Error(webhookPayload.error || 'Telegram webhook setup failed.');
    }

    const nextBot = botInfo || validationPayload.bot || null;
    replaceActiveProfile((profile) => ({
      ...profile,
      telegram: {
        botToken,
        webhookUrl,
        secretToken,
        botInfo: nextBot,
      },
    }));
    setSettingsOpen(false);
    showToast(`Telegram connected for ${activeProfile.name}${validationPayload.bot?.username ? ` as @${validationPayload.bot.username}` : ''}`);
  };

  const applyStarterTemplate = (template) => {
    const starter = starterWorkflow(activeProfile, template);
    createAutomationForProfile(starter);
    setTemplateMenuOpen(false);
    showToast(`${template === 'nurture' ? 'Nurture' : 'Starter'} workflow loaded`);
  };

  const loadSavedTemplate = (template) => {
    createAutomationForProfile({
      name: `${activeProfile.name} ${template.name}`,
      nodes: cloneNodes(template.nodes),
      edges: cloneEdges(template.edges),
      selectedId: template.selectedId || template.nodes?.[0]?.id || null,
      createdWith: 'template',
      prompt: template.prompt || `Loaded from saved template: ${template.name}`,
    });
    setTemplateMenuOpen(false);
    showToast(`${template.name} loaded`);
  };

  const deleteSavedTemplate = (templateId) => {
    const target = savedTemplates.find((template) => template.id === templateId);
    if (!target) return;
    const confirmed = window.confirm(`Delete template "${target.name}"?`);
    if (!confirmed) return;
    setSavedTemplates((current) => current.filter((template) => template.id !== templateId));
    showToast(`${target.name} deleted`);
  };

  const saveProfileDetails = (nextProfile) => {
    const starterTemplate = nextProfile.starterTemplate || '';
    const cleanedProfile = { ...nextProfile };
    delete cleanedProfile.starterTemplate;
    setProfiles((current) => current.map((profile) => profile.id === cleanedProfile.id ? { ...profile, ...cleanedProfile } : profile));
    if (nextProfile.id !== activeProfileId) setActiveProfileId(nextProfile.id);
    if (starterTemplate) {
      const starter = starterWorkflow(cleanedProfile, starterTemplate);
      setProfiles((current) => current.map((profile) => (
        profile.id === cleanedProfile.id
          ? {
              ...profile,
              automations: [createAutomation('automation-default', starter.name, starter)],
              activeAutomationId: 'automation-default',
            }
          : profile
      )));
      setNodes(cloneNodes(starter.nodes));
      setEdges(cloneEdges(starter.edges));
      setSelectedId(starter.selectedId);
      setActive('Automations');
    }
    setSettingsOpen(false);
    showToast(`${nextProfile.name} profile saved`);
  };

  const generateMessage = async (prompt, currentMessage) => {
    const response = await fetch('/api/gemini/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: activeProfile.geminiKey,
        prompt,
        currentMessage,
        profileContext: profileContext(activeProfile),
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || 'Gemini request failed.');
    return payload.text;
  };

  const generateAutomationWithGemini = async ({ name, goal, prompt }) => {
    if (!activeProfile?.geminiKey) {
      showToast('Connect Gemini first');
      return;
    }
    setGeneratingAutomation(true);
    setAutomationGeneratorError('');
    try {
      const { response, payload } = await fetchJsonWithTimeout('/api/gemini/automation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: activeProfile.geminiKey,
          name,
          goal,
          prompt,
          profileContext: profileContext(activeProfile),
        }),
      });
      if (!response.ok) throw new Error(payload.error || 'Gemini could not generate the automation.');
      createAutomationForProfile({
        ...payload.automation,
        name,
        createdWith: 'gemini',
        prompt,
      });
      setGeneratorOpen(false);
      setAutomationGeneratorError('');
      showToast(`${name} created with Gemini`);
    } catch (error) {
      const fallback = fallbackAutomationFromPrompt(activeProfile, name, goal, prompt);
      createAutomationForProfile(fallback);
      setGeneratorOpen(false);
      setAutomationGeneratorError(error.name === 'AbortError' ? 'Gemini took too long, so a fallback workflow was created.' : error.message || 'Gemini could not generate the automation.');
      showToast(`${name} created from fallback logic`);
    } finally {
      setGeneratingAutomation(false);
    }
  };

  const executeOperatorActions = async (actions = []) => {
    const applied = [];
    for (const action of actions) {
      if (!action?.type) continue;

      if (action.type === 'create_automation') {
        await generateAutomationWithGemini({
          name: action.name || `${activeProfile.name} AI automation`,
          goal: action.goal || 'Create a stronger Telegram workflow',
          prompt: action.prompt || 'Create a Telegram automation from the business context.',
        });
        applied.push(`created automation ${action.name || 'AI automation'}`);
        continue;
      }

      if (action.type === 'load_template') {
        applyStarterTemplate(action.template === 'nurture' ? 'nurture' : 'sales');
        applied.push(`loaded ${action.template === 'nurture' ? 'nurture' : 'sales'} template`);
        continue;
      }

      if (action.type === 'rename_active_automation' && action.name) {
        replaceActiveAutomation((automation) => ({ ...automation, name: action.name }));
        applied.push(`renamed automation to ${action.name}`);
        continue;
      }

      if (action.type === 'update_selected_node') {
        if (selectedNode) {
          const patch = { ...(action.patch || {}) };
          if (patch.timeoutValue || patch.timeoutUnit) {
            patch.timeout = `${patch.timeoutValue || selectedNode.data.timeoutValue || 24} ${patch.timeoutUnit || selectedNode.data.timeoutUnit || 'hours'}`;
          }
          updateNode(patch);
          applied.push(`updated ${selectedNode.data.title}`);
        }
        continue;
      }

      if (action.type === 'rewrite_selected_message' && selectedNode?.data.kind === 'message' && action.prompt) {
        const description = await generateMessage(action.prompt, selectedNode.data.description);
        updateNode({ description });
        applied.push(`rewrote ${selectedNode.data.title}`);
        continue;
      }

      if (action.type === 'add_step_after_selected') {
        const nextNode = addStepAfterCurrentSelection(action);
        applied.push(`added ${nextNode.data.kind} step`);
        continue;
      }

      if (action.type === 'update_profile' && action.patch) {
        patchActiveProfile(action.patch);
        applied.push('updated profile strategy');
        continue;
      }

      if (action.type === 'open_settings' && action.tab) {
        openSettings(action.tab);
        applied.push(`opened ${action.tab}`);
      }
    }
    return applied;
  };

  const runOperator = async (promptOverride) => {
    const requestText = (promptOverride || operatorInput).trim();
    if (!requestText) return;
    if (!activeProfile?.geminiKey) {
      showToast('Connect Gemini first');
      openSettings('gemini');
      return;
    }

    const userMessage = createOperatorMessage('user', requestText);
    appendOperatorMessage(userMessage);
    setOperatorInput('');
    setOperatorRunning(true);

    try {
      const { response, payload } = await fetchJsonWithTimeout('/api/gemini/operator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: activeProfile.geminiKey,
          prompt: requestText,
          profileContext: profileContext(activeProfile),
          automationSummary: automationSummary(activeAutomation),
          selectedNodeSummary: nodeSummary(selectedNode),
        }),
      });
      if (!response.ok) throw new Error(payload.error || 'The AI operator could not complete that request.');
      const applied = await executeOperatorActions(payload.actions || []);
      appendOperatorMessage(createOperatorMessage('assistant', payload.reply || 'Done.', { applied }));
      showToast(applied.length ? 'AI operator applied changes' : 'AI operator replied');
    } catch (error) {
      appendOperatorMessage(createOperatorMessage('assistant', error.message || 'The AI operator hit an error.'));
      showToast(error.message || 'AI operator failed');
    } finally {
      setOperatorRunning(false);
    }
  };

  const editingProfile = profiles.find((profile) => profile.id === editingProfileId) || activeProfile;
  const showRightRail = active === 'Automations' ? Boolean(selectedNode) : false;

  return (
    <div className={`app-shell ${showRightRail ? 'has-right-rail' : 'no-right-rail'}`}>
      <Sidebar
        active={active}
        setActive={setActive}
        automationsCount={activeProfile.automations.length}
        onOpenSettings={() => openSettings('gemini')}
        onOpenTelegram={() => openSettings('telegram')}
        geminiConnected={geminiConnected}
        telegramConnected={telegramConnected}
      />
      <main className="workspace">
        {active === 'Automations' ? (
          <>
            <header className="topbar">
              <div className="breadcrumb">
                <button>{activeProfile.name}</button>
                <span>/</span>
                <input aria-label="Automation name" value={activeAutomation?.name || ''} onChange={(event) => replaceActiveAutomation((automation) => ({ ...automation, name: event.target.value }))} />
              </div>
              <div className="top-actions">
                <span className={`save-state ${toast ? 'visible' : ''}`}><Save size={14} /> {toast}</span>
                <button className="icon-button" title="Notifications"><Bell size={18} /></button>
                <button className="secondary-action" onClick={() => setOperatorOpen(true)}><Bot size={14} /> AI operator</button>
                <button className="test-button" onClick={() => { window.dispatchEvent(new CustomEvent('teleflow-simulate-event', { detail: { type: 'start' } })); }}><Play size={15} /> Test flow</button>
                <label className="publish-toggle"><span>{published ? 'Live' : 'Draft'}</span><input type="checkbox" checked={published} onChange={() => { setPublished(!published); showToast(!published ? 'Automation published' : 'Automation paused'); }} /><i /></label>
              </div>
            </header>
            <ProfileTabs
              profiles={profiles}
              activeProfileId={activeProfile.id}
              onSelectProfile={setActiveProfileId}
              onCreateProfile={createNewProfile}
              onEditProfile={(profile) => openSettings('profile', profile.id)}
              onDeleteProfile={(profile) => deleteProfile(profile.id)}
              canDeleteProfiles={profiles.length > 1}
            />
            <AutomationShelf
              automations={activeProfile.automations}
              activeAutomationId={activeAutomation?.id}
              onSelect={selectAutomation}
              onCreateAi={() => { setAutomationGeneratorError(''); setGeneratorOpen(true); }}
              onCreateTemplate={() => setTemplateMenuOpen(!templateMenuOpen)}
              onDuplicate={duplicateActiveAutomation}
            />
            <div className="canvas-toolbar">
              <button className="add-step" onClick={() => setLibraryOpen(true)}><Plus size={17} /> Add step</button>
              <button><ListFilter size={16} /> Find step</button>
              <button onClick={() => setTemplateMenuOpen(!templateMenuOpen)}><Sparkles size={16} /> Templates</button>
              <button onClick={() => { setAutomationGeneratorError(''); setGeneratorOpen(true); }}><Bot size={16} /> AI automation</button>
              <span className={`connection-pill ${telegramConnected ? 'connected' : ''}`}>{telegramConnected ? 'Telegram connected' : 'Telegram mapping only'}</span>
              <span className="profile-pill"><BriefcaseBusiness size={13} /> {activeProfile.name}</span>
              <span className="canvas-stats"><i /> {activeProfile.products.length} offers loaded · {contextReadiness(activeProfile)} strategy complete</span>
            </div>
            <section className="canvas-wrap">
              <ReactFlow
                nodes={nodes}
                edges={renderedEdges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                nodeTypes={nodeTypes}
                onNodeClick={(_, node) => setSelectedId(node.id)}
                onPaneClick={() => setSelectedId(null)}
                fitView
                fitViewOptions={{ padding: 0.18 }}
                minZoom={0.25}
                maxZoom={1.6}
                defaultEdgeOptions={{ type: 'smoothstep' }}
              >
                <Background color="#d7dce3" gap={22} size={1} />
                <Controls position="bottom-left" showInteractive={false} />
                <MiniMap pannable zoomable nodeStrokeWidth={2} />
              </ReactFlow>
              {templateMenuOpen && (
                <div className="template-popover">
                  <div className="template-panel">
                    <b>Workflow templates</b>
                    <p>Save your current workflow, start from a base structure, or reuse a saved template across businesses.</p>
                    <button className="connect-button full" onClick={saveCurrentAutomationAsTemplate}><Save size={14} /> Save current workflow</button>
                    <button className="secondary-action full" onClick={() => applyStarterTemplate('sales')}><Sparkles size={14} /> Intro and qualify</button>
                    <button className="secondary-action full" onClick={() => applyStarterTemplate('nurture')}><Clock3 size={14} /> Follow-up sequence</button>
                    <div className="saved-template-list">
                      <span className="saved-template-label">Saved templates</span>
                      {savedTemplates.length > 0 ? savedTemplates.map((template) => (
                        <div className="saved-template-row" key={template.id}>
                          <button className="saved-template-card" onClick={() => loadSavedTemplate(template)}>
                            <strong>{template.name}</strong>
                            <small>{template.sourceProfileName} · {template.nodes.length} steps{template.createdAt ? ` · ${template.createdAt}` : ''}</small>
                          </button>
                          <button className="mini-icon" onClick={() => deleteSavedTemplate(template.id)} title="Delete template"><Trash2 size={13} /></button>
                        </div>
                      )) : <small className="saved-template-empty">No saved workflow templates yet.</small>}
                    </div>
                  </div>
                </div>
              )}
              {libraryOpen && <NodeLibrary onAdd={addNode} onClose={() => setLibraryOpen(false)} />}
            </section>
          </>
        ) : (
          <div className="workspace-page">
            <header className="topbar compact">
              <div className="breadcrumb"><button>{activeProfile.name}</button><span>/</span><button>{active}</button></div>
              <div className="top-actions">
                <span className={`save-state ${toast ? 'visible' : ''}`}><Save size={14} /> {toast}</span>
                <button className="icon-button" title="Notifications"><Bell size={18} /></button>
                <button className="secondary-action" onClick={() => setOperatorOpen(true)}><Bot size={14} /> AI operator</button>
              </div>
            </header>
            <ProfileTabs
              profiles={profiles}
              activeProfileId={activeProfile.id}
              onSelectProfile={setActiveProfileId}
              onCreateProfile={createNewProfile}
              onEditProfile={(profile) => openSettings('profile', profile.id)}
              onDeleteProfile={(profile) => deleteProfile(profile.id)}
              canDeleteProfiles={profiles.length > 1}
            />
            <WorkspacePage
              active={active}
              profile={activeProfile}
              profiles={profiles}
              profilesCount={profiles.length}
              onOpenSettings={(tab) => openSettings(tab)}
              onOpenTelegram={() => openSettings('telegram')}
              onSelectProfile={setActiveProfileId}
              geminiConnected={geminiConnected}
              telegramConnected={telegramConnected}
              onSaveProfilePatch={(patch) => replaceActiveProfile((profile) => ({ ...profile, ...patch }))}
            />
          </div>
        )}
      </main>
      {showRightRail && (
        <Inspector
          node={selectedNode}
          onChange={updateNode}
          onDelete={removeSelected}
          onDuplicate={duplicateSelected}
          onClose={() => setSelectedId(null)}
          geminiConnected={geminiConnected}
          onOpenGemini={() => openSettings('gemini')}
          onGenerate={generateMessage}
          profile={activeProfile}
        />
      )}
      {settingsOpen && editingProfile && (
        <IntegrationModal
          tab={settingsTab}
          profile={editingProfile}
          profiles={profiles}
          onChangeLinkedProfile={(profileId) => {
            setActiveProfileId(profileId);
            setEditingProfileId(profileId);
          }}
          onSaveGemini={saveGeminiKey}
          onSaveTelegram={saveTelegramConnection}
          onSaveProfile={saveProfileDetails}
          onDeleteProfile={deleteProfile}
          canDeleteProfile={profiles.length > 1}
          onClose={() => setSettingsOpen(false)}
        />
      )}
      {generatorOpen && activeProfile && (
        <AutomationGeneratorModal
          profile={activeProfile}
          onGenerate={generateAutomationWithGemini}
          onClose={() => setGeneratorOpen(false)}
          generating={generatingAutomation}
          error={automationGeneratorError}
        />
      )}
      {operatorOpen && activeProfile && (
        <AIOperatorModal
          profile={activeProfile}
          selectedNode={selectedNode}
          activeAutomation={activeAutomation}
          messages={activeProfile.operatorMessages || []}
          input={operatorInput}
          onInputChange={setOperatorInput}
          onSend={() => runOperator()}
          onClose={() => setOperatorOpen(false)}
          running={operatorRunning}
          onQuickAction={(prompt) => runOperator(prompt)}
        />
      )}
      {toast && <div className="toast"><span><Save size={16} /></span>{toast}</div>}
    </div>
  );
}

createRoot(document.getElementById('root')).render(<ReactFlowProvider><App /></ReactFlowProvider>);
