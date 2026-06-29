import "server-only";
import nodemailer from "nodemailer";

// Αποστολή μέσω Gmail / Google Workspace (SMTP με App Password).
let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter {
  if (transporter) return transporter;
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!user || !pass) {
    throw new Error(
      "Λείπουν τα SMTP_USER / SMTP_PASS. Όρισέ τα στο .env (Gmail App Password)."
    );
  }
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return transporter;
}

export type SendArgs = {
  fromName: string;
  fromEmail: string;
  to: string;
  subject: string;
  // Σώμα σε plain text/markdown-ish· μετατρέπεται σε απλό HTML.
  body: string;
};

export async function sendEmail(args: SendArgs): Promise<void> {
  const t = getTransporter();
  const html = bodyToHtml(args.body);
  await t.sendMail({
    from: `"${args.fromName}" <${args.fromEmail}>`,
    sender: process.env.SMTP_USER, // ο πραγματικός λογαριασμός Gmail
    to: args.to,
    subject: args.subject,
    text: args.body,
    html,
  });
}

function bodyToHtml(body: string): string {
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const paragraphs = escaped
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 16px">${p.replace(/\n/g, "<br/>")}</p>`)
    .join("");
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1a1a1a">${paragraphs}</div>`;
}

export { renderTemplate, TEMPLATE_VARIABLES } from "./templates";
