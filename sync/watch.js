require('dotenv').config();
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { syncOrders } = require('./sync');

const EXCEL_FILE = process.env.EXCEL_FILE;
const LOG_FILE = path.join(__dirname, 'watcher.log');

if (!EXCEL_FILE) {
  throw new Error('EXCEL_FILE is not defined in .env');
}

let timeout = null;
let isRunning = false;
let pendingRun = false;
let lastTriggerTime = 0;

function log(message) {
  const line = `[${new Date().toLocaleString()}] ${message}`;

  console.log(line);

  try {
    fs.appendFileSync(LOG_FILE, `${line}\n`);
  } catch (error) {
    console.error(`[${new Date().toLocaleString()}] Failed to write watcher log:`, error.message || error);
  }
}

async function runSync(reason = 'scheduled sync') {
  if (isRunning) {
    pendingRun = true;
    log(`Sync already running. Queueing a follow-up sync after "${reason}".`);
    return;
  }

  isRunning = true;
  log(`Starting sync (${reason})...`);

  try {
    await syncOrders();
    log(`Sync finished successfully (${reason}).`);
  } catch (error) {
    log(`Sync failed (${reason}): ${error.message || error}`);
  } finally {
    isRunning = false;

    if (pendingRun) {
      pendingRun = false;
      scheduleSync('pending change');
    }
  }
}

function scheduleSync(reason) {
  const now = Date.now();

  if (now - lastTriggerTime < 1500) {
    log(`Ignored duplicate trigger (${reason}).`);
    return;
  }

  lastTriggerTime = now;

  if (timeout) {
    clearTimeout(timeout);
  }

  log(`Change detected (${reason}). Waiting before syncing...`);

  timeout = setTimeout(() => {
    void runSync(reason);
  }, 4000);
}

log(`Watching file: ${EXCEL_FILE}`);

// Polling is more reliable for Excel files saved through OneDrive on Windows,
// where native file events can occasionally be missed.
const watcher = chokidar.watch(EXCEL_FILE, {
  ignoreInitial: true,
  usePolling: true,
  interval: 1000,
  binaryInterval: 1500,
  awaitWriteFinish: {
    stabilityThreshold: 3000,
    pollInterval: 200,
  },
});

watcher
  .on('ready', () => {
    log('Watcher initial scan complete. Running startup sync.');
    void runSync('startup');
  })
  .on('all', (event, filePath) => {
    log(`Watcher event: ${event} (${filePath})`);

    if (event === 'change' || event === 'add' || event === 'unlink') {
      scheduleSync(`file ${event}`);
    }
  })
  .on('error', (error) => {
    log(`Watcher error: ${error.message || error}`);
  });

log('Watcher is running. Leave this terminal open.');
