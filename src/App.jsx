import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flame, Snowflake, Mic, MicOff, Send } from 'lucide-react'

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
import iconCouch from '../assets/icons/Icon-9.svg'
import iconTruck from '../assets/icons/Icon-10.svg'
import iconMenu from '../assets/icons/Icon-13.svg'
import imgBriefing from '../assets/images/image 28.png'

const SUGGESTIONS = [
  '목적지로 안내해줘',
  '신나는 음악 틀어줘',
  '오늘 일정 알려줘',
  '현재 날씨 어때?',
  '전화 연결해줘',
]

const getAIResponse = (text) => {
  if (text.includes('음악') || text.includes('노래'))
    return '음악을 재생할게요! 어떤 장르나 아티스트를 원하시나요?'
  if (text.includes('목적지') || text.includes('안내') || text.includes('내비'))
    return '네비게이션을 시작할게요. 목적지를 말씀해주세요.'
  if (text.includes('날씨'))
    return '현재 외부 온도는 24°C이며 맑은 날씨입니다. 오후에는 구름이 조금 낄 수 있어요.'
  if (text.includes('전화') || text.includes('연결'))
    return '전화 앱을 열게요. 누구에게 연락하시겠어요?'
  if (text.includes('일정') || text.includes('캘린더'))
    return '오늘 일정을 확인할게요. 오후 3시에 팀 미팅이 예정되어 있습니다.'
  return '알겠습니다, 편하게 계세도 되고요. 혹시 나중에라도 궁금한 거나 대화하고 싶으시면 언제든 말씀해주세요!'
}

function AIOrb({ size = 160, pulse = false }) {
  return (
    <motion.div
      animate={pulse ? { scale: [1, 1.05, 1], opacity: [0.85, 1, 0.85] } : {}}
      transition={pulse ? { repeat: Infinity, duration: 3.5, ease: 'easeInOut' } : {}}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flexShrink: 0,
        background:
          'radial-gradient(circle at 38% 30%, #f0f8ff 0%, #b8daf5 25%, #6ab0e8 55%, #3580c9 80%, #1a5fa8 100%)',
        boxShadow: `0 ${Math.round(size / 8)}px ${Math.round(size / 2)}px rgba(91,163,217,0.32)`,
      }}
    />
  )
}

