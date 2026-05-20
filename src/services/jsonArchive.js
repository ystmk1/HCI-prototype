// ── JSON Archive service ─────────────────────────────────────
// Optional backup that writes participant JSON into a user-picked
// local folder via the File System Access API. This is purely
// additive: localStorage save and Export JSON remain the source of
// truth and must never be blocked by archive failures.

const IDB_NAME = 'exp_archive'
const IDB_STORE = 'handles'
const HANDLE_KEY = 'dir'

// ── Capability check ─────────────────────────────────────────
export const isSupported = () =>
  typeof window !== 'undefined' && 'showDirectoryPicker' in window

// ── IndexedDB wrapper (handle persistence across reloads) ────
const openIDB = () =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(IDB_STORE)
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })

export const saveHandleToIDB = async (handle) => {
  const db = await openIDB()
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).put(handle, HANDLE_KEY)
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

export const loadHandleFromIDB = async () => {
  const db = await openIDB()
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly')
      const req = tx.objectStore(IDB_STORE).get(HANDLE_KEY)
      req.onsuccess = () => resolve(req.result ?? null)
      req.onerror = () => reject(req.error)
    })
  } finally {
    db.close()
  }
}

export const clearHandleFromIDB = async () => {
  const db = await openIDB()
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite')
      tx.objectStore(IDB_STORE).delete(HANDLE_KEY)
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
    })
  } finally {
    db.close()
  }
}

// ── Folder picker (requires a user gesture) ──────────────────
export const pickDirectory = async () => {
  // Returns the handle, or null if the user cancelled the dialog.
  try {
    return await window.showDirectoryPicker({ mode: 'readwrite' })
  } catch (err) {
    if (err?.name === 'AbortError') return null
    throw err
  }
}

// ── Permission helpers ───────────────────────────────────────
// queryPermission never prompts; safe to call during Final Save.
export const queryPermission = async (handle) => {
  if (!handle?.queryPermission) return 'denied'
  return handle.queryPermission({ mode: 'readwrite' })
}

// requestPermission may prompt; must only be called from a user gesture.
export const requestPermission = async (handle) => {
  if (!handle?.requestPermission) return 'denied'
  return handle.requestPermission({ mode: 'readwrite' })
}

// ── Filename builder ─────────────────────────────────────────
// e.g. participant_P001_trials3_20260518_153012_843.json
export const buildArchiveFilename = (participantId, trialCount) => {
  const now = new Date()
  const pad = (n, w = 2) => String(n).padStart(w, '0')
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  const ms = pad(now.getMilliseconds(), 3)
  return `participant_${participantId}_trials${trialCount}_${date}_${time}_${ms}.json`
}

// ── File write ───────────────────────────────────────────────
export const writeJSON = async (handle, filename, data) => {
  const fileHandle = await handle.getFileHandle(filename, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(JSON.stringify(data, null, 2))
  await writable.close()
  return filename
}
