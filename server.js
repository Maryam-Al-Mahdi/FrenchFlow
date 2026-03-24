require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Hugging Face API key for fast cloud Whisper transcription (free at huggingface.co/settings/tokens)
const HF_API_KEY = process.env.HF_API_KEY || '';

app.use(express.json());
app.use(express.static('public'));

// File upload config
const MAX_DURATION_SECONDS = 600; // 10 minutes max for audio/video
const MAX_FILE_SIZE_MB = 50;

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: MAX_FILE_SIZE_MB * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = /\.(mp4|webm|mkv|avi|mov|mp3|wav|ogg|m4a|png|jpg|jpeg|gif|webp)$/i;
    if (allowed.test(path.extname(file.originalname))) {
      cb(null, true);
    } else {
      cb(new Error('Unsupported file type'));
    }
  }
});

const VOCAB_FILE = path.join(__dirname, 'data', 'vocabulary.json');

function readVocab() {
  try {
    return JSON.parse(fs.readFileSync(VOCAB_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function writeVocab(data) {
  fs.writeFileSync(VOCAB_FILE, JSON.stringify(data, null, 2));
}

// ─── Job tracking for progress ──────────────────────────────────────────────

const jobs = new Map();

function updateJob(jobId, updates) {
  const job = jobs.get(jobId);
  if (job) Object.assign(job, updates);
}

// SSE endpoint: streams real-time progress for a job
app.get('/api/jobs/:id', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  const jobId = req.params.id;

  const interval = setInterval(() => {
    const job = jobs.get(jobId);
    if (!job) {
      res.write(`data: ${JSON.stringify({ status: 'error', message: 'Job not found' })}\n\n`);
      clearInterval(interval);
      res.end();
      return;
    }

    res.write(`data: ${JSON.stringify(job)}\n\n`);

    if (job.status === 'complete' || job.status === 'error') {
      clearInterval(interval);
      setTimeout(() => { jobs.delete(jobId); res.end(); }, 500);
    }
  }, 400);

  req.on('close', () => clearInterval(interval));
});

// ─── YouTube: extract subtitles or audio ───────────────────────────────────────

app.post('/api/youtube', (req, res) => {
  const { url, whisperModel } = req.body;
  if (!url) return res.status(400).json({ error: 'URL is required' });

  const jobId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  jobs.set(jobId, {
    status: 'processing',
    step: 'subtitles',
    progress: 0,
    message: 'Checking for French subtitles...',
    text: null
  });

  res.json({ jobId });

  // Start async pipeline
  processYouTube(jobId, url, whisperModel || 'small');
});

async function processYouTube(jobId, url, whisperModel) {
  try {
    const outDir = path.join(__dirname, 'uploads');
    const subFile = path.join(outDir, `yt_sub_${jobId}`);

    // Step 1: Try French subtitles
    console.log(`[${jobId}] Step 1: Checking for French subtitles...`);
    updateJob(jobId, { step: 'subtitles', progress: 5, message: 'Searching for French subtitles...' });

    // Try subtitles up to 2 times (YouTube can 429 on first attempt)
    let subtitleText = null;
    for (let attempt = 1; attempt <= 2; attempt++) {
      if (attempt === 2) {
        console.log(`[${jobId}] Subtitle attempt 2 (retrying after 429/error)...`);
        updateJob(jobId, { progress: 15, message: 'Retrying subtitle download...' });
        await sleep(2000);
      }

      const subResult = await runSpawn(jobId, 'python', [
        '-m', 'yt_dlp',
        '--js-runtimes', 'nodejs',
        '--write-auto-sub', '--write-sub',
        '--sub-lang', 'fr',
        '--skip-download', '--sub-format', 'vtt',
        '-o', subFile,
        url
      ], {
        stepName: 'subtitles',
        progressRange: [5, 35],
        parseProgress: parseYtDlpProgress,
        timeout: 60000
      });

      console.log(`[${jobId}] Subtitle attempt ${attempt} done (code: ${subResult.code})`);
      if (subResult.output) console.log(`[${jobId}] Output: ${subResult.output.slice(-200)}`);

      const vttPath = subFile + '.fr.vtt';
      if (fs.existsSync(vttPath)) {
        updateJob(jobId, { step: 'parsing', progress: 90, message: 'Parsing subtitles...' });
        const vtt = fs.readFileSync(vttPath, 'utf8');
        subtitleText = parseVTT(vtt);
        try { fs.unlinkSync(vttPath); } catch {}
        break;
      }

      // Clean up partial files before retry
      cleanGlob(outDir, `yt_sub_${jobId}*`);

      // If output says no subtitles available (not a download error), don't retry
      if (subResult.output && !subResult.output.includes('429') &&
          !subResult.output.includes('Too Many Requests') &&
          (subResult.output.includes('no subtitles') || subResult.output.includes('There are no subtitles'))) {
        console.log(`[${jobId}] No French subtitles available for this video`);
        break;
      }
    }

    if (subtitleText && subtitleText.trim()) {
      console.log(`[${jobId}] Success via subtitles (${subtitleText.length} chars)`);
      updateJob(jobId, { status: 'complete', progress: 100, message: 'Done!', text: subtitleText, source: 'subtitles' });
      return;
    }

    // Clean up any leftover files
    cleanGlob(outDir, `yt_sub_${jobId}*`);

    // Step 2: Download audio (only reached if subtitles failed/unavailable)
    console.log(`[${jobId}] Step 2: No usable subtitles. Downloading audio for transcription...`);
    updateJob(jobId, { step: 'downloading', progress: 40, message: 'No subtitles available. Downloading audio...' });
    const audioFile = path.join(outDir, `yt_audio_${jobId}`);

    const dlResult = await runSpawn(jobId, 'python', [
      '-m', 'yt_dlp',
      '--js-runtimes', 'nodejs',
      '-x', '--audio-format', 'wav',
      '--postprocessor-args', '-ar 16000 -ac 1',
      '-o', audioFile + '.%(ext)s',
      url
    ], {
      stepName: 'downloading',
      progressRange: [40, 70],
      parseProgress: parseYtDlpProgress,
      timeout: 180000
    });

    console.log(`[${jobId}] Download done (code: ${dlResult.code})`);
    console.log(`[${jobId}] Output: ${dlResult.output.slice(-300)}`);

    // yt-dlp names files unpredictably — search for the actual output
    const outputFiles = fs.readdirSync(outDir).filter(f => f.startsWith(`yt_audio_${jobId}`));
    console.log(`[${jobId}] Output files found:`, outputFiles);
    const finalPath = outputFiles.length > 0 ? path.join(outDir, outputFiles[0]) : null;

    if (!finalPath) {
      updateJob(jobId, {
        status: 'error',
        progress: 0,
        message: 'Could not extract subtitles or audio. The video may be private, age-restricted, or region-locked.'
      });
      return;
    }

    // Convert to WAV if not already
    let wavPath = finalPath;
    if (!finalPath.endsWith('.wav')) {
      console.log(`[${jobId}] Converting ${path.basename(finalPath)} to WAV...`);
      updateJob(jobId, { step: 'downloading', progress: 65, message: 'Converting audio to WAV...' });
      wavPath = path.join(outDir, `yt_audio_${jobId}_converted.wav`);
      await runSpawn(jobId, 'ffmpeg', [
        '-i', finalPath, '-ar', '16000', '-ac', '1', '-f', 'wav', wavPath, '-y'
      ], { timeout: 60000 });
      try { fs.unlinkSync(finalPath); } catch {}
    }

    // Step 3: Transcribe
    console.log(`[${jobId}] Step 3: Transcribing...`);
    updateJob(jobId, { step: 'transcribing', progress: 70, message: 'Transcribing audio with Whisper...' });

    const text = await transcribeAudioWithProgress(jobId, wavPath, [70, 98], whisperModel);
    try { fs.unlinkSync(wavPath); } catch {}
    console.log(`[${jobId}] Success via transcription (${text.length} chars)`);
    updateJob(jobId, { status: 'complete', progress: 100, message: 'Done!', text, source: 'transcription' });

  } catch (e) {
    console.error(`[${jobId}] Error:`, e.message);
    updateJob(jobId, { status: 'error', progress: 0, message: 'Processing failed: ' + e.message });
    // Clean up any leftover files
    cleanGlob(path.join(__dirname, 'uploads'), `yt_audio_${jobId}*`);
  }
}

// ─── Transcribe uploaded video/audio ────────────────────────────────────────────

app.post('/api/transcribe', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const jobId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const inputPath = req.file.path;
  const whisperModel = req.body.whisperModel || 'small';

  jobs.set(jobId, {
    status: 'processing',
    step: 'converting',
    progress: 0,
    message: 'Preparing audio file...',
    text: null
  });

  res.json({ jobId });

  processUploadedFile(jobId, inputPath, whisperModel);
});

async function checkDuration(jobId, filePath) {
  const result = await runSpawn(jobId, 'ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', filePath
  ], { timeout: 15000 });
  const duration = parseFloat(result.output?.trim()) || 0;
  if (duration > MAX_DURATION_SECONDS) {
    const mins = Math.round(MAX_DURATION_SECONDS / 60);
    throw new Error(`File is too long (${Math.round(duration / 60)} min). Maximum is ${mins} minutes.`);
  }
  return duration;
}

async function processUploadedFile(jobId, inputPath, whisperModel) {
  const wavPath = inputPath + '.wav';

  // Check duration before processing
  try {
    updateJob(jobId, { step: 'checking', progress: 2, message: 'Checking file duration...' });
    await checkDuration(jobId, inputPath);
  } catch (e) {
    updateJob(jobId, { status: 'error', progress: 0, message: e.message });
    try { fs.unlinkSync(inputPath); } catch {}
    return;
  }

  // Step 1: Convert to WAV
  updateJob(jobId, { step: 'converting', progress: 5, message: 'Converting to audio format...' });

  await runSpawn(jobId, 'ffmpeg', [
    '-i', inputPath,
    '-ar', '16000', '-ac', '1',
    '-f', 'wav', wavPath, '-y'
  ], {
    stepName: 'converting',
    progressRange: [5, 20],
    parseProgress: parseFfmpegProgress
  });

  const fileToTranscribe = fs.existsSync(wavPath) ? wavPath : inputPath;

  // Step 2: Transcribe
  updateJob(jobId, { step: 'transcribing', progress: 20, message: 'Transcribing with Whisper...' });

  try {
    const text = await transcribeAudioWithProgress(jobId, fileToTranscribe, [20, 98], whisperModel);
    updateJob(jobId, { status: 'complete', progress: 100, message: 'Done!', text, source: 'transcription' });
  } catch (e) {
    updateJob(jobId, {
      status: 'error', progress: 0,
      message: 'Transcription failed. Ensure ffmpeg is installed for video files. ' + e.message
    });
  } finally {
    try { fs.unlinkSync(inputPath); } catch {}
    try { fs.unlinkSync(wavPath); } catch {}
  }
}

// ─── Video Frame OCR: extract frames for client-side OCR of burned-in subtitles ─

app.post('/api/extract-frames', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const jobId = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const inputPath = req.file.path;
  const interval = parseFloat(req.body.interval) || 2; // seconds between frames

  jobs.set(jobId, {
    status: 'processing',
    step: 'extracting',
    progress: 0,
    message: 'Extracting frames from video...',
    text: null
  });

  res.json({ jobId });

  extractFrames(jobId, inputPath, interval);
});

