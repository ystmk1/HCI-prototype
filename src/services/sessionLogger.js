// ── localStorage key constants ──────────────────────────────
const KEYS = {
  PARTICIPANT_COUNTER: 'exp_participant_counter',
  TRIAL_COUNTER_PREFIX: 'exp_trial_counter_',
  CURRENT_PARTICIPANT: 'exp_current_participant',
  CURRENT_TRIAL: 'exp_current_trial',
  CURRENT_TURNS: 'exp_current_turns',
  SAVED_SESSIONS: 'exp_saved_sessions',
}

// ── localStorage helpers ─────────────────────────────────────
const lsGet = (key) => {
  try {
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : null
  } catch {
    return null
  }
}

const lsSet = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error('[sessionLogger] localStorage write failed:', key, e)
  }
}

// ── ID generation (read-only, no side effects) ───────────────

export const generateNextParticipantId = () => {
  const counter = lsGet(KEYS.PARTICIPANT_COUNTER) ?? 0
  return 'P' + String(counter + 1).padStart(3, '0')
}

export const generateNextTrialId = (participantId) => {
  const counter = lsGet(KEYS.TRIAL_COUNTER_PREFIX + participantId) ?? 0
  return `${participantId}_T${String(counter + 1).padStart(3, '0')}`
}

// trialId already contains participantId (e.g. P001_T001), so we omit participantId here
export const generateSessionId = (_participantId, trialId) => {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  return `S_${trialId}_${date}_${time}`
}

// ── Counter commits ──────────────────────────────────────────
// Call commitParticipant() only on "Start New Participant"
export const commitParticipant = () => {
  const counter = lsGet(KEYS.PARTICIPANT_COUNTER) ?? 0
  lsSet(KEYS.PARTICIPANT_COUNTER, counter + 1)
}

// Call commitTrial() once per "Start Trial"
export const commitTrial = (participantId) => {
  const key = KEYS.TRIAL_COUNTER_PREFIX + participantId
  const counter = lsGet(key) ?? 0
  lsSet(key, counter + 1)
}

// ── Current session r/w (autosave during experiment) ─────────
export const saveCurrentParticipant = (participant) =>
  lsSet(KEYS.CURRENT_PARTICIPANT, participant)

export const getCurrentParticipant = () => lsGet(KEYS.CURRENT_PARTICIPANT)

export const saveCurrentTrial = (trial) =>
  lsSet(KEYS.CURRENT_TRIAL, trial)

export const getCurrentTrial = () => lsGet(KEYS.CURRENT_TRIAL)

export const saveCurrentTurns = (turns) =>
  lsSet(KEYS.CURRENT_TURNS, turns)

export const getCurrentTurns = () => lsGet(KEYS.CURRENT_TURNS) ?? []

export const clearCurrentSession = () => {
  localStorage.removeItem(KEYS.CURRENT_TRIAL)
  localStorage.removeItem(KEYS.CURRENT_TURNS)
}

// ── Reset test/rehearsal data (DANGEROUS — operator only) ────
// Deletes ONLY experiment localStorage keys so the next participant
// restarts at P001. Explicitly removed:
//   exp_participant_counter, exp_current_participant, exp_current_trial,
//   exp_current_turns, exp_saved_sessions, and every exp_trial_counter_* key.
// NOT touched: JSON archive folder handle (IndexedDB 'exp_archive'),
// Gemini/STT/TTS settings, or any other key.
export const resetTestData = () => {
  const keysToRemove = [
    KEYS.PARTICIPANT_COUNTER,
    KEYS.CURRENT_PARTICIPANT,
    KEYS.CURRENT_TRIAL,
    KEYS.CURRENT_TURNS,
    KEYS.SAVED_SESSIONS,
  ]

  // Collect dynamic per-participant trial counters (exp_trial_counter_*)
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key && key.startsWith(KEYS.TRIAL_COUNTER_PREFIX)) {
      keysToRemove.push(key)
    }
  }

  const removedKeys = []
  for (const key of keysToRemove) {
    try {
      if (localStorage.getItem(key) !== null) removedKeys.push(key)
      localStorage.removeItem(key)
    } catch (e) {
      console.error('[sessionLogger] resetTestData remove failed:', key, e)
    }
  }

  return { success: true, removedKeys }
}

// ── Final save (idempotent upsert by participantId/trialId) ──
export const saveParticipantSession = (participantData) => {
  try {
    const sessions = lsGet(KEYS.SAVED_SESSIONS) ?? []
    const pIdx = sessions.findIndex((s) => s.participantId === participantData.participantId)

    if (pIdx === -1) {
      sessions.push(participantData)
    } else {
      const existing = sessions[pIdx]
      const updatedTrials = [...(existing.trials ?? [])]
      for (const incomingTrial of participantData.trials) {
        const tIdx = updatedTrials.findIndex((t) => t.trialId === incomingTrial.trialId)
        if (tIdx === -1) {
          updatedTrials.push(incomingTrial)
        } else {
          updatedTrials[tIdx] = incomingTrial
        }
      }
      sessions[pIdx] = {
        ...existing,
        participant: participantData.participant,
        trials: updatedTrials,
      }
    }

    lsSet(KEYS.SAVED_SESSIONS, sessions)
    return { success: true }
  } catch (err) {
    console.error('[sessionLogger] saveParticipantSession failed:', err)
    return { success: false, error: err.message }
  }
}

export const getAllSessions = () => lsGet(KEYS.SAVED_SESSIONS) ?? []

export const getParticipantSession = (participantId) => {
  const sessions = getAllSessions()
  return sessions.find((s) => s.participantId === participantId) ?? null
}

// ── Export helpers ────────────────────────────────────────────
const getDateStr = () => {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

const downloadJSON = (data, filename) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export const exportParticipantJSON = (participantId) => {
  const session = getParticipantSession(participantId)
  if (!session) return false
  downloadJSON(session, `participant_${participantId}_${getDateStr()}.json`)
  return true
}

export const exportTrialDebugJSON = (trial) => {
  downloadJSON(trial, `debug_${trial.trialId}_${getDateStr()}.json`)
}
