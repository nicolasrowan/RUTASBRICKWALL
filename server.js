const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const path = require('path');

const app = express();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 16 * 1024 * 1024 } });

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Fixed depot address (start and end of every route)
const DEPOT = 'Camino Nogueiras 1 nave 3, Tameiga, 36416, Pontevedra';

// Sender's postal code in the albarán (left column) — used to split the mixed address line
const SENDER_CP = '36413';

/**
 * Extract the CLIENTE address from a BRICKWALL albarán PDF text.
 *
 * pdf-parse merges the two columns line by line, producing mixed lines like:
 *   "36413 Mos  EL MARCO 19 - TOMEZA  36158"
 *   "PONTEVEDRA  Pontevedra"
 *
 * We split on the sender's CP to isolate the client's street + CP,
 * then take the city from the next line.
 */
function extractClienteAddress(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);

  for (let i = 0; i < lines.length; i++) {
    // pdf-parse merges columns without spaces, producing lines like:
    //   "Mos3641336158EL MARCO 19 - TOMEZA"
    //   i.e. {SenderCity}{SenderCP}{ClientCP}{ClientStreet}
    //
    // Pattern: one word (sender city) + 5 digits (sender CP) + 5 digits (client CP) + rest (client street)
    const addrMatch = lines[i].match(/^\w+\d{5}(\d{5})(.+)$/);

    if (addrMatch) {
      const cp     = addrMatch[1];        // e.g. "36158"
      const street = addrMatch[2].trim(); // e.g. "EL MARCO 19 - TOMEZA"

      // Next line: "PONTEVEDRAPontevedra"
      // ALL-CAPS = sender province, TitleCase = client city
      let city = 'Pontevedra';
      if (i + 1 < lines.length) {
        // Split where an all-caps sequence is immediately followed by a title-case word
        const cityMatch = lines[i + 1].match(/^[A-ZÁÉÍÓÚÑ]+([A-ZÁÉÍÓÚÑ][a-záéíóúñ].*)$/);
        if (cityMatch) city = cityMatch[1].trim();
      }

      return `${street}, ${cp}, ${city}`;
    }
  }

  return null;
}

function buildMapsUrl(clientAddresses) {
  // /dir/ format: each /-separated segment = exactly one stop (no address splitting)
  const all = [DEPOT, ...clientAddresses, DEPOT];
  const encoded = all.map(a => encodeURIComponent(a.trim()));
  return `https://www.google.com/maps/dir/${encoded.join('/')}`;
}

function buildKml(clientAddresses) {
  const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const depotPlacemark = `
  <Placemark>
    <name>ALMACÉN (Inicio/Fin)</name>
    <description>${esc(DEPOT)}</description>
    <address>${esc(DEPOT)}</address>
  </Placemark>`;

  const clientPlacemarks = clientAddresses.map((addr, i) => `
  <Placemark>
    <name>Parada ${i + 1}</name>
    <description>${esc(addr)}</description>
    <address>${esc(addr)}</address>
  </Placemark>`).join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Ruta de clientes</name>
    <description>Generado automáticamente desde albaranes BRICKWALL</description>
    ${depotPlacemark}
    ${clientPlacemarks}
  </Document>
</kml>`;
}

// ── Routes ────────────────────────────────────────────────────────────────────

app.post('/upload', upload.single('pdf'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });
  if (!req.file.originalname.toLowerCase().endsWith('.pdf')) {
    return res.status(400).json({ error: 'El archivo debe ser un PDF' });
  }

  try {
    const data = await pdfParse(req.file.buffer);
    const text = data.text || '';

    const address = extractClienteAddress(text);

    // Fallback: return raw lines so the user can pick manually
    const rawLines = text.split('\n')
      .map(l => l.trim())
      .filter(l => l.length > 5)
      .slice(0, 200);

    res.json({
      address,              // single detected address or null
      raw_lines: rawLines,
      filename: req.file.originalname
    });
  } catch (e) {
    res.status(500).json({ error: `Error al procesar el PDF: ${e.message}` });
  }
});

app.post('/generate', (req, res) => {
  const addresses = (req.body.addresses || []).map(a => a.trim()).filter(Boolean);
  if (!addresses.length) return res.status(400).json({ error: 'No hay direcciones' });

  const maps_url = buildMapsUrl(addresses);
  const kml      = buildKml(addresses);

  res.json({ maps_url, kml, count: addresses.length, depot: DEPOT });
});

app.get('/depot', (req, res) => res.json({ depot: DEPOT }));

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`✓ App corriendo en http://localhost:${PORT}`);
});