async function extractFrames(jobId, inputPath, interval) {
  const outDir = path.join(__dirname, 'uploads', `frames_${jobId}`);
  try {
    fs.mkdirSync(outDir, { recursive: true });

    // Check duration limit
    try {
      await checkDuration(jobId, inputPath);
    } catch (e) {
      updateJob(jobId, { status: 'error', progress: 0, message: e.message });
      try { fs.unlinkSync(inputPath); } catch {}
      return;
    }

    // Get video duration first
    updateJob(jobId, { step: 'extracting', progress: 5, message: 'Analyzing video...' });

    const durationResult = await runSpawn(jobId, 'ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration',
      '-of', 'default=noprint_wrappers=1:nokey=1', inputPath
    ], { timeout: 30000 });

    const duration = parseFloat(durationResult.output?.trim()) || 60;
    const expectedFrames = Math.ceil(duration / interval);
    console.log(`[${jobId}] Video duration: ${duration}s, extracting ~${expectedFrames} frames every ${interval}s`);

    // Extract frames — crop to bottom 30% where subtitles usually are
    updateJob(jobId, { step: 'extracting', progress: 10, message: `Extracting frames (${expectedFrames} expected)...` });

    await runSpawn(jobId, 'ffmpeg', [
      '-i', inputPath,
      '-vf', `fps=1/${interval},crop=iw:ih*0.3:0:ih*0.7`,
      '-q:v', '3',
      path.join(outDir, 'frame_%04d.jpg'),
      '-y'
    ], {
      stepName: 'extracting',
      progressRange: [10, 70],
      parseProgress: parseFfmpegProgress,
      timeout: 120000
    });

    // List extracted frames
    const frames = fs.readdirSync(outDir)
      .filter(f => f.startsWith('frame_') && f.endsWith('.jpg'))
      .sort();

    console.log(`[${jobId}] Extracted ${frames.length} frames`);

    if (frames.length === 0) {
      updateJob(jobId, { status: 'error', progress: 0, message: 'No frames could be extracted. Is this a valid video file?' });
      return;
    }

    // Store frame paths in job for the client to fetch
    updateJob(jobId, {
      status: 'frames_ready',
      progress: 70,
      message: `${frames.length} frames extracted. Running OCR...`,
      frames: frames.map(f => `/api/frames/${jobId}/${f}`),
      frameCount: frames.length
    });

  } catch (e) {
    console.error(`[${jobId}] Frame extraction error:`, e.message);
    updateJob(jobId, { status: 'error', progress: 0, message: 'Frame extraction failed: ' + e.message });
  } finally {
    try { fs.unlinkSync(inputPath); } catch {}
  }
}

