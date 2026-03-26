import { docCtx, setupCanvas, clearRegions, resetZoom, cropRegionToBlob, getRegions, getDocumentBlob } from './canvas.js';
import { initI18n, t } from './i18n.js';
import { processOcr } from './ocr.js';
import { loadPdf } from './pdf.js';
import { showLoader, hideLoader, showStep, showToast, calcStats } from './utils.js';

await initI18n();
