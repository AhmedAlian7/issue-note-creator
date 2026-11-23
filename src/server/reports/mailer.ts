export type MailAttachment = { filename: string; content: Uint8Array };

export type Mail = {
  from: string;
  to: string[];
  subject: string;
  html: string;
  attachments?: MailAttachment[];
};

export type MailResult = { rejected: string[] };

function addressOf(from: string) {
  const match = /<([^>]+)>/.exec(from);
  return match ? match[1] : from.trim();
}

async function resend(mail: Mail): Promise<MailResult> {
  const key = process.env.RESEND_API_KEY!;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: mail.from,
      // Resend requires a visible recipient. Keep the distribution list in BCC
      // so recipients do not see each other's addresses.
      to: [addressOf(mail.from)],
      bcc: mail.to,
      subject: mail.subject,
      html: mail.html,
      attachments: mail.attachments?.map((file) => ({
        filename: file.filename,
        content: Buffer.from(file.content).toString("base64"),
      })),
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    const detail = (await response.text().catch(() => "")).slice(0, 300);
    throw Object.assign(
      new Error("Resend rejected the message (" + response.status + "): " + detail),
      { responseCode: response.status },
    );
  }
  return { rejected: [] };
}

async function smtp(mail: Mail): Promise<MailResult> {
  const nodemailer = (await import("nodemailer")).default;
  const port = Number(process.env.SMTP_PORT || 587);
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "localhost",
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  const info: { rejected?: string[] } = await transport.sendMail({
    from: mail.from,
    bcc: mail.to,
    subject: mail.subject,
    html: mail.html,
    attachments: mail.attachments?.map((file) => ({
      filename: file.filename,
      content: Buffer.from(file.content),
    })),
  });
  return { rejected: info.rejected ?? [] };
}

export function sendMail(mail: Mail): Promise<MailResult> {
  return process.env.RESEND_API_KEY ? resend(mail) : smtp(mail);
}
