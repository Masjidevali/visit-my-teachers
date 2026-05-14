import nodemailer from 'nodemailer';
import { generateGoogleCalendarUrl } from '@/lib/calendar';
import QRCode from 'qrcode';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

const FROM_NAME = 'Madrasah Vali Visit-My-Teachers';
const FROM_EMAIL = process.env.GMAIL_FROM || process.env.GMAIL_USER;

function emailTemplate(title: string, body: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#FAFAF7;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAF7;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.04);">
        <!-- Brand stripe -->
        <tr>
          <td style="height:4px;font-size:0;line-height:0;">
            <table width="100%" cellpadding="0" cellspacing="0"><tr>
              <td width="33.33%" style="background:#7BC800;height:4px;"></td>
              <td width="33.33%" style="background:#007BCB;height:4px;"></td>
              <td width="33.34%" style="background:#C91212;height:4px;"></td>
            </tr></table>
          </td>
        </tr>
        <!-- Header -->
        <tr>
          <td style="background:#007BCB;padding:32px 40px;text-align:center;">
            <h1 style="margin:0;color:#ffffff;font-size:28px;font-weight:700;font-family:Georgia,'Times New Roman',serif;letter-spacing:-0.5px;">Madrasah Vali</h1>
            <div style="width:40px;height:1px;background:rgba(255,255,255,0.3);margin:12px auto;"></div>
            <p style="margin:0;color:rgba(255,255,255,0.7);font-size:13px;letter-spacing:1px;text-transform:uppercase;">${title}</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            ${body}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;background:#FAFAF7;border-top:1px solid #f0ede8;">
            <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center;letter-spacing:0.3px;">
              Madrasah Vali Visit-My-Teachers Booking System
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function detailsTable(rows: Array<{ label: string; value: string; style?: string }>): string {
  return `
    <table style="width:100%;border-collapse:separate;border-spacing:0;margin:0 0 24px;border:1px solid #f0ede8;border-radius:10px;overflow:hidden;">
      ${rows.map((row, i) => `
        <tr>
          <td style="padding:10px 16px;background:#FAFAF7;font-weight:600;width:140px;color:#374151;font-size:13px;${i > 0 ? 'border-top:1px solid #f0ede8;' : ''}">${row.label}</td>
          <td style="padding:10px 16px;color:#374151;font-size:14px;${i > 0 ? 'border-top:1px solid #f0ede8;' : ''}${row.style || ''}">${row.value}</td>
        </tr>
      `).join('')}
    </table>`;
}

function button(text: string, href: string): string {
  return `
    <div style="text-align:center;margin:0 0 24px;">
      <a href="${href}" target="_blank" style="display:inline-block;padding:12px 28px;background:#007BCB;color:#ffffff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;letter-spacing:0.3px;">
        ${text}
      </a>
    </div>`;
}

const GREETING = (name?: string) =>
  `<p style="margin:0 0 16px;color:#374151;font-size:15px;">Assalamu Alaikum${name ? ` <strong>${name}</strong>` : ''},</p>`;

const CLOSING =
  `<p style="margin:0;color:#9ca3af;font-size:13px;font-style:italic;">JazakAllahu Khairan</p>`;

export async function sendBookingConfirmation(details: {
  parentName: string;
  parentEmail: string;
  studentName: string;
  className: string;
  teacherName: string;
  date: string;
  time: string;
  bookingRef: string;
  room?: string;
  rawDate?: string;
  rawStartTime?: string;
  rawEndTime?: string;
  specialRequest?: string;
}) {
  const rows = [
    { label: 'Student', value: details.studentName },
    { label: 'Class', value: details.className },
    ...(details.teacherName ? [{ label: 'Teacher', value: details.teacherName }] : []),
    { label: 'Date', value: details.date },
    { label: 'Time', value: details.time },
    ...(details.room ? [{ label: 'Location', value: details.room }] : []),
    { label: 'Booking Ref', value: details.bookingRef, style: 'font-family:monospace;font-size:16px;font-weight:700;color:#007BCB;' },
  ];

  const calendarBtn = details.rawDate && details.rawStartTime && details.rawEndTime
    ? button('Add to Google Calendar', generateGoogleCalendarUrl({
        studentName: details.studentName,
        className: details.className,
        teacherName: details.teacherName,
        bookingRef: details.bookingRef,
        eventDate: details.rawDate,
        startTime: details.rawStartTime,
        endTime: details.rawEndTime,
        room: details.room,
      }))
    : '';

  let qrHtml = '';
  let qrAttachment: { filename: string; content: Buffer; cid: string } | null = null;
  try {
    const qrBuffer = await QRCode.toBuffer(details.bookingRef, { width: 140, margin: 1, type: 'png' });
    qrAttachment = { filename: 'qr-checkin.png', content: qrBuffer, cid: 'qrcheckin' };
    qrHtml = `<div style="text-align:center;margin:0 0 24px;"><img src="cid:qrcheckin" alt="QR Code" width="140" height="140" style="border-radius:8px;" /><p style="margin:8px 0 0;font-size:11px;color:#9ca3af;">Show this QR code on arrival for quick check-in</p></div>`;
  } catch { /* QR generation failed, skip */ }

  const body = `
    ${GREETING(details.parentName)}
    <p style="margin:0 0 24px;color:#374151;font-size:15px;">Your Visit-My-Teachers appointment has been confirmed. Here are the details:</p>
    ${detailsTable(rows)}
    ${qrHtml}
    ${calendarBtn}
    ${details.specialRequest ? `
    <div style="background:#FEF3C7;border:1px solid #FDE68A;border-radius:10px;padding:16px;margin:0 0 24px;">
      <p style="margin:0 0 4px;color:#92400E;font-size:14px;font-weight:600;">Special Request Submitted</p>
      <p style="margin:0;color:#A16207;font-size:13px;">Your request for <strong>${details.specialRequest}</strong> has been submitted and is subject to approval. You will receive a separate email once it has been reviewed.</p>
    </div>` : ''}
    <p style="margin:0 0 8px;color:#374151;font-size:14px;">Please keep your booking reference safe. You can use it to view or cancel your appointment.</p>
    ${CLOSING}
  `;

  await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: details.parentEmail,
    subject: `Booking Confirmed - ${details.studentName} - ${details.date} at ${details.time}`,
    html: emailTemplate('Booking Confirmation', body),
    ...(qrAttachment ? { attachments: [qrAttachment] } : {}),
  });
}

