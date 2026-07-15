/**
 * Jednorazowy skrypt migracji galerii do Sanity.
 *
 * Uruchom z katalogu sanity/studio/:
 *   node migrate-gallery.mjs
 *
 * Wymaga: SANITY_TOKEN w zmiennych środowiskowych (token z uprawnieniami editor/write)
 * Utwórz token na: https://sanity.io/manage → projekt → API → Tokens
 */

import { createClient } from '@sanity/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const GALLERY_DIR = path.resolve(__dirname, '../../client/public/gallery');
const CAPTIONS_FILE = path.resolve(__dirname, '../../client/src/gallery-captions.json');

const token = process.env.SANITY_TOKEN;
if (!token) {
  console.error('Brak SANITY_TOKEN. Ustaw zmienną środowiskową i spróbuj ponownie.');
  console.error('Utwórz token na: https://sanity.io/manage → API → Tokens (rola: Editor)');
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
  // Wczytaj captions
  const captions = JSON.parse(fs.readFileSync(CAPTIONS_FILE, 'utf-8'));
  const captionMap = new Map(captions.map((c) => [c.id, { text: c.text, url: c.url }]));

  // Lista plików w katalogu galerii (posortowana)
  const files = fs.readdirSync(GALLERY_DIR)
    .filter((f) => /\.(webp|jpg|jpeg|png)$/i.test(f))
    .sort();

  console.log(`Znaleziono ${files.length} plików w galerii.`);

  const uploadedImages = [];

  for (const filename of files) {
    const id = path.basename(filename, path.extname(filename)); // np. "0002"
    const caption = captionMap.get(id);
    const filePath = path.join(GALLERY_DIR, filename);

    console.log(`Wgrywanie: ${filename}...`);

    try {
      const fileBuffer = fs.readFileSync(filePath);
      const asset = await client.assets.upload('image', fileBuffer, {
        filename,
        contentType: filename.endsWith('.webp') ? 'image/webp' : 'image/jpeg',
      });

      uploadedImages.push({
        _key: `gallery-${id}`,
        _type: 'object',
        image: {
          _type: 'image',
          asset: {
            _type: 'reference',
            _ref: asset._id,
          },
        },
        alt: caption?.text || `Zdjęcie z galerii Willi Ewa`,
        caption: caption?.text || '',
        captionUrl: caption?.url || '',
      });

      console.log(`  ✓ ${filename} → ${asset._id}`);
    } catch (err) {
      console.error(`  ✗ Błąd przy ${filename}: ${err.message}`);
    }
  }

  console.log(`\nTworzenie/aktualizacja dokumentu gallery w Sanity...`);

  // Zapisz jako opublikowany dokument (nie draft) — ID bez prefiksu "drafts."
  await client.createOrReplace({
    _id: 'gallery',
    _type: 'gallery',
    images: uploadedImages,
  });

  // Usuń ewentualny draft żeby Studio nie pokazywało konfliktu
  await client.delete('drafts.gallery').catch(Boolean);

  console.log(`✓ Gotowe! Wgrano ${uploadedImages.length} zdjęć do Sanity.`);
  console.log('\nMożesz teraz otworzyć Sanity Studio i zmienić kolejność/podpisy zdjęć.');
}

run().catch((err) => {
  console.error('Błąd krytyczny:', err);
  process.exit(1);
});
