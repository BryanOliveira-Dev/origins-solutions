// ─────────────────────────────────────────────────────────────────
//  Origins Solutions · Chatbot Knowledge Base
//  Imported by: api/chat.js (server-side system prompt)
//  Imported by: chatbot/chatbot.js (bot identity, quick replies)
// ─────────────────────────────────────────────────────────────────

export const BOT_NAME   = 'Origins Assistant';
export const BOT_AVATAR = '◈';
export const BOT_INTRO  = "Hi! I'm the Origins Assistant. I can answer questions about our services, pricing, and process — or help you book a free strategy call. How can I help?";

export const QUICK_REPLIES = [
  'What services do you offer?',
  'How much does it cost?',
  'How long does it take?',
  'Book a free strategy call',
];

// Same URL used in contact.html — safe to expose client-side
export const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzD5Y8C4o0WS3hu9py2WPL4bnVfHhVzLEebfLuJcTD7l4LQs2wGOZwtG5iu0jgH66H2Gg/exec';
