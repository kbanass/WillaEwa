/**
 * Jednorazowy skrypt migracji zdjęć pokoi do Sanity.
 *
 * Uruchom z katalogu sanity/studio/:
 *   node --env-file=.env migrate-rooms.mjs
 */

import { createClient } from '@sanity/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOMS_DIR = path.resolve(__dirname, '../../client/public/rooms');

const token = process.env.SANITY_TOKEN;
if (!token) {
  console.error('Brak SANITY_TOKEN. Ustaw zmienną środowiskową i spróbuj ponownie.');
  process.exit(1);
}

const client = createClient({
  projectId: 'csed1mdo',
  dataset: 'production',
  apiVersion: '2024-01-01',
  token,
  useCdn: false,
});

async function run() {
  const files = fs.readdirSync(ROOMS_DIR)
    .filter((f) => /\.(webp|jpg|jpeg|png)$/i.test(f))
    .sort();

  console.log(`Znaleziono ${files.length} zdjęć pokoi.`);

  const uploadedImages = [];

  for (const filename of files) {
    const filePath = path.join(ROOMS_DIR, filename);
    console.log(`Wgrywanie: ${filename}...`);

    try {
      const fileBuffer = fs.readFileSync(filePath);
      const asset = await client.assets.upload('image', fileBuffer, {
        filename,
        contentType: filename.endsWith('.webp') ? 'image/webp' : 'image/jpeg',
      });

      uploadedImages.push({
        _key: `room-${path.basename(filename, path.extname(filename))}`,
        _type: 'object',
        image: {
          _type: 'image',
          asset: { _type: 'reference', _ref: asset._id },
        },
        alt: 'Pokój w Willi Ewa',
      });

      console.log(`  ✓ ${filename} → ${asset._id}`);
    } catch (err) {
      console.error(`  ✗ Błąd przy ${filename}: ${err.message}`);
    }
  }

  console.log(`\nTworzenie dokumentu roomsSlider w Sanity...`);

  await client.createOrReplace({
    _id: 'roomsSlider',
    _type: 'roomsSlider',
    images: uploadedImages,
  });

  await client.delete('drafts.roomsSlider').catch(Boolean);

  console.log(`✓ Gotowe! Wgrano ${uploadedImages.length} zdjęć pokoi.`);
}

run().catch((err) => {
  console.error('Błąd krytyczny:', err);
  process.exit(1);
});
