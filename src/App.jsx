import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Snowflake, Mic, MicOff, ExternalLink, X, Wind, Volume, Volume1, Volume2, VolumeX } from 'lucide-react'

// ── Icon imports ────────────────────────────────────────────
import iconSun from '../assets/icons/Icon-15.svg'
import iconWifi from '../assets/icons/Icon-14.svg'
import iconBattery from '../assets/icons/Icon-12.svg'
import iconHome from '../assets/icons/Icon-8.svg'
import iconChevronDown from '../assets/icons/Icon-7.svg'
import iconChevronUp from '../assets/icons/Icon-4.svg'
import iconAC from '../assets/icons/Icon-6.svg'
import iconNav from '../assets/icons/Icon-3.svg'
import iconPhone from '../assets/icons/Icon-5.svg'
import iconMusic from '../assets/icons/Icon-2.svg'
import iconMail from '../assets/icons/Icon-1.svg'
import iconCalendar from '../assets/icons/Icon.svg'
import iconMenu from '../assets/icons/Icon-13.svg'
import voiceIcon from '../assets/icons/voiceicon.svg'

// ── Image imports ───────────────────────────────────────────
import imgBg40 from '../assets/images/image 40.png'
import imgCarHigh from '../assets/images/car_high.png'
import imgNavigation from '../assets/images/navigation.png'

// ── Service imports ─────────────────────────────────────────
import { getGeminiResponse } from './services/gemini'
import { speakText, SPEED_LEVELS, DEFAULT_SPEED_LEVEL } from './services/tts'
import { useWakeWord } from './hooks/useWakeWord'
import { findFavorite, adhocContact } from './data/contacts'
import AppView from './components/AppViews'
import ControlPanel from './components/ControlPanel'
import { ExperimentProvider, useExperiment } from './context/ExperimentContext'
import OperatorConsole from './components/OperatorConsole'

const TTS_KEY = import.meta.env.VITE_GOOGLE_TTS_API_KEY

// Conversational follow-up window. We open the mic the moment TTS *starts*
// playing so a barge-in attempted mid-reply is caught (the browser's AEC
// usually filters the speaker out), then start a hard countdown the moment
// TTS *ends* and close the mic when it hits 0.
const FOLLOWUP_OPEN_DELAY_MS = 150        // tiny pause so TTS audio context is up first
const FOLLOWUP_WINDOW_S      = 5          // seconds the mic stays open after TTS ends

// Hydroplaning scenario marches the simulated current location through five
// fixed points as the passenger keeps asking. App.jsx counts the queries and
// hands the count to gemini.js + the Nav map so the AI's words and the map's
// blue dot stay in sync.
const HYDRO_LOCATIONS = [
  null,                                                                // 0 — pre-trip default
  { lat: 37.5345, lng: 126.9885, name: '녹사평역 부근' },
  { lat: 37.5340, lng: 126.9942, name: '이태원역 부근' },
  { lat: 37.5343, lng: 127.0073, name: '한남대로 폴바셋 근처' },
  { lat: 37.5165, lng: 127.0203, name: '신사역 근처' },
]
const HYDRO_FINAL_LOCATION = { lat: 37.5060, lng: 127.0245, name: '신분당역 부근' } // 5+
const DEFAULT_CURRENT_LOCATION = { lat: 37.5510, lng: 126.9251, name: '홍익대학교' }

// User text → which scenario intents it matches. App.jsx uses these to keep
// per-session counters that influence Gemini's response (location step,
// "앞서 말씀드렸듯이" briefing acknowledgement).
const LOC_QUERY_RE = /(어디|위치|얼마나|남았|어디까지|진행|현재\s*경로|경로\s*확인|남은)/i
const BRIEFING_QUERY_RE = /(상황|왜\s*이래|왜\s*늦|무슨\s*일|괜찮|설명|브리핑)/i

// Scenario → "자세히 보기" animation src. Files live in public/animations/
// so we can reference them by URL without import (no build error if absent —
// the <video> will just fail at runtime and we fall back to the static image).
function animationForScenario(scenarioId) {
  if (scenarioId === 'frustration_roundabout_loop') return '/animations/roundabout.mp4'
  if (scenarioId === 'anxiety_hydroplaning') return '/animations/hydroplaning.mp4'
  return null
}

// In-panel apps the AI can open via the [OPEN_APP:<id>] intent tag. The model
// emits the canonical English id; aliases are a safety net for stray output.
const APP_IDS = ['Navigation', 'Phone', 'Music', 'Mail', 'Calendar']
const APP_ALIASES = {
  내비: 'Navigation', 내비게이션: 'Navigation', 네비: 'Navigation', 네비게이션: 'Navigation', 지도: 'Navigation', 길안내: 'Navigation',
  전화: 'Phone', 음악: 'Music', 메일: 'Mail', 이메일: 'Mail', 일정: 'Calendar', 캘린더: 'Calendar', 달력: 'Calendar',
}
const resolveAppId = (raw) => {
  const s = (raw || '').trim()
  const hit = APP_IDS.find((id) => id.toLowerCase() === s.toLowerCase())
  return hit || APP_ALIASES[s] || null
}

const SUGGESTIONS = [
  '현재 경로 확인',
  '경로 변경',
  '추천 옵션',
  '현재 상황 브리핑',
]

// ── Sub-components ─────────────────────────────────────────

function AIOrb({ size = 160, pulse = false }) {
  return (
    <motion.div
      animate={pulse ? { scale: [1, 1.05, 1], opacity: [0.85, 1, 0.85] } : {}}
      transition={pulse ? { repeat: Infinity, duration: 3.5, ease: 'easeInOut' } : {}}
      className="ai-orb"
      style={{
        width: size,
        height: size,
        boxShadow: `0 ${Math.round(size / 8)}px ${Math.round(size / 2)}px rgba(91,163,217,0.32)`,
      }}
    />
  )
}

