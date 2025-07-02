// Sidebar navigation
const navItems = document.querySelectorAll('.nav-item');
const sections = document.querySelectorAll('.section');
navItems.forEach(item => {
  item.addEventListener('click', () => {
    navItems.forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    sections.forEach(sec => sec.classList.remove('active'));
    document.getElementById(item.dataset.section + '-section').classList.add('active');
  });
});

// Image upload and gallery
const uploadBtn = document.getElementById('uploadBtn');
const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const galleryGrid = document.getElementById('galleryGrid');
let images = [];

uploadBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFiles);

uploadArea.addEventListener('dragover', e => {
  e.preventDefault();
  uploadArea.classList.add('dragover');
});
uploadArea.addEventListener('dragleave', e => {
  e.preventDefault();
  uploadArea.classList.remove('dragover');
});
uploadArea.addEventListener('drop', e => {
  e.preventDefault();
  uploadArea.classList.remove('dragover');
  handleFiles({ target: { files: e.dataTransfer.files } });
});

function handleFiles(e) {
  const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = ev => {
      images.push(ev.target.result);
      renderGallery();
    };
    reader.readAsDataURL(file);
  });
}

// --- Conversion Tools ---
const convertSection = document.getElementById('convert-section');
const convertTools = document.getElementById('convertTools');
let selectedForConvert = null;

// Allow selecting an image from the gallery for conversion
function renderGallery() {
  galleryGrid.innerHTML = '';
  images.forEach((src, idx) => {
    const img = document.createElement('img');
    img.src = src;
    img.addEventListener('click', (e) => {
      if (e.ctrlKey || e.metaKey) {
        // Convert (already handled)
        selectedForConvert = idx;
        showConvertTools();
        navItems.forEach(i => i.classList.remove('active'));
        document.querySelector('.nav-item[data-section="convert"]').classList.add('active');
        sections.forEach(sec => sec.classList.remove('active'));
        convertSection.classList.add('active');
      } else {
        // Edit
        selectedForEdit = idx;
        showEditor();
        navItems.forEach(i => i.classList.remove('active'));
        document.querySelector('.nav-item[data-section="edit"]').classList.add('active');
        sections.forEach(sec => sec.classList.remove('active'));
        editSection.classList.add('active');
      }
    });
    galleryGrid.appendChild(img);
  });
}

function showConvertTools() {
  if (selectedForConvert === null) {
    convertTools.innerHTML = '<p>Select an image from the gallery to convert.</p>';
    return;
  }
  const src = images[selectedForConvert];
  convertTools.innerHTML = `
    <div class="convert-preview">
      <img src="${src}" style="max-width:200px;max-height:200px;border-radius:8px;box-shadow:0 2px 8px rgba(0,0,0,0.07);margin-bottom:16px;" />
    </div>
    <label for="formatSelect">Convert to:</label>
    <select id="formatSelect">
      <option value="jpeg">JPEG</option>
      <option value="png">PNG</option>
      <option value="webp">WebP</option>
      <option value="pdf">PDF</option>
    </select>
    <button id="convertDownloadBtn"><i class="fa fa-download"></i> Convert & Download</button>
  `;
  document.getElementById('convertDownloadBtn').onclick = handleConvertDownload;
}

async function handleConvertDownload() {
  const format = document.getElementById('formatSelect').value;
  const src = images[selectedForConvert];
  const img = new window.Image();
  img.src = src;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  let blob, url, filename;
  if (format === 'jpeg' || format === 'png' || format === 'webp') {
    const mime = format === 'jpeg' ? 'image/jpeg' : format === 'png' ? 'image/png' : 'image/webp';
    blob = await new Promise(res => canvas.toBlob(res, mime, 0.95));
    url = URL.createObjectURL(blob);
    filename = `converted.${format}`;
    triggerDownload(url, filename);
  } else if (format === 'pdf') {
    // Use pdf-lib to create a PDF with the image
    const { PDFDocument } = window.pdfLib;
    const pdfDoc = await PDFDocument.create();
    const imgBytes = await fetch(src).then(r => r.arrayBuffer());
    let pdfImage, dims;
    if (src.startsWith('data:image/png')) {
      pdfImage = await pdfDoc.embedPng(imgBytes);
      dims = pdfImage.scale(1);
    } else {
      pdfImage = await pdfDoc.embedJpg(imgBytes);
      dims = pdfImage.scale(1);
    }
    const page = pdfDoc.addPage([dims.width, dims.height]);
    page.drawImage(pdfImage, { x: 0, y: 0, width: dims.width, height: dims.height });
    const pdfBytes = await pdfDoc.save();
    blob = new Blob([pdfBytes], { type: 'application/pdf' });
    url = URL.createObjectURL(blob);
    filename = 'converted.pdf';
    triggerDownload(url, filename);
  }
}

