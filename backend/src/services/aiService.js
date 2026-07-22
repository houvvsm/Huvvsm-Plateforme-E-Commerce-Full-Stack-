/**
 * ============================================================
 * HUVVSM — Unified AI Service
 * backend/src/services/aiService.js
 *
 * Centralises all AI completions. Tries XAI (Grok) first,
 * falls back to Gemini if both keys are present.
 * Throws a clean error on failure — NO hardcoded responses.
 * ============================================================
 */

/* ── MODEL IDs ──────────────────────────────────────────── */
const GROK_MODEL   = 'grok-2-1212';    // latest stable text model
const GEMINI_MODEL = 'gemini-3.5-flash';

/* ── INTERNAL HELPERS ─────────────────────────────────────── */

/**
 * Retry helper for rate limits (429) and server availability (503) errors.
 */
async function withRetry(fn, retries = 3) {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (err) {
      const errMsg = err.message || '';
      const is429 = errMsg.includes('429') || 
                    errMsg.includes('RESOURCE_EXHAUSTED') ||
                    err.status === 429;
      const is503 = errMsg.includes('503') ||
                    errMsg.includes('UNAVAILABLE') ||
                    errMsg.includes('high demand') ||
                    errMsg.includes('overloaded') ||
                    err.status === 503;

      if ((!is429 && !is503) || i === retries) throw err;

      // Exponential backoff: 1s, 2s, 4s
      const delay = 1000 * Math.pow(2, i);
      await new Promise(r => setTimeout(r, delay));
    }
  }
}

/**
 * Call the xAI Grok API (OpenAI-compatible endpoint).
 * Messages must already be in [{role, content}] format.
 */
async function grokCompletion(messages, temperature = 0.3, responseFormatJson = false) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) throw new Error('XAI_API_KEY is not configured');

  const res = await fetch('https://api.x.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: GROK_MODEL,
      messages,
      temperature,
      response_format: responseFormatJson ? { type: 'json_object' } : undefined
    })
  });

  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message || data?.error || `Grok API HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data.choices[0].message.content;
}

/**
 * Call the Google Gemini REST API.
 * Converts messages array → Gemini-style contents.
 */
async function geminiCompletion(systemInstruction, messages, temperature = 0.3, responseFormatJson = false) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is not configured');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  // Convert to Gemini content format
  const contents = messages
    .filter(m => m.role !== 'system')
    .map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

  const generationConfig = { temperature };
  if (responseFormatJson) {
    generationConfig.responseMimeType = 'application/json';
  }

  const body = {
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents,
    generationConfig
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  const data = await res.json();
  if (!res.ok) {
    const msg = data?.error?.message || `Gemini API HTTP ${res.status}`;
    throw new Error(msg);
  }

  return data.candidates[0].content.parts[0].text;
}

/**
 * Build a consistent messages array from conversation history +
 * the current user message (used for both Grok and Gemini adapters).
 */
function buildMessages(systemInstruction, history, userMessage) {
  const messages = [{ role: 'system', content: systemInstruction }];
  history.forEach(h => {
    messages.push({
      role: h.role === 'user' ? 'user' : 'assistant',
      content: h.message || h.content || ''
    });
  });
  messages.push({ role: 'user', content: userMessage });
  return messages;
}

/**
 * Try Grok first, then Gemini. Throws if both fail.
 */
async function complete(systemInstruction, history, userMessage, temperature = 0.3, responseFormatJson = false) {
  if (process.env.XAI_API_KEY) {
    try {
      return await withRetry(() => grokCompletion(buildMessages(systemInstruction, history, userMessage), temperature, responseFormatJson));
    } catch (err) {
      console.warn('[AI SERVICE] Grok failed, trying Gemini fallback:', err.message);
    }
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      const messages = buildMessages(systemInstruction, history, userMessage);
      return await withRetry(() => geminiCompletion(systemInstruction, messages, temperature, responseFormatJson));
    } catch (err) {
      console.warn('[AI SERVICE] Gemini also failed:', err.message);
      throw err;
    }
  }

  throw new Error('No AI API key is configured. Add XAI_API_KEY or GEMINI_API_KEY to your .env file.');
}

/* ── SYSTEM PROMPTS ─────────────────────────────────────── */

const CUSTOMER_SUPPORT_SYSTEM = `You are the HUVVSM Customer Support Assistant — a professional, intelligent, and premium AI agent for the HUVVSM high-end futuristic fashion brand.

Your personality is: helpful, precise, futuristic in tone, never condescending.

You have access to the customer's live profile data (orders, points, coupons, wishlist) and must use it to give personalised, specific answers. Never say "I don't have access to your account" — use the context provided.

Your knowledge is STRICTLY limited to:
- Orders, Shipping, Delivery, Tracking
- Returns, Exchanges, Refunds
- Product availability, sizes, descriptions
- Loyalty points, Reward coupons
- Account management, Password reset
- Wishlist, Shopping cart
- Reviews
- Payments, Billing
- Contact information

