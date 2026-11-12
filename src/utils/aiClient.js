// 🤖 عميل ذكاء اصطناعي مقاوم للأعطال (v15)
// - يدعم عدة مفاتيح Gemini: GEMINI_API_KEYS=key1,key2,key3 (تدوير تلقائي)
// - سلسلة نماذج احتياطية: إن فشل نموذج ينتقل للتالي
// - إعادة المحاولة مع تأخير متصاعد عند 429 / 5xx / انقطاع الشبكة / المهلة
// - "قاطع دائرة": المفتاح الذي يرجع 429 أو 403 يُعطّل مؤقتاً
// - مزوّدون احتياطيون: Gemini ← OpenAI ← Lovable AI (حسب المفاتيح المتوفرة)
// - طابور يحدد عدد الطلبات المتزامنة لمنع الحظر
// - إحصائيات تعرض بأمر /ai-status (عبر getStats)
const logger = require('./logger');

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
// أسماء نماذج Gemini الصحيحة والمتاحة حالياً (القديمة مثل gemini-pro / 1.5 / 2.0 أزيلت من الـ API)
const GEMINI_MODELS_DEFAULT = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-flash-latest'];
const GEMINI_DEPRECATED = /^(gemini-pro|gemini-1\.0|gemini-1\.5|gemini-2\.0|models\/)/i;
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODELS_DEFAULT = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'llama-3.3-70b-versatile', 'llama-3.1-8b-instant'];

function splitList(v) {
  return String(v || '').split(/[,\s]+/).map((s) => s.trim()).filter(Boolean);
}

