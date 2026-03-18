require('dotenv').config();
const chokidar = require('chokidar');
const { syncOrders } = require('./sync');

const EXCEL_FILE = process.env.EXCEL_FILE;

if (!EXCEL_FILE) {
  throw new Error('EXCEL_FILE is not defined in .env');
}

let timeout = null;
let isRunning = false;
let pendingRun = false;
let lastTriggerTime = 0;

async function runSync() {
  if (isRunning) {
    pendingRun = true;
    return;
  }

  isRunning = true;
  console.log(`[${new Date().toLocaleString()}] Starting sync...`);

  try {
    await syncOrders();
    console.log(`[${new Date().toLocaleString()}] Sync finished successfully.`);
  } catch (error) {
    console.error(`[${new Date().toLocaleString()}] Sync failed:`, error.message || error);
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
    return;
  }

  lastTriggerTime = now;

  if (timeout) {
    clearTimeout(timeout);
  }

  console.log(`[${new Date().toLocaleString()}] Change detected (${reason}). Waiting before syncing...`);

  timeout = setTimeout(() => {
    runSync();
  }, 4000);
}

console.log(`Watching file: ${EXCEL_FILE}`);

const watcher = chokidar.watch(EXCEL_FILE, {
  ignoreInitial: true,
  awaitWriteFinish: {
    stabilityThreshold: 3000,
    pollInterval: 200,
  },
});

watcher
  .on('change', () => scheduleSync('file changed'))
  .on('add', () => scheduleSync('file added'))
  .on('error', (error) => {
    console.error('Watcher error:', error);
  });

console.log('Watcher is running. Leave this terminal open.');