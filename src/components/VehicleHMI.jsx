import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Snowflake, Send, ExternalLink } from 'lucide-react'

// ── Icon imports ─────────────────────────────────────────────
import iconSun from '../../assets/icons/Icon-15.svg'
import iconWifi from '../../assets/icons/Icon-14.svg'
import iconBattery from '../../assets/icons/Icon-12.svg'
import iconHome from '../../assets/icons/Icon-8.svg'
import iconChevronDown from '../../assets/icons/Icon-7.svg'
import iconChevronUp from '../../assets/icons/Icon-4.svg'
import iconAC from '../../assets/icons/Icon-6.svg'
import iconNav from '../../assets/icons/Icon-3.svg'
import iconPhone from '../../assets/icons/Icon-5.svg'
import iconMusic from '../../assets/icons/Icon-2.svg'
import iconMail from '../../assets/icons/Icon-1.svg'
import iconCalendar from '../../assets/icons/Icon.svg'
import iconMenu from '../../assets/icons/Icon-13.svg'
import voiceIcon from '../../assets/icons/voice.svg'

// ── Image imports ─────────────────────────────────────────────
import imgBg40 from '../../assets/images/image 40.png'
import imgCarHigh from '../../assets/images/car_high.png'

// ── Service imports (unchanged) ───────────────────────────────
import { getGeminiResponse } from '../services/gemini'
import { speakText } from '../services/tts'

// ── Experiment context ────────────────────────────────────────
import { useExperiment } from '../context/ExperimentContext'

const TTS_KEY = import.meta.env.VITE_GOOGLE_TTS_API_KEY

const SUGGESTIONS = [
  '현재 경로 확인',
  '경로 변경',
  '추천옵션',
  '현재 상황 브리핑',
]

// ── Sub-components ────────────────────────────────────────────

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