export async function sendCancellationConfirmation(details: {
  parentName: string;
  parentEmail: string;
  studentName: string;
  className: string;
  date: string;
  time: string;
  bookingRef: string;
}) {
  const rows = [
    { label: 'Student', value: details.studentName },
    { label: 'Class', value: details.className },
    { label: 'Date', value: details.date },
    { label: 'Time', value: details.time },
    { label: 'Booking Ref', value: details.bookingRef, style: 'font-family:monospace;color:#9ca3af;text-decoration:line-through;' },
  ];

  const body = `
    ${GREETING(details.parentName)}
    <p style="margin:0 0 24px;color:#374151;font-size:15px;">Your Visit-My-Teachers appointment has been <strong>cancelled</strong>. The time slot has been released for others to book.</p>
    ${detailsTable(rows)}
    <p style="margin:0 0 8px;color:#374151;font-size:14px;">If this was a mistake, you can book a new appointment using your child&apos;s Student ID.</p>
    ${CLOSING}
  `;

  await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: details.parentEmail,
    subject: `Booking Cancelled - ${details.studentName}`,
    html: emailTemplate('Booking Cancelled', body),
  });
}

export async function sendBookingReminder(details: {
  parentName: string;
  parentEmail: string;
  studentName: string;
  className: string;
  teacherName: string;
  date: string;
  time: string;
  bookingRef: string;
  room?: string;
}) {
  const rows = [
    { label: 'Student', value: details.studentName },
    { label: 'Class', value: details.className },
    ...(details.teacherName ? [{ label: 'Teacher', value: details.teacherName }] : []),
    { label: 'Date', value: details.date },
    { label: 'Time', value: details.time },
    ...(details.room ? [{ label: 'Location', value: details.room }] : []),
  ];

  const body = `
    ${GREETING(details.parentName)}
    <p style="margin:0 0 24px;color:#374151;font-size:15px;">This is a reminder that your Visit-My-Teachers appointment is <strong>tomorrow</strong>.</p>
    ${detailsTable(rows)}
    <p style="margin:0 0 8px;color:#374151;font-size:14px;">Your booking reference is: <strong style="font-family:monospace;color:#007BCB;">${details.bookingRef}</strong></p>
    ${CLOSING}
  `;

  await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: details.parentEmail,
    subject: `Reminder: Visit-My-Teachers Tomorrow - ${details.studentName} at ${details.time}`,
    html: emailTemplate('Appointment Reminder', body),
  });
}