function triggerDownload(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);
}

// Load pdf-lib for PDF conversion
(function loadPdfLib() {
  const script = document.createElement('script');
  script.src = 'https://cdn.jsdelivr.net/npm/pdf-lib/dist/pdf-lib.min.js';
  script.onload = () => { window.pdfLib = window.PDFLib; };
  document.body.appendChild(script);
})();

// Initial render
showConvertTools();

const editSection = document.getElementById('edit-section');
const editorCanvas = document.getElementById('editorCanvas');
const editorTools = document.getElementById('editorTools');
let selectedForEdit = null;
let editorCtx = editorCanvas.getContext('2d');

function showEditor() {
  if (selectedForEdit === null) {
    editorTools.innerHTML = '<p>Select an image from the gallery to edit.</p>';
    editorCanvas.style.display = 'none';
    return;
  }
  const src = images[selectedForEdit];
  const img = new window.Image();
  img.onload = function() {
    editorCanvas.width = img.naturalWidth;
    editorCanvas.height = img.naturalHeight;
    editorCtx.drawImage(img, 0, 0);
    editorCanvas.style.display = 'block';
    setupEditorTools();
  };
  img.src = src;
}

function setupEditorTools() {
  editorTools.innerHTML = `
    <div class="editor-controls">
      <button id="undoBtn"><i class="fa fa-undo"></i> Undo</button>
      <button id="redoBtn"><i class="fa fa-redo"></i> Redo</button>
      <button id="rotateLeftBtn"><i class="fa fa-undo"></i> Rotate Left</button>
      <button id="rotateRightBtn"><i class="fa fa-redo"></i> Rotate Right</button>
      <button id="startCropBtn"><i class="fa fa-crop"></i> Crop</button>
      <button id="applyCropBtn" style="display:none;"><i class="fa fa-check"></i> Apply Crop</button>
      <button id="cancelCropBtn" style="display:none;"><i class="fa fa-times"></i> Cancel Crop</button>
      <button id="exportBtn"><i class="fa fa-download"></i> Export</button>
      <select id="exportFormat">
        <option value="png">PNG</option>
        <option value="jpeg">JPEG</option>
      </select>
      <button id="addTextBtn"><i class="fa fa-font"></i> Add Text</button>
      <button id="addRectBtn"><i class="fa fa-square"></i> Rectangle</button>
      <button id="addCircleBtn"><i class="fa fa-circle"></i> Circle</button>
      <button id="addLineBtn"><i class="fa fa-minus"></i> Line</button>
      <button id="addEmojiBtn"><i class="fa fa-smile"></i> Emoji</button>
      <button id="removeBgBtn"><i class="fa fa-eraser"></i> Remove Background</button>
    </div>
    <div class="preset-filters">
      <button id="presetCinematic">Cinematic</button>
      <button id="presetBW">B&amp;W</button>
    </div>
    <div class="filter-controls">
      <label>Brightness <input type="range" id="brightnessSlider" min="0" max="2" step="0.01" value="1"></label>
      <label>Contrast <input type="range" id="contrastSlider" min="0" max="2" step="0.01" value="1"></label>
      <label>Saturation <input type="range" id="saturateSlider" min="0" max="2" step="0.01" value="1"></label>
      <label>Grayscale <input type="range" id="grayscaleSlider" min="0" max="1" step="0.01" value="0"></label>
      <label>Sepia <input type="range" id="sepiaSlider" min="0" max="1" step="0.01" value="0"></label>
      <label>Blur <input type="range" id="blurSlider" min="0" max="10" step="0.1" value="0"></label>
      <label>Exposure <input type="range" id="exposureSlider" min="-1" max="1" step="0.01" value="0"></label>
      <label>Highlights <input type="range" id="highlightsSlider" min="-1" max="1" step="0.01" value="0"></label>
      <label>Shadows <input type="range" id="shadowsSlider" min="-1" max="1" step="0.01" value="0"></label>
      <label>Temperature <input type="range" id="temperatureSlider" min="-1" max="1" step="0.01" value="0"></label>
      <label>Tint <input type="range" id="tintSlider" min="-1" max="1" step="0.01" value="0"></label>
      <label>Vignette <input type="range" id="vignetteSlider" min="0" max="1" step="0.01" value="0"></label>
      <label>Clarity <input type="range" id="claritySlider" min="0" max="2" step="0.01" value="1"></label>
    </div>
    <div id="textControls" style="display:none;margin-top:12px;">
      <input type="text" id="overlayText" placeholder="Enter text..." style="width:120px;">
      <input type="color" id="textColor" value="#232946">
      <select id="textFont">
        <option value="Arial">Arial</option>
        <option value="Georgia">Georgia</option>
        <option value="Impact">Impact</option>
        <option value="Courier New">Courier New</option>
        <option value="Times New Roman">Times New Roman</option>
      </select>
      <input type="number" id="textSize" min="10" max="200" value="32" style="width:60px;">
      <button id="finishTextBtn"><i class="fa fa-check"></i> Done</button>
    </div>
    <div id="shapeControls" style="display:none;margin-top:12px;">
      <input type="color" id="shapeColor" value="#eebbc3">
      <input type="number" id="shapeWidth" min="1" max="500" value="100" style="width:60px;">
      <input type="number" id="shapeHeight" min="1" max="500" value="100" style="width:60px;">
      <button id="finishShapeBtn"><i class="fa fa-check"></i> Done</button>
    </div>
    <div id="emojiControls" style="display:none;margin-top:12px;">
      <input type="text" id="emojiChar" maxlength="2" value="😀" style="width:40px;font-size:1.5em;">
      <input type="number" id="emojiSize" min="20" max="200" value="64" style="width:60px;">
      <button id="finishEmojiBtn"><i class="fa fa-check"></i> Done</button>
    </div>
    <div id="cropHint" style="color:#888;font-size:0.95em;margin-top:8px;"></div>
    <button id="removeBgBtn"><i class="fa fa-eraser"></i> Remove Background</button>
  `;
  document.getElementById('undoBtn').onclick = undoEdit;
  document.getElementById('redoBtn').onclick = redoEdit;
  document.getElementById('rotateLeftBtn').onclick = () => rotateImage(-90);
  document.getElementById('rotateRightBtn').onclick = () => rotateImage(90);
  document.getElementById('startCropBtn').onclick = startCrop;
  document.getElementById('applyCropBtn').onclick = applyCrop;
  document.getElementById('cancelCropBtn').onclick = cancelCrop;
  document.getElementById('exportBtn').onclick = exportEditedImage;
  document.getElementById('addTextBtn').onclick = startTextOverlay;
  document.getElementById('addRectBtn').onclick = () => startShapeOverlay('rect');
  document.getElementById('addCircleBtn').onclick = () => startShapeOverlay('circle');
  document.getElementById('addLineBtn').onclick = () => startShapeOverlay('line');
  document.getElementById('addEmojiBtn').onclick = startEmojiOverlay;
  document.getElementById('removeBgBtn').onclick = removeBackground;
  document.getElementById('presetCinematic').onclick = () => applyPreset('cinematic');
  document.getElementById('presetBW').onclick = () => applyPreset('bw');

  // Filter controls
  [
    'brightnessSlider',
    'contrastSlider',
    'saturateSlider',
    'grayscaleSlider',
    'sepiaSlider',
    'blurSlider'
  ].forEach(id => {
    document.getElementById(id).addEventListener('input', applyFilters);
  });
}

