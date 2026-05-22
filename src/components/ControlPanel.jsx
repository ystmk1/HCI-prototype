import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Snowflake, Flame, Wind, RotateCcw, Cloud,
  Tv, Music, Play, Store, Smartphone,
  ArrowLeft, Minus, Plus, Search,
} from 'lucide-react'

/* Sub-level design tokens — matches AppViews + main screen system */
const T = {
  bg: '#f7f8fa',
  card: '#ffffff',
  chipGrad: 'linear-gradient(87deg, #ffffff 5%, #edeef2 95%)',
  text: '#131417',
  sub: '#5c668d',
  faint: '#99a1af',
  divider: 'rgba(19, 20, 23, 0.08)',
  border: '1.5px solid rgba(0, 0, 0, 0.08)',
  keyGrad: 'linear-gradient(-90deg, #77a9e8 0%, #2d7cf1 100%)',
  accent: '#2d7cf1',
  accentSoft: 'rgba(45, 124, 241, 0.12)',
  accentGlow: 'rgba(45, 124, 241, 0.32)',
  warm: '#e85d5d',
  cool: '#4a90d9',
  skeleton: '#e7e9ef',
  shadow: '0px 6px 12px rgba(0, 0, 0, 0.08)',
  radiusCard: 32,
  radiusChip: 999,
  font: "'Pretendard Variable', 'Pretendard', sans-serif",
}

/* ─────────── Tile components ─────────── */

function ControlTile({ icon, label, active, accent, onClick }) {
  const activeBg = accent === T.warm
    ? 'linear-gradient(135deg, #ff7a7a 0%, #e85d5d 100%)'
    : accent === T.cool
    ? 'linear-gradient(135deg, #6db8ff 0%, #4a90d9 100%)'
    : T.keyGrad
  const activeGlow = accent === T.warm
    ? 'rgba(232, 93, 93, 0.32)'
    : accent === T.cool
    ? 'rgba(74, 144, 217, 0.32)'
    : T.accentGlow
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      style={{
        background: active ? activeBg : T.chipGrad,
        border: active ? 'none' : T.border,
        borderRadius: 22, cursor: 'pointer',
        padding: '18px 8px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9,
        color: active ? 'white' : T.sub,
        fontSize: 15, fontWeight: 600, letterSpacing: -0.3,
        boxShadow: active ? `0 6px 16px ${activeGlow}` : 'none',
        fontFamily: T.font, lineHeight: 1.3,
        transition: 'background 0.2s',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: active ? 'white' : T.sub,
      }}>{icon}</div>
      <span style={{ textAlign: 'center', whiteSpace: 'pre-line' }}>{label}</span>
    </motion.button>
  )
}

function AppTile({ icon, label, color, onClick }) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      style={{
        background: 'transparent', border: 'none', cursor: 'pointer',
        padding: 0,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        fontFamily: T.font,
      }}
    >
      <div style={{
        width: 92, height: 92, borderRadius: 24,
        background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white',
        boxShadow: '0 8px 18px rgba(0, 0, 0, 0.18)',
      }}>{icon}</div>
      <span style={{
        fontSize: 16, fontWeight: 600, color: T.text, letterSpacing: -0.3,
      }}>{label}</span>
    </motion.button>
  )
}

function SectionHeader({ title, subtitle }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{
        fontSize: 26, fontWeight: 600, color: T.text, letterSpacing: -0.6,
        fontFamily: T.font,
      }}>{title}</div>
      {subtitle && (
        <div style={{
          fontSize: 15, color: T.sub, marginTop: 4, fontWeight: 500, letterSpacing: -0.2,
          fontFamily: T.font,
        }}>{subtitle}</div>
      )}
    </div>
  )
}

function CategoryLabel({ children }) {
  return (
    <div style={{
      fontSize: 16, fontWeight: 700, color: T.sub, letterSpacing: -0.3,
      margin: '22px 0 12px', fontFamily: T.font,
    }}>{children}</div>
  )
}

/* ─────────── Temperature stepper ─────────── */

function TempControl({ label, value, onDec, onInc }) {
  const RoundBtn = ({ onClick, children }) => (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      style={{
        width: 46, height: 46, borderRadius: '50%',
        background: T.chipGrad, border: T.border, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: T.text, flexShrink: 0,
      }}
    >{children}</motion.button>
  )
  return (
    <div style={{
      background: T.chipGrad, border: T.border, borderRadius: 22,
      padding: '16px 18px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
    }}>
      <div>
        <div style={{ fontSize: 14, color: T.sub, fontWeight: 600, letterSpacing: -0.2 }}>{label}</div>
        <div style={{ fontSize: 30, fontWeight: 700, color: T.text, letterSpacing: -1, lineHeight: 1.1 }}>
          {value.toFixed(1)}<span style={{ fontSize: 18, fontWeight: 600 }}>°C</span>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <RoundBtn onClick={onDec}><Minus size={22} strokeWidth={2.4} /></RoundBtn>
        <RoundBtn onClick={onInc}><Plus size={22} strokeWidth={2.4} /></RoundBtn>
      </div>
    </div>
  )
}

