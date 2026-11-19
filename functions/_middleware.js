// Every address the game answers to sends people on to tugboattycoon.com, except the old tugboat-tycoon.pages.dev (kept
// while players move their games over) and Cloudflare's preview addresses.
const HOME = 'tugboattycoon.com', OTHERS = ['www.tugboattycoon.com', 'tugtycoon.com', 'www.tugtycoon.com'];
export async function onRequest({ request, next }) {
  const u = new URL(request.url);
  if (OTHERS.includes(u.hostname)) { u.hostname = HOME; u.protocol = 'https:'; u.port = ''; return Response.redirect(u.toString(), 301); }
  return next();
}