// Store filter values
let filterValues = {
  brightness: 1,
  contrast: 1,
  saturate: 1,
  grayscale: 0,
  sepia: 0,
  blur: 0
};

function applyFilters() {
  filterValues.brightness = parseFloat(document.getElementById('brightnessSlider').value);
  filterValues.contrast = parseFloat(document.getElementById('contrastSlider').value);
  filterValues.saturate = parseFloat(document.getElementById('saturateSlider').value);
  filterValues.grayscale = parseFloat(document.getElementById('grayscaleSlider').value);
  filterValues.sepia = parseFloat(document.getElementById('sepiaSlider').value);
  filterValues.blur = parseFloat(document.getElementById('blurSlider').value);
  renderCanvas();
}

function renderCanvas() {
  // Redraw image and crop rectangle if cropping, apply filters, draw overlays
  if (selectedForEdit === null) return;
  const src = images[selectedForEdit];
  const img = new window.Image();
  img.onload = function() {
    editorCtx.clearRect(0, 0, editorCanvas.width, editorCanvas.height);
    editorCtx.save();
    // Apply filters
    editorCtx.filter =
      `brightness(${filterValues.brightness}) ` +
      `contrast(${filterValues.contrast}) ` +
      `saturate(${filterValues.saturate}) ` +
      `grayscale(${filterValues.grayscale}) ` +
      `sepia(${filterValues.sepia}) ` +
      `blur(${filterValues.blur}px)`;
    editorCtx.drawImage(img, 0, 0, editorCanvas.width, editorCanvas.height);
    editorCtx.filter = 'none';
    // Draw overlays
    overlays.forEach(ov => {
      if (ov.type === 'rect') {
        editorCtx.save();
        editorCtx.strokeStyle = ov.color;
        editorCtx.lineWidth = 3;
        editorCtx.strokeRect(ov.x - ov.width / 2, ov.y - ov.height / 2, ov.width, ov.height);
        editorCtx.restore();
      } else if (ov.type === 'circle') {
        editorCtx.save();
        editorCtx.strokeStyle = ov.color;
        editorCtx.lineWidth = 3;
        editorCtx.beginPath();
        editorCtx.arc(ov.x, ov.y, Math.min(ov.width, ov.height) / 2, 0, 2 * Math.PI);
        editorCtx.stroke();
        editorCtx.restore();
      } else if (ov.type === 'line') {
        editorCtx.save();
        editorCtx.strokeStyle = ov.color;
        editorCtx.lineWidth = 3;
        editorCtx.beginPath();
        editorCtx.moveTo(ov.x, ov.y);
        editorCtx.lineTo(ov.x + ov.width, ov.y + ov.height);
        editorCtx.stroke();
        editorCtx.restore();
      } else if (ov.type === 'emoji') {
        editorCtx.save();
        editorCtx.font = `${ov.size || 64}px Arial`;
        editorCtx.textAlign = 'center';
        editorCtx.textBaseline = 'middle';
        editorCtx.fillText(ov.char, ov.x, ov.y);
        editorCtx.restore();
      }
    });
    // Draw text overlay if present
    if (textOverlay) {
      editorCtx.save();
      editorCtx.font = `${textOverlay.size}px ${textOverlay.font}`;
      editorCtx.fillStyle = textOverlay.color;
      editorCtx.textAlign = 'center';
      editorCtx.textBaseline = 'bottom';
      editorCtx.fillText(textOverlay.text, textOverlay.x, textOverlay.y);
      editorCtx.restore();
    }
    if (currentOverlay) {
      if (currentOverlay.type === 'rect') {
        editorCtx.save();
        editorCtx.strokeStyle = currentOverlay.color;
        editorCtx.lineWidth = 3;
        editorCtx.strokeRect(currentOverlay.x - currentOverlay.width / 2, currentOverlay.y - currentOverlay.height / 2, currentOverlay.width, currentOverlay.height);
        editorCtx.restore();
      } else if (currentOverlay.type === 'circle') {
        editorCtx.save();
        editorCtx.strokeStyle = currentOverlay.color;
        editorCtx.lineWidth = 3;
        editorCtx.beginPath();
        editorCtx.arc(currentOverlay.x, currentOverlay.y, Math.min(currentOverlay.width, currentOverlay.height) / 2, 0, 2 * Math.PI);
        editorCtx.stroke();
        editorCtx.restore();
      } else if (currentOverlay.type === 'line') {
        editorCtx.save();
        editorCtx.strokeStyle = currentOverlay.color;
        editorCtx.lineWidth = 3;
        editorCtx.beginPath();
        editorCtx.moveTo(currentOverlay.x, currentOverlay.y);
        editorCtx.lineTo(currentOverlay.x + currentOverlay.width, currentOverlay.y + currentOverlay.height);
        editorCtx.stroke();
        editorCtx.restore();
      } else if (currentOverlay.type === 'emoji') {
        editorCtx.save();
        editorCtx.font = `${currentOverlay.size || 64}px Arial`;
        editorCtx.textAlign = 'center';
        editorCtx.textBaseline = 'middle';
        editorCtx.fillText(currentOverlay.char, currentOverlay.x, currentOverlay.y);
        editorCtx.restore();
      }
    }
    if (cropping && cropStart && cropEnd) {
      const [x, y, w, h] = getCropRect();
      editorCtx.save();
      editorCtx.strokeStyle = '#eebbc3';
      editorCtx.lineWidth = 2;
      editorCtx.setLineDash([6, 4]);
      editorCtx.strokeRect(x, y, w, h);
      editorCtx.restore();
    }
    editorCtx.restore();

    // --- Pixel-level effects ---
    let imageData = editorCtx.getImageData(0, 0, editorCanvas.width, editorCanvas.height);
    let data = imageData.data;
    const w = editorCanvas.width, h = editorCanvas.height;
    // Vignette
    if (filterValues.vignette > 0) {
      const cx = w / 2, cy = h / 2;
      const maxDist = Math.sqrt(cx * cx + cy * cy);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const dx = x - cx, dy = y - cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const vignette = 1 - filterValues.vignette * Math.pow(dist / maxDist, 2);
          const i = (y * w + x) * 4;
          data[i] *= vignette;
          data[i + 1] *= vignette;
          data[i + 2] *= vignette;
        }
      }
    }
    // Clarity (simple local contrast boost)
    if (filterValues.clarity !== 1) {
      // Simple unsharp mask for clarity
      const orig = new Uint8ClampedArray(data);
      const kernel = [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0
      ];
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          for (let c = 0; c < 3; c++) {
            let sum = 0;
            for (let ky = -1; ky <= 1; ky++) {
              for (let kx = -1; kx <= 1; kx++) {
                const px = ((y + ky) * w + (x + kx)) * 4 + c;
                sum += orig[px] * kernel[(ky + 1) * 3 + (kx + 1)];
              }
            }
            const i = (y * w + x) * 4 + c;
            data[i] = data[i] * (2 - filterValues.clarity) + sum * (filterValues.clarity - 1);
          }
        }
      }
    }
    // Sharpen
    if (filterValues.sharpen > 0) {
      const orig = new Uint8ClampedArray(data);
      const kernel = [
        0, -1, 0,
        -1, 5, -1,
        0, -1, 0
      ];
      for (let y = 1; y < h - 1; y++) {
        for (let x = 1; x < w - 1; x++) {
          for (let c = 0; c < 3; c++) {
            let sum = 0;
            for (let ky = -1; ky <= 1; ky++) {
              for (let kx = -1; kx <= 1; kx++) {
                const px = ((y + ky) * w + (x + kx)) * 4 + c;
                sum += orig[px] * kernel[(ky + 1) * 3 + (kx + 1)];
              }
            }
            const i = (y * w + x) * 4 + c;
            data[i] = data[i] * (1 - filterValues.sharpen) + sum * filterValues.sharpen;
          }
        }
      }
    }
    editorCtx.putImageData(imageData, 0, 0);
  };
  img.src = src;
}

