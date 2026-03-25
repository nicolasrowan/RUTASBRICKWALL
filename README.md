# RUTASBRICKWALL

Web app local que extrae la dirección del campo **CLIENTE** de los albaranes PDF de BRICKWALL y genera una ruta de Google Maps que empieza y acaba en el almacén.

---

## Stack

| Capa | Tecnología |
|---|---|
| Servidor | Node.js + Express |
| Parsing PDF | pdf-parse |
| Frontend | HTML + Tailwind CSS (CDN) |

---

## Cómo funciona

1. Arrastras uno o varios PDFs → el servidor extrae la dirección del cliente
2. La app lista las paradas detectadas (editables)
3. Pulsas **Generar Ruta** → obtienes:
   - Link de Google Maps: `Almacén → parada 1 → parada 2 → ... → Almacén`
   - Archivo KML para importar a Google My Maps

---

## Extracción de direcciones

El PDF mezcla columnas así al extraerse:
```
Mos3641336158EL MARCO 19 - TOMEZA
PONTEVEDRAPontevedra
```
La app detecta el patrón `{ciudadRemitente}{CP36413}{CPcliente}{calleCliente}` y extrae la dirección limpia del cliente.

---

## Estado actual

| Feature | Estado |
|---|---|
| Subir 1 PDF y extraer dirección | ✅ Funciona |
| Subir varios PDFs a la vez | ✅ Funciona |
| Ruta circular desde/hasta almacén | ✅ Funciona |
| Link Google Maps sin paradas extra | ✅ Corregido (formato `/dir/`) |
| KML para Google My Maps | ✅ Funciona |
| Añadir dirección manual | ✅ Funciona |

---

## Limitaciones conocidas

- **Máx. 25 paradas** en el link de Google Maps (límite de la URL). Con más, usar el KML.
- **Solo funciona con albaranes BRICKWALL** — la extracción está hardcodeada para ese formato de PDF (CP remitente 36413).
- Requiere **Node.js instalado** y ejecutar `iniciar.bat` manualmente cada vez.
- Si el PDF tiene la dirección del cliente en un formato muy distinto, la detección puede fallar y hay que añadirla a mano.

---

## Instalación y uso

```bash
# 1. Clonar el repositorio
git clone https://github.com/nicolasrowan/RUTASBRICKWALL.git
cd RUTASBRICKWALL

# 2. Instalar dependencias
npm install

# 3. Arrancar
# Doble clic en iniciar.bat
# o desde terminal:
node server.js
```

Abre el navegador en `http://localhost:3000`
