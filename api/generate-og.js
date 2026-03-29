// FORGE OG Image Generator — Returns a 1200x630 PNG
// Used as fallback when no static og-image.png exists
// Access: GET /api/generate-og

export const config = { runtime: 'nodejs' };

export default async function handler(req) {
  // Return an SVG that social platforms can render
  // Most modern platforms support SVG, but we set proper headers
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#07080a"/>
        <stop offset="100%" stop-color="#0c0e11"/>
      </linearGradient>
      <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#d4aa4a"/>
        <stop offset="100%" stop-color="#e8c86a"/>
      </linearGradient>
      <radialGradient id="glow" cx="50%" cy="40%" r="50%">
        <stop offset="0%" stop-color="rgba(212,170,74,0.12)"/>
        <stop offset="100%" stop-color="transparent"/>
      </radialGradient>
    </defs>
    <rect width="1200" height="630" fill="url(#bg)"/>
    <rect width="1200" height="630" fill="url(#glow)"/>
    <rect x="0" y="0" width="1200" height="5" fill="url(#gold)"/>
    <text x="600" y="250" text-anchor="middle" font-family="system-ui,-apple-system,sans-serif" font-weight="900" font-size="110" letter-spacing="12" fill="url(#gold)">FORGE</text>
    <text x="600" y="320" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="500" font-size="30" fill="#8a9099">Forge ta meilleure version. 1% chaque jour.</text>
    <text x="355" y="420" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="700" font-size="16" fill="#d4aa4a">🤖 Mentor IA</text>
    <text x="510" y="420" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="700" font-size="16" fill="#4db87a">🎮 Gamification</text>
    <text x="680" y="420" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="700" font-size="16" fill="#4a9ed4">📚 12 Formations</text>
    <text x="845" y="420" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="700" font-size="16" fill="#8b6de0">🌿 30+ Outils</text>
    <line x1="100" y1="560" x2="1100" y2="560" stroke="#1e252e" stroke-width="1"/>
    <text x="600" y="590" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="600" font-size="16" fill="#424b57">forge-app.com — Gratuit</text>
  </svg>`;

  return new Response(svg, {
    headers: {
      'Content-Type': 'image/svg+xml',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