// --- Rotation ---
function rotateImage(deg) {
  const w = editorCanvas.width;
  const h = editorCanvas.height;
  const temp = document.createElement('canvas');
  temp.width = h;
  temp.height = w;
  const tctx = temp.getContext('2d');
  tctx.save();
  tctx.translate(h/2, w/2);
  tctx.rotate((deg * Math.PI) / 180);
  tctx.drawImage(editorCanvas, -w/2, -h/2);
  tctx.restore();
  editorCanvas.width = temp.width;
  editorCanvas.height = temp.height;
  editorCtx.drawImage(temp, 0, 0);
}

// --- Cropping ---
let cropping = false, cropStart = null, cropEnd = null, cropRect = null;
function startCrop() {
  cropping = true;
  cropStart = cropEnd = cropRect = null;
  document.getElementById('cropHint').textContent = 'Drag on the image to select crop area.';
  editorCanvas.style.cursor = 'crosshair';
  document.getElementById('applyCropBtn').style.display = '';
  document.getElementById('cancelCropBtn').style.display = '';
  document.getElementById('startCropBtn').style.display = 'none';
}
function cancelCrop() {
  cropping = false;
  cropStart = cropEnd = cropRect = null;
  document.getElementById('cropHint').textContent = '';
  editorCanvas.style.cursor = '';
  document.getElementById('applyCropBtn').style.display = 'none';
  document.getElementById('cancelCropBtn').style.display = 'none';
  document.getElementById('startCropBtn').style.display = '';
  renderCanvas();
}
function applyCrop() {
  if (!cropRect) return;
  const [x, y, w, h] = cropRect;
  const temp = document.createElement('canvas');
  temp.width = w;
  temp.height = h;
  temp.getContext('2d').drawImage(editorCanvas, x, y, w, h, 0, 0, w, h);
  editorCanvas.width = w;
  editorCanvas.height = h;
  editorCtx.drawImage(temp, 0, 0);
  cancelCrop();
}
function getCropRect() {
  if (!cropStart || !cropEnd) return [0,0,0,0];
  const x = Math.min(cropStart[0], cropEnd[0]);
  const y = Math.min(cropStart[1], cropEnd[1]);
  const w = Math.abs(cropStart[0] - cropEnd[0]);
  const h = Math.abs(cropStart[1] - cropEnd[1]);
  return [x, y, w, h];
}
// Canvas mouse events for cropping
editorCanvas.addEventListener('mousedown', e => {
  if (!cropping) return;
  const rect = editorCanvas.getBoundingClientRect();
  cropStart = [e.clientX - rect.left, e.clientY - rect.top];
  cropEnd = null;
});
editorCanvas.addEventListener('mousemove', e => {
  if (!cropping || !cropStart) return;
  const rect = editorCanvas.getBoundingClientRect();
  cropEnd = [e.clientX - rect.left, e.clientY - rect.top];
  cropRect = getCropRect();
  renderCanvas();
});
editorCanvas.addEventListener('mouseup', e => {
  if (!cropping || !cropStart) return;
  const rect = editorCanvas.getBoundingClientRect();
  cropEnd = [e.clientX - rect.left, e.clientY - rect.top];
  cropRect = getCropRect();
  renderCanvas();
});

