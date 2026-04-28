// ─────────────────────────────────────────────────────────────────
//  Origins Solutions · Contact Proxy — Vercel Edge Function
//  Route: POST /api/contact
//  Proxies form submissions to Google Apps Script server-side,
//  keeping the Apps Script URL out of the browser.
// ─────────────────────────────────────────────────────────────────

export const config = { runtime: 'edge' };

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default async function handler(request) {
  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const appsScriptUrl = process.env.APPS_SCRIPT_URL;
  if (!appsScriptUrl) {
    return json({ error: 'Server configuration error' }, 500);
  }

  let body;
  try {
    body = await request.text();
    if (!body || body.length > 8000) {
      return json({ error: 'Invalid request' }, 400);
    }
    // Validate it's parseable JSON before forwarding
    JSON.parse(body);
  } catch {
    return json({ error: 'Invalid request body' }, 400);
  }

  try {
    await fetch(appsScriptUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'text/plain' },
      body,
    });
  } catch {
    // Apps Script errors are non-critical — lead may still be received
  }

  return json({ ok: true });
}
