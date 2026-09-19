import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
    ? new Resend(process.env.RESEND_API_KEY)
    : null;
const sender = process.env.RESEND_FROM || 'noreply@tuapp.com';

export async function sendResetEmail(email, resetLink) {
    if (!resend) throw new Error('RESEND_API_KEY no está configurada');

    const { error } = await resend.emails.send({
        from: sender,
        to: email,
        subject: 'Recupera tu contraseña',
        html: `<p>Haz clic <a href="${resetLink}">aquí</a> para restablecer tu contraseña. El enlace expira en 30 minutos.</p>`,
    });
    if (error) throw error;
}

export async function sendPasswordChangedNotification(email) {
    if (!resend) throw new Error('RESEND_API_KEY no está configurada');

    const { error } = await resend.emails.send({
        from: sender,
        to: email,
        subject: 'Tu contraseña ha sido cambiada',
        html: `<p>Tu contraseña se cambió correctamente. Si no fuiste tú, contacta con soporte de inmediato.</p>`,
    });
    if (error) throw error;
}