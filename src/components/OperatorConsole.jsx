import { useState, useEffect, useRef } from 'react'
import { useExperiment } from '../context/ExperimentContext'
import { SCENARIOS } from '../data/scenarios'
import * as sessionLogger from '../services/sessionLogger'

// ── Option data ───────────────────────────────────────────────
const AGE_RANGES = ['10대 이하', '20대', '30대', '40대', '50대', '60대 이상']
const DRIVING_EXP = ['무경험', '1년 미만', '1-3년', '3-10년', '10년 이상']
const TRIAL_STATUSES = [
  { value: 'completed', label: '완료 (completed)', color: 'text-green-700' },
  { value: 'failed',    label: '실패 (failed)',    color: 'text-red-600' },
  { value: 'invalid',   label: '무효 (invalid)',   color: 'text-orange-500' },
  { value: 'aborted',   label: '중단 (aborted)',   color: 'text-gray-500' },
]

// ── Helper components ─────────────────────────────────────────

function StatusBadge({ saveStatus }) {
  return (
    <div className="flex items-center gap-3 text-xs font-mono">
      <span className={saveStatus.autosaved ? 'text-blue-600 font-semibold' : 'text-gray-300'}>
        ● Autosaved
      </span>
      <span className={saveStatus.finalSaved ? 'text-green-600 font-semibold' : 'text-gray-300'}>
        ✓ Final Saved
      </span>
      <span className={saveStatus.exported ? 'text-purple-600 font-semibold' : 'text-gray-300'}>
        ↓ Exported
      </span>
    </div>
  )
}

function SectionCard({ title, children }) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-white">
      {title && <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">{title}</h3>}
      {children}
    </div>
  )
}

function Btn({ onClick, disabled, variant = 'primary', size = 'md', children }) {
  const base = 'rounded font-medium transition-colors focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed'
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-sm' }
  const variants = {
    primary:  'bg-blue-600 text-white hover:bg-blue-700 disabled:hover:bg-blue-600',
    danger:   'bg-red-600 text-white hover:bg-red-700 disabled:hover:bg-red-600',
    warning:  'bg-amber-500 text-white hover:bg-amber-600 disabled:hover:bg-amber-500',
    ghost:    'bg-gray-100 text-gray-700 hover:bg-gray-200',
    success:  'bg-green-600 text-white hover:bg-green-700 disabled:hover:bg-green-600',
    outline:  'border border-gray-300 text-gray-700 bg-white hover:bg-gray-50',
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]}`}
    >
      {children}
    </button>
  )
}

function TurnStatusDot({ status }) {
  const colors = {
    pending:   'bg-yellow-400',
    completed: 'bg-green-500',
    failed:    'bg-red-500',
  }
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${colors[status] ?? 'bg-gray-300'} mr-1.5 flex-shrink-0`}
    />
  )
}

function ElapsedTimer({ startTime }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (!startTime) return
    const update = () => {
      setElapsed(Math.floor((Date.now() - new Date(startTime).getTime()) / 1000))
    }
    update()
    const id = setInterval(update, 1000)
    return () => clearInterval(id)
  }, [startTime])

  const mm = String(Math.floor(elapsed / 60)).padStart(2, '0')
  const ss = String(elapsed % 60).padStart(2, '0')
  return <span className="font-mono text-sm text-gray-600">{mm}:{ss}</span>
}

// ── Main Component ────────────────────────────────────────────