// --- Text Overlay ---
let textOverlay = null;
let draggingText = false;
let dragOffset = [0, 0];
function startTextOverlay() {
  textOverlay = {
    text: 'Sample Text',
    x: editorCanvas.width / 2,
    y: editorCanvas.height / 2,
    color: '#232946',
    font: 'Arial',
    size: 32
  };
  document.getElementById('textControls').style.display = '';
  document.getElementById('overlayText').value = textOverlay.text;
  document.getElementById('textColor').value = textOverlay.color;
  document.getElementById('textFont').value = textOverlay.font;
  document.getElementById('textSize').value = textOverlay.size;
  renderCanvas();
  // Controls
  document.getElementById('overlayText').oninput = e => { textOverlay.text = e.target.value; renderCanvas(); };
  document.getElementById('textColor').oninput = e => { textOverlay.color = e.target.value; renderCanvas(); };
  document.getElementById('textFont').oninput = e => { textOverlay.font = e.target.value; renderCanvas(); };
  document.getElementById('textSize').oninput = e => { textOverlay.size = parseInt(e.target.value); renderCanvas(); };
  document.getElementById('finishTextBtn').onclick = finishTextOverlay;
}
function finishTextOverlay() {
  document.getElementById('textControls').style.display = 'none';
  textOverlay = null;
  renderCanvas();
}
// Drag text overlay
editorCanvas.addEventListener('mousedown', e => {
  if (!textOverlay) return;
  const rect = editorCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const ctx = editorCtx;
  ctx.save();
  ctx.font = `${textOverlay.size}px ${textOverlay.font}`;
  const width = ctx.measureText(textOverlay.text).width;
  ctx.restore();
  if (
    x >= textOverlay.x - width / 2 &&
    x <= textOverlay.x + width / 2 &&
    y >= textOverlay.y - textOverlay.size &&
    y <= textOverlay.y
  ) {
    draggingText = true;
    dragOffset = [x - textOverlay.x, y - textOverlay.y];
  }
});
editorCanvas.addEventListener('mousemove', e => {
  if (!draggingText || !textOverlay) return;
  const rect = editorCanvas.getBoundingClientRect();
  textOverlay.x = e.clientX - rect.left - dragOffset[0];
  textOverlay.y = e.clientY - rect.top - dragOffset[1];
  renderCanvas();
});
editorCanvas.addEventListener('mouseup', () => { draggingText = false; });

