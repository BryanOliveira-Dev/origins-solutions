// ─────────────────────────────────────────────────────────────────
//  Origins Solutions — Lead Agent
//  Google Apps Script · deploy as Web App
//
//  SETUP:
//  1. Go to https://script.google.com → New Project
//  2. Paste this entire file
//  3. Click Deploy → New Deployment → Web App
//     • Execute as: Me
//     • Who has access: Anyone
//  4. Copy the deployment URL into contact.html (APPS_SCRIPT_URL)
// ─────────────────────────────────────────────────────────────────

const OWNER_EMAIL      = 'byan.oliveira.bgo@gmail.com';
const AVAILABLE_TIMES  = ['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM', '4:00 PM'];

// ─── GET: availability checks ─────────────────────────────────────
//
//  ?action=day&date=YYYY-MM-DD
//    → { booked: ["9:00 AM", "2:00 PM", ...] }
//
//  ?action=month&year=YYYY&month=M   (month = 0-indexed, same as JS)
//    → { fullyBookedDays: [3, 14, 22, ...] }   (day numbers)
//
function doGet(e) {
  const action = e.parameter.action;

  try {
    if (action === 'day') {
      const booked = getBookedSlotsForDay(e.parameter.date);
      return jsonResponse({ booked });
    }

    if (action === 'month') {
      const year  = parseInt(e.parameter.year,  10);
      const month = parseInt(e.parameter.month, 10); // 0-indexed
      const fullyBookedDays = getFullyBookedDays(year, month);
      return jsonResponse({ fullyBookedDays });
    }

    return jsonResponse({ error: 'Unknown action' });

  } catch (err) {
    console.error('doGet error:', err);
    return jsonResponse({ error: err.toString() });
  }
}

// ─── POST: submit lead ────────────────────────────────────────────
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    sendLeadEmail(data);

    if (data.selectedDate && data.selectedTime) {
      createCalendarEvent(data);
    }

    return jsonResponse({ success: true });

  } catch (err) {
    console.error('Lead agent error:', err);
    return jsonResponse({ success: false, error: err.toString() });
  }
}

// ─── AVAILABILITY HELPERS ─────────────────────────────────────────

// Returns array of booked time strings for a given "YYYY-MM-DD" date.
function getBookedSlotsForDay(dateStr) {
  const date   = parseDateStr(dateStr);
  const events = CalendarApp.getDefaultCalendar().getEventsForDay(date);
  return AVAILABLE_TIMES.filter(t => isSlotBooked(t, date, events));
}

// Returns array of day-of-month numbers that have ALL slots booked.
function getFullyBookedDays(year, month) {
  const startOfMonth = new Date(year, month, 1);
  const endOfMonth   = new Date(year, month + 1, 0);
  const fullyBooked  = [];

  for (let d = new Date(startOfMonth); d <= endOfMonth; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();
    if (dow === 0 || dow === 6) continue; // skip weekends

    const dayCopy = new Date(d);
    const events  = CalendarApp.getDefaultCalendar().getEventsForDay(dayCopy);
    const allFull = AVAILABLE_TIMES.every(t => isSlotBooked(t, dayCopy, events));
    if (allFull) fullyBooked.push(dayCopy.getDate());
  }

  return fullyBooked;
}

// Returns true if timeStr overlaps any existing event on that date.
function isSlotBooked(timeStr, date, events) {
  const slotStart = parseTimeOnDate(timeStr, date);
  const slotEnd   = new Date(slotStart.getTime() + 30 * 60 * 1000);

  return events.some(ev => {
    const eStart = ev.getStartTime();
    const eEnd   = ev.getEndTime();
    return eStart < slotEnd && eEnd > slotStart;
  });
}

