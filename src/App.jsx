import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Snowflake, Mic, MicOff, Send } from 'lucide-react'

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
import voiceIcon from '../assets/icons/voice.svg'

// ── Image imports ───────────────────────────────────────────
import imgAiTitle from '../assets/images/AI 에이전트에게 무엇이든 물어보세요.png'
import imgBg40 from '../assets/images/image 40.png'

// ── Service imports ─────────────────────────────────────────
import { getGeminiResponse } from './services/gemini'
import { speakText } from './services/tts'

const TTS_KEY = import.meta.env.VITE_GOOGLE_TTS_API_KEY

const SUGGESTIONS = [
  '현재 경로 확인',
  '경로 변경',
  '추천옵션',
  '추천',
  '추천',
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

// ── Main App ───────────────────────────────────────────────

function App() {
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isAITyping, setIsAITyping] = useState(false)
  const [temperature, setTemperature] = useState(20)
  const [isAutoClimate, setIsAutoClimate] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [activeApp, setActiveApp] = useState(null)

  const messagesEndRef = useRef(null)
  const recognitionRef = useRef(null)

  const formatTime = (date) =>
    date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isAITyping])

  // ── Gemini + TTS ──────────────────────────────────────────
  const callGemini = async (text) => {
    setIsAITyping(true)
    try {
      const aiText = await getGeminiResponse(text)
      setIsAITyping(false)
      const displayText = aiText || '(응답을 받지 못했습니다)'
      setMessages((prev) => [...prev, { id: Date.now(), type: 'ai', text: displayText }])
      if (aiText && TTS_KEY) speakText(aiText, TTS_KEY).catch(console.error)
    } catch (err) {
      console.error('Gemini error:', err)
      setIsAITyping(false)
      setMessages((prev) => [
        ...prev,
        { id: Date.now(), type: 'ai', text: `오류: ${err.message}` },
      ])
    }
  }

  // ── Text send ─────────────────────────────────────────────
  const sendMessage = async (text) => {
    if (!text.trim()) return
    setMessages((prev) => [...prev, { id: Date.now(), type: 'user', text: text.trim() }])
    setInputText('')
    await callGemini(text.trim())
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
      setMessages((prev) => [...prev, { id: Date.now(), type: 'user', text: transcript }])
      await callGemini(transcript)
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

      {/* ── Main Content: Idle vs Chat ───────────────────────── */}
      <AnimatePresence mode="wait">
        {!hasConversation ? (
          <motion.div
            key="idle"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            {/* Hero Title */}
            <motion.div
              className="hero-title"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
            >
              <img src={imgAiTitle} alt="AI 에이전트에게 무엇이든 물어보세요" />
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

            {/* Voice Input Area */}
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
                  <span className="voice-placeholder">눌러서 말해보세요</span>
                )}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="chat-container"
          >
            <div className="chat-inner">
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
                    {msg.type === 'ai' && (
                      <div style={{ marginBottom: 2 }}>
                        <AIOrb size={42} />
                      </div>
                    )}
                    <div className={`message-bubble ${msg.type}`}>
                      {msg.text}
                    </div>
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
                      <AIOrb size={42} />
                      <div className="message-bubble ai">
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
                    className={`chat-mic-btn ${isListening ? 'active' : 'idle'}`}
                  >
                    {isListening
                      ? <MicOff size={22} color="white" />
                      : <Mic size={22} color="white" />}
                  </motion.button>

                  <div className="chat-divider" />

                  <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
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
                          <span style={{ fontSize: 20, color: '#007AFF', fontWeight: 500 }}>듣는 중...</span>
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
                          placeholder="무엇이든 물어보세요..."
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
                        onClick={() => sendMessage(inputText)}
                        className="chat-send-btn"
                      >
                        <Send size={20} color="white" style={{ marginLeft: 2 }} />
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom App Bar ────────────────────────────────────── */}
      <div className="bottom-bar">
        {/* Left: Home, Climate Controls */}
        <div className="bottom-left">
          <motion.button whileTap={{ scale: 0.92 }} className="btn-home">
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
          <motion.button whileTap={{ scale: 0.92 }} className="btn-menu">
            <img src={iconMenu} alt="Menu" />
          </motion.button>
        </div>
      </div>
    </div>
  )
}

export default App