// --- Overlays ---
let overlays = [];
let currentOverlay = null;
let overlayType = null;
let draggingOverlay = false;
let dragOffsetOverlay = [0, 0];

function startShapeOverlay(type) {
  overlayType = type;
  currentOverlay = {
    type,
    x: editorCanvas.width / 2,
    y: editorCanvas.height / 2,
    color: '#eebbc3',
    width: 100,
    height: 100
  };
  document.getElementById('shapeControls').style.display = '';
  document.getElementById('shapeColor').value = currentOverlay.color;
  document.getElementById('shapeWidth').value = currentOverlay.width;
  document.getElementById('shapeHeight').value = currentOverlay.height;
  renderCanvas();
  document.getElementById('shapeColor').oninput = e => { currentOverlay.color = e.target.value; renderCanvas(); };
  document.getElementById('shapeWidth').oninput = e => { currentOverlay.width = parseInt(e.target.value); renderCanvas(); };
  document.getElementById('shapeHeight').oninput = e => { currentOverlay.height = parseInt(e.target.value); renderCanvas(); };
  document.getElementById('finishShapeBtn').onclick = finishShapeOverlay;
}
function finishShapeOverlay() {
  overlays.push({ ...currentOverlay });
  currentOverlay = null;
  overlayType = null;
  document.getElementById('shapeControls').style.display = 'none';
  renderCanvas();
}
function startEmojiOverlay() {
  overlayType = 'emoji';
  currentOverlay = {
    type: 'emoji',
    char: '😀',
    x: editorCanvas.width / 2,
    y: editorCanvas.height / 2,
    size: 64
  };
  document.getElementById('emojiControls').style.display = '';
  document.getElementById('emojiChar').value = currentOverlay.char;
  document.getElementById('emojiSize').value = currentOverlay.size;
  renderCanvas();
  document.getElementById('emojiChar').oninput = e => { currentOverlay.char = e.target.value; renderCanvas(); };
  document.getElementById('emojiSize').oninput = e => { currentOverlay.size = parseInt(e.target.value); renderCanvas(); };
  document.getElementById('finishEmojiBtn').onclick = finishEmojiOverlay;
}
function finishEmojiOverlay() {
  overlays.push({ ...currentOverlay });
  currentOverlay = null;
  overlayType = null;
  document.getElementById('emojiControls').style.display = 'none';
  renderCanvas();
}
// Drag overlays
editorCanvas.addEventListener('mousedown', e => {
  if (currentOverlay) return;
  const rect = editorCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  for (let i = overlays.length - 1; i >= 0; i--) {
    const ov = overlays[i];
    if (ov.type === 'rect' || ov.type === 'circle') {
      if (
        x >= ov.x - ov.width / 2 &&
        x <= ov.x + ov.width / 2 &&
        y >= ov.y - ov.height / 2 &&
        y <= ov.y + ov.height / 2
      ) {
        draggingOverlay = i;
        dragOffsetOverlay = [x - ov.x, y - ov.y];
        return;
      }
    } else if (ov.type === 'line') {
      // Simple hit test for line
      const dist = Math.abs((ov.y - (ov.y + ov.height)) * x - (ov.x - (ov.x + ov.width)) * y + ov.x * (ov.y + ov.height) - (ov.x + ov.width) * ov.y) /
        Math.sqrt(Math.pow(ov.width, 2) + Math.pow(ov.height, 2));
      if (dist < 10) {
        draggingOverlay = i;
        dragOffsetOverlay = [x - ov.x, y - ov.y];
        return;
      }
    } else if (ov.type === 'emoji') {
      const size = ov.size || 64;
      if (
        x >= ov.x - size / 2 &&
        x <= ov.x + size / 2 &&
        y >= ov.y - size / 2 &&
        y <= ov.y + size / 2
      ) {
        draggingOverlay = i;
        dragOffsetOverlay = [x - ov.x, y - ov.y];
        return;
      }
    }
  }
});
editorCanvas.addEventListener('mousemove', e => {
  if (draggingOverlay === false || draggingOverlay === null || draggingOverlay === undefined) return;
  const rect = editorCanvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const ov = overlays[draggingOverlay];
  ov.x = x - dragOffsetOverlay[0];
  ov.y = y - dragOffsetOverlay[1];
  renderCanvas();
});
editorCanvas.addEventListener('mouseup', () => { draggingOverlay = false; });

