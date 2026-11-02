import nodemailer from 'nodemailer';
import { getEmailConfiguration } from '../config/email.js';

async function sendEmail(to, subject, html) {
    const configuration = getEmailConfiguration();
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: configuration.user,
            pass: configuration.password,
        },
    });
    return transporter.sendMail({
        from: configuration.user,
        to,
        subject,
        html,
    });
}

export async function sendResetEmail(email, resetLink) {
    return sendEmail(
        email,
        'Recupera tu contraseña',
        `<p>Haz clic <a href="${resetLink}">aquí</a> para restablecer tu contraseña. El enlace expira en 30 minutos.</p>`
    );
}

export async function sendPasswordChangedNotification(email) {
    await sendEmail(
        email,
        'Tu contraseña ha sido cambiada',
        '<p>Tu contraseña se cambió correctamente. Si no fuiste tú, contacta con soporte de inmediato.</p>'
    );
}

export async function sendVerificationEmail(email, verificationLink, emailChange = false) {
    await sendEmail(
        email,
        emailChange ? 'Confirma tu nuevo correo electrónico' : 'Verifica tu correo electrónico',
        emailChange
            ? `<p>Confirma el cambio de correo de tu cuenta: <a href="${verificationLink}">confirmar nuevo correo</a>.</p><p>El enlace caduca en 24 horas. Si no solicitaste este cambio, ignora el mensaje.</p>`
            : `<p>Confirma tu correo para activar tu cuenta: <a href="${verificationLink}">verificar correo</a>.</p><p>El enlace caduca en 24 horas.</p>`
    );
}