function TypingDots() {
  return (
    <div className="typing-dots">
      <div className="typing-dot" />
      <div className="typing-dot" />
      <div className="typing-dot" />
    </div>
  )
}

function ListeningWave() {
  return (
    <div className="listening-wave">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="wave-bar" />
      ))}
    </div>
  )
}

// Idle-screen greeting — one random pair is picked per mount (i.e. each time
// the conversation is cleared and the user returns to the home view). A
// time-of-day variant is included in the pool so it can surface naturally.
function pickGreeting() {
  const h = new Date().getHours()
  const tod =
    h >= 5 && h < 12  ? ['좋은 아침입니다.',  '오늘은 어디로 가실까요?'] :
    h >= 12 && h < 18 ? ['좋은 오후예요.',    '편하게 말 걸어주세요.'] :
    h >= 18 && h < 22 ? ['좋은 저녁입니다.',  '오늘도 수고하셨어요.'] :
                        ['늦은 밤이네요.',    '조용히 모셔다 드릴게요.']
  const pool = [
    ['반갑습니다!',                  '무엇을 도와드릴까요?'],
    ['안녕하세요.',                  '오늘 어디로 모셔다 드릴까요?'],
    ['"자인아"라고 불러보세요.',     '대화를 시작해봐요.'],
    ['"자인아"라고 깨워주세요.',     '필요한 게 있으면 말씀하세요.'],
    ['준비됐어요.',                  '어디든 안전하게 모실게요.'],
    ['오늘도 안전 주행 중이에요.',   '운전은 제가 할게요, 편히 쉬세요.'],
    tod,
  ]
  return pool[Math.floor(Math.random() * pool.length)]
}

function IdleGreeting() {
  const [greeting] = useState(pickGreeting)
  return (
    <motion.div
      className="hero-title"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
    >
      <p>{greeting[0]}</p>
      <p>{greeting[1]}</p>
    </motion.div>
  )
}

// ── Vehicle HMI (participant-facing screen) ────────────────

