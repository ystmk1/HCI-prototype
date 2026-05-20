import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import * as sessionLogger from '../services/sessionLogger'
import * as jsonArchive from '../services/jsonArchive'
import { getScenarioById } from '../data/scenarios'

const CHANNEL_NAME = 'exp_channel'

// ── BroadcastChannel message types ──────────────────────────
export const BC = {
  START_TRIAL:       'START_TRIAL',
  END_TRIAL:         'END_TRIAL',
  INITIALIZE_HMI:    'INITIALIZE_HMI',
  TURN_CREATED:      'TURN_CREATED',
  TURN_UPDATED:      'TURN_UPDATED',
}

const ExperimentContext = createContext(null)

export function ExperimentProvider({ children }) {
  // ── Restore from localStorage on mount ──────────────────
  const [currentParticipant, setCurrentParticipant] = useState(
    () => sessionLogger.getCurrentParticipant()
  )
  const [currentTrial, setCurrentTrial] = useState(
    () => sessionLogger.getCurrentTrial()
  )
  const [liveConversationTurns, setLiveConversationTurns] = useState(
    () => sessionLogger.getCurrentTurns()
  )
  const [experimentPhase, setExperimentPhase] = useState(() => {
    const trial = sessionLogger.getCurrentTrial()
    if (!trial) return 'setup'
    if (trial.status === 'active') return 'trial_active'
    return 'review'
  })
  const [activeScenario, setActiveScenario] = useState(() => {
    const trial = sessionLogger.getCurrentTrial()
    return trial?.scenario?.scenarioId
      ? getScenarioById(trial.scenario.scenarioId)
      : null
  })
  const [saveStatus, setSaveStatus] = useState({
    autosaved: false,
    finalSaved: false,
    exported: false,
  })
  // Preview of the next participant ID (re-derived after commitParticipant)
  const [nextParticipantId, setNextParticipantId] = useState(
    () => sessionLogger.generateNextParticipantId()
  )

  // ── JSON archive (optional local-folder backup) ─────────────
  const isArchiveSupported = jsonArchive.isSupported()
  const [archiveFolderName, setArchiveFolderName] = useState(null)
  // status: idle | ready | permission_required | saving | success | error | skipped | unsupported
  const [archiveStatus, setArchiveStatus] = useState({
    status: isArchiveSupported ? 'idle' : 'unsupported',
    filename: null,
    error: null,
    savedAt: null,
  })
  const archiveDirHandleRef = useRef(null)

  // Restore persisted folder handle on mount (no permission prompt here)
  useEffect(() => {
    if (!isArchiveSupported) return
    let cancelled = false
    ;(async () => {
      try {
        const handle = await jsonArchive.loadHandleFromIDB()
        if (cancelled || !handle) return
        archiveDirHandleRef.current = handle
        setArchiveFolderName(handle.name)
        const perm = await jsonArchive.queryPermission(handle)
        setArchiveStatus({
          status: perm === 'granted' ? 'ready' : 'permission_required',
          filename: null,
          error: null,
          savedAt: null,
        })
      } catch (err) {
        console.error('[archive] restore failed:', err)
      }
    })()
    return () => { cancelled = true }
  }, [isArchiveSupported])

  // ── Refs (stable across renders, not reactive) ───────────
  const channelRef = useRef(null)
  const turnCounterRef = useRef(sessionLogger.getCurrentTurns().length)
  const currentTrialRef = useRef(currentTrial)
  const liveConversationTurnsRef = useRef(liveConversationTurns)

  useEffect(() => { currentTrialRef.current = currentTrial }, [currentTrial])
  useEffect(() => { liveConversationTurnsRef.current = liveConversationTurns }, [liveConversationTurns])

  // ── BroadcastChannel setup ───────────────────────────────
  useEffect(() => {
    const channel = new BroadcastChannel(CHANNEL_NAME)
    channelRef.current = channel

    channel.onmessage = ({ data }) => {
      const { type, payload = {} } = data

      switch (type) {
        case BC.START_TRIAL: {
          const scenario = getScenarioById(payload.scenarioId)
          setActiveScenario(scenario)
          setCurrentTrial(payload.trial)
          sessionLogger.saveCurrentTrial(payload.trial)
          setLiveConversationTurns([])
          sessionLogger.saveCurrentTurns([])
          turnCounterRef.current = 0
          setExperimentPhase('trial_active')
          setSaveStatus({ autosaved: false, finalSaved: false, exported: false })
          break
        }
        case BC.END_TRIAL: {
          setCurrentTrial((prev) => {
            if (!prev) return prev
            const updated = {
              ...prev,
              status: payload.status,
              timing: { ...prev.timing, endTime: payload.endTime },
              operatorReview: {
                ...prev.operatorReview,
                failureReason: payload.failureReason ?? '',
              },
            }
            sessionLogger.saveCurrentTrial(updated)
            return updated
          })
          setExperimentPhase('review')
          break
        }
        case BC.INITIALIZE_HMI: {
          setLiveConversationTurns([])
          setCurrentTrial(null)
          setActiveScenario(null)
          setExperimentPhase('setup')
          setSaveStatus({ autosaved: false, finalSaved: false, exported: false })
          turnCounterRef.current = 0
          sessionLogger.clearCurrentSession()
          break
        }
        case BC.TURN_CREATED: {
          setLiveConversationTurns((prev) => {
            const updated = [...prev, payload.turn]
            liveConversationTurnsRef.current = updated
            return updated
          })
          setSaveStatus((prev) => ({ ...prev, autosaved: true }))
          break
        }
        case BC.TURN_UPDATED: {
          setLiveConversationTurns((prev) => {
            const updated = prev.map((t) =>
              t.turnId === payload.turnId ? { ...t, ...payload.updates } : t
            )
            liveConversationTurnsRef.current = updated
            return updated
          })
          break
        }
        default:
          break
      }
    }

    return () => channel.close()
  }, [])

  const broadcast = useCallback((type, payload = {}) => {
    channelRef.current?.postMessage({ type, payload })
  }, [])

  // ── Operator: start trial ────────────────────────────────
  const startTrial = useCallback(
    ({ ageRange, drivingExperience, scenarioId }) => {
      const participantId = currentParticipant?.participantId ?? nextParticipantId

      // Resolve or create participant
      let participant = currentParticipant
      if (!participant) {
        participant = { participantId, ageRange, drivingExperience }
        setCurrentParticipant(participant)
        sessionLogger.saveCurrentParticipant(participant)
      }

      // Generate trial ID before committing
      const trialId = sessionLogger.generateNextTrialId(participantId)
      sessionLogger.commitTrial(participantId)

      const sessionId = sessionLogger.generateSessionId(participantId, trialId)
      const scenario = getScenarioById(scenarioId)
      const now = new Date().toISOString()

      const trial = {
        trialId,
        sessionId,
        scenario: {
          scenarioId: scenario.scenarioId,
          scenarioName: scenario.scenarioName,
          scenarioGroup: scenario.scenarioGroup,
          targetAffect: scenario.targetAffect,
        },
        status: 'active',
        timing: { startTime: now, endTime: null },
        conversationTurns: [],
        operatorReview: {
          valid: true,
          memo: '',
          failureReason: '',
          editHistory: [],
        },
      }

      setCurrentTrial(trial)
      setActiveScenario(scenario)
      setLiveConversationTurns([])
      turnCounterRef.current = 0
      setExperimentPhase('trial_active')
      setSaveStatus({ autosaved: false, finalSaved: false, exported: false })

      sessionLogger.saveCurrentTrial(trial)
      sessionLogger.saveCurrentTurns([])

      broadcast(BC.START_TRIAL, {
        trial,
        scenarioId,
        scenarioContext: scenario.scenarioContext,
      })
    },
    [currentParticipant, nextParticipantId, broadcast]
  )

  // ── Operator: end trial with status ─────────────────────
  // status: 'completed' | 'failed' | 'invalid' | 'aborted'
  // valid defaults to true only for completed; all other statuses default false
  const endTrial = useCallback(
    (status = 'completed', failureReason = '') => {
      const endTime = new Date().toISOString()
      const defaultValid = status === 'completed'
      setCurrentTrial((prev) => {
        if (!prev) return prev
        const updated = {
          ...prev,
          status,
          timing: { ...prev.timing, endTime },
          operatorReview: { ...prev.operatorReview, failureReason, valid: defaultValid },
        }
        sessionLogger.saveCurrentTrial(updated)
        return updated
      })
      setExperimentPhase('review')
      broadcast(BC.END_TRIAL, { status, endTime, failureReason })
    },
    [broadcast]
  )

  // ── Archive: select folder (user gesture → may request permission) ─
  const selectArchiveFolder = useCallback(async () => {
    if (!isArchiveSupported) return
    try {
      const handle = await jsonArchive.pickDirectory()
      if (!handle) return // user cancelled
      // showDirectoryPicker grants readwrite; confirm explicitly.
      const perm = await jsonArchive.requestPermission(handle)
      archiveDirHandleRef.current = handle
      setArchiveFolderName(handle.name)
      await jsonArchive.saveHandleToIDB(handle)
      setArchiveStatus({
        status: perm === 'granted' ? 'ready' : 'permission_required',
        filename: null,
        error: null,
        savedAt: null,
      })
    } catch (err) {
      console.error('[archive] selectArchiveFolder failed:', err)
      setArchiveStatus({ status: 'error', filename: null, error: err.message, savedAt: null })
    }
  }, [isArchiveSupported])

  // ── Archive: reconnect permission (user gesture) ──────────
  const reconnectArchivePermission = useCallback(async () => {
    const handle = archiveDirHandleRef.current
    if (!handle) return
    try {
      const perm = await jsonArchive.requestPermission(handle)
      setArchiveStatus((prev) => ({
        ...prev,
        status: perm === 'granted' ? 'ready' : 'permission_required',
        error: perm === 'granted' ? null : prev.error,
      }))
    } catch (err) {
      console.error('[archive] reconnectArchivePermission failed:', err)
      setArchiveStatus({ status: 'error', filename: null, error: err.message, savedAt: null })
    }
  }, [])

  // ── Archive: test write (user gesture) ────────────────────
  const testArchiveSave = useCallback(async () => {
    const handle = archiveDirHandleRef.current
    if (!handle) return
    try {
      let perm = await jsonArchive.queryPermission(handle)
      if (perm !== 'granted') perm = await jsonArchive.requestPermission(handle)
      if (perm !== 'granted') {
        setArchiveStatus({ status: 'permission_required', filename: null, error: null, savedAt: null })
        return
      }
      const filename = 'test_archive_write.json'
      await jsonArchive.writeJSON(handle, filename, {
        test: true,
        writtenAt: new Date().toISOString(),
      })
      setArchiveStatus({ status: 'success', filename, error: null, savedAt: new Date().toISOString() })
    } catch (err) {
      console.error('[archive] testArchiveSave failed:', err)
      setArchiveStatus({ status: 'error', filename: null, error: err.message, savedAt: null })
    }
  }, [])

  // ── Archive: clear folder setting (does NOT touch logs) ───
  const clearArchiveFolder = useCallback(async () => {
    try {
      await jsonArchive.clearHandleFromIDB()
    } catch (err) {
      console.error('[archive] clearArchiveFolder failed:', err)
    }
    archiveDirHandleRef.current = null
    setArchiveFolderName(null)
    setArchiveStatus({
      status: isArchiveSupported ? 'idle' : 'unsupported',
      filename: null,
      error: null,
      savedAt: null,
    })
  }, [isArchiveSupported])

  // ── Archive: auto-write on Final Save (NO permission prompt) ─
  // Fire-and-forget. Never blocks or fails Final Save.
  const archiveOnFinalSave = useCallback(async (participantId) => {
    const handle = archiveDirHandleRef.current
    if (!isArchiveSupported) {
      setArchiveStatus({ status: 'unsupported', filename: null, error: null, savedAt: null })
      return
    }
    if (!handle) {
      setArchiveStatus({ status: 'skipped', filename: null, error: null, savedAt: null })
      return
    }
    try {
      const perm = await jsonArchive.queryPermission(handle)
      if (perm !== 'granted') {
        // prompt/denied → do NOT request here; signal that a user gesture is needed.
        setArchiveStatus({ status: 'permission_required', filename: null, error: null, savedAt: null })
        return
      }
      setArchiveStatus({ status: 'saving', filename: null, error: null, savedAt: null })
      const session = sessionLogger.getParticipantSession(participantId)
      if (!session) {
        setArchiveStatus({ status: 'error', filename: null, error: 'No saved session to archive', savedAt: null })
        return
      }
      const trialCount = session.trials?.length ?? 0
      const filename = jsonArchive.buildArchiveFilename(participantId, trialCount)
      await jsonArchive.writeJSON(handle, filename, session)
      setArchiveStatus({ status: 'success', filename, error: null, savedAt: new Date().toISOString() })
    } catch (err) {
      console.error('[archive] archiveOnFinalSave failed:', err)
      setArchiveStatus({ status: 'error', filename: null, error: err.message, savedAt: null })
    }
  }, [isArchiveSupported])

  // ── Operator: final save (idempotent) ────────────────────
  const doFinalSave = useCallback(
    (reviewForm, editHistory) => {
      const participant = currentParticipant
      const trial = currentTrialRef.current
      if (!participant || !trial) return { success: false, error: 'No active session' }

      const turns = liveConversationTurnsRef.current.map((t) => ({
        ...t,
        userCorrectedTranscript: reviewForm.correctedTranscripts?.[t.turnId] ?? null,
      }))

      const resolvedScenario = getScenarioById(reviewForm.scenarioId)

      const savedTrial = {
        ...trial,
        scenario: resolvedScenario
          ? {
              scenarioId: resolvedScenario.scenarioId,
              scenarioName: resolvedScenario.scenarioName,
              scenarioGroup: resolvedScenario.scenarioGroup,
              targetAffect: resolvedScenario.targetAffect,
            }
          : trial.scenario,
        status:
          trial.status === 'active'
            ? reviewForm.trialStatus ?? 'completed'
            : trial.status,
        conversationTurns: turns,
        operatorReview: {
          valid: reviewForm.valid,
          memo: reviewForm.memo,
          failureReason: reviewForm.failureReason,
          editHistory,
        },
      }

      const participantData = {
        participantId: participant.participantId,
        participant: {
          ageRange: reviewForm.ageRange ?? participant.ageRange,
          drivingExperience:
            reviewForm.drivingExperience ?? participant.drivingExperience,
        },
        trials: [savedTrial],
      }

      const result = sessionLogger.saveParticipantSession(participantData)

      if (result.success) {
        setSaveStatus((prev) => ({ ...prev, finalSaved: true }))
        setExperimentPhase('saved')
        // Update currentParticipant to reflect any edits
        setCurrentParticipant((prev) => ({
          ...prev,
          ageRange: participantData.participant.ageRange,
          drivingExperience: participantData.participant.drivingExperience,
        }))
        // Optional archive backup — fire-and-forget, never blocks Final Save.
        archiveOnFinalSave(participant.participantId)
      }

      return result
    },
    [currentParticipant, archiveOnFinalSave]
  )

  // ── Operator: add another trial (same participant) ───────
  const addAnotherTrial = useCallback(() => {
    setCurrentTrial(null)
    setLiveConversationTurns([])
    turnCounterRef.current = 0
    setExperimentPhase('setup')
    setSaveStatus({ autosaved: false, finalSaved: false, exported: false })
    sessionLogger.clearCurrentSession()
  }, [])

  // ── Operator: start new participant ─────────────────────
  const startNewParticipant = useCallback(() => {
    sessionLogger.commitParticipant()
    const newId = sessionLogger.generateNextParticipantId()
    setNextParticipantId(newId)
    setCurrentParticipant(null)
    setCurrentTrial(null)
    setLiveConversationTurns([])
    setActiveScenario(null)
    turnCounterRef.current = 0
    setExperimentPhase('setup')
    setSaveStatus({ autosaved: false, finalSaved: false, exported: false })
    sessionLogger.clearCurrentSession()
    localStorage.removeItem('exp_current_participant')
  }, [])

  // ── Operator: initialize HMI display ────────────────────
  const initializeHMI = useCallback(() => {
    broadcast(BC.INITIALIZE_HMI)
  }, [broadcast])

  // ── Operator: mark exported ──────────────────────────────
  const markExported = useCallback(() => {
    setSaveStatus((prev) => ({ ...prev, exported: true }))
  }, [])

  // ── HMI: add pending turn (returns turnId synchronously) ─
  const addPendingTurn = useCallback(
    ({ userRawTranscript, userTimestamp, inputMethod }) => {
      if (currentTrialRef.current?.status !== 'active') return null

      turnCounterRef.current += 1
      const turnId = `turn-${String(turnCounterRef.current).padStart(3, '0')}`

      const turn = {
        turnId,
        status: 'pending',
        userRawTranscript,
        userCorrectedTranscript: null,
        userTimestamp,
        inputMethod,
        aiResponse: null,
        aiTimestamp: null,
        responseLatencyMs: null,
        ttsPlayed: false,
        ttsError: null,
        error: null,
      }

      setLiveConversationTurns((prev) => {
        const updated = [...prev, turn]
        sessionLogger.saveCurrentTurns(updated)
        liveConversationTurnsRef.current = updated
        return updated
      })
      setSaveStatus((prev) => ({ ...prev, autosaved: true }))
      broadcast(BC.TURN_CREATED, { turn })

      return turnId
    },
    [broadcast]
  )

  // ── HMI: complete turn with AI response ─────────────────
  const completeTurn = useCallback(
    (turnId, { aiResponse, aiTimestamp, responseLatencyMs }) => {
      const updates = { aiResponse, aiTimestamp, responseLatencyMs, status: 'completed' }
      setLiveConversationTurns((prev) => {
        const updated = prev.map((t) =>
          t.turnId === turnId ? { ...t, ...updates } : t
        )
        sessionLogger.saveCurrentTurns(updated)
        liveConversationTurnsRef.current = updated
        return updated
      })
      setSaveStatus((prev) => ({ ...prev, autosaved: true }))
      broadcast(BC.TURN_UPDATED, { turnId, updates })
    },
    [broadcast]
  )

  // ── HMI: fail turn (Gemini error) ───────────────────────
  const failTurn = useCallback(
    (turnId, error) => {
      const updates = { error, status: 'failed' }
      setLiveConversationTurns((prev) => {
        const updated = prev.map((t) =>
          t.turnId === turnId ? { ...t, ...updates } : t
        )
        sessionLogger.saveCurrentTurns(updated)
        liveConversationTurnsRef.current = updated
        return updated
      })
      broadcast(BC.TURN_UPDATED, { turnId, updates })
    },
    [broadcast]
  )

  // ── HMI: mark TTS played ─────────────────────────────────
  const markTtsPlayed = useCallback(
    (turnId) => {
      const updates = { ttsPlayed: true }
      setLiveConversationTurns((prev) => {
        const updated = prev.map((t) =>
          t.turnId === turnId ? { ...t, ...updates } : t
        )
        sessionLogger.saveCurrentTurns(updated)
        liveConversationTurnsRef.current = updated
        return updated
      })
      broadcast(BC.TURN_UPDATED, { turnId, updates })
    },
    [broadcast]
  )

  // ── HMI: mark TTS error ──────────────────────────────────
  const markTtsError = useCallback(
    (turnId, ttsError) => {
      const updates = { ttsError }
      setLiveConversationTurns((prev) => {
        const updated = prev.map((t) =>
          t.turnId === turnId ? { ...t, ...updates } : t
        )
        sessionLogger.saveCurrentTurns(updated)
        liveConversationTurnsRef.current = updated
        return updated
      })
      broadcast(BC.TURN_UPDATED, { turnId, updates })
    },
    [broadcast]
  )

  const value = {
    // State
    currentParticipant,
    currentTrial,
    liveConversationTurns,
    experimentPhase,
    activeScenario,
    saveStatus,
    nextParticipantId,
    // Archive state
    isArchiveSupported,
    archiveFolderName,
    archiveStatus,
    // Operator functions
    startTrial,
    endTrial,
    doFinalSave,
    addAnotherTrial,
    startNewParticipant,
    initializeHMI,
    markExported,
    // Archive functions
    selectArchiveFolder,
    reconnectArchivePermission,
    testArchiveSave,
    clearArchiveFolder,
    // HMI logging functions
    addPendingTurn,
    completeTurn,
    failTurn,
    markTtsPlayed,
    markTtsError,
  }

  return (
    <ExperimentContext.Provider value={value}>
      {children}
    </ExperimentContext.Provider>
  )
}

export const useExperiment = () => {
  const ctx = useContext(ExperimentContext)
  if (!ctx) throw new Error('useExperiment must be used inside ExperimentProvider')
  return ctx
}