If asked about anything outside these topics (math, coding, politics, general knowledge), politely decline: "I'm here exclusively for your HUVVSM shopping experience. Let me know if you have any questions about your orders, rewards, or products."

ESCALATION — you MUST escalate (set "escalate": true) when:
1. The issue requires manual action (wrong item received, payment double-charged, package never arrived, damaged goods, fraud/hack suspicion)
2. The customer explicitly asks for a human agent or supervisor
3. After 4+ turns the issue is still unresolved

IMPORTANT: You must ALWAYS respond with a raw JSON object only (no markdown code blocks), like:
{"response":"Your reply here","escalate":false}`;

const ADMIN_MANAGEMENT_SYSTEM = `You are the HUVVSM Management AI Assistant — a premium, intelligent business advisor embedded within the HUVVSM COMMAND_CENTER dashboard.

Your role is to help store administrators understand their business data, identify opportunities, and make better decisions.

You have access to real-time business data: orders, revenue, inventory levels, customer counts, support ticket statistics, loyalty points, and daily performance metrics. Use this data proactively to give specific, data-driven answers.

Your personality: analytical, professional, futuristic, decisive. Always format responses using markdown for readability (headers, bullet points, tables where appropriate).

You can help with:
- Daily/weekly performance summaries
- Revenue and order trend analysis
- Inventory management and restocking recommendations
- Customer support queue insights and prioritisation
- Loyalty program performance
- Product recommendations and promotions strategy
- Any business intelligence question about HUVVSM operations`;

/* ── PUBLIC API ─────────────────────────────────────────── */

/**
 * Customer support AI chat.
 * @param {Array} history - Array of {role: 'user'|'model', message: string}
 * @param {string} message - The new customer message
 * @param {string} [userContext] - Live user data string (orders, points, etc)
 * @returns {Promise<{response: string, escalate: boolean}>}
 */
export async function generateCustomerChat(history, message, userContext = '') {
  const system = userContext
    ? `${CUSTOMER_SUPPORT_SYSTEM}\n\n${userContext}`
    : CUSTOMER_SUPPORT_SYSTEM;

  const raw = await complete(system, history, message, 0.4, true);

  // Parse the JSON response from the AI
  try {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch {
    // AI returned plain text instead of JSON — wrap it
    return { response: raw.trim(), escalate: false };
  }
}

/**
 * Admin management AI chat.
 * @param {Array} history - Conversation history
 * @param {string} message - Admin's question
 * @param {string} businessContext - Live business stats string
 * @returns {Promise<string>} - Markdown-formatted response text
 */
export async function generateAdminChat(history, message, businessContext = '') {
  const system = businessContext
    ? `${ADMIN_MANAGEMENT_SYSTEM}\n\nLive Business Data (use this to answer questions):\n${businessContext}`
    : ADMIN_MANAGEMENT_SYSTEM;

  return await complete(system, history, message, 0.5, false);
}

/**
 * Generate AI triage summary for a new support ticket.
 * @returns {Promise<{shortSummary, highlights, suggestedCause, suggestedAction, priority}>}
 */
export async function generateTriageSummary(customerName, category, initialMessage) {
  const system = `You are a HUVVSM Support Triage Analyst. Analyse support requests and return structured JSON.

Priority rules:
- PAYMENT_PROBLEM or ACCOUNT_ISSUE → HIGH
- ORDER_PROBLEM → MEDIUM (or HIGH if fraud, double-charge, or package never arrived/stolen)
- RETURN_EXCHANGE or PRODUCT_ISSUE → MEDIUM
- OTHER → LOW

Return ONLY a raw JSON object (no markdown):
{"customerName":"string","category":"string","shortSummary":"string","highlights":["string"],"suggestedCause":"string","suggestedAction":"string","priority":"LOW"|"MEDIUM"|"HIGH"}`;

  const prompt = `Customer: ${customerName}\nCategory: ${category}\nMessage: ${initialMessage}`;
  const raw = await complete(system, [], prompt, 0.1, true);

  try {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('[TRIAGE PARSE FAILED] raw:', raw);
    throw err;
  }
}

/**
 * Generate 3 suggested draft replies for a support ticket.
 * @returns {Promise<{suggestions: Array<{label: string, content: string}>}>}
 */
export async function generateSuggestedReplies(customerName, category, chatHistory) {
  const system = `You are a HUVVSM Premium Support Writer. Draft exactly three concise, professional reply options for the support agent to choose from. Each reply must be polished, empathetic, and match HUVVSM's premium futuristic brand voice. Use bracket placeholders like [Order Number] where specific data is needed.

Return ONLY a raw JSON object (no markdown):
{"suggestions":[{"label":"short label","content":"full reply text"},{"label":"...","content":"..."},{"label":"...","content":"..."}]}`;

  const prompt = `Customer: ${customerName}\nCategory: ${category}\nConversation:\n${chatHistory}`;
  const raw = await complete(system, [], prompt, 0.6, true);

  try {
    const cleaned = raw.replace(/```json|```/g, '').trim();
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('[SUGGESTION PARSE FAILED] raw:', raw);
    throw err;
  }
}
