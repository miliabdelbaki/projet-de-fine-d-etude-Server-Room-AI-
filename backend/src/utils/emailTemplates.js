
export function verificationTemplate(link) {
  return `
  <div style="font-family:Arial,sans-serif">
    <h2>Vérifiez votre adresse e‑mail</h2>
    <p>Merci d'avoir créé un compte. Cliquez le bouton ci‑dessous pour vérifier votre e‑mail.</p>
    <p><a href="${link}" style="background:#2563EB;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block">Vérifier mon e‑mail</a></p>
    <p>Ou copiez le lien dans votre navigateur :<br><a href="${link}">${link}</a></p>
    <p style="color:#6b7280">Ce lien expire dans 24h.</p>
  </div>`;
}

export function resetTemplate(link) {
  return `
  <div style="font-family:Arial,sans-serif">
    <h2>Réinitialisation du mot de passe</h2>
    <p>Vous avez demandé à réinitialiser votre mot de passe. Cliquez le bouton ci‑dessous.</p>
    <p><a href="${link}" style="background:#2563EB;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block">Réinitialiser</a></p>
    <p>Ou copiez le lien :<br><a href="${link}">${link}</a></p>
    <p style="color:#6b7280">Ce lien expire dans 30 minutes.</p>
  </div>`;
}