// Serve extracted frames
app.get('/api/frames/:jobId/:filename', (req, res) => {
  const framePath = path.join(__dirname, 'uploads', `frames_${req.params.jobId}`, req.params.filename);
  if (!fs.existsSync(framePath)) return res.status(404).send('Frame not found');
  res.sendFile(framePath);
});

// Clean up frames after OCR is done
app.delete('/api/frames/:jobId', (req, res) => {
  const dir = path.join(__dirname, 'uploads', `frames_${req.params.jobId}`);
  try {
    if (fs.existsSync(dir)) {
      fs.readdirSync(dir).forEach(f => fs.unlinkSync(path.join(dir, f)));
      fs.rmdirSync(dir);
    }
  } catch {}
  res.json({ ok: true });
});

// ─── Translation via MyMemory API (free, no key) ───────────────────────────────

// ─── Rate limiter for external API calls ─────────────────────────────────────

function createRateLimiter(maxRequests, windowMs) {
  const requests = [];
  return (req, res, next) => {
    const now = Date.now();
    // Remove expired entries
    while (requests.length > 0 && requests[0] <= now - windowMs) {
      requests.shift();
    }
    if (requests.length >= maxRequests) {
      return res.status(429).json({ error: `Rate limit exceeded. Max ${maxRequests} requests per ${windowMs / 1000}s. Please slow down.` });
    }
    requests.push(now);
    next();
  };
}

