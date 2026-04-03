// ─────────────────────────────────────────────────────────────────
//  Origins Solutions · Chatbot Widget
//  Integrates with: /api/chat (Anthropic), Google Apps Script (leads)
// ─────────────────────────────────────────────────────────────────

import {
  BOT_NAME,
  BOT_AVATAR,
  BOT_INTRO,
  QUICK_REPLIES,
  APPS_SCRIPT_URL,
} from './knowledge.js';

const API_URL     = '/api/chat';
const CONTACT_URL = 'contact.html';

// ─── STATE ──────────────────────────────────────────────────────
const messages = [];  // [{role, content}] — conversation history
let isOpen     = false;
let isTyping   = false;
let badgeDismissed = false;

// ─── KEYWORDS ───────────────────────────────────────────────────
// Detect when bot response contains booking/contact intent → show CTA
const CTA_REGEX = /book|schedule|strategy call|contact page|contact form|free call|get started|reach out|discovery call|contact\.html/i;

// Detect when user wants to leave contact info inline
const LEAD_REGEX = /\b(email|my name|contact me|reach me|leave.*info|send.*info|leave.*details|send.*details|leave.*contact|sign.?up)\b/i;

// ─── DOM REFS ───────────────────────────────────────────────────
let $window, $messages, $input, $send, $badge, $toggleChat, $toggleClose;

// ─── INIT ───────────────────────────────────────────────────────
function init() {
  injectHTML();
  injectCSS();

  $window      = document.getElementById('cb-window');
  $messages    = document.getElementById('cb-messages');
  $input       = document.getElementById('cb-input');
  $send        = document.getElementById('cb-send');
  $badge       = document.getElementById('cb-badge');
  $toggleChat  = document.getElementById('cb-icon-chat');
  $toggleClose = document.getElementById('cb-icon-close');

  // Keyboard: Enter to send
  $input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  });

  $send.addEventListener('click', handleSend);

  // Greeting message + quick replies
  appendBotMessage(BOT_INTRO, false);
  appendQuickReplies(QUICK_REPLIES);
}

// ─── INJECT HTML ────────────────────────────────────────────────
function injectHTML() {
  const el = document.createElement('div');
  el.id = 'cb-root';
  el.innerHTML = `
    <!-- Toggle button -->
    <button class="cb-toggle" id="cb-toggle" aria-label="Chat with Origins Assistant">
      <span class="cb-toggle-icon" id="cb-icon-chat">💬</span>
      <span class="cb-toggle-icon hidden" id="cb-icon-close">✕</span>
      <span class="cb-badge" id="cb-badge">1</span>
    </button>

    <!-- Chat window -->
    <div class="cb-window" id="cb-window" role="dialog" aria-label="Origins Assistant Chat">
      <div class="cb-header">
        <div class="cb-header-info">
          <div class="cb-avatar">${BOT_AVATAR}</div>
          <div>
            <div class="cb-header-name">${BOT_NAME}</div>
            <div class="cb-header-status">● Online · replies instantly</div>
          </div>
        </div>
        <div class="cb-header-actions">
          <a class="cb-book-link" href="${CONTACT_URL}">Book Free Call</a>
          <button class="cb-close-btn" id="cb-close-btn" aria-label="Close chat">✕</button>
        </div>
      </div>

      <div class="cb-messages" id="cb-messages"></div>

      <div class="cb-input-area">
        <input
          class="cb-input"
          id="cb-input"
          type="text"
          placeholder="Ask anything about Origins…"
          autocomplete="off"
          maxlength="500"
        />
        <button class="cb-send" id="cb-send" aria-label="Send message">↑</button>
      </div>

      <div class="cb-footer">Powered by <span>Origins Solutions AI</span></div>
    </div>`;

  document.body.appendChild(el);

  // Attach toggle via event listeners — no inline onclick needed
  document.getElementById('cb-toggle').addEventListener('click', toggle);
  document.getElementById('cb-close-btn').addEventListener('click', toggle);
}

// ─── INJECT CSS (prevents needing <link> if script is loaded alone) ─
function injectCSS() {
  // CSS is loaded via <link> in the HTML — this is a fallback check
  if (document.querySelector('link[href*="chatbot.css"]')) return;
  const link = document.createElement('link');
  link.rel  = 'stylesheet';
  link.href = 'chatbot/chatbot.css';
  document.head.appendChild(link);
}

// ─── TOGGLE ─────────────────────────────────────────────────────
function toggle() {
  isOpen = !isOpen;
  $window.classList.toggle('cb-open', isOpen);
  $toggleChat.classList.toggle('hidden', isOpen);
  $toggleClose.classList.toggle('hidden', !isOpen);

  if (isOpen) {
    // Dismiss unread badge
    if (!badgeDismissed) {
      $badge.classList.add('hidden');
      badgeDismissed = true;
    }
    // Focus input
    setTimeout(() => $input.focus(), 280);
    // Scroll to bottom
    scrollBottom();
  }
}