// ── VehicleHMI ────────────────────────────────────────────────

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

  // Dev-only fallback scenario context (Ctrl+1 / Ctrl+0)
  const [devScenarioContext, setDevScenarioContext] = useState('')
  const [hasShownScenarioCard, setHasShownScenarioCard] = useState(false)

  const messagesEndRef = useRef(null)
  const recognitionRef = useRef(null)

  // ── Experiment logging ────────────────────────────────────
  const {
    activeScenario,
    addPendingTurn,
    completeTurn,
    failTurn,
    markTtsPlayed,
    markTtsError,
  } = useExperiment()

  // Reset hasShownScenarioCard when scenario changes
  useEffect(() => {
    setHasShownScenarioCard(false)
  }, [activeScenario?.scenarioId])

  const formatTime = (date) =>
    date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isAITyping])

  // ── Dev-only Ctrl shortcuts ───────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.key === '1') {
        e.preventDefault()
        console.warn('[DEV] Ctrl+1: forcing frustration_roundabout_loop context locally')
        setDevScenarioContext(
          '현재는 완전자율주행(Lv5) 상황입니다. 차량(AI)이 회전교차로를 통과하던 중, 우측 차선에 차가 너무 많아 안전하게 끼어들어 목적지 방향으로 빠져나가지 못했습니다. 그래서 차량 스스로 판단하여 교차로를 한 바퀴 더 도는 중입니다. 탑승자가 "왜 안 가?", "왜 돌아가?" 등으로 물어보면, 당신이 자동차 자체가 된 것처럼 차분하게 답변해주세요.'
        )
        setHasShownScenarioCard(false)
      } else if (e.ctrlKey && e.key === '0') {
        e.preventDefault()
        console.warn('[DEV] Ctrl+0: clearing dev scenario context')
        setDevScenarioContext('')
        setHasShownScenarioCard(false)
        setShowCarStatus(false)
      } else if (e.ctrlKey && e.key === 'r') {
        e.preventDefault()
        const ctx = activeScenario?.scenarioContext ?? devScenarioContext
        if (ctx !== '') {
          setMessages((msgs) => {
            if (msgs.length > 0 && msgs[msgs.length - 1].text === '다른 경로로 우회할까요?')
              return msgs
            return [
              ...msgs,
              { id: Date.now(), type: 'ai-card', text: '다른 경로로 우회할까요?', options: ['우회하기', '기존 경로 유지'] },
            ]
          })
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeScenario, devScenarioContext])

  // ── Gemini call with turn logging ─────────────────────────
  // turnId and turnStartMs are passed when invoked from sendMessage.
  // They are null when called from dev shortcuts (no logging needed).
  const callGemini = async (text, turnId = null, turnStartMs = null) => {
    setIsAITyping(true)

    // Active scenario from operator takes precedence over dev fallback
    const effectiveContext = activeScenario?.scenarioContext ?? devScenarioContext

    try {
      const needsCard = effectiveContext !== '' && !hasShownScenarioCard
      let aiText = await getGeminiResponse(text, effectiveContext, needsCard)
      setIsAITyping(false)

      // ── Log AI response immediately on receipt ─────────
      const aiTimestamp = new Date().toISOString()
      const responseLatencyMs =
        turnStartMs != null ? Math.round(performance.now() - turnStartMs) : null

      // Parse display text (strip internal markers before logging)
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
        options = optionsMatch[1].split('|').map((s) => s.trim())
        aiText = aiText.replace(optionsMatch[0], '').trim()
      }

      const selectedMatch = aiText.match(/\[SELECTED_OPTION:(.*?)\]/)
      if (selectedMatch) {
        selectedOptionMatch = selectedMatch[1].trim()
        isConfirmation = true
        aiText = aiText.replace(selectedMatch[0], '').trim()
      }

      const displayText = aiText || '(응답을 받지 못했습니다)'

      // Complete the pending turn (logged text = displayText shown to user)
      if (turnId) {
        completeTurn(turnId, {
          aiResponse: displayText,
          aiTimestamp,
          responseLatencyMs,
        })
      }

      // Update message state
      setMessages((prev) => {
        let next = [...prev]
        if (selectedOptionMatch) {
          for (let i = next.length - 1; i >= 0; i--) {
            if (next[i].type === 'ai-card') {
              next[i] = { ...next[i], selectedOption: selectedOptionMatch }
              break
            }
          }
        }
        if (options) {
          next.push({ id: Date.now(), type: 'ai-card', text: displayText, options })
        } else {
          next.push({
            id: Date.now(),
            type: 'ai',
            text: displayText,
            hasRoundaboutCard: hasCard,
            isConfirmation,
          })
        }
        return next
      })

      // TTS
      if (displayText && TTS_KEY) {
        speakText(displayText, TTS_KEY)
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

  // ── Single entry point for sending a message (no duplicate logging) ──
  const sendMessage = async (text, inputMethod = 'text') => {
    if (!text.trim()) return
    const trimmed = text.trim()

    setMessages((prev) => [...prev, { id: Date.now(), type: 'user', text: trimmed }])
    setInputText('')

    // Record user utterance before Gemini call
    const userTimestamp = new Date().toISOString()
    const turnStartMs = performance.now()
    const turnId = addPendingTurn({
      userRawTranscript: trimmed,
      userTimestamp,
      inputMethod,
    })

    await callGemini(trimmed, turnId, turnStartMs)
  }

  // ── STT (Web Speech API) ──────────────────────────────────
  // onresult delegates to sendMessage — no separate logging here
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
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      setIsListening(false)
      sendMessage(transcript, 'voice')
    }
    rec.onerror = (e) => {
      console.error('STT error:', e.error)
      setIsListening(false)
    }
    rec.onend = () => setIsListening(false)
    rec.start()
  }

  const hasConversation = messages.length > 0

  const APP_ICONS = [
    { id: 'Navigation', icon: iconNav },
    { id: 'Phone', icon: iconPhone },
    { id: 'Music', icon: iconMusic },
    { id: 'Mail', icon: iconMail },
    { id: 'Calendar', icon: iconCalendar },
  ]

  return (
    <div className="screen">
      {/* Background */}
      <div className="bg-rotated-image">
        <img src={imgBg40} alt="" />
      </div>

      {/* Top Status Bar */}
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

      {/* Main Layout */}
      <div
        className="layout-container"
        style={{ position: 'absolute', top: 104, left: 49, right: 51, height: 828, display: 'flex', gap: 11, zIndex: 10 }}
      >
        {/* Left: Car Status Panel */}
        <AnimatePresence>
          {showCarStatus && (
            <motion.div
              layout
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 593, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: 'hidden', flexShrink: 0, borderRadius: 24, background: '#d9d9d9' }}
            >
              <img src={imgCarHigh} alt="car view" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Center: Idle / Chat */}
        <motion.div
          layout
          className={`panel-main ${hasConversation ? 'chat-mode' : 'idle-mode'}`}
          style={{
            flex: 1,
            position: 'relative',
            borderRadius: 24,
            overflow: 'hidden',
            background: hasConversation ? 'white' : 'transparent',
            transition: 'background 0.3s',
          }}
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
                <motion.div
                  className="hero-title"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
                >
                  <p>반갑습니다!</p>
                  <p>무엇을 도와드릴까요?</p>
                </motion.div>

                <div className="suggestion-chips">
                  {SUGGESTIONS.map((s, i) => (
                    <motion.button
                      key={i}
                      className="suggestion-chip"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 + i * 0.08, duration: 0.35, ease: 'easeOut' }}
                      onClick={() => sendMessage(s, 'text')}
                    >
                      <span>{s}</span>
                    </motion.button>
                  ))}
                </div>

                <div className="voice-input-area">
                  <div className="voice-input-bg" />
                  <div className="voice-input-content">
                    <button
                      className={`voice-btn ${isListening ? 'listening' : ''}`}
                      onClick={handleMicClick}
                    >
                      <img src={voiceIcon} alt="음성 입력" />
                    </button>
                    {isListening ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                        <ListeningWave />
                        <span className="voice-listening-text">듣는 중...</span>
                      </div>
                    ) : (
                      <>
                        <input
                          type="text"
                          className="voice-text-input"
                          placeholder="무엇이든 물어보세요"
                          value={inputText}
                          onChange={(e) => setInputText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && sendMessage(inputText, 'text')}
                        />
                        <button className="voice-send-btn" onClick={() => sendMessage(inputText, 'text')}>
                          <Send size={34} color="#5c668d" strokeWidth={1.8} />
                        </button>
                      </>
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
                            <button
                              className="roundabout-card-btn"
                              onClick={() => setShowCarStatus(true)}
                            >
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
                                  onClick={() => { if (!isAnySelected) sendMessage(opt, 'text') }}
                                >
                                  {opt}
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className={`message-bubble ${msg.type} ${msg.isConfirmation ? 'confirmation' : ''}`}>
                          {msg.text}
                        </div>
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
                      <img
                        src={voiceIcon}
                        alt="Mic"
                        style={{ width: 44, height: 44, opacity: isListening ? 1 : 0.4 }}
                      />
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
                            onKeyDown={(e) => e.key === 'Enter' && sendMessage(inputText, 'text')}
                            placeholder="무엇이든 물어보세요"
                            className="chat-text-input"
                          />
                        )}
                      </AnimatePresence>
                    </div>

                    <AnimatePresence>
                      {inputText.trim() && !isListening && (
                        <motion.button
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          exit={{ scale: 0, opacity: 0 }}
                          transition={{ duration: 0.18 }}
                          whileTap={{ scale: 0.88 }}
                          onClick={() => sendMessage(inputText, 'text')}
                          className="chat-send-btn"
                        >
                          <Send size={44} color="#5c668d" strokeWidth={1.5} />
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Right: App View */}
        <AnimatePresence>
          {activeApp && (
            <motion.div
              initial={{ opacity: 0, width: 0, marginLeft: 0 }}
              animate={{ opacity: 1, width: 482, marginLeft: 11 }}
              exit={{ opacity: 0, width: 0, marginLeft: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              style={{ overflow: 'hidden', flexShrink: 0, borderRadius: 24 }}
            >
              <div className="panel-app" style={{ width: 482, height: '100%', borderRadius: 24, background: '#d9d9d9' }}>
                <motion.div
                  key={activeApp}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="app-view-container"
                  style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#eceaea' }}
                >
                  <img
                    src={APP_ICONS.find((i) => i.id === activeApp)?.icon}
                    alt={activeApp}
                    style={{ width: 80, height: 80, opacity: 0.5, filter: 'grayscale(100%)' }}
                  />
                  <div style={{ color: '#888', fontSize: '24px', marginTop: 16, fontWeight: 500 }}>
                    {activeApp} 실행 중
                  </div>
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom App Bar */}
      <div className="bottom-bar">
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
            <button className="climate-mode" onClick={() => setIsAutoClimate(true)}>
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

        <div className="bottom-right">
          <motion.button whileTap={{ scale: 0.92 }} className="btn-menu">
            <img src={iconMenu} alt="Menu" />
          </motion.button>
        </div>
      </div>
    </div>
  )
}

export default VehicleHMI