/* ─────────── App wireframe screens ─────────── */

function Sk({ w = '100%', h, r = 12, style }) {
  return <div style={{ width: w, height: h, borderRadius: r, background: T.skeleton, flexShrink: 0, ...style }} />
}

function WireframeRow({ count = 5, cardW = 260, cardH = 156 }) {
  return (
    <div style={{ marginTop: 30 }}>
      <Sk w={200} h={22} r={8} />
      <div style={{ display: 'flex', gap: 18, marginTop: 16, overflow: 'hidden' }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i}>
            <Sk w={cardW} h={cardH} r={16} />
            <Sk w={cardW * 0.7} h={14} r={6} style={{ marginTop: 10 }} />
          </div>
        ))}
      </div>
    </div>
  )
}

function VideoWireframe({ app }) {
  return (
    <div style={{ padding: 44, height: '100%', overflowY: 'auto' }}>
      {/* Featured hero */}
      <div style={{
        height: 300, borderRadius: 24,
        background: `linear-gradient(150deg, ${app.color} 0%, rgba(20,20,28,0.92) 130%)`,
        position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        padding: 36, overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 28, right: 32, width: 76, height: 76, borderRadius: '50%',
          background: 'rgba(255,255,255,0.92)', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Play size={34} fill={app.color} strokeWidth={0} style={{ marginLeft: 4 }} />
        </div>
        <Sk w={360} h={30} r={8} style={{ background: 'rgba(255,255,255,0.65)' }} />
        <Sk w={520} h={16} r={6} style={{ background: 'rgba(255,255,255,0.45)', marginTop: 14 }} />
      </div>
      <WireframeRow count={5} />
      <WireframeRow count={5} />
    </div>
  )
}

function MusicWireframe({ app }) {
  return (
    <div style={{ padding: 44, height: '100%', overflowY: 'auto' }}>
      <div style={{ display: 'flex', gap: 28, alignItems: 'center' }}>
        <Sk w={220} h={220} r={20} style={{ background: `linear-gradient(150deg, ${app.color} 0%, rgba(20,20,28,0.85) 130%)` }} />
        <div style={{ flex: 1 }}>
          <Sk w={140} h={16} r={6} />
          <Sk w={420} h={34} r={8} style={{ marginTop: 16 }} />
          <Sk w={260} h={16} r={6} style={{ marginTop: 16 }} />
          <Sk w={150} h={48} r={999} style={{ marginTop: 28, background: app.color, opacity: 0.85 }} />
        </div>
      </div>
      <Sk w={180} h={22} r={8} style={{ marginTop: 40 }} />
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 22, marginTop: 18,
      }}>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i}>
            <Sk w="100%" h={180} r={16} />
            <Sk w="80%" h={14} r={6} style={{ marginTop: 10 }} />
            <Sk w="55%" h={12} r={6} style={{ marginTop: 7 }} />
          </div>
        ))}
      </div>
    </div>
  )
}

