const icon = `
<svg xmlns="http://www.w3.org/2000/svg" width="192" height="192" viewBox="0 0 192 192">
  <rect width="192" height="192" rx="42" fill="#4648d4"/>
  <path d="M66 86V67c0-17 13-30 30-30s30 13 30 30v19" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round"/>
  <rect x="50" y="80" width="92" height="70" rx="16" fill="none" stroke="#fff" stroke-width="12"/>
  <circle cx="96" cy="115" r="7" fill="#fff"/>
</svg>`;

export function GET() {
  return new Response(icon, {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'image/svg+xml',
    },
  });
}