// Parse "YYYY-MM-DD" → Date (local midnight)
function parseDateStr(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Set hour/minute from "9:00 AM" onto a copy of date
function parseTimeOnDate(timeStr, date) {
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  let   hours = parseInt(match[1], 10);
  const mins  = parseInt(match[2], 10);
  const ampm  = match[3].toUpperCase();
  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours  = 0;

  const result = new Date(date);
  result.setHours(hours, mins, 0, 0);
  return result;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── EMAIL SUMMARY ────────────────────────────────────────────────
function sendLeadEmail(data) {
  const name    = `${data.firstName} ${data.lastName}`;
  const service = data.service || 'General Inquiry';
  const subject = `New Lead: ${name} — ${service}`;

  const callRow = data.selectedDateTime
    ? `<tr>
         <td class="label">Call Scheduled</td>
         <td style="padding:12px 0;border-bottom:1px solid rgba(212,175,55,0.15);
                    color:#D4AF37;font-size:14px;font-weight:700">
           &#128197; ${data.selectedDateTime}
         </td>
       </tr>`
    : '';

  const goalsBlock = data.goals
    ? `<div style="margin-top:24px;padding:18px 20px;
                   background:rgba(212,175,55,0.06);border-left:3px solid #D4AF37">
         <p style="color:#888;font-size:10px;text-transform:uppercase;
                   letter-spacing:2px;margin:0 0 10px">Client Goals</p>
         <p style="color:#E8E8E8;font-size:14px;line-height:1.75;margin:0">${data.goals}</p>
       </div>`
    : '';

  const labelStyle = `padding:12px 0;border-bottom:1px solid rgba(212,175,55,0.15);
                      color:#888;font-size:11px;text-transform:uppercase;
                      letter-spacing:1px;width:28%;vertical-align:top`;
  const valueStyle = `padding:12px 0;border-bottom:1px solid rgba(212,175,55,0.15);
                      color:#E8E8E8;font-size:14px;font-weight:500`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#0a0a0a">
<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;
            background:#0C0C0C;color:#E8E8E8;padding:48px 40px;
            border:1px solid rgba(212,175,55,0.2)">

  <div style="border-bottom:2px solid #D4AF37;padding-bottom:20px;margin-bottom:32px">
    <p style="margin:0;font-size:21px;font-weight:900;letter-spacing:3px;color:#D4AF37">
      ORIGINS <span style="color:#fff">SOLUTIONS</span>
    </p>
    <p style="margin:6px 0 0;font-size:9px;letter-spacing:3px;
              text-transform:uppercase;color:#666">Lead Notification</p>
  </div>

  <h2 style="color:#fff;font-size:20px;font-weight:800;margin:0 0 6px">
    New lead from ${name}
  </h2>
  <p style="color:#888;font-size:13px;margin:0 0 28px">
    Submitted on ${new Date().toLocaleDateString('en-US', {
      weekday:'long', year:'numeric', month:'long', day:'numeric'
    })}
  </p>

  <table style="width:100%;border-collapse:collapse">
    <tr>
      <td style="${labelStyle}">Name</td>
      <td style="${valueStyle.replace('#E8E8E8','#fff')};font-weight:700">${name}</td>
    </tr>
    <tr>
      <td style="${labelStyle}">Email</td>
      <td style="${valueStyle}">
        <a href="mailto:${data.email}" style="color:#D4AF37;text-decoration:none;font-weight:600">
          ${data.email}
        </a>
      </td>
    </tr>
    <tr>
      <td style="${labelStyle}">Phone</td>
      <td style="${valueStyle}">${data.phone || 'Not provided'}</td>
    </tr>
    <tr>
      <td style="${labelStyle}">Company</td>
      <td style="${valueStyle}">${data.company || 'Not provided'}</td>
    </tr>
    <tr>
      <td style="${labelStyle}">Interested In</td>
      <td style="${valueStyle};color:#D4AF37;font-weight:700">${service}</td>
    </tr>
    ${callRow}
  </table>

  ${goalsBlock}

  <div style="margin-top:36px;text-align:center;padding-top:28px;
              border-top:1px solid rgba(212,175,55,0.12)">
    <a href="mailto:${data.email}?subject=Re: Your Origins Solutions Inquiry"
       style="display:inline-block;padding:15px 36px;
              background:linear-gradient(135deg,#F0D060,#D4AF37);
              color:#0C0C0C;text-decoration:none;font-size:12px;
              font-weight:800;letter-spacing:1.5px;text-transform:uppercase">
      Reply to ${data.firstName} &#8594;
    </a>
  </div>

  <p style="color:#444;font-size:10px;text-align:center;
            margin-top:32px;letter-spacing:1px">
    Origins Solutions · Automated Lead Agent
  </p>
</div>
</body>
</html>`;

  const plainText = [
    `New Lead — ${name}`,
    `─────────────────────────────`,
    `Email:   ${data.email}`,
    `Phone:   ${data.phone || 'N/A'}`,
    `Company: ${data.company || 'N/A'}`,
    `Service: ${service}`,
    data.selectedDateTime ? `Call:    ${data.selectedDateTime}` : '',
    ``,
    `Goals:`,
    data.goals || 'Not provided',
  ].filter(l => l !== undefined).join('\n');

  GmailApp.sendEmail(OWNER_EMAIL, subject, plainText, {
    htmlBody: htmlBody,
    replyTo:  data.email,
    name:     'Origins Solutions · Lead Alert',
  });
}

// ─── CALENDAR EVENT ───────────────────────────────────────────────
function createCalendarEvent(data) {
  const dateStr = data.selectedDate;
  const timeStr = data.selectedTime;

  const timeParts = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!timeParts) { console.error('Could not parse time:', timeStr); return; }

  let hours  = parseInt(timeParts[1], 10);
  const mins = parseInt(timeParts[2], 10);
  const ampm = timeParts[3].toUpperCase();
  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours  = 0;

  const dateParts = dateStr.match(/(\w+ \d+,\s*\d{4})$/);
  if (!dateParts) { console.error('Could not parse date:', dateStr); return; }

  const startDate = new Date(dateParts[1]);
  startDate.setHours(hours, mins, 0, 0);
  const endDate = new Date(startDate.getTime() + 30 * 60 * 1000);

  const title = `Strategy Call — ${data.firstName} ${data.lastName} (${data.service || 'Inquiry'})`;

  const description = [
    `CLIENT INFORMATION`,
    `──────────────────`,
    `Name:    ${data.firstName} ${data.lastName}`,
    `Email:   ${data.email}`,
    `Phone:   ${data.phone    || 'N/A'}`,
    `Company: ${data.company  || 'N/A'}`,
    `Service: ${data.service  || 'N/A'}`,
    ``,
    `THEIR GOALS`,
    `──────────────────`,
    data.goals || 'Not provided',
  ].join('\n');

  CalendarApp.getDefaultCalendar().createEvent(title, startDate, endDate, {
    description: description,
    guests:      data.email,
    sendInvites: true,
  });

  console.log(`Calendar event created: ${title} on ${startDate}`);
}