// ─── HANDLE SEND ────────────────────────────────────────────────
async function handleSend() {
  const text = $input.value.trim();
  if (!text || isTyping) return;

  $input.value = '';
  removeQuickReplies();

  // Append user message to UI + history
  appendUserMessage(text);
  messages.push({ role: 'user', content: text });

  // Check if user is asking to leave contact info
  if (LEAD_REGEX.test(text)) {
    appendLeadForm();
    return;
  }

  await fetchReply();
}

// ─── FETCH REPLY FROM /api/chat ──────────────────────────────────
async function fetchReply() {
  isTyping = true;
  $send.disabled = true;
  const typingEl = appendTyping();

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const reply = data.reply || "I'm having trouble responding right now. Please try again or reach out at byan.oliveira.bgo@gmail.com";

    typingEl.remove();
    messages.push({ role: 'assistant', content: reply });

    const showCTA = CTA_REGEX.test(reply);
    appendBotMessage(reply, showCTA);

  } catch (_err) {
    typingEl.remove();
    const fallback = "I'm having trouble connecting right now. Please reach out directly at **byan.oliveira.bgo@gmail.com** or use the contact form.";
    appendBotMessage(fallback, true);
  } finally {
    isTyping = false;
    $send.disabled = false;
    $input.focus();
  }
}

// ─── APPEND USER MESSAGE ─────────────────────────────────────────
function appendUserMessage(text) {
  const wrap = document.createElement('div');
  wrap.className = 'cb-msg cb-msg-user';
  const bubble = document.createElement('div');
  bubble.className = 'cb-bubble';
  bubble.textContent = text; // textContent → XSS-safe
  wrap.appendChild(bubble);
  $messages.appendChild(wrap);
  scrollBottom();
}

// ─── APPEND BOT MESSAGE ──────────────────────────────────────────
function appendBotMessage(text, showCTA = false) {
  const wrap = document.createElement('div');
  wrap.className = 'cb-msg cb-msg-bot';

  const bubble = document.createElement('div');
  bubble.className = 'cb-bubble';
  bubble.innerHTML = renderMarkdown(text); // bot output — markdown rendering

  wrap.appendChild(bubble);

  // Append CTA button when booking intent detected
  if (showCTA) {
    const btn = document.createElement('a');
    btn.className = 'cb-cta-btn';
    btn.href = CONTACT_URL;
    btn.textContent = '📅 Book Free Strategy Call →';
    wrap.appendChild(btn);
  }

  $messages.appendChild(wrap);
  scrollBottom();
}

// ─── TYPING INDICATOR ────────────────────────────────────────────
function appendTyping() {
  const el = document.createElement('div');
  el.className = 'cb-typing';
  el.innerHTML = '<span></span><span></span><span></span>';
  $messages.appendChild(el);
  scrollBottom();
  return el;
}

// ─── QUICK REPLIES ───────────────────────────────────────────────
function appendQuickReplies(replies) {
  const wrap = document.createElement('div');
  wrap.className = 'cb-quick-replies';
  wrap.id = 'cb-qr';

  replies.forEach(label => {
    const btn = document.createElement('button');
    btn.className = 'cb-qr';
    btn.textContent = label;
    btn.addEventListener('click', () => {
      removeQuickReplies();

      if (label === 'Book a free strategy call') {
        window.location.href = CONTACT_URL;
        return;
      }

      appendUserMessage(label);
      messages.push({ role: 'user', content: label });
      fetchReply();
    });
    wrap.appendChild(btn);
  });

  // Add "📩 Leave your contact info" option
  const infoBtn = document.createElement('button');
  infoBtn.className = 'cb-qr';
  infoBtn.textContent = '📩 Leave your contact info';
  infoBtn.addEventListener('click', () => {
    removeQuickReplies();
    appendBotMessage("Sure! Fill in the form below and we'll reach out within 24 hours.", false);
    appendLeadForm();
  });
  wrap.appendChild(infoBtn);

  $messages.appendChild(wrap);
  scrollBottom();
}

function removeQuickReplies() {
  const qr = document.getElementById('cb-qr');
  if (qr) qr.remove();
}