// Cap at 30 translation API calls per minute
const translateLimiter = createRateLimiter(30, 60000);

// Fix pronoun gender errors in API translations
// e.g. French "Elle a besoin..." mistranslated as "He needs..." → "She needs..."
function fixPronounGender(french, english) {
  const frLower = french.toLowerCase().trim();
  const enLower = english.toLowerCase().trim();

  // If French starts with "elle" but English starts with "he"
  if (/^elle\s/i.test(frLower) && /^he\s/i.test(enLower)) {
    english = english.replace(/^He\b/i, m => m === 'He' ? 'She' : 'she');
  }
  // If French starts with "il" but English starts with "she"
  if (/^il\s/i.test(frLower) && /^she\s/i.test(enLower)) {
    english = english.replace(/^She\b/i, m => m === 'She' ? 'He' : 'he');
  }
  // "elles" → "they" (already usually correct, but ensure not "he/she")
  if (/^elles\s/i.test(frLower) && /^(he|she)\s/i.test(enLower)) {
    english = english.replace(/^(He|She)\b/i, 'They');
  }

  return english;
}

// Common short French words the API often mistranslates
const FRENCH_OVERRIDES = {
  'a': { translation: 'has', alternatives: ['have (auxiliary)'] },
  'à': { translation: 'to / at', alternatives: ['in', 'with'] },
  'y': { translation: 'there', alternatives: ['to it', 'in it'] },
  'eu': { translation: 'had (past participle)', alternatives: [] },
  'été': { translation: 'been / was (past participle)', alternatives: ['summer'] },
  'est': { translation: 'is', alternatives: [] },
  'sont': { translation: 'are', alternatives: [] },
  'ont': { translation: 'have', alternatives: [] },
  'ai': { translation: 'have (1st person)', alternatives: [] },
  'as': { translation: 'have (2nd person)', alternatives: [] },
  'ou': { translation: 'or', alternatives: [] },
  'où': { translation: 'where', alternatives: [] },
  'si': { translation: 'if / so', alternatives: ['yes (contradicting)'] },
  'ça': { translation: 'that / it', alternatives: [] },
  'ce': { translation: 'this / it', alternatives: [] },
  'elle': { translation: 'she', alternatives: ['her', 'it (feminine)'] },
  'il': { translation: 'he', alternatives: ['it (masculine)'] },
  'je': { translation: 'I', alternatives: [] },
  'tu': { translation: 'you (informal)', alternatives: [] },
  'nous': { translation: 'we', alternatives: ['us'] },
  'vous': { translation: 'you (formal/plural)', alternatives: [] },
  'ils': { translation: 'they (masculine)', alternatives: [] },
  'elles': { translation: 'they (feminine)', alternatives: [] },
};

