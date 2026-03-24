// ─── FrenchFlow Main Application ─────────────────────────────────────────────

const App = (() => {
  // State
  let currentText = '';
  let sentences = [];
  let isSpeaking = false;
  let currentUtterance = null;
  let vocabularyCache = [];

  // ─── DOM Elements ──────────────────────────────────────────────────────────

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const els = {
    inputSection: $('#input-section'),
    contentSection: $('#content-section'),
    processing: $('#processing'),
    processingText: $('#processing-text'),
    errorBox: $('#error-box'),
    frenchText: $('#french-text'),
    popover: $('#word-popover'),
    vocabPanel: $('#vocab-panel'),
    vocabOverlay: $('#vocab-overlay'),
    vocabList: $('#vocab-list'),
    vocabStats: $('#vocab-stats'),
    vocabCountBadge: $('#vocab-count-badge'),
    sentenceBar: $('#sentence-bar'),
    sentenceTranslation: $('#sentence-translation'),
    toastContainer: $('#toast-container')
  };

  // ─── Initialize ────────────────────────────────────────────────────────────

  function init() {
    setupTabs();
    setupInputHandlers();
    setupAudioControls();
    setupPopover();
    setupVocabPanel();
    loadVocabulary();
    checkCloudAvailability();

    // Close popover on outside click
    document.addEventListener('click', (e) => {
      if (!els.popover.contains(e.target) && !e.target.classList.contains('french-word')) {
        closePopover();
      }
    });

    // New input button
    $('#new-input-btn').addEventListener('click', () => {
      els.contentSection.classList.remove('active');
      els.inputSection.style.display = '';
      const hero = $('#hero-section');
      if (hero) hero.style.display = '';
      stopSpeech();
    });
  }

  // ─── Check Groq Availability ─────────────────────────────────────────────

  async function checkCloudAvailability() {
    try {
      const res = await fetch('/api/config');
      const { cloudAvailable } = await res.json();
      const cloudOption = $('#whisper-model').querySelector('option[value="cloud"]');
      if (cloudOption) {
        if (!cloudAvailable) {
          cloudOption.textContent = 'Cloud - HuggingFace (no API key set)';
          cloudOption.disabled = true;
          $('#whisper-model').value = 'tiny';
        }
      }
    } catch {}
  }

  // ─── Tab Navigation ────────────────────────────────────────────────────────

  function setupTabs() {
    const whisperQuality = $('#whisper-quality');
    const videoOcrOption = $('#video-ocr-option');
    const audioTabs = ['youtube', 'instagram', 'video'];
    const videoTabs = ['youtube', 'instagram', 'video'];

    $$('.input-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        $$('.input-tab').forEach(t => t.classList.remove('active'));
        $$('.input-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        $(`#panel-${tab.dataset.tab}`).classList.add('active');

        // Show whisper quality selector only for audio-based tabs
        if (whisperQuality) {
          whisperQuality.style.display = audioTabs.includes(tab.dataset.tab) ? '' : 'none';
        }
        // Show video OCR option for video-capable tabs
        if (videoOcrOption) {
          videoOcrOption.style.display = videoTabs.includes(tab.dataset.tab) ? '' : 'none';
        }
      });
    });
  }

  // ─── Input Handlers ───────────────────────────────────────────────────────

  function setupInputHandlers() {
    // YouTube
    $('#youtube-submit').addEventListener('click', () => {
      const url = $('#youtube-url').value.trim();
      if (!url) return showError('Please enter a YouTube URL.');
      processYouTube(url);
    });

    // Instagram
    $('#instagram-submit').addEventListener('click', () => {
      const url = $('#instagram-url').value.trim();
      if (!url) return showError('Please enter an Instagram URL.');
      processInstagram(url);
    });

    // Image upload
    setupUploadZone('image-drop-zone', 'image-input', processImage);

    // Video upload
    setupUploadZone('video-drop-zone', 'video-input', processVideo);

    // Text
    $('#text-submit').addEventListener('click', () => {
      const text = $('#text-input').value.trim();
      if (!text) return showError('Please enter some French text.');
      displayFrenchText(text);
    });

    // Enter key for URL fields
    $('#youtube-url').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') $('#youtube-submit').click();
    });
    $('#instagram-url').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') $('#instagram-submit').click();
    });
  }

  let uploadBusy = false; // prevent double-uploads while processing

  function setupUploadZone(zoneId, inputId, handler) {
    const zone = document.getElementById(zoneId);
    const input = document.getElementById(inputId);

    zone.addEventListener('click', () => {
      if (uploadBusy) return;
      input.click();
    });

    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!uploadBusy) zone.classList.add('dragover');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('dragover');
      if (uploadBusy) return;
      if (e.dataTransfer.files.length) startUpload(zone, e.dataTransfer.files[0], handler);
    });

    input.addEventListener('change', () => {
      if (uploadBusy) return;
      if (input.files.length) startUpload(zone, input.files[0], handler);
    });
  }

  function startUpload(zone, file, handler) {
    // Show selected file in the upload zone
    uploadBusy = true;
    zone.classList.add('file-selected');
    const origHTML = zone.innerHTML;

    const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
    const icon = file.type.startsWith('image/') ? '🖼' : file.type.startsWith('audio/') ? '🎵' : '🎬';
    zone.innerHTML = `
      <div class="selected-file-info">
        <span class="selected-file-icon">${icon}</span>
        <div>
          <p class="selected-file-name">${escapeHtml(file.name)}</p>
          <p class="selected-file-size">${sizeMB} MB</p>
        </div>
        <div class="selected-file-status">Processing...</div>
      </div>
    `;

    // Run the handler — restore zone when done (on error or when content section shows)
    const restore = () => {
      uploadBusy = false;
      zone.classList.remove('file-selected');
      zone.innerHTML = origHTML;
    };

    // Restore on error or when content displays
    const observer = new MutationObserver(() => {
      if (els.contentSection.classList.contains('active')) {
        observer.disconnect();
        restore();
      }
    });
    observer.observe(els.contentSection, { attributes: true, attributeFilter: ['class'] });

    // Also restore if processing hides (error case)
    const errObserver = new MutationObserver(() => {
      if (!els.processing.classList.contains('active') && !els.contentSection.classList.contains('active')) {
        errObserver.disconnect();
        restore();
      }
    });
    errObserver.observe(els.processing, { attributes: true, attributeFilter: ['class'] });

    handler(file);
  }

  // ─── OCR Quality Filter ──────────────────────────────────────────────────
  // Detects garbage OCR output (visual noise misread as text)
  // Real French text: mostly lowercase words, average word length 3-5, common French words present
  // Garbage: single chars, random uppercase, symbols, pipes, arrows

  // Common French words (function words + very frequent content words)
  const commonFrenchWords = new Set([
    'le', 'la', 'les', 'un', 'une', 'des', 'de', 'du', 'au', 'aux',
    'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles',
    'me', 'te', 'se', 'ce', 'ne', 'que', 'qui', 'où', 'et', 'ou',
    'mais', 'donc', 'car', 'ni', 'si', 'en', 'dans', 'sur', 'sous',
    'avec', 'pour', 'par', 'sans', 'vers', 'chez', 'entre',
    'est', 'suis', 'es', 'sont', 'sommes', 'êtes', 'être',
    'ai', 'as', 'a', 'ont', 'avons', 'avez', 'avoir',
    'fait', 'faire', 'dit', 'dire', 'va', 'aller', 'peut', 'pouvoir',
    'pas', 'plus', 'bien', 'très', 'tout', 'tous', 'toute', 'toutes',
    'mon', 'ma', 'mes', 'ton', 'ta', 'tes', 'son', 'sa', 'ses',
    'notre', 'nos', 'votre', 'vos', 'leur', 'leurs',
    'cette', 'ces', 'cet', 'quel', 'quelle',
    'comme', 'quand', 'aussi', 'encore', 'même', 'autre',
    'être', 'avoir', 'faire', 'dire', 'aller', 'voir', 'savoir',
    'petit', 'petite', 'grand', 'grande', 'bon', 'bonne',
    'homme', 'femme', 'enfant', 'temps', 'jour', 'vie', 'monde',
    'ici', 'là', 'oui', 'non', 'merci', 'bonjour',
    'alors', 'après', 'avant', 'depuis', 'pendant', 'parce',
    'comment', 'pourquoi', 'combien', 'toujours', 'jamais', 'rien',
    'chose', 'quelque', 'chaque', 'peu', 'beaucoup', 'trop',
  ]);

  /**
   * Clean up raw OCR text: remove browser/UI noise, rejoin hyphenated words,
   * filter garbage lines, and restore paragraph structure.
   */
  function cleanOCRText(raw) {
    // Split into lines for filtering
    const lines = raw.split('\n');
    const cleaned = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Skip empty lines (but mark paragraph breaks)
      if (!trimmed) {
        if (cleaned.length > 0 && cleaned[cleaned.length - 1] !== '') {
          cleaned.push('');
        }
        continue;
      }

      // Skip lines that are just numbers (page numbers)
      if (/^\d+$/.test(trimmed)) continue;

      // Skip very short lines that look like noise (single chars, symbols)
      if (trimmed.length <= 2 && !/[A-ZÀ-ÿ]{2}/.test(trimmed)) continue;

      // Skip lines containing URLs or file paths
      if (/https?:\/\/|www\.|\.com|\.fr\/|\.pdf|\.net|\.org|\/\w+\/\w+/.test(trimmed)) continue;

      // Skip lines that look like browser tab bars / UI chrome
      // These often have multiple "x" separators, tab-like patterns, or mixed symbols
      if (/\bx\s+[A-Z@#]|\bx\s*\d|[{}[\]=+|]/.test(trimmed) && trimmed.length < 200) continue;

      // Skip lines with browser UI keywords (Bookmarks, address bar, app names, common UI)
      if (/\b(Bookmarks|localhost|Chrome|Firefox|Edge|Safari|FrenchFlow|Storyset|Canva|Google)\b/i.test(trimmed)) continue;

      // Skip short lines that are mostly uppercase single letters / abbreviations mixed with symbols
      // e.g. "EF C AI Bookmarks ;" — but NOT valid French headings like "À LÉON WERTH"
      const hasSymbolNoise = /[;@#©®%*={}[\]|]/.test(trimmed);
      if (hasSymbolNoise) {
        const upperSingles = (trimmed.match(/\b[A-Z]{1,3}\b/g) || []).length;
        const totalWords = trimmed.split(/\s+/).length;
        if (totalWords <= 8 && upperSingles / totalWords > 0.4) continue;
      }

      // Skip lines that are mostly non-letter characters
      const letters = (trimmed.match(/[a-zA-ZÀ-ÿ]/g) || []).length;
      if (trimmed.length > 3 && letters / trimmed.length < 0.5) continue;

      // Skip lines that look like PDF viewer UI artifacts
      if (/^(Kind:|Language:|WEBVTT|\d+\s*\/\s*\d+|[\d%]+\s*[+\-—])/.test(trimmed)) continue;

      // Score this line: count recognized French words vs total words
      const words = trimmed.split(/\s+/);
      if (words.length >= 3) {
        let symbolTokens = 0;
        for (const w of words) {
          const clean = w.replace(/[.,!?;:'"()\[\]«»\-—]/g, '');
          if (clean.length > 0 && (clean.match(/[a-zA-ZÀ-ÿ]/g) || []).length / clean.length < 0.5) {
            symbolTokens++;
          }
        }
        // If more than half the tokens are symbol-heavy, skip the line
        if (symbolTokens / words.length > 0.5) continue;
      }

      cleaned.push(trimmed);
    }

    // Rejoin lines within paragraphs (consecutive non-empty lines)
    const paragraphs = [];
    let current = [];

    for (const line of cleaned) {
      if (line === '') {
        if (current.length > 0) {
          paragraphs.push(current.join(' '));
          current = [];
        }
      } else {
        current.push(line);
      }
    }
    if (current.length > 0) {
      paragraphs.push(current.join(' '));
    }

    let text = paragraphs.join('\n\n');

    // Rejoin hyphenated line-break words: "per- sonne" → "personne"
    // Handle various OCR artifacts in the hyphen break (spaces, semicolons, etc.)
    text = text.replace(/(\w)-\s*\n\s*(\w)/g, '$1$2');
    text = text.replace(/(\w)-\s*[;,.]?\s+(\w)/g, (match, before, after) => {
      // Only rejoin if the result looks like a word (lowercase continuation)
      if (after === after.toLowerCase()) return before + after;
      return match;
    });

    // Clean up stray OCR artifacts
    text = text.replace(/\s*#_\s*/g, ' ');
    // Remove orphan short fragments with quotes/symbols (e.g. "po"", ": po"")
    text = text.replace(/\s*:?\s*\bpo[""'""\u201C\u201D\u2018\u2019]\s*/g, ' ');
    text = text.replace(/\s*["""\u201C\u201D]\s*(?=[A-ZÀ-Ÿ])/g, ' '); // stray quote before uppercase
    // Remove stray single-digit numbers between words (e.g. "une 3 grande" → "une grande")
    text = text.replace(/(\s)\d(\s)/g, '$1');

    // Strip leading punctuation/symbol noise (e.g. "; Je demande" → "Je demande")
    text = text.replace(/^[;:,.\-—–•*#\s]+/, '');

    // Remove trailing garbage after last real sentence (fragments with no sentence-ending punctuation)
    // Keep the text up to the last sentence-ending punctuation if trailing noise exists
    const lastSentenceEnd = text.search(/[.!?:)][^.!?:)]*$/);
    if (lastSentenceEnd > 0) {
      const trailing = text.slice(lastSentenceEnd + 1).trim();
      // If trailing text is short and has no sentence punctuation, it might be noise
      // But only strip it if it looks like garbage (mostly non-French-word content)
      // Don't strip if it's mostly uppercase letters (likely a heading/title like "À LÉON WERTH")
      const isHeading = /^[A-ZÀ-Ÿ\s]{4,}$/.test(trailing);
      if (trailing.length > 0 && trailing.length < 50 && !/[.!?]/.test(trailing) && !isHeading) {
        const trailingLetters = (trailing.match(/[a-zA-ZÀ-ÿ]/g) || []).length;
        if (trailingLetters / trailing.length < 0.7) {
          text = text.slice(0, lastSentenceEnd + 1);
        }
      }
    }

    // Collapse multiple spaces
    return text.replace(/ {2,}/g, ' ').trim();
  }

  /**
   * Check if OCR text is meaningful French (not garbage noise).
   * Returns { ok: boolean, reason: string }
   */
  function validateOCRText(text) {
    if (!text || !text.trim()) return { ok: false, reason: 'No text detected' };

    // Split into words
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    if (words.length < 3) return { ok: false, reason: 'Too few words detected' };

    // Count various quality signals
    let singleCharCount = 0;
    let symbolHeavyCount = 0;
    let realWordCount = 0;
    let totalLetterChars = 0;
    let totalChars = 0;

    for (const w of words) {
      const clean = w.replace(/[.,!?;:'"()\[\]«»\-—▶…]/g, '');
      totalChars += clean.length;

      if (clean.length <= 1) {
        singleCharCount++;
        continue;
      }

      // Count letter chars vs symbols/numbers
      const letterCount = (clean.match(/[a-zA-ZÀ-ÿ]/g) || []).length;
      totalLetterChars += letterCount;

      // Word is mostly symbols/numbers?
      if (letterCount / clean.length < 0.5) {
        symbolHeavyCount++;
        continue;
      }

      // Check if it's a recognized French word
      const lower = clean.toLowerCase();
      if (commonFrenchWords.has(lower)) {
        realWordCount++;
      } else if (lower.length >= 3 && /^[a-zà-ÿ]+$/.test(lower)) {
        // Looks like a plausible word (all lowercase letters, 3+ chars)
        realWordCount += 0.5;
      }
    }

    const singleCharRatio = singleCharCount / words.length;
    const symbolRatio = symbolHeavyCount / words.length;
    const realWordRatio = realWordCount / words.length;
    const letterRatio = totalChars > 0 ? totalLetterChars / totalChars : 0;

    // Garbage signals:
    // - More than 40% single-character "words"
    if (singleCharRatio > 0.4) {
      return { ok: false, reason: `Too many isolated characters (${Math.round(singleCharRatio * 100)}% single chars) — likely visual noise` };
    }
    // - More than 30% symbol-heavy tokens
    if (symbolRatio > 0.3) {
      return { ok: false, reason: `Too many symbols/numbers (${Math.round(symbolRatio * 100)}%) — likely visual noise` };
    }
    // - Less than 60% of characters are letters
    if (letterRatio < 0.6) {
      return { ok: false, reason: `Low letter content (${Math.round(letterRatio * 100)}%) — likely visual noise` };
    }
    // - Less than 15% recognized French words
    if (realWordRatio < 0.15 && words.length > 10) {
      return { ok: false, reason: `Very few recognizable French words (${Math.round(realWordRatio * 100)}%) — OCR may have misread the image` };
    }

    return { ok: true };
  }

  // ─── Processing Functions ─────────────────────────────────────────────────

  let progressTimer = null;
  let progressStartTime = null;

  async function processYouTube(url) {
    configureSteps([
      { key: 'subtitles', label: 'Checking subtitles' },
      { key: 'downloading', label: 'Downloading audio' },
      { key: 'transcribing', label: 'Transcribing' }
    ]);
    showProcessing('Connecting...');

    try {
      const whisperModel = $('#whisper-model') ? $('#whisper-model').value : 'small';
      const res = await fetch('/api/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, whisperModel })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process YouTube video');
      trackJob(data.jobId);
    } catch (e) {
      hideProcessing();
      showError(e.message);
    }
  }

  async function processInstagram(url) {
    configureSteps([
      { key: 'subtitles', label: 'Checking subtitles' },
      { key: 'downloading', label: 'Downloading audio' },
      { key: 'transcribing', label: 'Transcribing' }
    ]);
    showProcessing('Connecting...');

    try {
      const whisperModel = $('#whisper-model') ? $('#whisper-model').value : 'small';
      const res = await fetch('/api/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, whisperModel })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to process Instagram reel.');
      trackJob(data.jobId);
    } catch (e) {
      hideProcessing();
      showError(e.message);
    }
  }

  /**
   * Pre-process image for better OCR: convert to grayscale, increase contrast,
   * and apply threshold to produce cleaner black-on-white text.
   */
  function preprocessImageForOCR(file) {
    return new Promise((resolve) => {
      try {
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');

            ctx.drawImage(img, 0, 0);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            for (let i = 0; i < data.length; i += 4) {
              let gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
              gray = ((gray - 128) * 1.5) + 128;
              gray = Math.max(0, Math.min(255, gray));
              if (gray > 180) gray = 255;
              else if (gray < 80) gray = 0;
              data[i] = data[i + 1] = data[i + 2] = gray;
            }

            ctx.putImageData(imageData, 0, 0);

            canvas.toBlob((blob) => {
              URL.revokeObjectURL(objectUrl);
              resolve(blob || file);
            }, 'image/png');
          } catch (e) {
            console.warn('Image preprocessing failed, using original:', e);
            URL.revokeObjectURL(objectUrl);
            resolve(file);
          }
        };
        img.onerror = () => {
          URL.revokeObjectURL(objectUrl);
          resolve(file);
        };
        img.src = objectUrl;
      } catch (e) {
        console.warn('Image preprocessing setup failed:', e);
        resolve(file);
      }
    });
  }

  async function processImage(file) {
    configureSteps([
      { key: 'loading', label: 'Loading OCR' },
      { key: 'recognizing', label: 'Recognizing text' }
    ]);
    showProcessing('Initializing OCR engine...');
    setProgress(5, 'loading');

    try {
      // Pre-process image: sharpen and increase contrast for better OCR
      const processedFile = await preprocessImageForOCR(file);

      const { data: { text } } = await Tesseract.recognize(processedFile, 'fra', {
        logger: (m) => {
          if (m.status === 'loading tesseract core') {
            setProgress(10, 'loading', 'Loading OCR engine...');
          } else if (m.status === 'initializing tesseract') {
            setProgress(20, 'loading', 'Initializing...');
          } else if (m.status === 'loading language traineddata') {
            setProgress(30, 'loading', 'Loading French language data...');
          } else if (m.status === 'initializing api') {
            setProgress(40, 'recognizing', 'Preparing recognition...');
          } else if (m.status === 'recognizing text') {
            const pct = Math.round(40 + m.progress * 55);
            setProgress(pct, 'recognizing', `Recognizing text... ${Math.round(m.progress * 100)}%`);
          }
        }
      });
      if (!text.trim()) throw new Error('No text detected in the image. Try a clearer image.');

      // Clean up OCR artifacts (hyphenation, noise lines, etc.)
      const cleaned = cleanOCRText(text);
      if (!cleaned) throw new Error('No readable text after cleanup. Try a clearer image.');

      // Validate OCR quality — reject garbage output
      const quality = validateOCRText(cleaned);
      if (!quality.ok) {
        throw new Error(`OCR produced poor results: ${quality.reason}. Try a clearer image with readable French text.`);
      }

      setProgress(100, 'recognizing', 'Done!');
      setTimeout(() => displayFrenchText(cleaned), 300);
    } catch (e) {
      hideProcessing();
      showError(e.message);
    }
  }

  async function processVideo(file) {
    // Check if user wants OCR for burned-in subtitles
    const useOCR = $('#use-video-ocr') && $('#use-video-ocr').checked;
    if (useOCR) {
      return processVideoOCR(file);
    }

    configureSteps([
      { key: 'uploading', label: 'Uploading' },
      { key: 'converting', label: 'Converting' },
      { key: 'transcribing', label: 'Transcribing' }
    ]);
    showProcessing('Uploading file...');
    setProgress(2, 'uploading');

    try {
      const formData = new FormData();
      formData.append('file', file);
      const whisperModel = $('#whisper-model') ? $('#whisper-model').value : 'small';
      formData.append('whisperModel', whisperModel);

      // Use XMLHttpRequest for upload progress
      const { jobId } = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/transcribe');

        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setProgress(Math.min(pct, 99), 'uploading', `Uploading... ${pct}%`);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            try {
              reject(new Error(JSON.parse(xhr.responseText).error));
            } catch {
              reject(new Error('Upload failed'));
            }
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Upload failed')));
        xhr.send(formData);
      });

      trackJob(jobId);
    } catch (e) {
      hideProcessing();
      showError(e.message);
    }
  }

  // ─── Video Frame OCR (for burned-in subtitles) ──────────────────────────────

  async function processVideoOCR(file) {
    lastVideoFile = file; // store for fallback to audio transcription

    configureSteps([
      { key: 'uploading', label: 'Uploading' },
      { key: 'extracting', label: 'Extracting frames' },
      { key: 'ocr', label: 'OCR reading text' }
    ]);
    showProcessing('Uploading video for frame extraction...');
    setProgress(2, 'uploading');

    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('interval', '2'); // 1 frame every 2 seconds

      // Upload with progress
      const { jobId } = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/extract-frames');
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setProgress(Math.min(pct, 99), 'uploading', `Uploading... ${pct}%`);
          }
        });
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            try { reject(new Error(JSON.parse(xhr.responseText).error)); }
            catch { reject(new Error('Upload failed')); }
          }
        });
        xhr.addEventListener('error', () => reject(new Error('Upload failed')));
        xhr.send(formData);
      });

      // Track the job until frames are ready
      await new Promise((resolve, reject) => {
        const source = new EventSource(`/api/jobs/${jobId}`);
        source.addEventListener('message', (e) => {
          const job = JSON.parse(e.data);
          setProgress(job.progress, job.step, job.message);

          if (job.status === 'frames_ready') {
            source.close();
            // Now do client-side OCR on the frames
            runFrameOCR(jobId, job.frames).then(resolve).catch(reject);
          } else if (job.status === 'error') {
            source.close();
            reject(new Error(job.message));
          }
        });
        source.addEventListener('error', () => {
          source.close();
          reject(new Error('Lost connection during frame extraction'));
        });
      });

    } catch (e) {
      hideProcessing();
      showError(e.message);
    }
  }

  async function runFrameOCR(jobId, framePaths) {
    setProgress(70, 'ocr', `Running OCR on ${framePaths.length} frames...`);

    const texts = [];
    let lastText = '';
    let emptyCount = 0;
    const EARLY_BAIL_THRESHOLD = 10; // if first 10 frames have no text, give up on OCR

    for (let i = 0; i < framePaths.length; i++) {
      const pct = 70 + Math.round((i / framePaths.length) * 25);
      setProgress(pct, 'ocr', `OCR: frame ${i + 1}/${framePaths.length}...`);

      try {
        const { data: { text } } = await Tesseract.recognize(framePaths[i], 'fra', {
          logger: () => {} // suppress individual frame logs
        });

        const cleaned = text.trim().replace(/\n+/g, ' ').replace(/\s+/g, ' ');

        // Check if frame has meaningful French text (not OCR noise)
        const frameQuality = validateOCRText(cleaned);

        if (!frameQuality.ok) {
          emptyCount++;
          // If first N frames are all empty/garbage, no burned-in subtitles — fall back to audio
          if (emptyCount >= EARLY_BAIL_THRESHOLD && texts.length === 0) {
            console.log(`No subtitles detected in first ${EARLY_BAIL_THRESHOLD} frames, falling back to audio transcription`);
            try { await fetch(`/api/frames/${jobId}`, { method: 'DELETE' }); } catch {}
            setProgress(75, 'ocr', 'No burned-in subtitles detected. Switching to audio transcription...');
            await fallbackToAudioTranscription(jobId);
            return;
          }
          continue;
        }

        // Deduplicate: skip if same as previous frame (subtitle hasn't changed)
        if (cleaned !== lastText) {
          // Also skip if very similar (subtitle might have minor OCR differences)
          if (!lastText || levenshteinSimilarity(cleaned, lastText) < 0.85) {
            texts.push(cleaned);
          }
          lastText = cleaned;
        }
      } catch (e) {
        console.warn(`OCR failed on frame ${i}:`, e);
        emptyCount++;
        if (emptyCount >= EARLY_BAIL_THRESHOLD && texts.length === 0) {
          try { await fetch(`/api/frames/${jobId}`, { method: 'DELETE' }); } catch {}
          setProgress(75, 'ocr', 'No burned-in subtitles detected. Switching to audio transcription...');
          await fallbackToAudioTranscription(jobId);
          return;
        }
      }
    }

    // Clean up frames on server
    try { await fetch(`/api/frames/${jobId}`, { method: 'DELETE' }); } catch {}

    if (texts.length === 0) {
      // All frames scanned but no text — fall back to audio
      setProgress(80, 'ocr', 'No text found in video. Switching to audio transcription...');
      await fallbackToAudioTranscription(jobId);
      return;
    }

    setProgress(100, 'ocr', 'Done!');
    const fullText = texts.join('. ').replace(/\.\./g, '.');
    setTimeout(() => displayFrenchText(fullText), 300);
  }

  // When OCR finds no subtitles, re-upload the original file for audio transcription
  // We store the file reference during processVideoOCR to enable this fallback
  let lastVideoFile = null;

  async function fallbackToAudioTranscription(ocrJobId) {
    if (!lastVideoFile) {
      hideProcessing();
      showError('No burned-in subtitles detected and original file unavailable for audio transcription.');
      return;
    }

    // Reconfigure progress steps for audio transcription
    configureSteps([
      { key: 'uploading', label: 'Uploading' },
      { key: 'converting', label: 'Converting' },
      { key: 'transcribing', label: 'Transcribing' }
    ]);
    setProgress(5, 'uploading', 'No subtitles found. Uploading for audio transcription...');

    try {
      const formData = new FormData();
      formData.append('file', lastVideoFile);
      const whisperModel = $('#whisper-model') ? $('#whisper-model').value : 'cloud';
      formData.append('whisperModel', whisperModel);

      const { jobId } = await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/transcribe');
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setProgress(Math.min(pct, 99), 'uploading', `Uploading for transcription... ${pct}%`);
          }
        });
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText));
          else {
            try { reject(new Error(JSON.parse(xhr.responseText).error)); }
            catch { reject(new Error('Upload failed')); }
          }
        });
        xhr.addEventListener('error', () => reject(new Error('Upload failed')));
        xhr.send(formData);
      });

      trackJob(jobId);
    } catch (e) {
      hideProcessing();
      showError(e.message);
    }
  }

  // Simple Levenshtein-based similarity (0 to 1)
  function levenshteinSimilarity(a, b) {
    if (a === b) return 1;
    const longer = a.length > b.length ? a : b;
    const shorter = a.length > b.length ? b : a;
    if (longer.length === 0) return 1;
    // Quick check: if lengths are very different, they're not similar
    if (shorter.length / longer.length < 0.5) return 0;
    // Use simple character overlap ratio for speed
    const set1 = new Set(a.toLowerCase().split(' '));
    const set2 = new Set(b.toLowerCase().split(' '));
    let overlap = 0;
    for (const w of set1) if (set2.has(w)) overlap++;
    return overlap / Math.max(set1.size, set2.size);
  }

  // ─── SSE Job Tracker ──────────────────────────────────────────────────────

  function trackJob(jobId) {
    progressStartTime = Date.now();
    startElapsedTimer();

    const source = new EventSource(`/api/jobs/${jobId}`);

    source.addEventListener('message', (e) => {
      const job = JSON.parse(e.data);

      setProgress(job.progress, job.step, job.message);

      if (job.status === 'complete') {
        source.close();
        stopElapsedTimer();
        setProgress(100, null, 'Done!');
        setTimeout(() => displayFrenchText(job.text), 400);
      } else if (job.status === 'error') {
        source.close();
        stopElapsedTimer();
        hideProcessing();
        showError(job.message);
      }
    });

    source.addEventListener('error', () => {
      source.close();
      stopElapsedTimer();
      hideProcessing();
      showError('Lost connection to server. Please try again.');
    });
  }

  // ─── Progress UI ──────────────────────────────────────────────────────────

  function configureSteps(steps) {
    const container = $('#progress-steps');
    container.innerHTML = steps.map((s, i) => `
      <div class="progress-step" data-step="${s.key}">
        <div class="step-icon" id="step-icon-${i}">${i + 1}</div>
        <span class="step-label" id="step-label-${i}">${s.label}</span>
      </div>
    `).join('');
  }

  function setProgress(pct, activeStep, message) {
    const fill = $('#progress-bar-fill');
    const pctEl = $('#progress-pct');

    fill.style.width = pct + '%';
    pctEl.textContent = pct + '%';

    if (message) {
      els.processingText.textContent = message;
    }

    // Update step indicators
    if (activeStep) {
      const steps = document.querySelectorAll('.progress-step');
      let foundActive = false;
      steps.forEach(step => {
        if (step.dataset.step === activeStep) {
          step.className = 'progress-step active';
          foundActive = true;
        } else if (!foundActive) {
          step.className = 'progress-step done';
          // Replace number with checkmark
          const icon = step.querySelector('.step-icon');
          if (icon && !icon.dataset.checked) {
            icon.textContent = '\u2713';
            icon.dataset.checked = '1';
          }
        } else {
          step.className = 'progress-step';
        }
      });
    }
  }

  function startElapsedTimer() {
    stopElapsedTimer();
    const el = $('#progress-elapsed');
    progressTimer = setInterval(() => {
      const secs = Math.floor((Date.now() - progressStartTime) / 1000);
      const m = Math.floor(secs / 60);
      const s = secs % 60;
      el.textContent = `Elapsed: ${m}:${s.toString().padStart(2, '0')}`;
    }, 1000);
  }

  function stopElapsedTimer() {
    if (progressTimer) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
  }

  // ─── Display French Text ──────────────────────────────────────────────────

  function displayFrenchText(text) {
    currentText = text;
    hideProcessing();
    hideError();
    els.inputSection.style.display = 'none';
    const hero = document.querySelector('#hero-section');
    if (hero) hero.style.display = 'none';
    els.contentSection.classList.add('active');

    // Split into sentences
    sentences = splitSentences(text);

    // Render interactive text
    els.frenchText.innerHTML = '';

    sentences.forEach((sentence, sIdx) => {
      const group = document.createElement('span');
      group.className = 'sentence-group';
      group.dataset.sentenceIndex = sIdx;

      // Split sentence into words (preserving punctuation)
      const tokens = tokenize(sentence);
      // Collect just the word tokens for compound tense detection
      const wordTokens = tokens.filter(t => t.type === 'word').map(t => t.text.replace(/[.,!?;:'"()\[\]«»\-—]/g, ''));
      let wordIdx = 0;

      tokens.forEach((token, wIdx) => {
        if (token.type === 'word') {
          const span = document.createElement('span');
          span.className = 'french-word';
          span.textContent = token.text;
          span.dataset.word = token.text.replace(/[.,!?;:'"()\[\]«»\-—]/g, '');
          span.dataset.sentenceIndex = sIdx;
          span.dataset.wordIndex = wordIdx;
          const currentWordIdx = wordIdx;
          wordIdx++;
          span.addEventListener('click', (e) => {
            e.stopPropagation();
            onWordClick(span, token.text, sIdx, currentWordIdx, wordTokens);
          });

          // Check if word is in vocabulary
          const cleanWord = span.dataset.word.toLowerCase();
          if (vocabularyCache.some(v => v.word.toLowerCase() === cleanWord)) {
            span.classList.add('saved');
          }

          // Check if it's a verb (but not if context says it's a noun)
          const verbResult = FrenchVerbs.analyze(span.dataset.word);
          if (verbResult && !FrenchVerbs.isLikelyNoun(span.dataset.word, wordTokens, currentWordIdx)) {
            span.classList.add('verb');
          }

          group.appendChild(span);
        } else {
          group.appendChild(document.createTextNode(token.text));
        }
      });

      // Add sentence play button
      const playBtn = document.createElement('button');
      playBtn.className = 'sentence-play-btn';
      playBtn.innerHTML = '&#9654;';
      playBtn.title = 'Listen to this sentence';
      playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        speakText(sentence);
      });
      group.appendChild(playBtn);

      // Double-click to translate sentence
      group.addEventListener('dblclick', (e) => {
        e.preventDefault();
        translateSentence(sentence);
      });

      els.frenchText.appendChild(group);
      els.frenchText.appendChild(document.createTextNode(' '));
    });
  }

  function splitSentences(text) {
    // Preserve paragraph breaks as sentence boundaries, then split on punctuation
    return text
      .split(/\n\n+/)
      .flatMap(para => para.replace(/\n/g, ' ').split(/(?<=[.!?])\s+/))
      .filter(s => s.trim().length > 0);
  }

  // French elision prefixes: single-letter words that attach via apostrophe
  const elisionPrefixes = /^(j|l|n|s|m|t|d|c|qu|lorsqu|puisqu|quoiqu|jusqu|presqu|quelqu)['''](.+)$/i;

  function tokenize(text) {
    const tokens = [];
    // Match words (including accented chars, œ/æ ligatures, apostrophes) or whitespace/punctuation
    const regex = /([a-zA-ZÀ-ÿœŒæÆ][a-zA-ZÀ-ÿœŒæÆ''-]*[a-zA-ZÀ-ÿœŒæÆ]|[a-zA-ZÀ-ÿœŒæÆ])|([^a-zA-ZÀ-ÿœŒæÆ]+)/g;
    let match;
    while ((match = regex.exec(text)) !== null) {
      if (match[1]) {
        const word = match[1];
        // Split French elisions: qu'empruntaient -> qu' + empruntaient
        const elision = word.match(elisionPrefixes);
        if (elision) {
          const apostrophe = word.charAt(elision[1].length); // ' or '
          tokens.push({ type: 'word', text: elision[1] + apostrophe });
          tokens.push({ type: 'word', text: elision[2] });
        } else {
          tokens.push({ type: 'word', text: word });
        }
      } else {
        tokens.push({ type: 'other', text: match[2] });
      }
    }
    return tokens;
  }

  // ─── Word Click / Popover ─────────────────────────────────────────────────

  async function onWordClick(element, rawWord, sentenceIndex, wordIndex, sentenceWords) {
    const word = rawWord.replace(/[.,!?;:'"()\[\]«»\-—]/g, '').trim();
    if (!word) return;

    // Highlight active word
    $$('.french-word.active').forEach(el => el.classList.remove('active'));
    element.classList.add('active');

    // Show popover (fixed sidebar on right side, CSS handles positioning)
    const popover = els.popover;
    popover.classList.add('active');
    document.body.classList.add('popover-open');

    // Fill popover
    $('#popover-word').textContent = word;
    $('#popover-translation').textContent = 'Translating...';
    $('#popover-alternatives').textContent = '';

    // Verb analysis — check compound tenses first, then single-word
    const verbInfoEl = $('#verb-info');
    const saveVerbBtn = $('#save-verb-btn');
    let verbDisplay = null; // { infinitive, meaning, tenseName, pronoun, explanation }

    // Check if context indicates this is a noun (e.g. "la petite ferme")
    const likelyNoun = (sentenceWords && wordIndex !== undefined)
      ? FrenchVerbs.isLikelyNoun(word, sentenceWords, wordIndex)
      : false;

    // 1. Check compound tense (futur proche, passé composé, passé récent, etc.)
    const compound = (!likelyNoun && sentenceWords && wordIndex !== undefined)
      ? FrenchVerbs.analyzeCompound(word, sentenceWords, wordIndex)
      : null;

    if (compound) {
      const ti = compound.tenseInfo;
      let displayMeaning = compound.meaning || '(look up translation)';
      // For modal constructions, show both the modal and main verb info
      if (compound.modalVerb && compound.modalMeaning) {
        displayMeaning = `${compound.modalMeaning} + ${displayMeaning || compound.infinitive}`;
      }
      verbDisplay = {
        infinitive: compound.infinitive,
        meaning: displayMeaning,
        tenseName: ti ? ti.name : compound.compound,
        pronoun: compound.pronoun,
        explanation: ti ? `${ti.description}\n\nFormation: ${ti.formation}\n\nExample: ${ti.usage}` : '',
        fullForm: compound.fullForm,
        negative: compound.negative
      };
    }

    // 2. Fall back to single-word verb analysis (skip if context says noun)
    if (!verbDisplay && !likelyNoun) {
      const verbResults = FrenchVerbs.analyze(word);
      if (verbResults && verbResults.length > 0) {
        const verb = verbResults[0];
        const ti = verb.tenseInfo;
        verbDisplay = {
          infinitive: verb.infinitive,
          meaning: verb.meaning || '(look up translation)',
          tenseName: ti ? ti.name : verb.tense,
          pronoun: verb.pronoun,
          explanation: ti ? `${ti.description}\n\nFormation: ${ti.formation}\n\nExample: ${ti.usage}` : ''
        };
      }
    }

    if (verbDisplay) {
      verbInfoEl.classList.add('active');
      $('#verb-infinitive').textContent = verbDisplay.infinitive;
      $('#verb-meaning').textContent = verbDisplay.meaning;
      $('#verb-tense').textContent = verbDisplay.tenseName;
      $('#verb-person').textContent = verbDisplay.pronoun;
      if (verbDisplay.fullForm) {
        const neg = verbDisplay.negative ? ', negative' : '';
        $('#verb-tense').textContent = verbDisplay.tenseName + '  (' + verbDisplay.fullForm + neg + ')';
      }
      $('#tense-explanation').textContent = verbDisplay.explanation;

      saveVerbBtn.style.display = '';
      saveVerbBtn.onclick = () => {
        saveToVocabulary(word, null, sentences[sentenceIndex], {
          infinitive: verbDisplay.infinitive,
          tense: verbDisplay.tenseName,
          meaning: verbDisplay.meaning,
          explanation: verbDisplay.explanation
        });
      };
    } else {
      verbInfoEl.classList.remove('active');
      saveVerbBtn.style.display = 'none';
    }

    // Fetch translation with sentence context for better accuracy
    try {
      const sentence = sentences[sentenceIndex] || '';
      const contextParam = sentence ? `&context=${encodeURIComponent(sentence)}` : '';
      const res = await fetch(`/api/translate/${encodeURIComponent(word)}?${contextParam}`);
      if (res.status === 429) {
        $('#popover-translation').textContent = 'Slow down — too many requests';
        $('#popover-alternatives').textContent = 'Wait a moment and try again.';
        return;
      }
      const data = await res.json();
      if (data.translation) {
        $('#popover-translation').textContent = data.translation;
        const alts = [];
        if (data.alternatives && data.alternatives.length > 0) {
          alts.push(...data.alternatives);
        }
        if (data.contextualTranslation) {
          $('#popover-alternatives').innerHTML =
            (alts.length > 0 ? 'Also: ' + alts.map(a => escapeHtml(a)).join(', ') + '<br>' : '') +
            '<span style="color: var(--text-muted); font-size: 0.8rem;">In context: "' + escapeHtml(data.contextualTranslation) + '"</span>';
        } else if (alts.length > 0) {
          $('#popover-alternatives').textContent = 'Also: ' + alts.join(', ');
        }
      }
    } catch (e) {
      $('#popover-translation').textContent = 'Translation unavailable';
    }

    // Save to vocab button
    $('#save-vocab-btn').onclick = () => {
      const translation = $('#popover-translation').textContent;
      const verbData = verbDisplay ? {
        infinitive: verbDisplay.infinitive,
        tense: verbDisplay.tenseName,
        meaning: verbDisplay.meaning,
        explanation: verbDisplay.explanation
      } : null;
      saveToVocabulary(word, translation, sentences[sentenceIndex], verbData);
    };
  }

  function closePopover() {
    els.popover.classList.remove('active');
    document.body.classList.remove('popover-open');
    $$('.french-word.active').forEach(el => el.classList.remove('active'));
  }

  function setupPopover() {
    $('#popover-close').addEventListener('click', closePopover);
    $('#popover-listen').addEventListener('click', () => {
      const word = $('#popover-word').textContent;
      speakText(word, 0.85);
    });
  }

  // ─── Sentence Translation ─────────────────────────────────────────────────

  async function translateSentence(sentence) {
    els.sentenceBar.classList.add('active');
    els.sentenceTranslation.textContent = 'Translating sentence...';

    try {
      const res = await fetch('/api/translate-sentence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: sentence })
      });
      const data = await res.json();
      els.sentenceTranslation.textContent = data.translation || 'Translation not available';
    } catch {
      els.sentenceTranslation.textContent = 'Translation failed';
    }

    $('#close-sentence-bar').onclick = () => {
      els.sentenceBar.classList.remove('active');
    };
  }

  // ─── Text-to-Speech ───────────────────────────────────────────────────────

  function setupAudioControls() {
    $('#play-all-btn').addEventListener('click', () => playAllText());
    $('#pause-btn').addEventListener('click', () => {
      if (speechSynthesis.paused) {
        speechSynthesis.resume();
        $('#pause-btn').innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pause`;
      } else {
        speechSynthesis.pause();
        $('#pause-btn').innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg> Resume`;
      }
    });
    $('#stop-btn').addEventListener('click', stopSpeech);
  }

  function speakText(text, rateOverride) {
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'fr-FR';
    utterance.rate = rateOverride || parseFloat($('#speech-speed').value);

    // Try to find a French voice
    const voices = speechSynthesis.getVoices();
    const frenchVoice = voices.find(v => v.lang.startsWith('fr'));
    if (frenchVoice) utterance.voice = frenchVoice;

    speechSynthesis.speak(utterance);
  }

  function playAllText() {
    if (!currentText) return;

    isSpeaking = true;
    $('#play-all-btn').style.display = 'none';
    $('#pause-btn').style.display = '';
    $('#stop-btn').style.display = '';

    let idx = 0;

    function speakNext() {
      if (idx >= sentences.length || !isSpeaking) {
        stopSpeech();
        return;
      }

      // Highlight current sentence
      $$('.sentence-group').forEach(g => g.style.background = '');
      const group = $(`.sentence-group[data-sentence-index="${idx}"]`);
      if (group) {
        group.style.background = 'rgba(245, 175, 175, 0.25)';
        group.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }

      const utterance = new SpeechSynthesisUtterance(sentences[idx]);
      utterance.lang = 'fr-FR';
      utterance.rate = parseFloat($('#speech-speed').value);

      const voices = speechSynthesis.getVoices();
      const frenchVoice = voices.find(v => v.lang.startsWith('fr'));
      if (frenchVoice) utterance.voice = frenchVoice;

      utterance.onend = () => {
        idx++;
        speakNext();
      };

      currentUtterance = utterance;
      speechSynthesis.speak(utterance);
    }

    speakNext();
  }

  function stopSpeech() {
    isSpeaking = false;
    speechSynthesis.cancel();
    $('#play-all-btn').style.display = '';
    $('#pause-btn').style.display = 'none';
    $('#stop-btn').style.display = 'none';
    $('#pause-btn').innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg> Pause`;
    $$('.sentence-group').forEach(g => g.style.background = '');
  }

  // ─── Vocabulary ────────────────────────────────────────────────────────────

  async function loadVocabulary() {
    try {
      const res = await fetch('/api/vocabulary');
      vocabularyCache = await res.json();
      updateVocabBadge();
    } catch {
      vocabularyCache = [];
    }
  }

  async function saveToVocabulary(word, translation, context, verbInfo) {
    try {
      const res = await fetch('/api/vocabulary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word,
          translation: translation || $('#popover-translation').textContent,
          context: context || '',
          verbInfo: verbInfo || null,
          savedExplanation: verbInfo ? verbInfo.explanation : null
        })
      });
      const data = await res.json();

      if (data.duplicate) {
        showToast('Already in your vocabulary!', 'info');
      } else {
        vocabularyCache.push(data.entry);
        updateVocabBadge();
        showToast(`"${word}" added to vocabulary!`, 'success');

        // Mark word as saved in the text
        $$('.french-word').forEach(el => {
          if (el.dataset.word.toLowerCase() === word.toLowerCase()) {
            el.classList.add('saved');
          }
        });
      }
    } catch (e) {
      showToast('Failed to save word', 'error');
    }
  }

  async function deleteFromVocabulary(id) {
    try {
      await fetch(`/api/vocabulary/${id}`, { method: 'DELETE' });
      vocabularyCache = vocabularyCache.filter(v => v.id !== id);
      updateVocabBadge();
      renderVocabList();
      showToast('Word removed from vocabulary', 'info');
    } catch {
      showToast('Failed to remove word', 'error');
    }
  }

  function updateVocabBadge() {
    const count = vocabularyCache.length;
    els.vocabCountBadge.textContent = count > 0 ? `(${count})` : '';
  }

  function setupVocabPanel() {
    $('#open-vocab-btn').addEventListener('click', openVocabPanel);
    $('#close-vocab').addEventListener('click', closeVocabPanel);
    els.vocabOverlay.addEventListener('click', closeVocabPanel);

    $('#vocab-search-input').addEventListener('input', (e) => {
      renderVocabList(e.target.value);
    });
  }

  function openVocabPanel() {
    els.vocabPanel.classList.add('active');
    els.vocabOverlay.classList.add('active');
    renderVocabList();
  }

  function closeVocabPanel() {
    els.vocabPanel.classList.remove('active');
    els.vocabOverlay.classList.remove('active');
  }

  function renderVocabList(filter = '') {
    let items = vocabularyCache;
    if (filter) {
      const lower = filter.toLowerCase();
      items = items.filter(v =>
        v.word.toLowerCase().includes(lower) ||
        (v.translation && v.translation.toLowerCase().includes(lower))
      );
    }

    els.vocabStats.textContent = `${items.length} word${items.length !== 1 ? 's' : ''} saved`;

    if (items.length === 0) {
      els.vocabList.innerHTML = `
        <div class="vocab-empty">
          <img src="https://stories.freepiklabs.com/storage/28383/Learning-01.svg"
               alt="Start learning" class="vocab-empty-illustration">
          <p>No words saved yet.</p>
          <p style="margin-top: 0.5rem; font-size: 0.85rem;">Click on any French word to translate it, then save it to your vocabulary.</p>
        </div>`;
      return;
    }

    // Sort by newest first
    items = [...items].sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));

    els.vocabList.innerHTML = items.map(item => `
      <div class="vocab-item" data-id="${item.id}">
        <div class="vocab-item-header">
          <span class="vocab-item-word">${escapeHtml(item.word)}</span>
          <span class="vocab-item-date">${formatDate(item.dateAdded)}</span>
        </div>
        <div class="vocab-item-translation">${escapeHtml(item.translation || '')}</div>
        ${item.context ? `<div class="vocab-item-context">"...${escapeHtml(truncate(item.context, 80))}..."</div>` : ''}
        ${item.verbInfo ? `
          <div class="vocab-item-verb">
            <strong>${escapeHtml(item.verbInfo.infinitive || '')}</strong> &mdash; ${escapeHtml(item.verbInfo.tense || '')}
            ${item.verbInfo.meaning ? `<br>Meaning: ${escapeHtml(item.verbInfo.meaning)}` : ''}
            ${item.savedExplanation ? `<br><br>${escapeHtml(item.savedExplanation)}` : ''}
          </div>
        ` : ''}
        <div class="vocab-item-actions">
          <button class="btn btn-sm btn-outline vocab-listen-btn" data-word="${escapeHtml(item.word)}">Listen</button>
          <button class="btn btn-sm btn-danger vocab-delete-btn" data-id="${item.id}">Remove</button>
        </div>
      </div>
    `).join('');

    // Attach event listeners
    els.vocabList.querySelectorAll('.vocab-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteFromVocabulary(btn.dataset.id));
    });

    els.vocabList.querySelectorAll('.vocab-listen-btn').forEach(btn => {
      btn.addEventListener('click', () => speakText(btn.dataset.word, 0.85));
    });
  }

  // ─── UI Helpers ────────────────────────────────────────────────────────────

  function showProcessing(msg) {
    hideError();
    els.processing.classList.add('active');
    els.processingText.textContent = msg;
    // Reset progress bar
    const fill = $('#progress-bar-fill');
    const pctEl = $('#progress-pct');
    if (fill) fill.style.width = '0%';
    if (pctEl) pctEl.textContent = '0%';
    const elapsed = $('#progress-elapsed');
    if (elapsed) elapsed.textContent = '';
    // Reset step states
    document.querySelectorAll('.progress-step').forEach(s => {
      s.className = 'progress-step';
      const icon = s.querySelector('.step-icon');
      if (icon) icon.dataset.checked = '';
    });
  }

  function hideProcessing() {
    els.processing.classList.remove('active');
    stopElapsedTimer();
  }

  function showError(msg) {
    els.errorBox.textContent = msg;
    els.errorBox.classList.add('active');
  }

  function hideError() {
    els.errorBox.classList.remove('active');
  }

  function showToast(msg, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    els.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function truncate(text, max) {
    return text.length > max ? text.slice(0, max) + '...' : text;
  }

  function formatDate(dateStr) {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric'
      });
    } catch {
      return '';
    }
  }

  // ─── Boot ──────────────────────────────────────────────────────────────────

  // Wait for voices to load
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = () => {};
  }
  speechSynthesis.getVoices();

  document.addEventListener('DOMContentLoaded', init);

  return { speakText, loadVocabulary };
})();
