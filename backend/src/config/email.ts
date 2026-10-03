import nodemailer from 'nodemailer';
import { getEmailConfig } from '@backend/config/env';

export function getEmailTransporter() {
  const { user, pass } = getEmailConfig();
  return nodemailer.createTransport({ service: 'gmail', auth: { user, pass } });
}