function TypingDots() {
  return (
    <div className="flex gap-[6px] items-center h-[22px]">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-[9px] h-[9px] rounded-full bg-[#c0c8d4]"
          animate={{ y: [0, -5, 0] }}
          transition={{ duration: 0.55, delay: i * 0.14, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
    </div>
  )
}

function ListeningWave() {
  return (
    <div className="flex items-center gap-[4px] h-[28px]">
      {[0.6, 1, 0.75, 1.2, 0.5, 0.9, 1.1, 0.65].map((h, i) => (
        <motion.div
          key={i}
          className="w-[4px] rounded-full bg-[#007AFF]"
          animate={{ scaleY: [h * 0.4, h, h * 0.4] }}
          transition={{ duration: 0.45 + i * 0.07, repeat: Infinity, ease: 'easeInOut', delay: i * 0.06 }}
          style={{ height: 28, originY: 0.5 }}
        />
      ))}
    </div>
  )
}

function App() {
  const [messages, setMessages] = useState([])
  const [inputText, setInputText] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [isAITyping, setIsAITyping] = useState(false)
  const [temperature, setTemperature] = useState(20)
  const [isAutoClimate, setIsAutoClimate] = useState(true)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [activeApp, setActiveApp] = useState(null)
  const [isBriefingOpen, setIsBriefingOpen] = useState(false)
  const messagesEndRef = useRef(null)

  const formatTime = (date) =>
    date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

  useEffect(() => {
    const t = setInterval(() => setCurrentTime(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isAITyping])

  const sendMessage = (text) => {
    if (!text.trim()) return
    setMessages((prev) => [...prev, { id: Date.now(), type: 'user', text: text.trim() }])
    setInputText('')
    setIsListening(false)
    setIsAITyping(true)
    setTimeout(() => {
      setIsAITyping(false)
      setMessages((prev) => [
        ...prev,
        { id: Date.now() + 1, type: 'ai', text: getAIResponse(text) },
      ])
    }, 950)
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
    <div
      className="relative w-[1920px] h-[1080px] overflow-hidden rounded-[32px]"
      style={{ fontFamily: "'Pretendard', sans-serif", background: '#f2f4f7' }}
    >
      {/* ── Top Bar ─────────────────────────────────────────── */}
      <div
        className="absolute left-0 top-0 w-full h-[79px] bg-white flex items-center justify-between px-[49px] z-30"
        style={{ borderBottom: '1px solid rgba(19,20,23,0.06)' }}
      >
        <div className="flex items-center gap-[24px]">
          <span className="text-[21px] text-black leading-[30px] tabular-nums">
            {formatTime(currentTime)}
          </span>
          <div className="flex items-center gap-[6px]">
            <img src={iconSun} alt="" className="w-[24px] h-[24px]" />
            <span className="text-[21px] text-black leading-[30px]">24°C</span>
          </div>
        </div>
        <div className="flex items-center gap-[18px]">
          <img src={iconWifi} alt="" className="w-[24px] h-[24px]" />
          <img src={iconBattery} alt="" className="w-[24px] h-[24px]" />
          <span className="text-[21px] text-black leading-[30px]">100%</span>
        </div>
      </div>

      {/* ── Main Chat Area ───────────────────────────────────── */}
      <div className="absolute left-0 right-0 top-[79px] bottom-[121px] flex justify-center">
        <div className="w-[1000px] h-full flex flex-col">

          {/* Messages / Idle */}
          <div className="flex-1 overflow-hidden relative">
            <AnimatePresence mode="wait">
              {!hasConversation ? (
                /* Welcome / Idle */
                <motion.div
                  key="idle"
                  initial={{ opacity: 0, y: 24 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                  className="absolute inset-0 flex flex-col items-center justify-center gap-[40px]"
                >
                  <AIOrb size={160} pulse />

                  <div className="text-center">
                    <p className="text-[32px] font-semibold text-[#131417] leading-[44px]">
                      안녕하세요! 무엇을 도와드릴까요?
                    </p>
                    <p className="text-[20px] text-[#99a1af] mt-[10px]">
                      아래 제안을 선택하거나 직접 말씀해주세요
                    </p>
                  </div>

                  <div className="flex flex-wrap justify-center gap-[14px]">
                    {SUGGESTIONS.map((s, i) => (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.12 + i * 0.08 }}
                        whileHover={{ scale: 1.04, y: -2 }}
                        whileTap={{ scale: 0.96 }}
                        onClick={() => sendMessage(s)}
                        className="px-[28px] py-[15px] rounded-full bg-white border border-[rgba(19,20,23,0.1)] text-[19px] text-[#131417] hover:border-[#007AFF] hover:text-[#007AFF] transition-all duration-200 cursor-pointer"
                        style={{ boxShadow: '0px 4px 14px rgba(0,0,0,0.07)' }}
                      >
                        {s}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              ) : (
                /* Chat messages */
                <motion.div
                  key="chat"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="absolute inset-0 overflow-y-auto hide-scrollbar py-[32px] flex flex-col gap-[18px]"
                >
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 14 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.28 }}
                      className={`flex items-end gap-[14px] ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                      {msg.type === 'ai' && (
                        <div className="mb-[2px]">
                          <AIOrb size={42} />
                        </div>
                      )}
                      <div
                        className={`max-w-[580px] px-[24px] py-[16px] text-[20px] leading-[32px] ${
                          msg.type === 'user'
                            ? 'bg-[#007AFF] text-white rounded-[22px] rounded-br-[5px]'
                            : 'bg-white text-[#131417] rounded-[22px] rounded-bl-[5px] border border-[rgba(19,20,23,0.07)]'
                        }`}
                        style={{
                          boxShadow:
                            msg.type === 'user'
                              ? '0px 4px 14px rgba(0,122,255,0.25)'
                              : '0px 3px 12px rgba(0,0,0,0.07)',
                        }}
                      >
                        {msg.text}
                      </div>
                    </motion.div>
                  ))}

                  {/* Typing indicator */}
                  <AnimatePresence>
                    {isAITyping && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-end gap-[14px]"
                      >
                        <AIOrb size={42} />
                        <div
                          className="bg-white rounded-[22px] rounded-bl-[5px] px-[24px] py-[16px] border border-[rgba(19,20,23,0.07)]"
                          style={{ boxShadow: '0px 3px 12px rgba(0,0,0,0.07)' }}
                        >
                          <TypingDots />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div ref={messagesEndRef} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Input Bar */}
          <div className="py-[22px] shrink-0">
            <div
              className="flex items-center gap-[16px] bg-white rounded-[24px] px-[22px] py-[13px]"
              style={{
                border: '1.5px solid rgba(19,20,23,0.1)',
                boxShadow: '0px 6px 20px rgba(0,0,0,0.09)',
              }}
            >
              {/* Mic button */}
              <motion.button
                whileTap={{ scale: 0.88 }}
                onClick={() => setIsListening((v) => !v)}
                className={`w-[54px] h-[54px] rounded-full flex items-center justify-center shrink-0 transition-colors duration-300 ${
                  isListening ? 'bg-[#FF3B30]' : 'bg-[#007AFF]'
                }`}
                style={{
                  boxShadow: isListening
                    ? '0 0 0 8px rgba(255,59,48,0.14), 0 4px 12px rgba(255,59,48,0.4)'
                    : '0px 4px 12px rgba(0,122,255,0.35)',
                }}
              >
                {isListening ? (
                  <MicOff size={22} className="text-white" />
                ) : (
                  <Mic size={22} className="text-white" />
                )}
              </motion.button>

              <div className="w-[1.5px] h-[34px] bg-[rgba(19,20,23,0.09)] shrink-0" />

              {/* Text input or wave */}
              <div className="flex-1 flex items-center">
                <AnimatePresence mode="wait">
                  {isListening ? (
                    <motion.div
                      key="wave"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex items-center gap-[12px]"
                    >
                      <ListeningWave />
                      <span className="text-[20px] text-[#007AFF] font-medium">듣는 중...</span>
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
                      className="w-full bg-transparent text-[20px] text-[#131417] placeholder-[#c0c8d4] outline-none"
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* Send button */}
              <AnimatePresence>
                {(inputText.trim() || isListening) && (
                  <motion.button
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.18 }}
                    whileTap={{ scale: 0.88 }}
                    onClick={() => {
                      if (isListening) {
                        setIsListening(false)
                        sendMessage('신나는 음악 틀어줘')
                      } else {
                        sendMessage(inputText)
                      }
                    }}
                    className="w-[54px] h-[54px] rounded-full bg-[#007AFF] flex items-center justify-center shrink-0"
                    style={{ boxShadow: '0px 4px 12px rgba(0,122,255,0.35)' }}
                  >
                    <Send size={20} className="text-white ml-[2px]" />
                  </motion.button>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom Bar ──────────────────────────────────────── */}
      <div
        className="absolute left-0 bottom-0 w-full h-[121px] flex items-center justify-between px-[49px] z-30"
        style={{
          background: 'linear-gradient(90deg, #fff 0%, #edeef2 100%)',
          borderTop: '1px solid rgba(19,20,23,0.06)',
        }}
      >
        {/* Climate */}
        <div className="flex items-center gap-[18px]">
          <motion.button
            whileTap={{ scale: 0.92 }}
            className="w-[73px] h-[73px] rounded-[21px] flex items-center justify-center"
          >
            <img src={iconHome} alt="" className="w-[36px] h-[36px]" />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => { setTemperature((v) => Math.max(17, v - 1)); setIsAutoClimate(false) }}
            className="w-[55px] h-[55px] rounded-[21px] flex items-center justify-center"
          >
            <img src={iconChevronDown} alt="" className="w-[30px] h-[30px]" />
          </motion.button>

          <div className="flex flex-col items-center px-[12px]">
            <span
              className={`text-[36px] font-semibold leading-[49px] transition-colors duration-300 ${
                isAutoClimate ? 'text-[#a0a0a5]' : temperature <= 22 ? 'text-[#4A90D9]' : 'text-[#E85D5D]'
              }`}
            >
              {temperature}.0
            </span>
            <button
              onClick={() => setIsAutoClimate(true)}
              className="flex items-center gap-[6px] hover:opacity-70 transition-opacity"
            >
              {isAutoClimate ? (
                <img src={iconAC} alt="" className="w-[18px] h-[18px] opacity-60" />
              ) : temperature <= 22 ? (
                <Snowflake size={18} className="text-[#4A90D9]" />
              ) : (
                <Flame size={18} className="text-[#E85D5D]" />
              )}
              <span
                className={`text-[18px] leading-[24px] transition-colors duration-300 ${
                  isAutoClimate ? 'text-[#99a1af]' : temperature <= 22 ? 'text-[#4A90D9]' : 'text-[#E85D5D]'
                }`}
              >
                {isAutoClimate ? 'AUTO' : temperature <= 22 ? 'COOL' : 'HEAT'}
              </span>
            </button>
          </div>

          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => { setTemperature((v) => Math.min(29, v + 1)); setIsAutoClimate(false) }}
            className="w-[55px] h-[55px] rounded-[21px] flex items-center justify-center"
          >
            <img src={iconChevronUp} alt="" className="w-[30px] h-[30px]" />
          </motion.button>

          <motion.button whileTap={{ scale: 0.92 }} className="w-[67px] h-[67px] rounded-[21px] flex items-center justify-center">
            <img src={iconCouch} alt="" className="w-[30px] h-[30px]" />
          </motion.button>
          <motion.button whileTap={{ scale: 0.92 }} className="w-[67px] h-[67px] rounded-[21px] flex items-center justify-center">
            <img src={iconTruck} alt="" className="w-[30px] h-[30px]" />
          </motion.button>
        </div>

        {/* App Icons */}
        <div className="flex items-center gap-[18px]">
          {APP_ICONS.map((item) => (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.9 }}
              onClick={() => setActiveApp((v) => (v === item.id ? null : item.id))}
              className={`w-[73px] h-[73px] border border-[rgba(19,20,23,0.2)] rounded-full flex items-center justify-center transition-colors ${
                activeApp === item.id ? 'bg-white' : 'bg-[#f7f8fa]'
              }`}
              style={{ filter: 'drop-shadow(0px 6px 12px rgba(0,0,0,0.08))' }}
            >
              <img src={item.icon} alt={item.id} className="w-[30px] h-[30px]" />
            </motion.button>
          ))}
        </div>

        {/* Right */}
        <div className="flex items-center gap-[18px]">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setIsBriefingOpen((v) => !v)}
            className={`flex flex-col items-center cursor-pointer transition-opacity ${
              isBriefingOpen ? 'opacity-100' : 'opacity-70 hover:opacity-100'
            }`}
          >
            <div className="w-[61px] h-[57px]">
              <img src={imgBriefing} alt="" className="w-full h-full object-contain" />
            </div>
            <span className="text-[12px] font-semibold text-[#a0a0a5] leading-[15px] mt-[3px]">
              상황브리핑
            </span>
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.92 }}
            className="w-[51px] h-[51px] rounded-[16px] flex items-center justify-center bg-[#f7f8fa] border border-[rgba(19,20,23,0.1)]"
          >
            <img src={iconMenu} alt="" className="w-[24px] h-[24px]" />
          </motion.button>
        </div>
      </div>
    </div>
  )
}

export default App