// --- Undo/Redo ---
let historyStack = [];
let redoStack = [];
function saveHistory() {
  // Save a deep copy of the current state
  historyStack.push({
    image: editorCanvas.toDataURL(),
    overlays: JSON.parse(JSON.stringify(overlays)),
    filterValues: { ...filterValues }
  });
  if (historyStack.length > 50) historyStack.shift(); // Limit history size
  redoStack = [];
}
function undoEdit() {
  if (historyStack.length < 2) return;
  redoStack.push(historyStack.pop());
  const prev = historyStack[historyStack.length - 1];
  restoreHistoryState(prev);
}
function redoEdit() {
  if (!redoStack.length) return;
  const next = redoStack.pop();
  historyStack.push(next);
  restoreHistoryState(next);
}
function restoreHistoryState(state) {
  overlays = JSON.parse(JSON.stringify(state.overlays));
  filterValues = { ...state.filterValues };
  // Restore image to canvas
  const img = new window.Image();
  img.onload = function() {
    editorCanvas.width = img.naturalWidth;
    editorCanvas.height = img.naturalHeight;
    editorCtx.drawImage(img, 0, 0);
    renderCanvas();
  };
  img.src = state.image;
}
// Save history after each major action
function saveEditAction() {
  setTimeout(saveHistory, 0);
}
// Call saveEditAction after crop, rotate, filter change, overlay add/move, text add/move, etc.
// ... existing code ...
// Example: after applyCrop, rotateImage, finishTextOverlay, finishShapeOverlay, finishEmojiOverlay, applyFilters
// Add saveEditAction() at the end of those functions

