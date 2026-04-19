import { spawn } from 'child_process';
import { createWriteStream, unlink } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomUUID } from 'crypto';
import { pipeline } from 'stream/promises';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TRANSCRIBE_SCRIPT = join(__dirname, 'transcribe.py');

function isYouTubeUrl(url) {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

// Download a direct audio URL to a temp file, returns the temp file path
async function downloadAudio(url) {
  const tempPath = join(tmpdir(), `${randomUUID()}.mp3`);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download audio: ${response.statusText}`);
  }

  const fileStream = createWriteStream(tempPath);
  await pipeline(response.body, fileStream);

  return tempPath;
}

// Download YouTube audio to a temp file using yt-dlp, returns the temp file path
function downloadYouTubeAudio(url) {
  return new Promise((resolve, reject) => {
    const tempPath = join(tmpdir(), `${randomUUID()}.mp3`);

    const ytDlp = spawn('yt-dlp', [
      '-x',                      // extract audio only
      '--audio-format', 'mp3',
      '-o', tempPath,
      url,
    ]);

    ytDlp.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`yt-dlp exited with code ${code}`));
      } else {
        resolve(tempPath);
      }
    });

    ytDlp.on('error', reject);
  });
}

// Run the Python transcription script on a local file, returns segments array
function runTranscribeScript(audioPath) {
  return new Promise((resolve, reject) => {
    const python = spawn('python', [TRANSCRIBE_SCRIPT, audioPath]);

    let stdout = '';
    let stderr = '';

    python.stdout.on('data', (data) => { stdout += data; });
    python.stderr.on('data', (data) => { stderr += data; });

    python.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Transcription failed: ${stderr}`));
      } else {
        try {
          resolve(JSON.parse(stdout));
        } catch {
          reject(new Error(`Failed to parse transcription output: ${stdout}`));
        }
      }
    });

    python.on('error', reject);
  });
}

function deleteTempFile(path) {
  unlink(path, () => {}); // best effort, ignore errors
}

// Main export — takes a lesson row, returns transcription segments
export async function transcribeLesson(lesson) {
  let tempPath = null;
  let audioPath;

  try {
    if (lesson.audio_file_path) {
      audioPath = lesson.audio_file_path;
    } else if (isYouTubeUrl(lesson.audio_url)) {
      tempPath = await downloadYouTubeAudio(lesson.audio_url);
      audioPath = tempPath;
    } else {
      tempPath = await downloadAudio(lesson.audio_url);
      audioPath = tempPath;
    }

    const segments = await runTranscribeScript(audioPath);
    return segments;
  } finally {
    if (tempPath) deleteTempFile(tempPath);
  }
}