export default function OperatorConsole() {
  const {
    currentParticipant,
    currentTrial,
    liveConversationTurns,
    experimentPhase,
    saveStatus,
    nextParticipantId,
    startTrial,
    endTrial,
    doFinalSave,
    addAnotherTrial,
    startNewParticipant,
    initializeHMI,
    markExported,
    isArchiveSupported,
    archiveFolderName,
    archiveStatus,
    selectArchiveFolder,
    reconnectArchivePermission,
    testArchiveSave,
    clearArchiveFolder,
  } = useExperiment()

  // ── Setup form ────────────────────────────────────────────
  const [setupForm, setSetupForm] = useState({
    ageRange: '',
    drivingExperience: '',
    scenarioId: '',
  })

  // Pre-fill ageRange/drivingExp when returning to setup for same participant
  useEffect(() => {
    if (experimentPhase === 'setup' && currentParticipant) {
      setSetupForm((prev) => ({
        ...prev,
        ageRange: currentParticipant.ageRange ?? '',
        drivingExperience: currentParticipant.drivingExperience ?? '',
        scenarioId: prev.scenarioId, // keep last selected scenario
      }))
    }
    if (experimentPhase === 'setup' && !currentParticipant) {
      setSetupForm({ ageRange: '', drivingExperience: '', scenarioId: '' })
    }
  }, [experimentPhase, currentParticipant])

  // ── End trial modal ───────────────────────────────────────
  const [endModal, setEndModal] = useState({ open: false, status: 'completed', failureReason: '' })

  // ── Review form ───────────────────────────────────────────
  const [reviewForm, setReviewForm] = useState({
    ageRange: '',
    drivingExperience: '',
    scenarioId: '',
    trialStatus: 'completed',
    memo: '',
    valid: true,
    failureReason: '',
    correctedTranscripts: {},
  })
  const [editHistory, setEditHistory] = useState([])
  const prevReviewRef = useRef({})

  // Init review form when entering review phase
  useEffect(() => {
    if (experimentPhase !== 'review') return
    const resolvedStatus = currentTrial?.status === 'active'
      ? 'completed'
      : (currentTrial?.status ?? 'completed')
    // valid mirrors status: only completed → true; failed/invalid/aborted → false
    const derivedValid = resolvedStatus === 'completed'
    const form = {
      ageRange: currentParticipant?.ageRange ?? '',
      drivingExperience: currentParticipant?.drivingExperience ?? '',
      scenarioId: currentTrial?.scenario?.scenarioId ?? '',
      trialStatus: resolvedStatus,
      memo: currentTrial?.operatorReview?.memo ?? '',
      valid: derivedValid,
      failureReason: currentTrial?.operatorReview?.failureReason ?? '',
      correctedTranscripts: {},
    }
    setReviewForm(form)
    prevReviewRef.current = form
    setEditHistory([])
  }, [experimentPhase]) // eslint-disable-line react-hooks/exhaustive-deps

  const updateReviewField = (field, newValue) => {
    const oldValue = reviewForm[field]
    if (oldValue === newValue) return
    setReviewForm((prev) => ({ ...prev, [field]: newValue }))
    setEditHistory((prev) => [
      ...prev,
      { timestamp: new Date().toISOString(), field, oldValue, newValue },
    ])
  }

  const updateCorrectedTranscript = (turnId, newValue) => {
    const oldValue = reviewForm.correctedTranscripts[turnId] ?? null
    if (oldValue === newValue) return
    setReviewForm((prev) => ({
      ...prev,
      correctedTranscripts: { ...prev.correctedTranscripts, [turnId]: newValue },
    }))
    setEditHistory((prev) => [
      ...prev,
      {
        timestamp: new Date().toISOString(),
        field: 'userCorrectedTranscript',
        turnId,
        oldValue,
        newValue,
      },
    ])
  }

  // ── Derived display info ──────────────────────────────────
  const displayParticipantId = currentParticipant?.participantId ?? nextParticipantId
  const displayTrialId = currentTrial
    ? currentTrial.trialId
    : currentParticipant
    ? sessionLogger.generateNextTrialId(currentParticipant.participantId)
    : `${nextParticipantId}_T001`

  // ── Handlers ──────────────────────────────────────────────

  const handleStartTrial = () => {
    const { ageRange, drivingExperience, scenarioId } = setupForm
    if (!ageRange || !drivingExperience || !scenarioId) {
      alert('나이대, 운전경험, 시나리오를 모두 선택해주세요.')
      return
    }
    startTrial({ ageRange, drivingExperience, scenarioId })
  }

  const handleEndTrialConfirm = () => {
    endTrial(endModal.status, endModal.failureReason)
    setEndModal({ open: false, status: 'completed', failureReason: '' })
  }

  const handleFinalSave = () => {
    const result = doFinalSave(reviewForm, editHistory)
    if (!result.success) {
      alert(`저장 실패: ${result.error}`)
    }
  }

  const handleExport = () => {
    const pid = currentParticipant?.participantId
    if (!pid) return
    const ok = sessionLogger.exportParticipantJSON(pid)
    if (ok) markExported()
    else alert('저장된 데이터가 없습니다. Final Save를 먼저 완료하세요.')
  }

  const handleDebugExport = () => {
    if (!currentTrial) return
    const turns = liveConversationTurns.map((t) => ({
      ...t,
      userCorrectedTranscript: reviewForm.correctedTranscripts?.[t.turnId] ?? null,
    }))
    sessionLogger.exportTrialDebugJSON({ ...currentTrial, conversationTurns: turns })
  }

  const handleAddAnotherTrial = () => {
    if (!saveStatus.finalSaved) {
      alert('Add Another Trial은 Final Save 완료 후에만 사용할 수 있습니다.')
      return
    }
    addAnotherTrial()
  }

  const handleStartNewParticipant = () => {
    if (!saveStatus.finalSaved && currentTrial) {
      const ok = window.confirm(
        '현재 Trial이 아직 저장되지 않았습니다.\n저장하지 않고 새 참가자로 넘어가면 데이터가 유실됩니다.\n계속하시겠습니까?'
      )
      if (!ok) return
    }
    startNewParticipant()
  }

  const handleInitializeHMI = () => {
    const ok = window.confirm('HMI 화면을 초기화합니다. 저장된 로그는 유지됩니다. 계속하시겠습니까?')
    if (!ok) return
    initializeHMI()
  }

  // ── Render ────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col" style={{ fontFamily: 'system-ui, sans-serif' }}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-base font-bold text-gray-800 tracking-tight">Operator Console</h1>
          <span className="text-xs text-gray-400 font-mono border border-gray-200 rounded px-2 py-0.5">
            {displayParticipantId}
            {currentTrial ? ` / ${currentTrial.trialId}` : ''}
          </span>
          <PhaseTag phase={experimentPhase} />
        </div>
        <StatusBadge saveStatus={saveStatus} />
      </header>

      {/* JSON Archive Folder bar (always visible) */}
      <ArchiveBar
        supported={isArchiveSupported}
        folderName={archiveFolderName}
        status={archiveStatus}
        onSelect={selectArchiveFolder}
        onReconnect={reconnectArchivePermission}
        onTest={testArchiveSave}
        onClear={clearArchiveFolder}
      />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-6">

        {/* ── SETUP phase ────────────────────────────────── */}
        {experimentPhase === 'setup' && (
          <>
            <SectionCard title="참가자 정보">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Participant ID
                  </label>
                  <div className="text-sm font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded px-3 py-2 inline-block">
                    {displayParticipantId}
                    <span className="ml-2 text-xs font-normal text-blue-400">
                      (다음 Trial: {displayTrialId})
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">나이대</label>
                    <select
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                      value={setupForm.ageRange}
                      disabled={!!currentParticipant}
                      onChange={(e) => setSetupForm((p) => ({ ...p, ageRange: e.target.value }))}
                    >
                      <option value="">선택</option>
                      {AGE_RANGES.map((v) => <option key={v}>{v}</option>)}
                    </select>
                    {currentParticipant && (
                      <p className="text-xs text-gray-400 mt-1">동일 참가자 — 수정 불가</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">운전경험</label>
                    <select
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                      value={setupForm.drivingExperience}
                      disabled={!!currentParticipant}
                      onChange={(e) => setSetupForm((p) => ({ ...p, drivingExperience: e.target.value }))}
                    >
                      <option value="">선택</option>
                      {DRIVING_EXP.map((v) => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">시나리오</label>
                  <select
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                    value={setupForm.scenarioId}
                    onChange={(e) => setSetupForm((p) => ({ ...p, scenarioId: e.target.value }))}
                  >
                    <option value="">선택</option>
                    {SCENARIOS.map((s) => (
                      <option key={s.scenarioId} value={s.scenarioId}>
                        {s.scenarioName} ({s.targetAffect})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </SectionCard>

            <div className="flex gap-2">
              <Btn onClick={handleStartTrial} variant="primary" size="lg">
                ▶ Start Trial
              </Btn>
            </div>
          </>
        )}

        {/* ── TRIAL_ACTIVE phase ──────────────────────────── */}
        {experimentPhase === 'trial_active' && (
          <>
            <SectionCard title="진행 중">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="text-sm font-semibold text-gray-800">
                    {currentTrial?.trialId}
                    <span className="ml-3 text-xs font-normal text-gray-400">
                      {currentTrial?.scenario?.scenarioName} · {currentTrial?.scenario?.targetAffect}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">
                    {currentParticipant?.ageRange} · {currentParticipant?.drivingExperience}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-400 mb-0.5">경과 시간</div>
                  <ElapsedTimer startTime={currentTrial?.timing?.startTime} />
                </div>
              </div>
            </SectionCard>

            <SectionCard title={`대화 로그 (${liveConversationTurns.length}턴)`}>
              {liveConversationTurns.length === 0 ? (
                <p className="text-xs text-gray-400">아직 대화가 없습니다.</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                  {liveConversationTurns.map((t) => (
                    <TurnRow key={t.turnId} turn={t} />
                  ))}
                </div>
              )}
            </SectionCard>

            <div className="flex gap-2">
              <Btn
                onClick={() => setEndModal({ open: true, status: 'completed', failureReason: '' })}
                variant="danger"
                size="lg"
              >
                ■ End Trial
              </Btn>
            </div>

            {/* End Trial modal */}
            {endModal.open && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
                <div className="bg-white rounded-xl shadow-xl p-6 w-80">
                  <h2 className="text-base font-bold text-gray-800 mb-4">Trial 종료 — 상태 선택</h2>
                  <div className="space-y-2 mb-4">
                    {TRIAL_STATUSES.map((s) => (
                      <label key={s.value} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="trialStatus"
                          value={s.value}
                          checked={endModal.status === s.value}
                          onChange={() => setEndModal((p) => ({ ...p, status: s.value }))}
                        />
                        <span className={`text-sm font-medium ${s.color}`}>{s.label}</span>
                      </label>
                    ))}
                  </div>
                  {endModal.status !== 'completed' && (
                    <div className="mb-4">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        사유 (선택)
                      </label>
                      <textarea
                        rows={2}
                        className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none"
                        placeholder="실패/중단 사유를 입력하세요"
                        value={endModal.failureReason}
                        onChange={(e) => setEndModal((p) => ({ ...p, failureReason: e.target.value }))}
                      />
                    </div>
                  )}
                  <div className="flex gap-2 justify-end">
                    <Btn
                      onClick={() => setEndModal({ open: false, status: 'completed', failureReason: '' })}
                      variant="ghost"
                    >
                      취소
                    </Btn>
                    <Btn onClick={handleEndTrialConfirm} variant="danger">
                      종료 확정
                    </Btn>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── REVIEW phase ────────────────────────────────── */}
        {experimentPhase === 'review' && (
          <>
            <SectionCard title="Review / Edit">
              <div className="space-y-3">
                {/* Trial status (editable if was active) */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Trial 상태</label>
                  <select
                    className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                    value={reviewForm.trialStatus}
                    onChange={(e) => updateReviewField('trialStatus', e.target.value)}
                  >
                    {TRIAL_STATUSES.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">나이대</label>
                    <select
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                      value={reviewForm.ageRange}
                      onChange={(e) => updateReviewField('ageRange', e.target.value)}
                    >
                      {AGE_RANGES.map((v) => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">운전경험</label>
                    <select
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                      value={reviewForm.drivingExperience}
                      onChange={(e) => updateReviewField('drivingExperience', e.target.value)}
                    >
                      {DRIVING_EXP.map((v) => <option key={v}>{v}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">시나리오</label>
                  <select
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                    value={reviewForm.scenarioId}
                    onChange={(e) => updateReviewField('scenarioId', e.target.value)}
                  >
                    {SCENARIOS.map((s) => (
                      <option key={s.scenarioId} value={s.scenarioId}>
                        {s.scenarioName} ({s.targetAffect})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="valid"
                    checked={reviewForm.valid}
                    onChange={(e) => updateReviewField('valid', e.target.checked)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <label htmlFor="valid" className="text-sm text-gray-700">
                    유효한 Trial (분석에 포함)
                  </label>
                </div>

                {reviewForm.trialStatus !== 'completed' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">
                      실패/중단 사유
                    </label>
                    <input
                      type="text"
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400"
                      placeholder="사유를 입력하세요 (선택)"
                      value={reviewForm.failureReason}
                      onChange={(e) => updateReviewField('failureReason', e.target.value)}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">메모</label>
                  <textarea
                    rows={3}
                    className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-400 resize-none"
                    placeholder="관찰 내용, 특이사항 등"
                    value={reviewForm.memo}
                    onChange={(e) => updateReviewField('memo', e.target.value)}
                  />
                </div>
              </div>
            </SectionCard>

            {/* Conversation Turns Review */}
            <SectionCard title={`대화 로그 검토 (${liveConversationTurns.length}턴)`}>
              {liveConversationTurns.length === 0 ? (
                <p className="text-xs text-gray-400">기록된 대화가 없습니다.</p>
              ) : (
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
                  {liveConversationTurns.map((turn) => (
                    <div key={turn.turnId} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-1.5">
                          <TurnStatusDot status={turn.status} />
                          <span className="text-xs font-mono text-gray-400">{turn.turnId}</span>
                          <span className="text-xs text-gray-400">· {turn.inputMethod}</span>
                          {turn.responseLatencyMs != null && (
                            <span className="text-xs text-gray-400">· {turn.responseLatencyMs}ms</span>
                          )}
                          {turn.ttsPlayed && <span className="text-xs text-green-500 ml-1">TTS ✓</span>}
                          {turn.ttsError && (
                            <span className="text-xs text-red-500 ml-1">TTS ✗</span>
                          )}
                        </div>
                        <span className="text-xs text-gray-300 font-mono">
                          {turn.userTimestamp ? new Date(turn.userTimestamp).toLocaleTimeString('ko-KR') : ''}
                        </span>
                      </div>

                      {/* User utterance (read-only) */}
                      <div className="mb-2">
                        <div className="text-xs text-gray-400 mb-0.5">User (원본 — 수정불가)</div>
                        <div className="text-sm text-gray-800 bg-white border border-gray-200 rounded px-3 py-2">
                          {turn.userRawTranscript || <em className="text-gray-300">없음</em>}
                        </div>
                      </div>

                      {/* STT correction */}
                      <div className="mb-2">
                        <div className="text-xs text-gray-400 mb-0.5">STT 보정 (correctedTranscript)</div>
                        <input
                          type="text"
                          className="w-full border border-dashed border-gray-300 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-blue-400 bg-white"
                          placeholder="STT 오류가 있으면 여기에 보정된 텍스트를 입력"
                          value={reviewForm.correctedTranscripts[turn.turnId] ?? ''}
                          onChange={(e) => updateCorrectedTranscript(turn.turnId, e.target.value)}
                        />
                      </div>

                      {/* AI response (read-only) */}
                      {turn.aiResponse && (
                        <div>
                          <div className="text-xs text-gray-400 mb-0.5">AI 응답 (원본 — 수정불가)</div>
                          <div className="text-sm text-gray-700 bg-blue-50 border border-blue-100 rounded px-3 py-2">
                            {turn.aiResponse}
                          </div>
                        </div>
                      )}

                      {/* Error info */}
                      {turn.status === 'failed' && turn.error && (
                        <div className="mt-2 text-xs text-red-500 bg-red-50 rounded px-2 py-1">
                          오류: {turn.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Edit history summary */}
            {editHistory.length > 0 && (
              <SectionCard title={`수정 이력 (${editHistory.length}건)`}>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {editHistory.map((entry, i) => (
                    <div key={i} className="text-xs text-gray-500 font-mono">
                      [{new Date(entry.timestamp).toLocaleTimeString('ko-KR')}] {entry.field}
                      {entry.turnId ? ` (${entry.turnId})` : ''}: {JSON.stringify(entry.oldValue)} → {JSON.stringify(entry.newValue)}
                    </div>
                  ))}
                </div>
              </SectionCard>
            )}

            <div className="flex gap-2 flex-wrap">
              <Btn onClick={handleFinalSave} variant="success" size="lg" disabled={saveStatus.finalSaved}>
                {saveStatus.finalSaved ? '✓ Saved' : '💾 Final Save'}
              </Btn>
              <Btn onClick={handleDebugExport} variant="outline" size="md">
                Debug Export (미저장)
              </Btn>
            </div>
          </>
        )}

        {/* ── SAVED phase ─────────────────────────────────── */}
        {experimentPhase === 'saved' && (
          <>
            <SectionCard title="저장 완료">
              <div className="flex items-center gap-3 mb-4">
                <span className="text-2xl">✅</span>
                <div>
                  <div className="text-sm font-semibold text-gray-800">
                    {currentTrial?.trialId} 저장 완료
                  </div>
                  <div className="text-xs text-gray-400 font-mono">{currentTrial?.sessionId}</div>
                </div>
              </div>
              <StatusBadge saveStatus={saveStatus} />
            </SectionCard>

            {/* Summary */}
            <SectionCard title="Trial 요약">
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div><span className="text-gray-400 text-xs">참가자</span><br />{currentParticipant?.participantId}</div>
                <div><span className="text-gray-400 text-xs">Trial</span><br />{currentTrial?.trialId}</div>
                <div><span className="text-gray-400 text-xs">시나리오</span><br />{currentTrial?.scenario?.scenarioName}</div>
                <div><span className="text-gray-400 text-xs">상태</span><br />
                  <span className={currentTrial?.status === 'completed' ? 'text-green-600' : 'text-orange-500'}>
                    {currentTrial?.status}
                  </span>
                </div>
                <div><span className="text-gray-400 text-xs">대화 턴</span><br />{liveConversationTurns.length}턴</div>
                <div>
                  <span className="text-gray-400 text-xs">나이대 / 경험</span><br />
                  {currentParticipant?.ageRange} / {currentParticipant?.drivingExperience}
                </div>
              </div>
            </SectionCard>

            <div className="flex gap-2 flex-wrap mb-6">
              <Btn onClick={handleExport} variant="primary" size="lg">
                ↓ Export Participant JSON
              </Btn>
              <Btn onClick={handleDebugExport} variant="outline" size="md">
                Debug Export (Trial)
              </Btn>
            </div>

            <div className="border-t border-gray-200 pt-4 flex gap-2 flex-wrap">
              <Btn
                onClick={handleAddAnotherTrial}
                variant="ghost"
                size="md"
                disabled={!saveStatus.finalSaved}
              >
                + Add Another Trial (같은 참가자)
              </Btn>
              <Btn
                onClick={handleStartNewParticipant}
                variant="warning"
                size="md"
              >
                → Start New Participant
              </Btn>
              <Btn onClick={handleInitializeHMI} variant="outline" size="md">
                ↺ Initialize HMI
              </Btn>
            </div>
          </>
        )}

      </main>

      {/* Footer info */}
      <footer className="border-t border-gray-200 bg-white px-6 py-2 text-xs text-gray-400 flex gap-4">
        <span>Participant counter: {sessionLogger.getAllSessions().length} saved</span>
        <span>·</span>
        <span>
          Turns this trial: {liveConversationTurns.length}
          {liveConversationTurns.filter(t => t.status === 'pending').length > 0 &&
            ` (${liveConversationTurns.filter(t => t.status === 'pending').length} pending)`}
        </span>
      </footer>
    </div>
  )
}

// ── TurnRow (used in ACTIVE view) ─────────────────────────────
function TurnRow({ turn }) {
  return (
    <div className="text-xs border-l-2 pl-2 border-gray-200">
      <div className="flex items-center gap-1.5 mb-0.5">
        <TurnStatusDot status={turn.status} />
        <span className="font-mono text-gray-400">{turn.turnId}</span>
        {turn.responseLatencyMs != null && (
          <span className="text-gray-300">· {turn.responseLatencyMs}ms</span>
        )}
        {turn.ttsPlayed && <span className="text-green-400 ml-1">TTS✓</span>}
      </div>
      <div className="text-gray-700 mb-0.5">
        <span className="text-gray-400">U: </span>{turn.userRawTranscript}
      </div>
      {turn.aiResponse && (
        <div className="text-blue-600">
          <span className="text-gray-400">A: </span>{turn.aiResponse}
        </div>
      )}
      {turn.status === 'failed' && turn.error && (
        <div className="text-red-500">오류: {turn.error}</div>
      )}
    </div>
  )
}

// ── PhaseTag ─────────────────────────────────────────────────
function PhaseTag({ phase }) {
  const map = {
    setup:        { label: 'SETUP',        bg: 'bg-gray-100 text-gray-600' },
    trial_active: { label: 'TRIAL ACTIVE', bg: 'bg-green-100 text-green-700' },
    review:       { label: 'REVIEW',       bg: 'bg-amber-100 text-amber-700' },
    saved:        { label: 'SAVED',        bg: 'bg-blue-100 text-blue-700' },
  }
  const { label = phase.toUpperCase(), bg = 'bg-gray-100 text-gray-600' } = map[phase] ?? {}
  return (
    <span className={`text-xs font-semibold rounded px-2 py-0.5 ${bg}`}>{label}</span>
  )
}

// ── ArchiveBar (always-visible JSON Archive Folder bar) ───────
function ArchiveStatusBadge({ status }) {
  const map = {
    idle:                { label: '대기', cls: 'text-gray-400' },
    ready:               { label: '✓ 연결됨 (저장 준비)', cls: 'text-green-600 font-semibold' },
    permission_required: { label: '⚠ 권한 필요 — Reconnect Permission', cls: 'text-amber-600 font-semibold' },
    saving:              { label: '… 저장 중', cls: 'text-blue-600 font-semibold' },
    success:             { label: '✓ 저장 성공', cls: 'text-green-600 font-semibold' },
    error:               { label: '✗ 저장 실패', cls: 'text-red-600 font-semibold' },
    skipped:             { label: '폴더 미선택 — archive 건너뜀', cls: 'text-gray-400' },
    unsupported:         { label: '이 브라우저는 폴더 저장 미지원', cls: 'text-gray-400' },
  }
  const { label, cls } = map[status?.status] ?? map.idle
  return <span className={`text-xs font-mono ${cls}`}>{label}</span>
}

function ArchiveBar({ supported, folderName, status, onSelect, onReconnect, onTest, onClear }) {
  const hasFolder = !!folderName
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-2 sticky top-[49px] z-10">
      <div className="max-w-3xl mx-auto w-full flex items-center gap-3 flex-wrap">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
          JSON Archive Folder
        </span>

        {!supported ? (
          <span className="text-xs text-gray-400">
            이 브라우저는 로컬 폴더 저장(File System Access API)을 지원하지 않습니다. Export JSON을 사용하세요.
          </span>
        ) : (
          <>
            <span className="text-xs font-mono text-gray-600 truncate max-w-[200px]">
              {hasFolder ? `📁 ${folderName}` : '선택 안 됨'}
            </span>

            <ArchiveStatusBadge status={status} />

            <div className="flex items-center gap-1.5 ml-auto">
              <Btn onClick={onSelect} variant="outline" size="sm">
                Select Folder
              </Btn>
              {hasFolder && status?.status === 'permission_required' && (
                <Btn onClick={onReconnect} variant="warning" size="sm">
                  Reconnect Permission
                </Btn>
              )}
              {hasFolder && (
                <Btn onClick={onTest} variant="ghost" size="sm">
                  Test Save
                </Btn>
              )}
              {hasFolder && (
                <Btn onClick={onClear} variant="ghost" size="sm">
                  Clear Folder Setting
                </Btn>
              )}
            </div>
          </>
        )}
      </div>

      {status?.status === 'error' && status?.error && (
        <div className="max-w-3xl mx-auto w-full mt-1">
          <span className="text-xs text-red-600 font-mono">
            오류: {status.error} · localStorage 저장과 Export JSON은 정상입니다.
          </span>
        </div>
      )}
      {status?.status === 'success' && status?.filename && (
        <div className="max-w-3xl mx-auto w-full mt-1">
          <span className="text-xs text-green-600 font-mono">
            저장됨: {status.filename}
          </span>
        </div>
      )}
    </div>
  )
}
