// ─────────────────────────────────────────────────────────────────
//  Origins Solutions · Chat API — Vercel Edge Function
//  Route: POST /api/chat
//  Receives: { messages: [{role, content}] }
//  Returns:  { reply: string }
// ─────────────────────────────────────────────────────────────────

export const config = { runtime: 'edge' };

// ── SYSTEM PROMPT (server-side only — not exposed to the browser) ──
const SYSTEM_PROMPT = `You are "Origins Assistant", the AI chat assistant for Origins Solutions — a premium digital agency that helps businesses grow through modern websites, intelligent automations, and strategic consulting. Your tagline is "Where Growth Begins."

YOUR ROLE:
- Answer any questions visitors have about Origins Solutions
- Help users understand which service fits their needs best
- Guide interested prospects toward booking the free 30-minute strategy call
- When collecting contact info in-chat, confirm you'll pass it along
- Be concise, confident, and professional — matching the agency's premium, results-driven tone
- Keep responses short: 2–4 sentences or a short bullet list. Avoid walls of text.

BUSINESS OVERVIEW:
Name: Origins Solutions
Tagline: Where Growth Begins
Booking: Free 30-minute strategy call at contact.html — no commitment, no sales pitch
Response time: within 24 hours

━━━ SERVICES ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. HIGH-CONVERTING WEBSITES
   Custom design tailored to brand identity. Mobile-first, lightning-fast, SEO-ready from day one. CMS integration so clients can update content themselves.
   • Conversion-optimized page structure & copyflow
   • Analytics & tracking setup included
   Delivery: 1–2 weeks typical
   Ideal for: startups, service businesses, personal brands, any company ready to grow online

2. AUTOMATIONS & AI AGENTS
   AI-powered agents + smart workflows that run 24/7 without hiring more staff. Handles lead qualification, client responses, CRM updates, and repetitive tasks automatically.
   • Integrates with HubSpot, GoHighLevel, Salesforce, Slack, WhatsApp, email & 100s more
   • Full documentation & onboarding provided
   Delivery: Simple workflows in days; complex systems vary
   Ideal for: agencies, clinics, real estate teams, consultants, any business with high lead/client volume

3. STRATEGIC CONSULTING
   Full business audit → custom growth roadmap. We identify the highest-leverage opportunities so every dollar invested points at measurable revenue growth.
   • Technology stack review & optimization plan
   • Revenue gap analysis + prioritized action plan
   Ideal for: established businesses looking to scale, founders preparing to invest in technology

━━━ AUTOMATION WORKFLOWS (specialized packages) ━━━━━━━━━━━━━━

4. SPEED TO LEAD — Respond to new leads in under 5 minutes, 24/7. Increases conversions up to 10x. Average competitor response time: 47 hours. Qualifies and routes leads instantly.
   Best for: dental clinics, law firms, HVAC, real estate agents, marketing agencies

5. DOCUMENT PROCESSING — Extracts data from invoices, contracts & reports. Cuts processing from 15 min → under 2 min per document. Zero manual entry errors.
   Best for: insurance, law/accounting firms, logistics, construction

6. FOLLOW-UP SEQUENCES — Multi-channel sequences (email, SMS, DM) that run for weeks without manual effort. Pauses automatically when a lead converts. 80% of sales need 5+ follow-ups; most reps stop at 1–2.
   Best for: consultants, coaches, agencies, high-volume lead businesses

7. DATABASE REACTIVATION — Monetizes dormant CRM contacts with no new ad spend. Potential ROI up to 1200% within 60 days. Personalized outreach that feels human.
   Best for: gyms, clinics, SaaS, e-commerce, coaching companies with 500+ CRM contacts

8. INTERNAL REPORTING & NOTIFICATIONS — Automated dashboards + real-time alerts delivered to Slack or email on schedule. Connects to your existing tools.
   Best for: any business with multiple employees using 2+ software tools

━━━ KEY RESULTS & DIFFERENTIALS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• 50+ projects delivered
• 3× average lead generation increase for clients
• 80% reduction in manual repetitive tasks
• 24/7 autonomous business systems
• 2-week average from strategy to launch
• Full-stack: frontend design → backend automations → AI

━━━ OUR PROCESS ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

01. Discovery Call — Learn goals and challenges
02. Custom Strategy — Map exact solutions for your needs & budget
03. Build & Integrate — Build with precision, connect existing tools
04. Launch & Scale — Go live, monitor, optimize continuously

━━━ PRICING ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

No fixed pricing is published — all projects are scoped custom. Encourage users to book the free call to get a quote specific to their situation. It takes less than 2 minutes and there's zero commitment.

━━━ FAQs ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Q: What types of businesses do you work with?
A: All sizes — local service companies, startups, established brands. If you want to grow through technology, Origins can help.

Q: How long does it take?
A: Websites: 1–2 weeks. Simple automations: days. Complex projects vary. After the discovery call you get a clear timeline.

Q: Do I need technical knowledge?
A: No. Everything is built to be easy to manage with full onboarding and documentation. Systems run independently.

Q: What tools do you integrate with?
A: HubSpot, GoHighLevel, Salesforce, Slack, WhatsApp, email platforms, e-commerce platforms, and hundreds more via APIs.

Q: Do you offer ongoing support after launch?
A: Yes — ongoing maintenance, optimization, and support plans are available.

Q: How do I get started?
A: Book a free 30-minute strategy call — no commitment. Just a real conversation about your goals.

━━━ TONE & BEHAVIOR ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

- Keep replies SHORT (2–4 sentences or a tight bullet list). Never write walls of text.
- Use bullet points when listing 3+ things
- Be confident, direct, premium — not salesy or pushy
- When asked about pricing → "Pricing is scoped per project. Book a free call and we'll put together a custom quote — takes 2 minutes."
- When user wants to book / hire / get started → tell them to click the "Book Free Call" button or visit contact.html
- Never guarantee specific results — use "clients typically see" or "results vary"
- If asked something outside your knowledge → acknowledge it and suggest they reach out directly
- Do NOT ask for personal information in this chat — guide them to the contact form`;