export async function sendRescheduleConfirmation(details: {
  parentName: string;
  parentEmail: string;
  studentName: string;
  className: string;
  teacherName: string;
  date: string;
  oldTime: string;
  newTime: string;
  bookingRef: string;
  room?: string;
  rawDate?: string;
  rawStartTime?: string;
  rawEndTime?: string;
}) {
  const rows = [
    { label: 'Student', value: details.studentName },
    { label: 'Class', value: details.className },
    ...(details.teacherName ? [{ label: 'Teacher', value: details.teacherName }] : []),
    { label: 'Date', value: details.date },
    { label: 'Previous Time', value: details.oldTime, style: 'color:#9ca3af;text-decoration:line-through;' },
    { label: 'New Time', value: details.newTime, style: 'color:#7BC800;font-weight:700;' },
    ...(details.room ? [{ label: 'Location', value: details.room }] : []),
    { label: 'Booking Ref', value: details.bookingRef, style: 'font-family:monospace;font-size:16px;font-weight:700;color:#007BCB;' },
  ];

  const calendarBtn = details.rawDate && details.rawStartTime && details.rawEndTime
    ? button('Add to Google Calendar', generateGoogleCalendarUrl({
        studentName: details.studentName,
        className: details.className,
        teacherName: details.teacherName,
        bookingRef: details.bookingRef,
        eventDate: details.rawDate,
        startTime: details.rawStartTime,
        endTime: details.rawEndTime,
        room: details.room,
      }))
    : '';

  const body = `
    ${GREETING(details.parentName)}
    <p style="margin:0 0 24px;color:#374151;font-size:15px;">Your Visit-My-Teachers appointment has been <strong>rescheduled</strong>. Here are your updated details:</p>
    ${detailsTable(rows)}
    ${calendarBtn}
    ${CLOSING}
  `;

  await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: details.parentEmail,
    subject: `Appointment Rescheduled - ${details.studentName} - ${details.date} at ${details.newTime}`,
    html: emailTemplate('Appointment Rescheduled', body),
  });
}

export async function sendUnbookedReminder(details: {
  parentEmail: string;
  studentName: string;
  className: string;
  studentId: string;
  eventName: string;
  cc?: string;
}) {
  const bookingUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://vmt.madrasahvali.com'}/book/${encodeURIComponent(details.studentId)}`;

  const body = `
    ${GREETING()}
    <p style="margin:0 0 24px;color:#374151;font-size:15px;">This is a reminder to book your Visit-My-Teachers appointment for <strong>${details.studentName}</strong> (${details.className}).</p>
    <p style="margin:0 0 24px;color:#374151;font-size:15px;">Please click the button below to book your slot:</p>
    ${button('Book Appointment', bookingUrl)}
    <p style="margin:0 0 8px;color:#374151;font-size:13px;">If the button doesn&apos;t work, copy and paste this link into your browser:</p>
    <p style="margin:0 0 16px;color:#9ca3af;font-size:12px;word-break:break-all;">${bookingUrl}</p>
    ${CLOSING}
  `;

  await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: details.parentEmail,
    cc: details.cc || undefined,
    subject: `Book Your Visit-My-Teachers Appointment - ${details.studentName}`,
    html: emailTemplate('Booking Reminder', body),
  });
}

export async function sendAutoAssignNotification(details: {
  parentEmail: string;
  studentName: string;
  className: string;
  teacherName: string;
  date: string;
  time: string;
  bookingRef: string;
  room?: string;
  rescheduleUrl: string;
}) {
  const rows = [
    { label: 'Student', value: details.studentName },
    { label: 'Class', value: details.className },
    ...(details.teacherName ? [{ label: 'Teacher', value: details.teacherName }] : []),
    { label: 'Date', value: details.date },
    { label: 'Time', value: details.time },
    ...(details.room ? [{ label: 'Location', value: details.room }] : []),
    { label: 'Booking Ref', value: details.bookingRef, style: 'font-family:monospace;font-size:16px;font-weight:700;color:#007BCB;' },
  ];

  const body = `
    ${GREETING()}
    <p style="margin:0 0 24px;color:#374151;font-size:15px;">A Visit-My-Teachers appointment has been automatically assigned for <strong>${details.studentName}</strong>. Here are the details:</p>
    ${detailsTable(rows)}
    <p style="margin:0 0 16px;color:#374151;font-size:14px;">If this time doesn&apos;t work for you, you can reschedule or cancel using the link below:</p>
    ${button('View or Change Appointment', details.rescheduleUrl)}
    ${CLOSING}
  `;

  await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: details.parentEmail,
    subject: `Appointment Auto-Assigned - ${details.studentName} - ${details.date} at ${details.time}`,
    html: emailTemplate('Appointment Assigned', body),
  });
}

export async function sendRequestStatusEmail(details: {
  parentName: string;
  parentEmail: string;
  studentName: string;
  requestType: string;
  status: 'approved' | 'rejected';
  adminNotes?: string;
}) {
  const statusColor = details.status === 'approved' ? '#7BC800' : '#C91212';
  const statusText = details.status === 'approved' ? 'Approved' : 'Rejected';

  const rows = [
    { label: 'Request Type', value: details.requestType },
    { label: 'Status', value: statusText, style: `color:${statusColor};font-weight:700;` },
    ...(details.adminNotes ? [{ label: 'Notes', value: details.adminNotes }] : []),
  ];

  const body = `
    ${GREETING(details.parentName)}
    <p style="margin:0 0 24px;color:#374151;font-size:15px;">Your special arrangement request for <strong>${details.studentName}</strong> has been updated:</p>
    ${detailsTable(rows)}
    ${CLOSING}
  `;

  await transporter.sendMail({
    from: `"${FROM_NAME}" <${FROM_EMAIL}>`,
    to: details.parentEmail,
    subject: `Special Request ${statusText} - ${details.studentName}`,
    html: emailTemplate('Special Request Update', body),
  });
}
