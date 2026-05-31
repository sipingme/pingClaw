#!/usr/bin/env zx

import 'zx/globals';
import sharp from 'sharp';
import png2icons from 'png2icons';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const ICONS_DIR = path.join(PROJECT_ROOT, 'resources', 'icons');
const EXPORT_SVG = path.join(PROJECT_ROOT, 'export.svg');
const LEGACY_SVG = path.join(ICONS_DIR, 'icon.svg');

echo`🎨 Generating PingClaw icons using Node.js...`;

async function loadMasterPngBuffer() {
  const svgCandidates = [EXPORT_SVG, LEGACY_SVG].filter((p) => fs.existsSync(p));

  for (const svgPath of svgCandidates) {
    const svgContent = fs.readFileSync(svgPath, 'utf-8');
    const embedded = svgContent.match(/data:image\/png;base64,([A-Za-z0-9+/=]+)/);
    if (embedded) {
      echo`  Using embedded PNG from ${path.relative(PROJECT_ROOT, svgPath)}`;
      return sharp(Buffer.from(embedded[1], 'base64'))
        .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
    }

    echo`  Rendering vector from ${path.relative(PROJECT_ROOT, svgPath)}...`;
    try {
      return await sharp(svgPath)
        .resize(1024, 1024, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
    } catch {
      echo`  ⚠️  Failed to render ${path.relative(PROJECT_ROOT, svgPath)}, trying next source...`;
    }
  }

  echo`❌ No usable icon source found. Expected export.svg or resources/icons/icon.svg`;
  process.exit(1);
}

await fs.ensureDir(ICONS_DIR);

try {
  const masterPngBuffer = await loadMasterPngBuffer();

  await sharp(masterPngBuffer)
    .resize(512, 512)
    .toFile(path.join(ICONS_DIR, 'icon.png'));
  echo`  ✅ Created icon.png (512x512)`;

  echo`🪟 Generating Windows .ico...`;
  const icoBuffer = png2icons.createICO(masterPngBuffer, png2icons.HERMITE, 0, false);
  if (icoBuffer) {
    fs.writeFileSync(path.join(ICONS_DIR, 'icon.ico'), icoBuffer);
    echo`  ✅ Created icon.ico`;
  } else {
    echo(chalk.red`  ❌ Failed to create icon.ico`);
  }

  echo`🍎 Generating macOS .icns...`;
  const icnsBuffer = png2icons.createICNS(masterPngBuffer, png2icons.HERMITE, 0);
  if (icnsBuffer) {
    fs.writeFileSync(path.join(ICONS_DIR, 'icon.icns'), icnsBuffer);
    echo`  ✅ Created icon.icns`;
  } else {
    echo(chalk.red`  ❌ Failed to create icon.icns`);
  }

  echo`🐧 Generating Linux PNG icons...`;
  const linuxSizes = [16, 32, 48, 64, 128, 256, 512];
  for (const size of linuxSizes) {
    await sharp(masterPngBuffer)
      .resize(size, size)
      .toFile(path.join(ICONS_DIR, `${size}x${size}.png`));
  }
  echo`  ✅ Created ${linuxSizes.length} Linux PNG icons`;

  echo`📍 Generating macOS tray icon template...`;
  await sharp(masterPngBuffer)
    .resize(22, 22)
    .grayscale()
    .threshold(128)
    .png()
    .toFile(path.join(ICONS_DIR, 'tray-icon-Template.png'));
  echo`  ✅ Created tray-icon-Template.png (22x22)`;

  echo`\n✨ Icon generation complete! Files located in: ${ICONS_DIR}`;
} catch (error) {
  echo(chalk.red`\n❌ Fatal Error: ${error.message}`);
  process.exit(1);
}
