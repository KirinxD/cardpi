import sharp from "sharp";
import fs from "fs";
import path from "path";

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];

const svg = `
<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0a1a0a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#004411;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="digimonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#00b84a;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#39d66e;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="64" fill="url(#bgGrad)"/>
  <rect x="16" y="16" width="480" height="480" rx="48" fill="none" stroke="url(#digimonGrad)" stroke-width="8"/>
  
  <!-- Digivice-inspired center -->
  <circle cx="256" cy="256" r="120" fill="#002200" stroke="#00b84a" stroke-width="6"/>
  <circle cx="256" cy="256" r="90" fill="#001100" stroke="#008f3a" stroke-width="4"/>
  
  <!-- Screen -->
  <rect x="196" y="196" width="120" height="120" rx="8" fill="#003300" stroke="#00b84a" stroke-width="3"/>
  
  <!-- Digital monster pixel art in screen -->
  <!-- Agumon-inspired simple pixel art -->
  <g fill="#00ff41">
    <!-- Head -->
    <rect x="220" y="210" width="72" height="50" rx="4"/>
    <!-- Eyes -->
    <rect x="230" y="220" width="12" height="12" fill="#000"/>
    <rect x="270" y="220" width="12" height="12" fill="#000"/>
    <!-- Snout -->
    <rect x="244" y="240" width="24" height="16" rx="2"/>
    <!-- Nostrils -->
    <rect x="248" y="244" width="4" height="4" fill="#000"/>
    <rect x="260" y="244" width="4" height="4" fill="#000"/>
    <!-- Teeth -->
    <rect x="244" y="252" width="8" height="8"/>
    <rect x="260" y="252" width="8" height="8"/>
    <!-- Ear things -->
    <rect x="210" y="200" width="16" height="24" rx="2" transform="rotate(-30 210 200)"/>
    <rect x="286" y="200" width="16" height="24" rx="2" transform="rotate(30 286 200)"/>
  </g>
  
  <!-- Buttons below screen -->
  <g fill="#004411" stroke="#00b84a" stroke-width="2">
    <circle cx="256" cy="340" r="20"/>
    <circle cx="180" cy="370" r="14"/>
    <circle cx="332" cy="370" r="14"/>
  </g>
  
  <!-- DTP-LOSPI text -->
  <text x="256" y="440" font-family="monospace" font-size="32" font-weight="bold" fill="url(#digimonGrad)" text-anchor="middle" letter-spacing="4">DTP-LOSPI</text>
  <text x="256" y="470" font-family="monospace" font-size="16" fill="#00b84a" text-anchor="middle">TRACKER</text>
</svg>
`;

async function generateIcons() {
  const iconsDir = path.join(process.cwd(), "public", "icons");
  
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }

  const svgBuffer = Buffer.from(svg);

  for (const size of sizes) {
    const outputPath = path.join(iconsDir, `icon-${size}.png`);
    
    await sharp(svgBuffer)
      .resize(size, size, { fit: "contain", background: { r: 10, g: 26, b: 10, alpha: 1 } })
      .png()
      .toFile(outputPath);
    
    console.log(`Generated icon-${size}.png`);
  }

  // Also generate apple-touch-icon
  await sharp(svgBuffer)
    .resize(180, 180, { fit: "contain", background: { r: 10, g: 26, b: 10, alpha: 1 } })
    .png()
    .toFile(path.join(iconsDir, "apple-touch-icon.png"));
  
  console.log("Generated apple-touch-icon.png");
  console.log("All icons generated successfully!");
}

generateIcons().catch(console.error);