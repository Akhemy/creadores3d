/* fetch-places.js — corre via GitHub Actions cada ~25 días
   Lee de Google Places API y guarda fotos + reseñas localmente.
   Requiere la variable de entorno GOOGLE_PLACES_KEY. */

const https = require('https');
const http  = require('http');
const fs    = require('fs');
const path  = require('path');

const KEY = process.env.GOOGLE_PLACES_KEY;
if (!KEY) { console.error('❌  GOOGLE_PLACES_KEY no configurada'); process.exit(1); }

const ROOT       = path.join(__dirname, '..');
const PHOTOS_DIR = path.join(ROOT, 'img', 'google-photos');
const DATA_FILE  = path.join(ROOT, 'data', 'google-places.json');

fs.mkdirSync(PHOTOS_DIR, { recursive: true });
fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });

function get(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return get(res.headers.location).then(resolve).catch(reject);
      }
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        try { resolve(JSON.parse(body)); } catch { resolve(body); }
      });
    }).on('error', reject);
  });
}

function downloadBinary(url, filepath) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        return downloadBinary(res.headers.location, filepath).then(resolve).catch(reject);
      }
      const file = fs.createWriteStream(filepath);
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
      file.on('error', err => { fs.unlink(filepath, () => {}); reject(err); });
    }).on('error', reject);
  });
}

async function main() {
  console.log('🔍  Buscando Creadora3D en Google Places...');

  // 1 — Find place
  const findUrl =
    `https://maps.googleapis.com/maps/api/place/findplacefromtext/json` +
    `?input=Creadora3D&inputtype=textquery` +
    `&locationbias=circle:15000@-38.0175666,-57.600534` +
    `&fields=place_id,name&key=${KEY}`;

  const found = await get(findUrl);
  if (!found.candidates?.length) {
    console.error('❌  Lugar no encontrado. Status:', found.status);
    process.exit(1);
  }

  const { place_id, name } = found.candidates[0];
  console.log(`✅  Encontrado: ${name} (${place_id})`);

  // 2 — Place details
  const detailsUrl =
    `https://maps.googleapis.com/maps/api/place/details/json` +
    `?place_id=${place_id}` +
    `&fields=name,rating,user_ratings_total,photos,reviews` +
    `&language=es&key=${KEY}`;

  const details = await get(detailsUrl);
  if (details.status !== 'OK') {
    console.error('❌  Error en detalles:', details.status);
    process.exit(1);
  }

  const place = details.result;
  console.log(`⭐  Rating: ${place.rating} (${place.user_ratings_total} reseñas)`);

  // 3 — Download photos (máx 6)
  const photos = [];
  const photoRefs = (place.photos || []).slice(0, 6);

  for (let i = 0; i < photoRefs.length; i++) {
    const ref      = photoRefs[i].photo_reference;
    const filename = `photo-${i + 1}.jpg`;
    const filepath = path.join(PHOTOS_DIR, filename);
    const url      =
      `https://maps.googleapis.com/maps/api/place/photo` +
      `?maxwidth=800&photo_reference=${ref}&key=${KEY}`;

    try {
      await downloadBinary(url, filepath);
      photos.push(`img/google-photos/${filename}`);
      console.log(`  📷  Foto ${i + 1} descargada`);
    } catch (err) {
      console.error(`  ⚠️  Foto ${i + 1} falló:`, err.message);
    }
  }

  // 4 — Filter reviews ≥ 4 estrellas
  const reviews = (place.reviews || [])
    .filter(r => r.rating >= 4)
    .map(r => ({
      author: r.author_name,
      rating: r.rating,
      text:   r.text,
      time:   r.relative_time_description,
      photo:  r.profile_photo_url || null,
    }));

  console.log(`💬  ${reviews.length} reseñas positivas encontradas`);

  // 5 — Save JSON
  const data = {
    updated: new Date().toISOString().split('T')[0],
    rating:  place.rating,
    total:   place.user_ratings_total,
    photos,
    reviews,
  };

  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  console.log(`✅  Guardado: ${photos.length} fotos, ${reviews.length} reseñas → data/google-places.json`);
}

main().catch(err => { console.error(err); process.exit(1); });