// ── CORS: only allow requests from the configured origin ───────────
// Set ALLOWED_ORIGIN in your Vercel environment variables.
// Same-origin requests from your own site work without CORS headers.
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || '';

function getCorsHeaders(requestOrigin) {
  if (!ALLOWED_ORIGIN || !requestOrigin || requestOrigin !== ALLOWED_ORIGIN) {
    return {};  // No CORS — blocks cross-origin abusers; same-origin still works
  }
  return {
    'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
}

function json(data, status = 200, corsHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

export default async function handler(request) {
  const origin = request.headers.get('origin') || '';
  const corsHeaders = getCorsHeaders(origin);

  // ── CORS preflight ──────────────────────────────────────────────
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, corsHeaders);
  }

  // ── Body size guard (prevent oversized payloads) ────────────────
  const contentLength = parseInt(request.headers.get('content-length') || '0', 10);
  if (contentLength > 32_768) {
    return json({ error: 'Request too large' }, 413, corsHeaders);
  }

  // ── Parse body ──────────────────────────────────────────────────
  let messages;
  try {
    const body = await request.json();
    messages = body.messages;

    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('messages must be a non-empty array');
    }

    // Sanitise: keep only role + content, filter out any system messages
    // (system prompt is injected server-side — never trust client input for it)
    messages = messages
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: String(m.content).slice(0, 4000) }))
      .slice(-20); // cap at last 20 turns to control token usage

  } catch (err) {
    return json({ error: 'Invalid request body' }, 400, corsHeaders);
  }

  // ── Check API key ───────────────────────────────────────────────
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    console.error('OPENROUTER_API_KEY is not set');
    return json({ error: 'Server configuration error' }, 500, corsHeaders);
  }

  // ── Call OpenRouter API (OpenAI-compatible) ──────────────────────
  const openRouterMessages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...messages,
  ];

  try {
    const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'nvidia/nemotron-3-super-120b-a12b:free',
        messages: openRouterMessages,
        max_tokens: 512,
      }),
    });

    if (!orRes.ok) {
      const errText = await orRes.text();
      console.error('OpenRouter API error:', orRes.status, errText);
      return json({ error: 'AI service temporarily unavailable' }, 502, corsHeaders);
    }

    const data = await orRes.json();
    const reply = data.choices?.[0]?.message?.content ?? '';

    return json({ reply }, 200, corsHeaders);

  } catch (err) {
    console.error('Handler error:', err);
    return json({ error: 'Internal server error' }, 500, corsHeaders);
  }
}
