/**
 * Script to generate app icons from SVG
 * Run: node scripts/generate-icons.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

// SVG icon source - Fitly logo (updated design)
const svgIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f97316"/>
      <stop offset="100%" style="stop-color:#ec4899"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="108" fill="url(#gradient)"/>
  <g transform="translate(256, 270) scale(0.7) translate(-256, -256)">
    <path d="M160 180 L160 400 C160 415 172 427 187 427 L325 427 C340 427 352 415 352 400 L352 180" fill="white"/>
    <path d="M200 130 C200 130 220 160 256 160 C292 160 312 130 312 130 L352 180 L256 200 L160 180 L200 130 Z" fill="white"/>
    <path d="M160 180 L100 220 C90 226 85 240 90 252 L120 300 C125 310 138 315 150 310 L160 280" fill="white"/>
    <path d="M352 180 L412 220 C422 226 427 240 422 252 L392 300 C387 310 374 315 362 310 L352 280" fill="white"/>
  </g>
  <circle cx="390" cy="130" r="15" fill="white" opacity="0.8"/>
  <circle cx="415" cy="165" r="10" fill="white" opacity="0.6"/>
  <circle cx="430" cy="115" r="7" fill="white" opacity="0.5"/>
</svg>`;

// Favicon SVG (simpler for small sizes)
const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <defs>
    <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f97316"/>
      <stop offset="100%" style="stop-color:#ec4899"/>
    </linearGradient>
  </defs>
  <rect width="32" height="32" rx="6" fill="url(#g)"/>
  <g transform="translate(16, 17) scale(0.6) translate(-16, -16)">
    <path d="M10 12 L10 26 L22 26 L22 12" fill="white"/>
    <path d="M12 8 L16 11 L20 8 L22 12 L16 13.5 L10 12 L12 8 Z" fill="white"/>
    <path d="M10 12 L6 14 L8 20 L10 18" fill="white"/>
    <path d="M22 12 L26 14 L24 20 L22 18" fill="white"/>
  </g>
</svg>`;

async function generateIcons() {
    try {
        // Try to use sharp if available
        const sharp = await import('sharp').catch(() => null);
        
        if (sharp) {
            console.log('Using sharp for icon generation...');
            
            const sizes = [16, 32, 48, 128, 180, 192, 512];
            const extensionIconsDir = path.join(rootDir, 'apps/extension/icons');
            const webPublicDir = path.join(rootDir, 'apps/web/public');
            const webIconsDir = path.join(webPublicDir, 'icons');
            
            // Ensure directories exist
            [extensionIconsDir, webIconsDir].forEach(dir => {
                if (!fs.existsSync(dir)) {
                    fs.mkdirSync(dir, { recursive: true });
                }
            });
            
            // Generate icons
            for (const size of sizes) {
                const buffer = await sharp.default(Buffer.from(svgIcon))
                    .resize(size, size)
                    .png()
                    .toBuffer();
                
                // Extension icons
                if ([16, 48, 128].includes(size)) {
                    fs.writeFileSync(path.join(extensionIconsDir, `icon${size}.png`), buffer);
                    console.log(`✓ Generated icon${size}.png for extension`);
                }
                
                // Web app icons
                if ([192, 512].includes(size)) {
                    fs.writeFileSync(path.join(webIconsDir, `icon-${size}.png`), buffer);
                    console.log(`✓ Generated icon-${size}.png for web`);
                }
                
                // Apple touch icon (180x180)
                if (size === 180) {
                    fs.writeFileSync(path.join(webIconsDir, 'apple-touch-icon.png'), buffer);
                    console.log('✓ Generated apple-touch-icon.png for web');
                }
                
                // Favicon (32x32)
                if (size === 32) {
                    fs.writeFileSync(path.join(webPublicDir, 'favicon.png'), buffer);
                    console.log('✓ Generated favicon.png for web');
                }
            }
            
            // Generate maskable icon (with padding for safe zone)
            const maskableBuffer = await sharp.default(Buffer.from(svgIcon))
                .resize(440, 440)
                .extend({
                    top: 36,
                    bottom: 36,
                    left: 36,
                    right: 36,
                    background: { r: 249, g: 115, b: 22, alpha: 1 }
                })
                .resize(512, 512)
                .png()
                .toBuffer();
            
            fs.writeFileSync(path.join(webIconsDir, 'icon-maskable.png'), maskableBuffer);
            console.log('✓ Generated icon-maskable.png for web');
            
            // Also save SVG versions
            fs.writeFileSync(path.join(extensionIconsDir, 'icon.svg'), svgIcon);
            fs.writeFileSync(path.join(webPublicDir, 'icon.svg'), svgIcon);
            console.log('✓ Saved SVG icons');
            
            console.log('\n✅ All icons generated successfully!');
        } else {
            console.log('Sharp not available. Saving SVG files only...');
            
            // Save SVG files
            const extensionIconsDir = path.join(rootDir, 'apps/extension/icons');
            const webPublicDir = path.join(rootDir, 'apps/web/public');
            
            fs.writeFileSync(path.join(extensionIconsDir, 'icon.svg'), svgIcon);
            fs.writeFileSync(path.join(webPublicDir, 'icon.svg'), svgIcon);
            fs.writeFileSync(path.join(webPublicDir, 'favicon.svg'), faviconSvg);
            
            console.log('✓ Saved SVG icons');
            console.log('\n⚠️  To generate PNG icons, install sharp: npm install sharp');
            console.log('   Then run this script again.');
        }
    } catch (error) {
        console.error('Error generating icons:', error);
    }
}

generateIcons();
