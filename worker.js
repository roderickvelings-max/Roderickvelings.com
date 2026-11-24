// Blog réservé : /blog et /blog-* demandent un mot de passe ; le reste du site est servi tel quel.
const PASS_HASH = "479977e5199ec7229d50c4098bcfff6cbcea6d89753b5660d7e566fd0b4ce897";
const COOKIE = "blog_acces";

async function sha256(text) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function isBlog(path) {
  return path === "/blog" || path === "/blog/" || path === "/blog.html" || path.startsWith("/blog-");
}

function loginPage(error) {
  const msg = error ? '<p class="err">Ce n\'est pas le bon mot de passe. Réessaie.</p>' : "";
  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow"><title>Blog réservé · Roderick Vélings</title><link rel="icon" href="/favicon.svg">
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#101f3d;color:#eef1f5;font:19px/1.55 Karla,system-ui,sans-serif}
main{width:min(92vw,520px);box-sizing:border-box;background:#fff;color:#101f3d;border-radius:20px;padding:clamp(28px,6vw,48px);box-shadow:0 24px 60px rgba(0,0,0,.35)}
h1{margin:0 0 12px;font:500 2.1rem/1.15 Georgia,serif}p{margin:0 0 24px;color:#4a5570}
label{display:block;font-weight:700;margin-bottom:8px}input{width:100%;box-sizing:border-box;padding:15px 16px;border:1px solid #c9d1de;border-radius:12px;font:inherit}
button{margin-top:18px;width:100%;padding:15px;border:0;border-radius:999px;background:#1a7a56;color:#fff;font:700 1.1rem Karla,system-ui,sans-serif;cursor:pointer}
.err{color:#b4553a;font-weight:700}a{color:#22488a}</style></head>
<body><main><h1>Le blog est réservé</h1><p>Les articles sont réservés à mes élèves. Entre le mot de passe que je t'ai donné.</p>${msg}
<form method="post"><label for="mdp">Mot de passe</label><input id="mdp" name="motdepasse" type="password" autocomplete="current-password" required autofocus>
<button type="submit">Entrer</button></form><p style="margin:18px 0 0;font-size:.9rem"><a href="/">Retour au site</a></p></main></body></html>`;
  return new Response(html, { status: 401, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" } });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!isBlog(url.pathname)) return env.ASSETS.fetch(request);
    const token = await sha256(PASS_HASH + ":acces-blog");
    if (request.method === "POST") {
      const form = await request.formData();
      const pass = String(form.get("motdepasse") || "").trim().toLowerCase();
      if ((await sha256(pass)) === PASS_HASH) {
        return new Response(null, { status: 303, headers: { Location: url.pathname, "Set-Cookie": `${COOKIE}=${token}; Path=/; Max-Age=7776000; HttpOnly; Secure; SameSite=Lax` } });
      }
      return loginPage(true);
    }
    const cookies = (request.headers.get("Cookie") || "").split(/;\s*/);
    if (!cookies.includes(`${COOKIE}=${token}`)) return loginPage(false);
    const res = await env.ASSETS.fetch(request);
    const headers = new Headers(res.headers);
    headers.set("X-Robots-Tag", "noindex, nofollow");
    headers.set("Cache-Control", "private, no-store");
    return new Response(res.body, { status: res.status, headers });
  },
};
