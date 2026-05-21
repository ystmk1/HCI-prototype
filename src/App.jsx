import { useState, useEffect, useRef } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Snowflake, Mic, MicOff, ExternalLink, X } from 'lucide-react'

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
import AppView from './components/AppViews'
import ControlPanel from './components/ControlPanel'
import { ExperimentProvider, useExperiment } from './context/ExperimentContext'
import OperatorConsole from './components/OperatorConsole'

const TTS_KEY = import.meta.env.VITE_GOOGLE_TTS_API_KEY

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

// ── Vehicle HMI (participant-facing screen) ────────────────

function VehicleHMI() {
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isAITyping, setIsAITyping] = useState(false)
  const [showCarStatus, setShowCarStatus] = useState(false)
  const [temperature, setTemperature] = useState(20)
  const [isAutoClimate, setIsAutoClimate] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [activeApp, setActiveApp] = useState(null)
  const [isControlPanelOpen, setIsControlPanelOpen] = useState(false)

  const [hasShownScenarioCard, setHasShownScenarioCard] = useState(false)

  const messagesEndRef = useRef(null)
  const recognitionRef = useRef(null)
  const screenRef = useRef(null)
  const speedLevelRef = useRef(DEFAULT_SPEED_LEVEL)
  const speakingRateRef = useRef(SPEED_LEVELS[DEFAULT_SPEED_LEVEL])

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
  }, [activeScenario?.scenarioId])

  // Operator ended the trial / reset → wipe the HMI back to the idle screen.
  useEffect(() => {
    if (hmiResetNonce === 0) return
    setMessages([])
    setInputText('')
    setShowCarStatus(false)
    setActiveApp(null)
    setIsControlPanelOpen(false)
    setHasShownScenarioCard(false)
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
  const callGemini = async (text, turnId = null, turnStartMs = null) => {
    setIsAITyping(true)

    try {
      const needsCard = effectiveContext !== '' && !hasShownScenarioCard
      let aiText = await getGeminiResponse(text, effectiveContext, needsCard, speedLevelRef.current)
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
      if (aiText.includes('[SHOW_ROUNDABOUT_CARD]')) {
        aiText = aiText.replace('[SHOW_ROUNDABOUT_CARD]', '').trim()
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
        speakText(displayText, TTS_KEY, speakingRateRef.current)
          .then(() => { if (turnId) markTtsPlayed(turnId) })
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
    setMessages((prev) => [...prev, { id: Date.now(), type: 'user', text: trimmed }])
    setInputText('')

    // Record the user turn (no-op if no trial is active in the operator console).
    const turnStartMs = performance.now()
    const turnId = addPendingTurn({
      userRawTranscript: trimmed,
      userTimestamp: new Date().toISOString(),
      inputMethod,
    })

    await callGemini(trimmed, turnId, turnStartMs)
  }

  // ── Web Speech API (STT) ──────────────────────────────────
  const handleMicClick = () => {
    if (isListening) {
      recognitionRef.current?.stop()
      return
    }

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
                {/* Hero Title */}
                <motion.div
                  className="hero-title"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
                >
                  <p>반갑습니다!</p>
                  <p>무엇을 도와드릴까요?</p>
                </motion.div>

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
                        <span className="voice-listening-text">듣는 중...</span>
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
                            <span style={{ fontSize: 32, color: '#4aa8ff', fontWeight: 500, letterSpacing: -1.5 }}>듣는 중...</span>
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
                style={{ width: '100%', height: '100%', cursor: 'grab' }}
                whileDrag={{ cursor: 'grabbing' }}
              >
                <img
                  src={imgNavigation}
                  alt="navigation view"
                  draggable={false}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', pointerEvents: 'none' }}
                />
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
                <AppView id={activeApp} onClose={() => setActiveApp(null)} />
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

        {/* Right: Menu */}
        <div className="bottom-right">
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
