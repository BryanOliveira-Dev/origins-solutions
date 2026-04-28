// ─────────────────────────────────────────────────────────────────
//  Origins Solutions · Calendar Proxy — Vercel Edge Function
//  Route: GET /api/calendar?action=month&year=&month=
//         GET /api/calendar?action=day&date=YYYY-MM-DD
//  Proxies calendar availability requests to Google Apps Script,
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
  if (request.method !== 'GET') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const appsScriptUrl = process.env.APPS_SCRIPT_URL;
  if (!appsScriptUrl) {
    return json({ error: 'Server configuration error' }, 500);
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  if (action === 'month') {
    const year  = parseInt(searchParams.get('year'),  10);
    const month = parseInt(searchParams.get('month'), 10);
    if (isNaN(year) || isNaN(month) || month < 0 || month > 11) {
      return json({ error: 'Invalid parameters' }, 400);
    }
    try {
      const res  = await fetch(`${appsScriptUrl}?action=month&year=${year}&month=${month}`);
      const data = await res.json();
      return json(data);
    } catch {
      return json({ fullyBookedDays: [] });
    }
  }

  if (action === 'day') {
    const date = searchParams.get('date');
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return json({ error: 'Invalid date format' }, 400);
    }
    try {
      const res  = await fetch(`${appsScriptUrl}?action=day&date=${date}`);
      const data = await res.json();
      return json(data);
    } catch {
      return json({ booked: [] });
    }
  }

  return json({ error: 'Unknown action' }, 400);
}
