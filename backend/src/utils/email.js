
import nodemailer from 'nodemailer';
import { verificationTemplate, resetTemplate } from './emailTemplates.js';

export const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendVerificationEmail(to, token) {
  const link = `${process.env.API_PUBLIC_URL}/auth/verify?token=${encodeURIComponent(token)}`;
  await mailer.sendMail({
    from: process.env.MAIL_FROM || 'no-reply@loeni.app',
    to,
    subject: 'Vérifiez votre e‑mail',
    html: verificationTemplate(link),
  });
}

export async function sendResetEmail(to, token) {
  const link = `${process.env.CLIENT_URL}/reset-password?token=${encodeURIComponent(token)}`;
  await mailer.sendMail({
    from: process.env.MAIL_FROM || 'no-reply@loeni.app',
    to,
    subject: 'Réinitialisation du mot de passe',
    html: resetTemplate(link),
  });
}