function StoreWireframe() {
  return (
    <div style={{ padding: 44, height: '100%', overflowY: 'auto' }}>
      {/* Search bar */}
      <div style={{
        height: 56, borderRadius: 999, background: T.skeleton,
        display: 'flex', alignItems: 'center', gap: 12, padding: '0 22px',
      }}>
        <Search size={24} color={T.faint} />
        <Sk w={220} h={14} r={6} style={{ background: '#d6d9e2' }} />
      </div>
      <Sk w={160} h={22} r={8} style={{ marginTop: 36 }} />
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginTop: 18,
      }}>
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} style={{
            background: T.card, border: T.border, borderRadius: 22,
            padding: 18, display: 'flex', alignItems: 'center', gap: 16,
          }}>
            <Sk w={72} h={72} r={18} />
            <div style={{ flex: 1 }}>
              <Sk w="60%" h={16} r={6} />
              <Sk w="40%" h={12} r={6} style={{ marginTop: 9 }} />
            </div>
            <div style={{
              width: 84, height: 40, borderRadius: 999, background: T.accentSoft,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: T.accent, fontSize: 15, fontWeight: 700, fontFamily: T.font,
            }}>설치</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AppScreen({ app, onBack }) {
  const Body = app.key === 'store'
    ? StoreWireframe
    : app.key === 'spotify'
    ? MusicWireframe
    : VideoWireframe
  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      style={{ height: '100%', display: 'flex', flexDirection: 'column', background: T.bg }}
    >
      {/* Back bar */}
      <div style={{
        padding: '20px 36px', display: 'flex', alignItems: 'center', gap: 18,
        borderBottom: `1px solid ${T.divider}`, background: T.card, flexShrink: 0,
      }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={onBack}
          style={{
            background: T.chipGrad, border: T.border, cursor: 'pointer',
            width: 52, height: 52, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.text,
          }}
        ><ArrowLeft size={26} strokeWidth={2.2} /></motion.button>
        <div style={{
          width: 46, height: 46, borderRadius: 13, background: app.color,
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white',
        }}>{app.iconSm ?? app.icon}</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: T.text, letterSpacing: -0.5 }}>{app.label}</div>
        <div style={{
          marginLeft: 'auto', fontSize: 13, fontWeight: 600, color: T.faint,
          border: `1px dashed ${T.faint}`, borderRadius: 999, padding: '6px 14px',
        }}>와이어프레임</div>
      </div>
      <div style={{ flex: 1, overflow: 'hidden' }}><Body app={app} /></div>
    </motion.div>
  )
}

/* ─────────── Panel ─────────── */