function buildProviders() {
  const providers = [];
  const geminiKeys = [...new Set([
    ...splitList(process.env.GEMINI_API_KEYS),
    ...splitList(process.env.GEMINI_API_KEY),
    ...splitList(process.env.GOOGLE_API_KEY),
  ])];
  if (geminiKeys.length) {
    const models = splitList(process.env.AI_MODELS || process.env.AI_MODEL)
      .map((m) => m.replace(/^models\//, ''))
      .filter((m) => /^gemini/i.test(m) && !GEMINI_DEPRECATED.test(m));
    providers.push({
      name: 'gemini', url: GEMINI_URL, keys: geminiKeys,
      models: [...new Set([...models, ...GEMINI_MODELS_DEFAULT])],
    });
  }
  // Groq (سريع جداً ومجاني) — احتياطي مباشر بعد Gemini، أو أساسي إن لم يوجد مفتاح Gemini
  const groqKeys = [...new Set([...splitList(process.env.GROQ_API_KEYS), ...splitList(process.env.GROQ_API_KEY)])];
  if (groqKeys.length) {
    const gm = splitList(process.env.GROQ_MODELS || process.env.GROQ_MODEL);
    providers.push({ name: 'groq', url: GROQ_URL, keys: groqKeys, models: [...new Set([...gm, ...GROQ_MODELS_DEFAULT])] });
  }
  if (process.env.AI_PROVIDER_ORDER === 'groq-first') providers.sort((a, b) => (b.name === 'groq') - (a.name === 'groq'));
  if (process.env.OPENAI_API_KEY) {
    providers.push({ name: 'openai', url: 'https://api.openai.com/v1/chat/completions', keys: splitList(process.env.OPENAI_API_KEY), models: [process.env.OPENAI_MODEL || 'gpt-4o-mini'] });
  }
  if (process.env.LOVABLE_API_KEY) {
    providers.push({ name: 'lovable', url: 'https://ai.gateway.lovable.dev/v1/chat/completions', keys: [process.env.LOVABLE_API_KEY], models: [process.env.LOVABLE_MODEL || 'google/gemini-2.5-flash'] });
  }
  return providers;
}

let PROVIDERS = buildProviders();
const keyBlockedUntil = new Map();   // key -> ts
const modelBlockedUntil = new Map(); // provider:model -> ts (نموذج غير موجود/معطل)
const keyIndex = new Map();          // provider -> rotating index
const stats = { ok: 0, fail: 0, retries: 0, lastError: null, lastOkAt: null, lastModel: null, avgMs: 0 };

// ===== طابور التزامن =====
const MAX_CONCURRENT = Number(process.env.AI_MAX_CONCURRENT || 6);
let active = 0;
const queue = [];
function acquire() {
  if (active < MAX_CONCURRENT) { active++; return Promise.resolve(); }
  return new Promise((r) => queue.push(r));
}
function release() {
  const next = queue.shift();
  if (next) next(); else active--;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function nextKey(p) {
  const now = Date.now();
  const start = keyIndex.get(p.name) || 0;
  for (let i = 0; i < p.keys.length; i++) {
    const idx = (start + i) % p.keys.length;
    const k = p.keys[idx];
    if ((keyBlockedUntil.get(k) || 0) <= now) {
      keyIndex.set(p.name, idx + 1);
      return k;
    }
  }
  return null;
}

/** خطأ يحمل نوعه لنقرر: نعيد؟ نغير المفتاح؟ نغير النموذج؟ */
class AIError extends Error {
  constructor(msg, kind, status) { super(msg); this.kind = kind; this.status = status; }
}

// تعطيل "التفكير" في النماذج التي تدعمه — هذا سبب التأخير الأكبر (كان يضيف 5-20 ثانية لكل رد)
function buildBody(p, model, messages, opts) {
  const body = { model, messages, temperature: opts.temperature };
  body[p.name === 'groq' ? 'max_completion_tokens' : 'max_tokens'] = opts.maxTokens;
  if (p.name === 'gemini' && /flash/i.test(model)) body.reasoning_effort = 'none';
  if (p.name === 'groq' && /gpt-oss/i.test(model)) body.reasoning_effort = 'low';
  if (p.name === 'lovable') body.reasoning = { effort: 'minimal' };
  return body;
}

async function requestOnce(p, key, model, messages, opts) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), opts.timeoutMs);
  try {
    const res = await fetch(p.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(buildBody(p, model, messages, opts)),
      signal: controller.signal,
    });
    if (res.ok) {
      const data = await res.json().catch(() => null);
      const text = data?.choices?.[0]?.message?.content?.trim();
      if (!text) throw new AIError('empty response', 'empty', 200);
      return text;
    }
    const body = (await res.text().catch(() => '')).slice(0, 300);
    if (res.status === 429) throw new AIError(`429 ${body}`, 'rate', 429);
    if (res.status === 401 || res.status === 403) throw new AIError(`${res.status} ${body}`, 'key', res.status);
    if (res.status === 402) throw new AIError('402 credits', 'key', 402);
    if (res.status === 404 || (res.status === 400 && /model/i.test(body))) throw new AIError(`${res.status} ${body}`, 'model', res.status);
    if (res.status >= 500) throw new AIError(`${res.status} ${body}`, 'server', res.status);
    throw new AIError(`${res.status} ${body}`, 'bad', res.status);
  } catch (e) {
    if (e instanceof AIError) throw e;
    throw new AIError(e.name === 'AbortError' ? 'timeout' : e.message, 'network', 0);
  } finally {
    clearTimeout(t);
  }
}

/**
 * يرسل محادثة ويرجع نص الرد، أو null إن فشلت كل المحاولات.
 * @param {Array<{role:string, content:string}>} messages
 */
async function chat(messages, options = {}) {
  if (!PROVIDERS.length) PROVIDERS = buildProviders();
  if (!PROVIDERS.length) return null;
  return chatWith(PROVIDERS, messages, options);
}