// ─── INLINE LEAD FORM ────────────────────────────────────────────
// Triggers the existing Google Apps Script email integration
function appendLeadForm() {
  const formId = 'cb-lead-form-' + Date.now();

  const wrap = document.createElement('div');
  wrap.className = 'cb-msg cb-msg-bot';

  const form = document.createElement('div');
  form.className = 'cb-lead-form';
  form.id = formId;

  form.innerHTML = `
    <div class="cb-lead-form-title">Your Contact Info</div>
    <input class="cb-lead-input" id="${formId}-name"    type="text"  placeholder="Your full name"         autocomplete="name" />
    <input class="cb-lead-input" id="${formId}-email"   type="email" placeholder="Business email"         autocomplete="email" />
    <input class="cb-lead-input" id="${formId}-company" type="text"  placeholder="Company (optional)"     autocomplete="organization" />
    <select class="cb-lead-select" id="${formId}-service">
      <option value="">I'm interested in…</option>
      <option>Website Development</option>
      <option>Automations & AI Agents</option>
      <option>Strategic Consulting</option>
      <option>Automation Workflow</option>
      <option>Not sure yet — just exploring</option>
    </select>
    <button class="cb-lead-submit" id="${formId}-btn">Send Info →</button>`;

  // Make select show filled color when a value is chosen
  const select = form.querySelector(`#${formId}-service`);
  select.addEventListener('change', () => {
    select.classList.toggle('filled', select.value !== '');
  });

  // Submit handler
  const submitBtn = form.querySelector(`#${formId}-btn`);
  submitBtn.addEventListener('click', () => submitLeadForm(formId, form, wrap));

  wrap.appendChild(form);
  $messages.appendChild(wrap);
  scrollBottom();
}

// ─── SUBMIT LEAD FORM → Google Apps Script ───────────────────────
function submitLeadForm(formId, form, wrap) {
  const name    = document.getElementById(`${formId}-name`).value.trim();
  const email   = document.getElementById(`${formId}-email`).value.trim();
  const company = document.getElementById(`${formId}-company`).value.trim();
  const service = document.getElementById(`${formId}-service`).value;

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!name || !emailValid) {
    // Highlight missing/invalid fields
    if (!name)       document.getElementById(`${formId}-name`).style.borderColor  = 'rgba(220,50,50,0.6)';
    if (!emailValid) document.getElementById(`${formId}-email`).style.borderColor = 'rgba(220,50,50,0.6)';
    return;
  }

  const btn = document.getElementById(`${formId}-btn`);
  btn.textContent = 'Sending…';
  btn.disabled = true;

  const parts = name.split(' ');
  const payload = {
    firstName: parts[0] || name,
    lastName:  parts.slice(1).join(' ') || '',
    email,
    company,
    service:   service || 'Chat inquiry',
    goals:     'Lead submitted via chatbot widget.',
    selectedDate:     '',
    selectedTime:     '',
    selectedDateTime: '',
  };

  // POST to Google Apps Script (same integration as contact.html)
  fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    mode:   'no-cors',         // required for cross-origin Apps Script calls
    headers: { 'Content-Type': 'text/plain' },
    body:    JSON.stringify(payload),
  })
  .catch(() => {}) // no-cors always resolves without response body
  .finally(() => {
    // Replace form with success message — build DOM safely to avoid XSS
    wrap.innerHTML = '';
    const successMsg = document.createElement('div');
    successMsg.className = 'cb-msg cb-msg-bot';
    const bubble = document.createElement('div');
    bubble.className = 'cb-bubble';

    const line1 = document.createElement('strong');
    line1.textContent = `Got it — thanks, ${payload.firstName}!`;
    const line2 = document.createTextNode(' We\'ll be in touch at ');
    const emailStrong = document.createElement('strong');
    emailStrong.textContent = email;
    const line3 = document.createTextNode(' within 24 hours.');
    const br1 = document.createElement('br');
    const br2 = document.createElement('br');
    const line4 = document.createTextNode('Want to lock in a specific time? ');
    const link = document.createElement('a');
    link.href = CONTACT_URL;
    link.style.cssText = 'color:#D4AF37;font-weight:700;';
    link.textContent = 'Book a free call →';

    bubble.append(line1, br1, line2, emailStrong, line3, br2, line4, link);
    successMsg.appendChild(bubble);
    $messages.appendChild(successMsg);

    // Add the lead to conversation history
    messages.push({
      role: 'user',
      content: `[I just submitted my contact info: name=${name}, email=${email}, service=${service}]`,
    });

    scrollBottom();
  });
}

// ─── HTML ESCAPING ────────────────────────────────────────────────
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── MARKDOWN RENDERER (minimal, safe) ───────────────────────────
function renderMarkdown(text) {
  const lines = text.split('\n');
  let html = '';
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('- ') || trimmed.startsWith('• ')) {
      if (!inList) { html += '<ul>'; inList = true; }
      html += `<li>${inlineFormat(trimmed.slice(2))}</li>`;
    } else {
      if (inList) { html += '</ul>'; inList = false; }
      if (trimmed) {
        html += `<p>${inlineFormat(trimmed)}</p>`;
      }
    }
  }

  if (inList) html += '</ul>';
  return html || `<p>${inlineFormat(text)}</p>`;
}

function inlineFormat(text) {
  // Escape HTML entities first, then apply markdown patterns
  return escapeHtml(text)
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>');
}

// ─── SCROLL TO BOTTOM ────────────────────────────────────────────
function scrollBottom() {
  requestAnimationFrame(() => {
    $messages.scrollTop = $messages.scrollHeight;
  });
}

// ─── BOOTSTRAP ───────────────────────────────────────────────────
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