function VehicleHMI() {
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isAITyping, setIsAITyping] = useState(false)
  const [showCarStatus, setShowCarStatus] = useState(false)
  const [temperature, setTemperature] = useState(20)
  const [isAutoClimate, setIsAutoClimate] = useState(true)
  const [fanSpeed, setFanSpeed] = useState(2)
  // System-wide volume — lives at the HMI level (not inside the music app)
  // so the bar stays visible whatever screen the user is on.
  const [volume, setVolume] = useState(0.5)
  const [muted, setMuted] = useState(false)
  const [volumeOpen, setVolumeOpen] = useState(false) // slider only expands during adjustment
  // Active navigation route confirmed by the user in the Nav app. When set,
  // gemini.js gets its summary in the prompt so the AI can answer trip
  // questions ("얼마나 걸려?") with concrete numbers + scenario delay.
  const [activeRoute, setActiveRoute] = useState(null)
  // Phone call state lifted up so voice intents ([CALL:name]) can initiate
  // calls from outside the Phone app. 'ringing' is a transition state of
  // random 1–5 s before flipping to 'connected'.
  const [callingContact, setCallingContact] = useState(null)
  const [callState, setCallState] = useState(null) // 'ringing' | 'connected' | null
  // Hydroplaning scenario session counters — drive the location step list and
  // the "앞서 말씀드셨듯이…" briefing acknowledgement. Reset on scenario change.
  const [hydroState, setHydroState] = useState({ locationCount: 0, briefingCount: 0 })
  // Seconds remaining in the post-TTS listening window (visible in the voice
  // input area as "N초 남음"). null = no countdown active.
  const [followUpCountdown, setFollowUpCountdown] = useState(null)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [activeApp, setActiveApp] = useState(null)
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(false)

  const [hasShownScenarioCard, setHasShownScenarioCard] = useState(false)

  const messagesEndRef = useRef(null)
  const recognitionRef = useRef(null)
  const screenRef = useRef(null)
  const speedLevelRef = useRef(DEFAULT_SPEED_LEVEL)
  const speakingRateRef = useRef(SPEED_LEVELS[DEFAULT_SPEED_LEVEL])
  const isListeningRef = useRef(false)         // mirror of isListening for async callbacks
  const lastInputMethodRef = useRef('text')    // 'voice' arms the post-response follow-up
  const temperatureRef = useRef(20)            // mirrors of climate state for the Gemini call
  const fanSpeedRef = useRef(2)
  const fanBoostTimerRef = useRef(null)        // reverts a temporary fan boost
  const volumeRef = useRef(0.5)
  const mutedRef = useRef(false)
  const volumeCloseTimerRef = useRef(null)     // auto-collapses the volume slider
  const activeRouteRef = useRef(null)          // mirror of activeRoute for the Gemini call
  const ringingTimerRef = useRef(null)         // ringing → connected transition timer

  // Start a call (used by both UI taps and the [CALL:name] voice intent).
  // Ringing lasts a random 1–5 seconds before flipping to connected.
  const startCall = (contact) => {
    if (!contact) return
    clearTimeout(ringingTimerRef.current)
    setCallingContact(contact)
    setCallState('ringing')
    const delay = 1000 + Math.floor(Math.random() * 4000)
    ringingTimerRef.current = setTimeout(() => setCallState('connected'), delay)
  }

  const endCall = () => {
    clearTimeout(ringingTimerRef.current)
    ringingTimerRef.current = null
    setCallingContact(null)
    setCallState(null)
  }

  // Fit the fixed 1920×1080 screen to the display, preserving aspect ratio.
  useEffect(() => {
    const fit = () => {
      const scale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080)
      if (screenRef.current) screenRef.current.style.transform = `scale(${scale})`
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])

  // ── Experiment logging + scenario control (synced w/ Operator) ──
  const {
    activeScenario,
    hmiResetNonce,
    setScenario,
    resetHmi,
    addPendingTurn,
    completeTurn,
    failTurn,
    markTtsPlayed,
    markTtsError,
  } = useExperiment()

  // Single source of truth for the active scenario (synced across windows).
  const effectiveContext = activeScenario?.scenarioContext ?? ''

  // Reset the roundabout card flag when the scenario switches.
  useEffect(() => {
    setHasShownScenarioCard(false)
    setHydroState({ locationCount: 0, briefingCount: 0 })
  }, [activeScenario?.scenarioId])

  // When a scenario activates, auto-set the navigation route to 강남역 2호선
  // so the experiment trip is already in progress without the participant
  // needing to search. Only fires when transitioning into a scenario and
  // when the participant hasn't already confirmed their own route.
  useEffect(() => {
    const scenarioId = activeScenario?.scenarioId
    if (!scenarioId || activeRouteRef.current) return
    const dest = {
      name: '강남역 2호선',
      addr: '서울 강남구 강남대로 396',
      lat: 37.4979, lng: 127.0276,
    }
    const origin = { lat: 37.5510, lng: 126.9251 }   // 홍익대학교 (DEFAULT_CENTER)
    let cancelled = false
    ;(async () => {
      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?steps=true&geometries=geojson&overview=full`
        const res = await fetch(url)
        if (!res.ok) throw new Error(`OSRM ${res.status}`)
        const data = await res.json()
        const r = data.routes?.[0]
        if (!r) throw new Error('no route')
        if (cancelled) return
        const now = new Date()
        setActiveRoute({
          destination: dest,
          durationSec: r.duration,
          distanceM: r.distance,
          geometry: r.geometry.coordinates,
          departureIso: now.toISOString(),
          baseArrivalIso: new Date(now.getTime() + r.duration * 1000).toISOString(),
        })
      } catch (e) {
        if (cancelled) return
        console.warn('[auto-route] OSRM failed, using straight-line fallback:', e.message)
        const now = new Date()
        const durationSec = 25 * 60   // ~25 min Seoul drive estimate
        const distanceM = 12000
        setActiveRoute({
          destination: dest,
          durationSec, distanceM,
          geometry: [[origin.lng, origin.lat], [dest.lng, dest.lat]],
          departureIso: now.toISOString(),
          baseArrivalIso: new Date(now.getTime() + durationSec * 1000).toISOString(),
        })
      }
    })()
    return () => { cancelled = true }
  }, [activeScenario?.scenarioId])

  // When the participant ends an active route mid-scenario, the AI proactively
  // asks where to go next, anchoring the conversation at a believable
  // mid-route landmark (녹사평역 부근).
  const prevRouteRef = useRef(null)
  useEffect(() => {
    const had = !!prevRouteRef.current
    const has = !!activeRoute
    prevRouteRef.current = activeRoute
    if (had && !has && activeScenario?.scenarioId) {
      const text = '지금 녹사평역 부근인데, 어디로 갈까요?'
      setMessages((prev) => [...prev, { id: Date.now(), type: 'ai', text }])
      if (TTS_KEY) {
        speakText(text, TTS_KEY, speakingRateRef.current).catch(() => {})
      }
    }
  }, [activeRoute, activeScenario?.scenarioId])

  // Operator ended the trial / reset → wipe the HMI back to the idle screen.
  useEffect(() => {
    if (hmiResetNonce === 0) return
    setMessages([])
    setInputText('')
    setShowCarStatus(false)
    setActiveApp(null)
    setIsControlPanelOpen(false)
    setHasShownScenarioCard(false)
    setActiveRoute(null)
    endCall()
    setHydroState({ locationCount: 0, briefingCount: 0 })
  }, [hmiResetNonce])

  const formatTime = (date) =>
    date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isAITyping])

  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Alt+Shift+O → open the operator console in its own window.
      // Triple-modifier chord: identical on Windows/Mac, no OS/browser conflict.
      if (e.ctrlKey && e.altKey && e.shiftKey && e.code === 'KeyO') {
        e.preventDefault()
        window.open('/operator', 'operator_console')
        console.log('Operator Console opened (Ctrl+Alt+Shift+O)')
        return
      }

      // Scenario shortcuts (Alt + single key) — synced to the Operator Console.
      const altOnly = e.altKey && !e.shiftKey && !e.ctrlKey && !e.metaKey
      if (altOnly && e.code === 'KeyQ') {
        // 회전교차로 반복 주행 상황
        e.preventDefault()
        setScenario('frustration_roundabout_loop')
        console.log('Scenario: 회전교차로 반복 주행 (Alt+Q)')
      } else if (altOnly && e.code === 'KeyW') {
        // 빗길 수막현상 상황
        e.preventDefault()
        setScenario('anxiety_hydroplaning')
        console.log('Scenario: 빗길 수막현상 (Alt+W)')
      } else if (altOnly && e.code === 'KeyR') {
        // 상황 리셋 (HMI 초기화)
        e.preventDefault()
        resetHmi()
        console.log('Scenario Reset (Alt+R)')
      } else if (altOnly && e.code === 'KeyA') {
        // CTA 채팅 팝업 (우회 선택지)
        e.preventDefault()
        if (effectiveContext !== '') {
          setMessages(msgs => {
            // Prevent duplicate insertion
            if (msgs.length > 0 && msgs[msgs.length - 1].text === '다른 경로로 우회할까요?') {
              return msgs
            }
            console.log('CTA popup (Alt+A): Showing detour options')
            return [...msgs, {
              id: Date.now(),
              type: 'ai-card',
              text: '다른 경로로 우회할까요?',
              options: ['우회하기', '기존 경로 유지']
            }]
          })
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [effectiveContext, setScenario, resetHmi])

  // ── Gemini + TTS ──────────────────────────────────────────
  // turnId / turnStartMs are passed from sendMessage for experiment logging;
  // null when invoked outside a logged turn.
  const callGemini = async (text, turnId = null, turnStartMs = null, scenarioState = undefined) => {
    setIsAITyping(true)

    try {
      const needsCard = effectiveContext !== '' && !hasShownScenarioCard
      const stateForGemini = scenarioState ?? hydroState
      let aiText = await getGeminiResponse(text, effectiveContext, needsCard, speedLevelRef.current, activeScenario?.scenarioId, temperatureRef.current, fanSpeedRef.current, activeRouteRef.current, volumeRef.current, mutedRef.current, stateForGemini)
      setIsAITyping(false)

      const aiTimestamp = new Date().toISOString()
      const responseLatencyMs =
        turnStartMs != null ? Math.round(performance.now() - turnStartMs) : null

      const speedMatch = aiText.match(/\[SPEED:(slow|normal|fast|very_fast)\]/i)
      if (speedMatch) {
        const level = speedMatch[1].toLowerCase()
        if (SPEED_LEVELS[level] !== undefined) {
          speedLevelRef.current = level
          speakingRateRef.current = SPEED_LEVELS[level]
          console.log('[tts] speed level →', level, `(rate=${SPEED_LEVELS[level]})`)
        }
        aiText = aiText.replace(speedMatch[0], '').trim()
      }

      let hasCard = false
      if (/\[SHOW_SITUATION\]/i.test(aiText) || aiText.includes('[SHOW_ROUNDABOUT_CARD]')) {
        aiText = aiText
          .replace(/\[SHOW_SITUATION\]/gi, '')
          .replace(/\[SHOW_ROUNDABOUT_CARD\]/g, '')
          .trim()
        hasCard = true
        setHasShownScenarioCard(true)
      }

      let options = null
      let isConfirmation = false
      let selectedOptionMatch = null

      const optionsMatch = aiText.match(/\[OPTIONS:(.*?)\]/)
      if (optionsMatch) {
        options = optionsMatch[1].split('|').map(s => s.trim())
        aiText = aiText.replace(optionsMatch[0], '').trim()
      }

      const selectedMatch = aiText.match(/\[SELECTED_OPTION:(.*?)\]/)
      if (selectedMatch) {
        selectedOptionMatch = selectedMatch[1].trim()
        isConfirmation = true
        aiText = aiText.replace(selectedMatch[0], '').trim()
      }

      // App control by intent: the model emits [OPEN_APP:<id>] / [CLOSE_APP].
      const openAppMatch = aiText.match(/\[OPEN_APP:(.*?)\]/i)
      if (openAppMatch) {
        const appId = resolveAppId(openAppMatch[1])
        aiText = aiText.replace(openAppMatch[0], '').trim()
        if (appId) {
          setActiveApp(appId)
          console.log('[app-control] open', appId)
        }
      }
      if (/\[CLOSE_APP\]/i.test(aiText)) {
        aiText = aiText.replace(/\[CLOSE_APP\]/i, '').trim()
        setActiveApp(null)
        console.log('[app-control] close')
      }

      // Voice-triggered call: [CALL:name] — open the Phone app and start
      // ringing. Favorites match by normalized name; an unknown name lands
      // as an ad-hoc contact (the AI should have confirmed with the user
      // before emitting [CALL] for unknowns).
      const callMatch = aiText.match(/\[CALL:(.*?)\]/i)
      if (callMatch) {
        const rawName = callMatch[1].trim()
        aiText = aiText.replace(callMatch[0], '').trim()
        const contact = findFavorite(rawName) ?? adhocContact(rawName)
        setActiveApp('Phone')
        startCall(contact)
        console.log('[phone] call →', contact.name)
      }

      // Climate control by intent: [SET_TEMP:n] / [FAN:n] / [FAN_BOOST].
      const setTempMatch = aiText.match(/\[SET_TEMP:\s*(\d{1,2})\s*\]/i)
      if (setTempMatch) {
        const t = Math.min(29, Math.max(17, parseInt(setTempMatch[1], 10)))
        aiText = aiText.replace(setTempMatch[0], '').trim()
        setTemperature(t)
        setIsAutoClimate(false)
        console.log('[climate] temp →', t)
      }
      const fanMatch = aiText.match(/\[FAN:\s*([1-5])\s*\]/i)
      if (fanMatch) {
        aiText = aiText.replace(fanMatch[0], '').trim()
        clearTimeout(fanBoostTimerRef.current)
        setFanSpeed(parseInt(fanMatch[1], 10))
        console.log('[climate] fan →', fanMatch[1])
      }
      if (/\[FAN_BOOST\]/i.test(aiText)) {
        aiText = aiText.replace(/\[FAN_BOOST\]/i, '').trim()
        clearTimeout(fanBoostTimerRef.current)
        const prev = fanSpeedRef.current
        setFanSpeed(5)
        fanBoostTimerRef.current = setTimeout(() => setFanSpeed(prev), 8000)
        console.log('[climate] fan boost (8s) ← from', prev)
      }

      // System volume by intent: [VOLUME:0-10] / [MUTE] / [UNMUTE]
      const volMatch = aiText.match(/\[VOLUME:\s*(\d{1,2})\s*\]/i)
      if (volMatch) {
        const v = Math.min(10, Math.max(0, parseInt(volMatch[1], 10)))
        aiText = aiText.replace(volMatch[0], '').trim()
        setVolume(v / 10)
        if (muted && v > 0) setMuted(false)
        openVolume()
        console.log('[volume] →', v, '/10')
      }
      if (/\[MUTE\]/i.test(aiText)) {
        aiText = aiText.replace(/\[MUTE\]/i, '').trim()
        setMuted(true)
        openVolume()
        console.log('[volume] muted')
      }
      if (/\[UNMUTE\]/i.test(aiText)) {
        aiText = aiText.replace(/\[UNMUTE\]/i, '').trim()
        setMuted(false)
        openVolume()
        console.log('[volume] unmuted')
      }

      const displayText = aiText || '(응답을 받지 못했습니다)'

      // Log the completed turn (text shown to the user).
      if (turnId) {
        completeTurn(turnId, { aiResponse: displayText, aiTimestamp, responseLatencyMs })
      }

      setMessages((prev) => {
        let newMessages = [...prev]
        if (selectedOptionMatch) {
          // Find the last ai-card and update its selectedOption
          for (let i = newMessages.length - 1; i >= 0; i--) {
            if (newMessages[i].type === 'ai-card') {
              newMessages[i] = { ...newMessages[i], selectedOption: selectedOptionMatch }
              break
            }
          }
        }

        if (options) {
          newMessages.push({ id: Date.now(), type: 'ai-card', text: displayText, options })
        } else {
          newMessages.push({ id: Date.now(), type: 'ai', text: displayText, hasRoundaboutCard: hasCard, isConfirmation })
        }
        return newMessages
      })

      if (displayText && TTS_KEY) {
        // Open the follow-up mic right as TTS starts (only for voice turns) so
        // an interrupting "그럼…" or "잠깐" attempted mid-reply is caught.
        // The fixed-window countdown is started in `.then()` when TTS ends.
        if (lastInputMethodRef.current === 'voice' && !isListeningRef.current) {
          setTimeout(() => {
            if (!isListeningRef.current) startListening()
          }, FOLLOWUP_OPEN_DELAY_MS)
        }
        speakText(displayText, TTS_KEY, speakingRateRef.current)
          .then(() => {
            if (turnId) markTtsPlayed(turnId)
            if (lastInputMethodRef.current === 'voice' && isListeningRef.current) {
              setFollowUpCountdown(FOLLOWUP_WINDOW_S)
            }
          })
          .catch((err) => { if (turnId) markTtsError(turnId, err.message) })
      }
    } catch (err) {
      console.error('Gemini error:', err)
      setIsAITyping(false)
      if (turnId) failTurn(turnId, err.message)
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), type: 'ai', text: `오류: ${err.message}` },
      ])
    }
  }

  // ── Text send ─────────────────────────────────────────────
  const sendMessage = async (text, inputMethod = 'text') => {
    const trimmed = text.trim()
    if (!trimmed) return
    lastInputMethodRef.current = inputMethod
    setMessages((prev) => [...prev, { id: Date.now(), type: 'user', text: trimmed }])
    setInputText('')

    // Hydroplaning session counters — advance the simulated current location
    // and remember how many briefings we've already given. The freshly
    // computed value is what the very next Gemini call needs to see, so it's
    // passed inline alongside the setState (state itself doesn't update in
    // time for the closure below).
    let nextHydroState = hydroState
    if (activeScenario?.scenarioId === 'anxiety_hydroplaning') {
      const locInc = LOC_QUERY_RE.test(trimmed) ? 1 : 0
      const briefInc = BRIEFING_QUERY_RE.test(trimmed) ? 1 : 0
      if (locInc || briefInc) {
        nextHydroState = {
          locationCount: hydroState.locationCount + locInc,
          briefingCount: hydroState.briefingCount + briefInc,
        }
        setHydroState(nextHydroState)
      }
    }

    // Record the user turn (no-op if no trial is active in the operator console).
    const turnStartMs = performance.now()
    const turnId = addPendingTurn({
      userRawTranscript: trimmed,
      userTimestamp: new Date().toISOString(),
      inputMethod,
    })

    await callGemini(trimmed, turnId, turnStartMs, nextHydroState)
  }

  // ── Web Speech API (STT) ──────────────────────────────────
  // Keep a ref mirror so async callbacks (TTS completion, wake word) read the
  // live listening state instead of a stale closure value.
  useEffect(() => {
    isListeningRef.current = isListening
  }, [isListening])

  // Mirror climate state so the Gemini call always sends the current values.
  useEffect(() => { temperatureRef.current = temperature }, [temperature])
  useEffect(() => { fanSpeedRef.current = fanSpeed }, [fanSpeed])
  useEffect(() => { volumeRef.current = volume }, [volume])
  useEffect(() => { mutedRef.current = muted }, [muted])
  useEffect(() => { activeRouteRef.current = activeRoute }, [activeRoute])

  // Follow-up countdown — once set (when TTS ends) tick down to 0 every
  // second and stop the recognizer. Cleared early if the passenger speaks
  // (recognizer ends → isListening flips false → effect below clears).
  useEffect(() => {
    if (followUpCountdown == null) return
    if (followUpCountdown <= 0) {
      try { recognitionRef.current?.stop() } catch { /* noop */ }
      setFollowUpCountdown(null)
      return
    }
    const id = setTimeout(() => setFollowUpCountdown((c) => (c == null ? null : c - 1)), 1000)
    return () => clearTimeout(id)
  }, [followUpCountdown])

  useEffect(() => {
    if (!isListening) setFollowUpCountdown(null)
  }, [isListening])

  // Briefly expand the volume slider (manual click, bar drag, or AI tag).
  // Re-extends an auto-collapse timer each time it's called.
  const openVolume = () => {
    setVolumeOpen(true)
    clearTimeout(volumeCloseTimerRef.current)
    volumeCloseTimerRef.current = setTimeout(() => setVolumeOpen(false), 2500)
  }

  // 4-step icon (mute → low → mid → full) that mirrors the actual level.
  const renderVolumeIcon = () => {
    const v = muted ? 0 : volume
    if (v === 0) return <VolumeX size={22} />
    if (v < 0.34) return <Volume size={22} />
    if (v < 0.67) return <Volume1 size={22} />
    return <Volume2 size={22} />
  }

  const startListening = () => {
    if (isListeningRef.current) return

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) {
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), type: 'ai', text: 'Chrome 또는 Edge 브라우저에서 음성 기능을 사용할 수 있습니다.' },
      ])
      return
    }

    const rec = new SR()
    rec.lang = 'ko-KR'
    rec.interimResults = false
    rec.maxAlternatives = 1
    recognitionRef.current = rec

    rec.onstart = () => setIsListening(true)

    rec.onresult = async (e) => {
      const transcript = e.results[0][0].transcript
      setIsListening(false)
      await sendMessage(transcript, 'voice')
    }

    rec.onerror = (e) => {
      console.error('STT error:', e.error)
      setIsListening(false)
    }

    rec.onend = () => setIsListening(false)

    rec.start()
  }

  const handleMicClick = () => {
    if (isListeningRef.current) {
      recognitionRef.current?.stop()
      return
    }
    startListening()
  }

  // ── Handle voice mic click on idle screen ─────────────────
  const handleVoiceMicClick = () => {
    handleMicClick()
  }

  // ── Wake word "자인아" → start STT ─────────────────────────
  useWakeWord({
    onWake: () => {
      if (!isListening) handleMicClick()
    },
    isSttActive: isListening,
  })

  const hasConversation = messages.length > 0
  const showSplitLayout = hasConversation || !!activeApp

  const APP_ICONS = [
    { id: 'Navigation', icon: iconNav },
    { id: 'Phone', icon: iconPhone },
    { id: 'Music', icon: iconMusic },
    { id: 'Mail', icon: iconMail },
    { id: 'Calendar', icon: iconCalendar },
  ]

  return (
    <div className="hmi-viewport">
      <div className="screen" ref={screenRef}>
      {/* ── Rotated Background Image ─────────────────────────── */}
      <div className="bg-rotated-image">
        <img src={imgBg40} alt="" />
      </div>

      {/* ── Top Status Bar ───────────────────────────────────── */}
      <div className="top-bar">
        <div className="top-bar-left">
          <span className="time">{formatTime(currentTime)}</span>
          <div className="weather">
            <img src={iconSun} alt="" />
            <span>24°C</span>
          </div>
        </div>
        <div className="top-bar-right">
          <img src={iconWifi} alt="" />
          <img src={iconBattery} alt="" />
          <span className="battery-text">100%</span>
        </div>
      </div>

      {/* ── Main Content: Unified Responsive Layout ───────────── */}
      <div className="layout-container" style={{ position: 'absolute', top: 104, left: 49, right: 51, height: 828, display: 'flex', gap: 11, zIndex: 10 }}>

        {/* Center Panel: Idle or Chat */}
        <motion.div
          layout
          className={`panel-main ${hasConversation ? 'chat-mode' : 'idle-mode'}`}
          style={{ flex: 1, position: 'relative', borderRadius: 24, overflow: 'hidden', background: hasConversation ? 'white' : 'transparent', transition: 'background 0.3s' }}
        >
          <AnimatePresence mode="wait">
            {!hasConversation ? (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.2 } }}
                transition={{ duration: 0.4 }}
                style={{ position: 'absolute', inset: 0 }}
              >
                {/* Hero Title — random greeting picked per idle-screen mount */}
                <IdleGreeting />

                {/* Suggestion Chips */}
                <div className="suggestion-chips">
                  {SUGGESTIONS.map((s, i) => (
                    <motion.button
                      key={i}
                      className="suggestion-chip"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.08, duration: 0.35, ease: 'easeOut' }}
                      onClick={() => sendMessage(s)}
                    >
                      <span>{s}</span>
                    </motion.button>
                  ))}
                </div>

                {/* Voice / Text Input Area */}
                <div className="voice-input-area">
                  <div className="voice-input-bg" />
                  <div className="voice-input-content">
                    <button
                      className={`voice-btn ${isListening ? 'listening' : ''}`}
                      onClick={handleVoiceMicClick}
                    >
                      <img src={voiceIcon} alt="음성 입력" />
                    </button>
                    {isListening ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <ListeningWave />
                        <span className="voice-listening-text">
                          듣는 중...
                          {followUpCountdown != null && (
                            <span style={{ marginLeft: 10, opacity: 0.7, fontVariantNumeric: 'tabular-nums' }}>
                              {followUpCountdown}초
                            </span>
                          )}
                        </span>
                      </div>
                    ) : (
                      <input
                        type="text"
                        className="voice-text-input"
                        placeholder="무엇이든 물어보세요"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && sendMessage(inputText)}
                      />
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="chat"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="panel-chat"
                style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}
              >
                {/* Chat Messages */}
                <div className="chat-messages">
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.28 }}
                      className={`message-row ${msg.type === 'user' ? 'user' : ''}`}
                    >
                      {msg.hasRoundaboutCard ? (
                        <div className="roundabout-card">
                          <div className="roundabout-card-title">{msg.text}</div>
                          <div className="roundabout-card-image">
                            <img src={imgCarHigh} alt="car view" />
                            <button className="roundabout-card-btn" onClick={() => setShowCarStatus(v => !v)}>
                              눌러서 자세히 보기 <ExternalLink size={24} color="#131417" strokeWidth={2} />
                            </button>
                          </div>
                        </div>
                      ) : msg.type === 'ai-card' ? (
                        <div className="ai-option-card">
                          <div className="ai-option-title">{msg.text}</div>
                          <div className="ai-option-actions">
                            {msg.options?.map((opt, i) => {
                              const isSelected = msg.selectedOption === opt
                              const isAnySelected = !!msg.selectedOption
                              return (
                                <button
                                  key={i}
                                  className={`ai-option-btn ${isSelected ? 'selected' : isAnySelected ? 'dimmed' : ''}`}
                                  onClick={() => {
                                    if (!isAnySelected) {
                                      sendMessage(opt)
                                    }
                                  }}
                                >
                                  {opt}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className={`message-bubble ${msg.type} ${msg.isConfirmation ? 'confirmation' : ''}`}>
                            {msg.text}
                          </div>
                        </>
                      )}
                    </motion.div>
                  ))}

                  <AnimatePresence>
                    {isAITyping && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="message-row"
                      >
                        <div className="message-bubble ai" style={{ padding: '20px 32px' }}>
                          <TypingDots />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div ref={messagesEndRef} />
                </div>

                {/* Chat Input Bar */}
                <div className="chat-input-bar">
                  <div className="chat-input-inner">
                    <motion.button
                      whileTap={{ scale: 0.88 }}
                      onClick={handleMicClick}
                      className="voice-btn"
                      style={{ width: 'auto', height: 'auto', background: 'transparent' }}
                    >
                      <img src={voiceIcon} alt="Mic" style={{ width: 44, height: 44, opacity: isListening ? 1 : 0.4 }} />
                    </motion.button>

                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', marginLeft: 10 }}>
                      <AnimatePresence mode="wait">
                        {isListening ? (
                          <motion.div
                            key="wave"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            style={{ display: 'flex', alignItems: 'center', gap: 12 }}
                          >
                            <ListeningWave />
                            <span style={{ fontSize: 32, color: '#4aa8ff', fontWeight: 500, letterSpacing: -1.5 }}>
                              듣는 중...
                              {followUpCountdown != null && (
                                <span style={{ fontSize: 22, marginLeft: 12, opacity: 0.7, fontVariantNumeric: 'tabular-nums' }}>
                                  {followUpCountdown}초
                                </span>
                              )}
                            </span>
                          </motion.div>
                        ) : (
                          <motion.input
                            key="input"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            type="text"
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage(inputText)}
                            placeholder="무엇이든 물어보세요"
                            className="chat-text-input"
                          />
                        )}
                      </AnimatePresence>
                    </div>

                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Right Popup Panel (Roundabout Details) */}
        <AnimatePresence>
          {showCarStatus && (
            <motion.div
              layout
              initial={{ width: 0, opacity: 0, marginLeft: 0 }}
              animate={{ width: 593, opacity: 1, marginLeft: 11 }}
              exit={{ width: 0, opacity: 0, marginLeft: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: 'hidden', flexShrink: 0, borderRadius: 24, background: '#d9d9d9', position: 'relative' }}
            >
              <motion.div
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={{ left: 0, right: 0.6 }}
                dragMomentum={false}
                onDragEnd={(_, info) => {
                  if (info.offset.x > 120 || info.velocity.x > 600) setShowCarStatus(false)
                }}
                style={{ width: '100%', height: '100%', cursor: 'grab', position: 'relative' }}
                whileDrag={{ cursor: 'grabbing' }}
              >
                {(() => {
                  const animSrc = animationForScenario(activeScenario?.scenarioId)
                  // Animation plays once and auto-closes on ended. If no
                  // scenario is active we fall through to the static image.
                  return animSrc ? (
                    <video
                      key={animSrc}
                      src={animSrc}
                      autoPlay
                      muted
                      playsInline
                      onEnded={() => setShowCarStatus(false)}
                      onError={() => {
                        console.warn('[scenario-anim] missing or failed to load:', animSrc)
                        // Leave the popup open with no content; user can close
                        // manually (drag or X). Avoid mutating state mid-render.
                      }}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none', background: '#000' }}
                    />
                  ) : (
                    <img
                      src={imgNavigation}
                      alt="navigation view"
                      draggable={false}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
                    />
                  )
                })()}
              </motion.div>
              <motion.button
                whileTap={{ scale: 0.9 }}
                whileHover={{ scale: 1.05 }}
                onClick={() => setShowCarStatus(false)}
                aria-label="닫기"
                style={{
                  position: 'absolute', top: 20, right: 20,
                  width: 52, height: 52, borderRadius: '50%',
                  background: 'rgba(255, 255, 255, 0.92)', border: 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(0,0,0,0.18)',
                  backdropFilter: 'blur(4px)',
                }}
              >
                <X size={28} color="#131417" strokeWidth={2.2} />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right Panel: App View */}
        <AnimatePresence>
          {activeApp && (
            <motion.div
              initial={{ opacity: 0, width: 0, marginLeft: 0 }}
              animate={{ opacity: 1, width: 482, marginLeft: 11 }}
              exit={{ opacity: 0, width: 0, marginLeft: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: 'hidden', flexShrink: 0, borderRadius: 24 }}
            >
              <div className="panel-app" style={{ width: 482, height: '100%', borderRadius: 24, overflow: 'hidden', background: '#f5f5f7' }}>
                <AppView
                  id={activeApp}
                  onClose={() => setActiveApp(null)}
                  activeRoute={activeRoute}
                  setActiveRoute={setActiveRoute}
                  callingContact={callingContact}
                  callState={callState}
                  startCall={startCall}
                  endCall={endCall}
                  currentLocation={
                    activeScenario?.scenarioId === 'anxiety_hydroplaning' && hydroState.locationCount > 0
                      ? (hydroState.locationCount >= 5
                          ? HYDRO_FINAL_LOCATION
                          : HYDRO_LOCATIONS[hydroState.locationCount] ?? DEFAULT_CURRENT_LOCATION)
                      : DEFAULT_CURRENT_LOCATION
                  }
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Bottom App Bar ────────────────────────────────────── */}
      <div className="bottom-bar">
        {/* Left: Home, Climate Controls */}
        <div className="bottom-left">
          <motion.button
            whileTap={{ scale: 0.92 }}
            className="btn-home"
            onClick={() => {
              setMessages([])
              setActiveApp(null)
              setShowCarStatus(false)
            }}
          >
            <img src={iconHome} alt="Home" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.92 }}
            className="btn-chevron"
            onClick={() => { setTemperature((v) => Math.max(17, v - 1)); setIsAutoClimate(false) }}
          >
            <img src={iconChevronDown} alt="Temp down" />
          </motion.button>

          <div className="climate-display">
            <span className={`climate-temp ${!isAutoClimate ? (temperature <= 22 ? 'cool' : 'heat') : ''}`}>
              {temperature}.0
            </span>
            <button
              className="climate-mode"
              onClick={() => setIsAutoClimate(true)}
            >
              {isAutoClimate ? (
                <img src={iconAC} alt="" />
              ) : temperature <= 22 ? (
                <Snowflake size={18} color="#4A90D9" />
              ) : (
                <Flame size={18} color="#E85D5D" />
              )}
              <span className={!isAutoClimate ? (temperature <= 22 ? 'cool' : 'heat') : ''}>
                {isAutoClimate ? 'AUTO' : temperature <= 22 ? 'COOL' : 'HEAT'}
              </span>
            </button>
          </div>

          <motion.button
            whileTap={{ scale: 0.92 }}
            className="btn-chevron"
            onClick={() => { setTemperature((v) => Math.min(29, v + 1)); setIsAutoClimate(false) }}
          >
            <img src={iconChevronUp} alt="Temp up" />
          </motion.button>

          {/* Fan speed indicator (set by voice intent: 바람 세게/약하게/잠깐) */}
          <div className="fan-display" title={`바람 세기 ${fanSpeed}/5`}>
            <Wind size={22} color={fanSpeed >= 4 ? '#4A90D9' : 'var(--text-secondary)'} />
            <div className="fan-dots">
              {[1, 2, 3, 4, 5].map((i) => (
                <span
                  key={i}
                  className="fan-dot"
                  style={{ background: i <= fanSpeed ? '#4A90D9' : 'rgba(140,144,168,0.28)' }}
                />
              ))}
            </div>
          </div>

        </div>

        {/* Center: App Icons */}
        <div className="bottom-center">
          {APP_ICONS.map((item) => (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.9 }}
              onClick={() => setActiveApp((v) => (v === item.id ? null : item.id))}
              className={`app-icon-btn ${activeApp === item.id ? 'active' : ''}`}
            >
              <img src={item.icon} alt={item.id} />
            </motion.button>
          ))}
        </div>

        {/* Right: System Volume + Menu */}
        <div className="bottom-right">
          <div className="volume-control" title={`볼륨 ${Math.round((muted ? 0 : volume) * 100)}%`}>
            <motion.div
              initial={false}
              animate={{ width: volumeOpen ? 160 : 0, opacity: volumeOpen ? 1 : 0 }}
              transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: 'hidden' }}
            >
              <div
                className="volume-bar"
                role="slider"
                aria-label="시스템 볼륨"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round((muted ? 0 : volume) * 100)}
                onClick={(e) => {
                  const r = e.currentTarget.getBoundingClientRect()
                  const ratio = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width))
                  setVolume(ratio)
                  if (muted && ratio > 0) setMuted(false)
                  openVolume()
                }}
              >
                <div
                  className="volume-fill"
                  style={{ width: `${(muted ? 0 : volume) * 100}%` }}
                />
              </div>
            </motion.div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              className="volume-icon-btn"
              onClick={() => {
                if (!volumeOpen) { openVolume(); return }
                // Already open → second tap toggles mute (and keeps it open).
                setMuted((m) => !m)
                openVolume()
              }}
              aria-label={volumeOpen ? (muted ? '음소거 해제' : '음소거') : '음량 조절'}
            >
              {renderVolumeIcon()}
            </motion.button>
          </div>
          <motion.button
            whileTap={{ scale: 0.92 }}
            className="btn-menu"
            onClick={() => setIsControlPanelOpen(v => !v)}
          >
            <img src={iconMenu} alt="Menu" />
          </motion.button>
        </div>
      </div>

      {/* ── Control Panel Drawer (Vehicle controls + Media apps) ── */}
      <AnimatePresence>
        {isControlPanelOpen && (
          <ControlPanel onClose={() => setIsControlPanelOpen(false)} />
        )}
      </AnimatePresence>
      </div>
    </div>
  )
}

// ── App shell: router + experiment provider ────────────────
// /hmi      → participant-facing vehicle screen (new design)
// /operator → researcher operator console (drives scenarios, logs sessions)
function App() {
  return (
    <BrowserRouter>
      <ExperimentProvider>
        <Routes>
          <Route path="/hmi" element={<VehicleHMI />} />
          <Route path="/operator" element={<OperatorConsole />} />
          <Route path="*" element={<Navigate to="/hmi" replace />} />
        </Routes>
      </ExperimentProvider>
    </BrowserRouter>
  )
}

export default App
