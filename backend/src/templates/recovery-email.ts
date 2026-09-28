const ASSETS_URL = 'https://sgde-fawn.vercel.app';

export function crearCorreoRecuperacion(codigo: string) {
  if (!/^\d{6}$/.test(codigo)) throw new Error('El código debe contener seis dígitos.');

  return {
    text: `SIGDE — Recuperación de contraseña\n\nTu código de verificación es: ${codigo}\n\nIngresa este código en la pantalla de recuperación de SIGDE. Expira en 15 minutos. No compartas este código.\n\nSi no solicitaste este cambio, ignora este mensaje. Tu contraseña no cambiará.`,
    html: `<!doctype html>
<html lang="es">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Código de verificación — SIGDE</title></head>
<body style="margin:0;padding:0;background-color:#edf3fa;font-family:Arial,Helvetica,sans-serif;color:#101828;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">Tu código para recuperar el acceso a SIGDE vence en 15 minutos.</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#edf3fa;">
<tr><td align="center" style="padding:28px 12px;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;">
<tr><td align="center" bgcolor="#06152f" background="${ASSETS_URL}/sigde-space-background.png" style="padding:42px 24px;background-color:#06152f;background-image:url('${ASSETS_URL}/sigde-space-background.png');background-position:center;background-size:cover;border-radius:24px 24px 0 0;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" bgcolor="#0a1628" style="padding:20px 28px;border:1px solid #284767;border-radius:16px;background-color:#0a1628;">
<p style="margin:0;font-size:38px;line-height:46px;font-weight:700;letter-spacing:5px;color:#e8f4fd;">SI<span style="color:#66c5ed;">G</span>DE</p>
<p style="margin:8px 0 0;font-size:10px;line-height:17px;letter-spacing:1.4px;color:#c5ddf1;">SISTEMA DE GESTIÓN<br>DIGITAL ESCOLAR</p>
</td></tr></table>
</td></tr>
<tr><td align="center" bgcolor="#ffffff" style="padding:30px 24px 34px;background-color:#ffffff;border:1px solid #d6dfeb;border-top:0;border-radius:0 0 24px 24px;">
<img src="${ASSETS_URL}/Logo-login.png" width="68" height="72" alt="SIGDE" style="display:block;margin:0 auto 20px;border:0;">
<p style="margin:0 0 10px;font-size:11px;line-height:18px;font-weight:700;letter-spacing:1.8px;color:#1f6fb8;">RECUPERA TU ACCESO</p>
<h1 style="margin:0;font-size:25px;line-height:32px;font-weight:700;color:#0a1628;">Tu código de verificación</h1>
<p style="margin:14px 0 24px;font-size:15px;line-height:24px;color:#667085;">Ingresa estos seis dígitos en la pantalla<br>de recuperación de SIGDE.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:360px;"><tr><td align="center" bgcolor="#eaf3fb" style="padding:22px 8px;border:1px solid #bed8ef;border-radius:16px;background-color:#eaf3fb;">
<p style="margin:0;font-family:'Courier New',monospace;font-size:34px;line-height:44px;font-weight:700;letter-spacing:5px;color:#1f6fb8;">${codigo}</p>
</td></tr></table>
<p style="margin:16px 0 24px;font-size:13px;line-height:20px;color:#667085;">Este código expira en <strong style="color:#0a1628;">15 minutos</strong>.</p>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td style="padding-top:22px;border-top:1px solid #e4ecf4;">
<p style="margin:0;font-size:13px;line-height:21px;color:#667085;"><strong style="color:#0a1628;">Cuida tu cuenta.</strong> No compartas este código con otras personas.</p>
<p style="margin:10px 0 0;font-size:12px;line-height:20px;color:#667085;">Si no solicitaste este cambio, puedes ignorar este mensaje. Tu contraseña no cambiará.</p>
</td></tr></table>
</td></tr>
<tr><td align="center" style="padding:20px 18px;"><p style="margin:0;font-size:11px;line-height:18px;color:#667085;">SIGDE · Sistema de Gestión Digital Escolar<br>Mensaje automático de recuperación de acceso.</p></td></tr>
</table>
</td></tr></table>
</body></html>`,
  };
}