app.get('/api/translate/:word', translateLimiter, async (req, res) => {
  const word = req.params.word.toLowerCase().trim();
  const context = req.query.context || '';

  try {
    // If we have sentence context, translate the full sentence first for better accuracy
    let contextualTranslation = null;
    if (context) {
      try {
        const ctxUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(context)}&langpair=fr|en`;
        const ctxRes = await fetch(ctxUrl);
        const ctxData = await ctxRes.json();
        if (ctxData.responseData?.translatedText) {
          contextualTranslation = ctxData.responseData.translatedText;
          // Fix common pronoun gender mistakes from the API
          contextualTranslation = fixPronounGender(context, contextualTranslation);
        }
      } catch {}
    }

    // Use override for commonly mistranslated short words
    const override = FRENCH_OVERRIDES[word];
    if (override) {
      return res.json({
        word,
        translation: override.translation,
        alternatives: override.alternatives,
        contextualTranslation
      });
    }

    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=fr|en`;
    const response = await fetch(url);
    const data = await response.json();

    const translation = data.responseData?.translatedText || 'Translation not found';
    const alternatives = (data.matches || [])
      .filter(m => m.segment.toLowerCase() === word && m.translation !== translation)
      .map(m => m.translation)
      .slice(0, 3);

    res.json({ word, translation, alternatives, contextualTranslation });
  } catch (e) {
    res.status(500).json({ error: 'Translation failed: ' + e.message });
  }
});

// ─── Translate full sentence ────────────────────────────────────────────────────

app.post('/api/translate-sentence', translateLimiter, async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ error: 'Text is required' });

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=fr|en`;
    const response = await fetch(url);
    const data = await response.json();
    res.json({ translation: data.responseData?.translatedText || 'Translation not found' });
  } catch (e) {
    res.status(500).json({ error: 'Translation failed: ' + e.message });
  }
});

// ─── Vocabulary CRUD ────────────────────────────────────────────────────────────

app.get('/api/vocabulary', (req, res) => {
  res.json(readVocab());
});

app.post('/api/vocabulary', (req, res) => {
  const vocab = readVocab();
  const entry = {
    id: Date.now().toString(),
    word: req.body.word,
    translation: req.body.translation,
    context: req.body.context || '',
    verbInfo: req.body.verbInfo || null,
    savedExplanation: req.body.savedExplanation || null,
    dateAdded: new Date().toISOString(),
    reviewCount: 0,
    lastReviewed: null
  };

  // Don't add duplicates
  const exists = vocab.find(v => v.word.toLowerCase() === entry.word.toLowerCase());
  if (exists) {
    return res.json({ success: true, entry: exists, duplicate: true });
  }

  vocab.push(entry);
  writeVocab(vocab);
  res.json({ success: true, entry });
});

app.delete('/api/vocabulary/:id', (req, res) => {
  let vocab = readVocab();
  vocab = vocab.filter(v => v.id !== req.params.id);
  writeVocab(vocab);
  res.json({ success: true });
});

app.put('/api/vocabulary/:id', (req, res) => {
  const vocab = readVocab();
  const idx = vocab.findIndex(v => v.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  vocab[idx] = { ...vocab[idx], ...req.body };
  writeVocab(vocab);
  res.json({ success: true, entry: vocab[idx] });
});

// ─── Spawn helper with real-time progress ───────────────────────────────────────

function runSpawn(jobId, command, args, opts = {}) {
  const { stepName, progressRange = [0, 100], parseProgress, timeout = 120000 } = opts;

  return new Promise((resolve) => {
    const proc = spawn(command, args);
    let allOutput = '';
    let killed = false;

    // Timeout safety net
    const timer = setTimeout(() => {
      killed = true;
      proc.kill();
      resolve({ code: -1, output: allOutput + '\n[TIMEOUT after ' + (timeout / 1000) + 's]' });
    }, timeout);

    const handleData = (data) => {
      const text = data.toString();
      allOutput += text;

      if (parseProgress) {
        const pct = parseProgress(text);
        if (pct !== null) {
          const [min, max] = progressRange;
          const mapped = Math.round(min + (pct / 100) * (max - min));
          updateJob(jobId, { progress: mapped });
        }
      }
    };

    proc.stdout.on('data', handleData);
    proc.stderr.on('data', handleData);

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (!killed) resolve({ code, output: allOutput });
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      if (!killed) resolve({ code: -1, output: err.message });
    });
  });
}

// ─── Output parsers ─────────────────────────────────────────────────────────────

function parseYtDlpProgress(text) {
  // yt-dlp: [download]  45.2% of ~  12.34MiB ...
  const match = text.match(/\[download\]\s+([\d.]+)%/);
  if (match) return parseFloat(match[1]);

  // Also check for completion markers
  if (text.includes('[download] 100%')) return 100;
  if (text.includes('has already been downloaded')) return 100;
  if (text.includes('Deleting original file')) return 95;

  return null;
}

function parseFfmpegProgress(text) {
  // ffmpeg: time=00:01:23.45
  const match = text.match(/time=(\d+):(\d+):([\d.]+)/);
  if (match) {
    // We don't know total duration, so just show it's working
    // Return a capped estimate
    const seconds = parseInt(match[1]) * 3600 + parseInt(match[2]) * 60 + parseFloat(match[3]);
    return Math.min(90, seconds * 2); // Rough estimate
  }
  return null;
}

// ─── Transcription: HuggingFace API (fast, cloud) or local Whisper (fallback) ─

async function transcribeAudioWithProgress(jobId, audioPath, progressRange, whisperModel = 'small') {
  const [pMin, pMax] = progressRange;
  const useCloud = whisperModel === 'cloud' || (HF_API_KEY && !['tiny', 'base', 'small', 'medium'].includes(whisperModel));
  const localModel = (whisperModel === 'cloud') ? 'small' : whisperModel;

  // Try HuggingFace Inference API if selected
  if (useCloud && HF_API_KEY) {
    try {
      updateJob(jobId, { progress: pMin, message: 'Transcribing via HuggingFace Cloud (Whisper large-v3)...' });

      const text = await transcribeWithHuggingFace(jobId, audioPath, pMin, pMax);
      if (text && text.trim()) return text;
    } catch (e) {
      console.log(`[${jobId}] HuggingFace API failed, falling back to local Whisper: ${e.message}`);
      updateJob(jobId, { message: 'Cloud unavailable, falling back to local Whisper...' });
    }
  }

  // Fallback: local Whisper
  updateJob(jobId, { progress: pMin, message: `Transcribing locally (${localModel} model — this may take a while)...` });
  return transcribeWithLocalWhisper(jobId, audioPath, [pMin, pMax], localModel);
}

async function transcribeWithHuggingFace(jobId, audioPath, pMin, pMax) {
  updateJob(jobId, { progress: Math.round(pMin + (pMax - pMin) * 0.15), message: 'Uploading audio to HuggingFace...' });

  const fileBuffer = fs.readFileSync(audioPath);
  const base64Audio = fileBuffer.toString('base64');

  // JSON payload with base64 audio + language parameter to force French
  const jsonBody = JSON.stringify({
    inputs: base64Audio,
    parameters: {
      generate_kwargs: {
        language: 'french',
        task: 'transcribe'
      }
    }
  });

  async function doRequest() {
    return fetch(
      'https://api-inference.huggingface.co/models/openai/whisper-large-v3',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: jsonBody
      }
    );
  }

  const response = await doRequest();

  updateJob(jobId, { progress: Math.round(pMin + (pMax - pMin) * 0.8), message: 'Processing response...' });

  if (!response.ok) {
    const errText = await response.text();
    // Model might be loading — HF returns 503 with estimated_time
    if (response.status === 503) {
      let wait = 20;
      try { wait = JSON.parse(errText).estimated_time || 20; } catch {}
      updateJob(jobId, { message: `Model is loading on HuggingFace (est. ${Math.round(wait)}s)... Retrying...` });
      await sleep(Math.min(wait * 1000, 60000));
      // Retry once
      const retry = await doRequest();
      if (!retry.ok) {
        const retryErr = await retry.text();
        throw new Error(`HuggingFace API error ${retry.status}: ${retryErr.slice(0, 200)}`);
      }
      const retryData = await retry.json();
      const text = retryData.text || '';
      console.log(`[${jobId}] HuggingFace transcription complete on retry (${text.length} chars)`);
      updateJob(jobId, { progress: pMax, message: 'Transcription complete!' });
      return text;
    }
    throw new Error(`HuggingFace API error ${response.status}: ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = data.text || '';
  console.log(`[${jobId}] HuggingFace transcription complete (${text.length} chars)`);
  updateJob(jobId, { progress: pMax, message: 'Transcription complete!' });
  return text;
}

