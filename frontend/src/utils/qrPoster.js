import QRCode from 'qrcode';
import templateUrl from '../assets/qr-poster.png';

// Locandina «Ti siamo piaciuti?» col QR del bar, da stampare e tenere nel
// locale. Il template è il qr.png di partenza (2×) col riquadro del QR vuoto:
// qui si disegnano i moduli, i tre occhi arancioni e il pin col calice.
// Stessa geometria di Android (ui/modals/QrPoster.kt) e iOS (QrPoster.swift):
// cambiarla vuol dire cambiarla in tutti e tre.
// Correzione H: il pin copre circa il 5% dei moduli.

const QR_X = 332;
const QR_Y = 748;
const QR_SIZE = 936;
const ORANGE = '#DF7B19';
const CREAM = '#FBF7EC';
const PIN_R = 0.0908; // raggio del pin / lato del QR
const PIN_TIP = 1.54; // centro del pin → punta, in raggi
const PIN_PAD = 0.3; // margine libero attorno al pin, in moduli
// Raggi degli angoli degli occhi, in moduli: bordo, foro, centro.
const EYE_R = 1.8;
const HOLE_R = 0.8;
const DOT_R = 0.9;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Rettangolo arrotondato con un angolo vivo, quello rivolto al centro del QR.
function cornerRect(ctx, x, y, w, h, r, sharp) {
  const [tl, tr, br, bl] = ['tl', 'tr', 'br', 'bl'].map((c) => (c === sharp ? 0 : r));
  ctx.beginPath();
  ctx.moveTo(x + tl, y);
  ctx.arcTo(x + w, y, x + w, y + h, tr);
  ctx.arcTo(x + w, y + h, x, y + h, br);
  ctx.arcTo(x, y + h, x, y, bl);
  ctx.arcTo(x, y, x + w, y, tl);
  ctx.closePath();
  ctx.fill();
}

/** La locandina per `url` come PNG. */
export async function renderQrPoster(url) {
  const qr = QRCode.create(url, { errorCorrectionLevel: 'H' });
  const template = await loadImage(templateUrl);
  const canvas = document.createElement('canvas');
  canvas.width = template.naturalWidth;
  canvas.height = template.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(template, 0, 0);

  const n = qr.modules.size;
  const mod = QR_SIZE / n;
  const cx = QR_X + QR_SIZE / 2;
  const cy = QR_Y + QR_SIZE / 2;

  // Pin a goccia: cerchio più il triangolo tangente fino alla punta, centrato
  // sul QR. ty/tx = punti di tangenza rispetto al centro del cerchio.
  const r = PIN_R * QR_SIZE;
  const tip = PIN_TIP * r;
  const pcy = cy - (r + tip) / 2 + r;
  const cos = r / tip;
  const ty = r * cos;
  const tx = r * Math.sqrt(1 - cos * cos);
  const pad = PIN_PAD * mod;
  const inPin = (x, y) => {
    const dx = x - cx;
    const dy = y - pcy;
    if (dx * dx + dy * dy <= (r + pad) ** 2) return true;
    if (dy < ty || dy > tip + pad) return false;
    return Math.abs(dx) <= Math.max(0, (tx * (tip - dy)) / (tip - ty)) + pad;
  };
  const inEye = (row, col) => (row < 7 && (col < 7 || col >= n - 7)) || (row >= n - 7 && col < 7);

  ctx.fillStyle = '#000';
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (!qr.modules.get(row, col) || inEye(row, col)) continue;
      const x = QR_X + col * mod;
      const y = QR_Y + row * mod;
      const h = mod / 2;
      if ([[0, 0], [mod, 0], [0, mod], [mod, mod], [h, h]].some(([a, b]) => inPin(x + a, y + b))) continue;
      // Mezzo pixel in più: niente filo chiaro fra due moduli vicini.
      ctx.fillRect(x, y, mod + 0.5, mod + 0.5);
    }
  }

  for (const [row, col, sharp] of [[0, 0, 'br'], [0, n - 7, 'bl'], [n - 7, 0, 'tr']]) {
    const x = QR_X + col * mod;
    const y = QR_Y + row * mod;
    ctx.fillStyle = ORANGE;
    cornerRect(ctx, x, y, 7 * mod, 7 * mod, EYE_R * mod, sharp);
    ctx.fillStyle = '#fff';
    cornerRect(ctx, x + mod, y + mod, 5 * mod, 5 * mod, HOLE_R * mod, sharp);
    ctx.fillStyle = '#000';
    cornerRect(ctx, x + 2 * mod, y + 2 * mod, 3 * mod, 3 * mod, DOT_R * mod, sharp);
  }

  ctx.fillStyle = ORANGE;
  ctx.beginPath();
  ctx.arc(cx, pcy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(cx - tx, pcy + ty);
  ctx.lineTo(cx + tx, pcy + ty);
  ctx.lineTo(cx, pcy + tip);
  ctx.closePath();
  ctx.fill();

  // Calice, in raggi del pin dal centro del cerchio.
  ctx.strokeStyle = CREAM;
  ctx.lineWidth = 0.1 * r;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const rimY = pcy - 0.412 * r;
  const rimX = 0.541 * r;
  const stemTop = pcy + 0.212 * r;
  const baseY = pcy + 0.565 * r;
  const baseX = 0.306 * r;
  ctx.beginPath();
  ctx.moveTo(cx - rimX, rimY);
  ctx.lineTo(cx + rimX, rimY);
  ctx.lineTo(cx, stemTop);
  ctx.closePath();
  ctx.moveTo(cx, stemTop);
  ctx.lineTo(cx, baseY);
  ctx.moveTo(cx - baseX, baseY);
  ctx.lineTo(cx + baseX, baseY);
  ctx.stroke();

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('toBlob failed'))), 'image/png');
  });
}