export default function ControlPanel({ onClose }) {
  const [controls, setControls] = useState({
    autoClimate: true,
    recirculate: false,
    defrostFront: false,
    defrostRear: false,
    driverHeat: false,
    driverVent: false,
    passengerHeat: false,
    passengerVent: false,
    steeringHeat: false,
  })
  const toggle = (k) => setControls(c => ({ ...c, [k]: !c[k] }))

  const [driverTemp, setDriverTemp] = useState(22)
  const [passengerTemp, setPassengerTemp] = useState(22)
  const stepTemp = (setter) => (delta) =>
    setter((v) => Math.min(30, Math.max(17, Math.round((v + delta) * 2) / 2)))

  const [openApp, setOpenApp] = useState(null)

  // Vehicle controls grouped by category.
  const climate = [
    { key: 'autoClimate', label: 'AUTO\n공조', icon: <Cloud size={30} />, accent: T.accent },
    { key: 'recirculate', label: '내기\n순환', icon: <RotateCcw size={30} />, accent: T.accent },
    { key: 'defrostFront', label: '앞유리\n서리 제거', icon: <Wind size={30} />, accent: T.warm },
    { key: 'defrostRear', label: '뒷유리\n서리 제거', icon: <Wind size={30} style={{ transform: 'scaleX(-1)' }} />, accent: T.warm },
  ]
  const seats = [
    { key: 'driverHeat', label: '운전석\n열선', icon: <Flame size={30} />, accent: T.warm },
    { key: 'driverVent', label: '운전석\n통풍', icon: <Snowflake size={30} />, accent: T.cool },
    { key: 'passengerHeat', label: '동승석\n열선', icon: <Flame size={30} />, accent: T.warm },
    { key: 'passengerVent', label: '동승석\n통풍', icon: <Snowflake size={30} />, accent: T.cool },
  ]
  const steering = [
    { key: 'steeringHeat', label: '운전대\n열선', icon: <Flame size={30} />, accent: T.warm },
  ]
  const grid4 = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }

  const apps = [
    { key: 'netflix', label: 'Netflix', icon: <span style={{ fontSize: 42, fontWeight: 900, fontFamily: 'serif' }}>N</span>, iconSm: <span style={{ fontSize: 24, fontWeight: 900, fontFamily: 'serif' }}>N</span>, color: '#e50914' },
    { key: 'youtube', label: 'YouTube', icon: <Play size={44} fill="white" strokeWidth={0} />, iconSm: <Play size={22} fill="white" strokeWidth={0} />, color: '#ff0000' },
    { key: 'tving', label: 'TVING', icon: <span style={{ fontSize: 32, fontWeight: 800 }}>T</span>, iconSm: <span style={{ fontSize: 20, fontWeight: 800 }}>T</span>, color: '#ec0a8c' },
    { key: 'wavve', label: 'Wavve', icon: <span style={{ fontSize: 30, fontWeight: 800 }}>w</span>, iconSm: <span style={{ fontSize: 20, fontWeight: 800 }}>w</span>, color: '#0077ff' },
    { key: 'disney', label: 'Disney+', icon: <span style={{ fontSize: 28, fontWeight: 800, fontStyle: 'italic' }}>D+</span>, iconSm: <span style={{ fontSize: 18, fontWeight: 800, fontStyle: 'italic' }}>D+</span>, color: '#0f1f4d' },
    { key: 'spotify', label: 'Spotify', icon: <Music size={42} fill="white" strokeWidth={0} />, iconSm: <Music size={22} fill="white" strokeWidth={0} />, color: '#1db954' },
    { key: 'apple', label: 'Apple TV', icon: <Tv size={44} />, iconSm: <Tv size={22} />, color: '#000000' },
    { key: 'store', label: '앱 마켓', icon: <Store size={42} />, iconSm: <Store size={22} />, color: T.accent },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
      style={{
        position: 'absolute', inset: 0, zIndex: 50,
        background: 'rgba(19, 20, 23, 0.45)',
        backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
      }}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 1722, height: 920,
          background: T.bg, borderRadius: 40,
          boxShadow: '0 -20px 60px rgba(0, 0, 0, 0.3)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          marginBottom: 24,
          fontFamily: T.font,
        }}
      >
        {/* Header */}
        <div style={{
          padding: '28px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: `1px solid ${T.divider}`, background: T.card, flexShrink: 0,
        }}>
          <div style={{
            fontSize: 32, fontWeight: 600, letterSpacing: -1, color: T.text,
          }}>차량 제어 & 미디어</div>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            style={{
              background: T.chipGrad, border: T.border, cursor: 'pointer',
              width: 60, height: 60, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: T.text, boxShadow: T.shadow,
            }}
          ><X size={30} strokeWidth={2.2} /></motion.button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <div style={{ height: '100%', display: 'flex', overflow: 'hidden' }}>
            {/* Left: vehicle controls — categorized */}
            <div style={{
              flex: 1.4, padding: 36, overflowY: 'auto',
              borderRight: `1px solid ${T.divider}`,
            }}>
              <SectionHeader title="차량 제어" subtitle="온도 · 공조 · 시트 · 스티어링" />

              <CategoryLabel>온도</CategoryLabel>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 14 }}>
                <TempControl label="운전석" value={driverTemp} onDec={() => stepTemp(setDriverTemp)(-0.5)} onInc={() => stepTemp(setDriverTemp)(0.5)} />
                <TempControl label="동승석" value={passengerTemp} onDec={() => stepTemp(setPassengerTemp)(-0.5)} onInc={() => stepTemp(setPassengerTemp)(0.5)} />
              </div>

              <CategoryLabel>공조</CategoryLabel>
              <div style={grid4}>
                {climate.map(c => (
                  <ControlTile key={c.key} icon={c.icon} label={c.label} active={controls[c.key]} accent={c.accent} onClick={() => toggle(c.key)} />
                ))}
              </div>

              <CategoryLabel>시트</CategoryLabel>
              <div style={grid4}>
                {seats.map(c => (
                  <ControlTile key={c.key} icon={c.icon} label={c.label} active={controls[c.key]} accent={c.accent} onClick={() => toggle(c.key)} />
                ))}
              </div>

              <CategoryLabel>스티어링</CategoryLabel>
              <div style={grid4}>
                {steering.map(c => (
                  <ControlTile key={c.key} icon={c.icon} label={c.label} active={controls[c.key]} accent={c.accent} onClick={() => toggle(c.key)} />
                ))}
              </div>
            </div>

            {/* Right: apps & media */}
            <div style={{ flex: 1, padding: 36, overflowY: 'auto', background: T.card }}>
              <SectionHeader title="미디어 & 앱" subtitle="자율주행 중 즐기는 OTT · 음악" />
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, columnGap: 12,
                marginBottom: 36,
              }}>
                {apps.map(a => (
                  <AppTile key={a.key} icon={a.icon} label={a.label} color={a.color} onClick={() => setOpenApp(a)} />
                ))}
              </div>
              <div style={{
                background: T.accentSoft, borderRadius: 20, padding: '16px 20px',
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <Smartphone size={32} color={T.accent} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 17, fontWeight: 600, color: T.text, letterSpacing: -0.3 }}>휴대폰 연결</div>
                  <div style={{ fontSize: 14, color: T.sub, marginTop: 2 }}>Android Auto / CarPlay 자동 연결됨</div>
                </div>
              </div>
            </div>
          </div>

          {/* App wireframe overlay */}
          <AnimatePresence>
            {openApp && (
              <motion.div
                style={{ position: 'absolute', inset: 0, zIndex: 5 }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <AppScreen app={openApp} onBack={() => setOpenApp(null)} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}