function transcribeWithLocalWhisper(jobId, audioPath, progressRange, whisperModel) {
  return new Promise((resolve, reject) => {
    const [pMin, pMax] = progressRange;
    let stdoutBuf = '';

    const scriptPath = path.join(__dirname, 'whisper_transcribe.py');
    const proc = spawn('python', [scriptPath, audioPath, whisperModel]);

    proc.stderr.on('data', (data) => {
      const text = data.toString();
      const lines = text.split('\n');
      for (const line of lines) {
        const match = line.match(/^PROGRESS:(\d+):(.+)$/);
        if (match) {
          const rawPct = parseInt(match[1]);
          const mapped = Math.round(pMin + (rawPct / 100) * (pMax - pMin));
          updateJob(jobId, { progress: mapped, message: match[2] });
        }
      }
    });

    proc.stdout.on('data', (data) => {
      stdoutBuf += data.toString();
    });

    proc.on('close', (code) => {
      try {
        const result = JSON.parse(stdoutBuf.trim());
        if (result.error) {
          reject(new Error(result.error));
        } else {
          resolve(result.text);
        }
      } catch (e) {
        reject(new Error(`Whisper process exited with code ${code}. Output: ${stdoutBuf.slice(0, 200)}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error('Failed to start Whisper: ' + err.message));
    });
  });
}

// ─── Config endpoint ─────────────────────────────────────────────────────────

app.get('/api/config', (req, res) => {
  res.json({ cloudAvailable: !!HF_API_KEY });
});

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── VTT subtitle parser ────────────────────────────────────────────────────────

function parseVTT(vtt) {
  const lines = vtt.split('\n');
  const textLines = [];
  let lastLine = '';

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed === 'WEBVTT' || trimmed.includes('-->') ||
        /^\d+$/.test(trimmed) || trimmed.startsWith('Kind:') ||
        trimmed.startsWith('Language:')) continue;

    const clean = trimmed.replace(/<[^>]+>/g, '').trim();
    if (clean && clean !== lastLine) {
      textLines.push(clean);
      lastLine = clean;
    }
  }

  return textLines.join(' ');
}

// ─── Helpers ────────────────────────────────────────────────────────────────────

function cleanGlob(dir, pattern) {
  try {
    const files = fs.readdirSync(dir);
    const regex = new RegExp('^' + pattern.replace('*', '.*'));
    files.filter(f => regex.test(f)).forEach(f => {
      try { fs.unlinkSync(path.join(dir, f)); } catch {}
    });
  } catch {}
}

// ─── Start server ───────────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
  // Show local network IP so phone can connect
  const nets = require('os').networkInterfaces();
  const localIP = Object.values(nets).flat().find(n => n.family === 'IPv4' && !n.internal)?.address;
  console.log(`\n  FrenchFlow is running at http://localhost:${PORT}`);
  if (localIP) console.log(`  Phone access: http://${localIP}:${PORT}`);
  console.log(`\n  HuggingFace: ${HF_API_KEY ? 'configured ✓ (fast cloud transcription)' : 'not set — add HF_API_KEY to .env for fast transcription'}`);
  console.log('  Fallback: local Whisper (yt-dlp, ffmpeg)\n');
});