async function chatWith(list, messages, options = {}) {
  const opts = { timeoutMs: 25000, maxTokens: 1200, temperature: 0.9, maxAttempts: 6, ...options };

  await acquire();
  const started = Date.now();
  let attempt = 0;
  try {
    for (const p of list) {
      for (const model of p.models) {
        if ((modelBlockedUntil.get(`${p.name}:${model}`) || 0) > Date.now()) continue;
        let tries = 0;
        while (attempt < opts.maxAttempts && tries < 3) {
          const key = nextKey(p);
          if (!key) break; // كل مفاتيح هذا المزود معطلة مؤقتاً
          attempt++; tries++;
          try {
            const text = await requestOnce(p, key, model, messages, opts);
            stats.ok++; stats.lastOkAt = Date.now(); stats.lastModel = `${p.name}/${model}`;
            const ms = Date.now() - started;
            stats.avgMs = stats.avgMs ? Math.round(stats.avgMs * 0.8 + ms * 0.2) : ms;
            return text;
          } catch (e) {
            stats.retries++; stats.lastError = `${p.name}/${model}: ${e.message}`.slice(0, 200);
            logger.warn(`[AI] ${p.name}/${model} attempt ${attempt} failed (${e.kind}): ${e.message.slice(0, 120)}`);
            if (e.kind === 'rate') { keyBlockedUntil.set(key, Date.now() + 30000); await sleep(400 * tries); continue; }
            if (e.kind === 'key') { keyBlockedUntil.set(key, Date.now() + 10 * 60000); continue; }
            if (e.kind === 'model') { modelBlockedUntil.set(`${p.name}:${model}`, Date.now() + 60 * 60000); break; }
            if (e.kind === 'server' || e.kind === 'network' || e.kind === 'empty') { await sleep(Math.min(500 * 2 ** (tries - 1), 4000)); continue; }
            break; // bad request: جرب النموذج التالي
          }
        }
        if (attempt >= opts.maxAttempts) break;
      }
      if (attempt >= opts.maxAttempts) break;
    }
    stats.fail++;
    return null;
  } finally {
    release();
  }
}

/**
 * نسخة سريعة للمحادثة: تبدأ بالمزود الأول، وإن تأخر أكثر من hedgeMs
 * تطلق المزود الثاني بالتوازي وتأخذ أول رد يصل.
 */
async function fastChat(messages, options = {}) {
  if (!PROVIDERS.length) PROVIDERS = buildProviders();
  if (!PROVIDERS.length) return null;
  const hedgeMs = options.hedgeMs ?? 3500;
  if (PROVIDERS.length < 2) return chat(messages, options);
  const [first, ...rest] = PROVIDERS;
  const run = (list) => chatWith(list, messages, options);
  return new Promise((resolve) => {
    let settled = false, pending = 2, timer = null;
    const done = (text) => {
      if (settled) return;
      if (text) { settled = true; clearTimeout(timer); return resolve(text); }
      if (--pending <= 0) { settled = true; clearTimeout(timer); resolve(null); }
    };
    let backupStarted = false;
    const startBackup = () => { if (backupStarted || settled) return; backupStarted = true; run(rest).then(done, () => done(null)); };
    // إن فشل الأول نبدأ الاحتياطي فوراً بدل الانتظار
    run([first]).then((t) => { if (t) return done(t); startBackup(); done(null); }, () => { startBackup(); done(null); });
    timer = setTimeout(startBackup, hedgeMs);
  });
}

function isConfigured() {
  if (!PROVIDERS.length) PROVIDERS = buildProviders();
  return PROVIDERS.length > 0;
}

function getStats() {
  const now = Date.now();
  return {
    ...stats,
    providers: PROVIDERS.map((p) => ({
      name: p.name,
      keys: p.keys.length,
      keysAvailable: p.keys.filter((k) => (keyBlockedUntil.get(k) || 0) <= now).length,
      models: p.models.map((m) => ({ model: m, blocked: (modelBlockedUntil.get(`${p.name}:${m}`) || 0) > now })),
    })),
    queue: queue.length,
    active,
  };
}

function reset() {
  keyBlockedUntil.clear(); modelBlockedUntil.clear(); PROVIDERS = buildProviders();
}

module.exports = { chat, fastChat, isConfigured, getStats, reset };