// Initial render
showEditor();

async function removeBackground() {
  if (!window.rembg) {
    alert('Background remover not loaded.');
    return;
  }
  // Show loading state
  const btn = document.getElementById('removeBgBtn');
  btn.disabled = true;
  btn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Removing...';
  // Get current image as blob
  editorCanvas.toBlob(async blob => {
    const arrayBuffer = await blob.arrayBuffer();
    const input = new Uint8Array(arrayBuffer);
    // Use rembg to remove background
    const output = await window.rembg.remove(input);
    const outBlob = new Blob([output], { type: 'image/png' });
    const url = URL.createObjectURL(outBlob);
    const img = new window.Image();
    img.onload = function() {
      editorCanvas.width = img.naturalWidth;
      editorCanvas.height = img.naturalHeight;
      editorCtx.clearRect(0, 0, editorCanvas.width, editorCanvas.height);
      editorCtx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      btn.disabled = false;
      btn.innerHTML = '<i class="fa fa-eraser"></i> Remove Background';
      saveEditAction();
    };
    img.src = url;
  }, 'image/png');
}

window.addEventListener('DOMContentLoaded', () => {
  // Splash screen fade
  setTimeout(() => {
    const splash = document.getElementById('splash');
    splash.style.opacity = 0;
    setTimeout(() => splash.style.display = 'none', 900);
  }, 2000);

  // Theme toggle
  const themeBtn = document.getElementById('themeToggle');
  const themeLabel = document.getElementById('themeLabel');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const savedTheme = localStorage.getItem('prismix-theme');
  if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
    document.body.classList.add('dark-mode');
    themeBtn.querySelector('i').className = 'fa fa-sun';
    themeLabel.textContent = 'Dark Mode';
  } else {
    document.body.classList.remove('dark-mode');
    themeBtn.querySelector('i').className = 'fa fa-moon';
    themeLabel.textContent = 'Light Mode';
  }
  themeBtn.onclick = () => {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    themeBtn.querySelector('i').className = isDark ? 'fa fa-sun' : 'fa fa-moon';
    themeLabel.textContent = isDark ? 'Dark Mode' : 'Light Mode';
    localStorage.setItem('prismix-theme', isDark ? 'dark' : 'light');
  };
});

function applyPreset(type) {
  if (type === 'cinematic') {
    filterValues.brightness = 1.05;
    filterValues.contrast = 1.25;
    filterValues.saturate = 1.2;
    filterValues.grayscale = 0;
    filterValues.sepia = 0.18;
    filterValues.blur = 0;
    filterValues.exposure = 0.1;
    filterValues.highlights = 0.1;
    filterValues.shadows = 0.2;
    filterValues.temperature = 0.2;
    filterValues.tint = 0.1;
    filterValues.vignette = 0.3;
    filterValues.clarity = 1.2;
    filterValues.sharpen = 0.5;
  } else if (type === 'bw') {
    filterValues.brightness = 1;
    filterValues.contrast = 1.1;
    filterValues.saturate = 0;
    filterValues.grayscale = 1;
    filterValues.sepia = 0;
    filterValues.blur = 0;
    filterValues.exposure = 0;
    filterValues.highlights = 0.1;
    filterValues.shadows = 0.1;
    filterValues.temperature = 0;
    filterValues.tint = 0;
    filterValues.vignette = 0.4;
    filterValues.clarity = 1.1;
    filterValues.sharpen = 0.3;
  }
  // Update sliders
  Object.entries(filterValues).forEach(([k, v]) => {
    const el = document.getElementById(k + 'Slider');
    if (el) el.value = v;
  });
  renderCanvas();
} 