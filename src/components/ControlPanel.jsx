import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Snowflake, Flame, Wind, RotateCcw,
  Tv, Music, Play, Store, Smartphone, Cloud,
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
  shadow: '0px 6px 12px rgba(0, 0, 0, 0.08)',
  radiusCard: 32,
  radiusChip: 999,
  font: "'Pretendard Variable', 'Pretendard', sans-serif",
}

/* ─────────── Tile components ─────────── */

function ControlTile({ icon, label, active, accent, onClick }) {
  // When active, fill the whole tile with an accent gradient (warm = red,
  // cool = blue, default = key blue). Matches the main confirmation pattern,
  // no outline stroke.
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
        borderRadius: 24, cursor: 'pointer',
        padding: '20px 10px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        color: active ? 'white' : T.sub,
        fontSize: 16, fontWeight: 600, letterSpacing: -0.3,
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

/* ─────────── Panel ─────────── */

export default function ControlPanel({ onClose }) {
  const [controls, setControls] = useState({
    defrostFront: false,
    defrostRear: false,
    autoClimate: true,
    driverHeat: false,
    passengerHeat: false,
    driverVent: false,
    passengerVent: false,
    recirculate: false,
    steeringHeat: false,
  })
  const toggle = (k) => setControls(c => ({ ...c, [k]: !c[k] }))

  const vehicleControls = [
    { key: 'defrostFront', label: '앞유리\n서리 제거', icon: <Wind size={32} />, accent: T.warm },
    { key: 'defrostRear', label: '뒷유리\n서리 제거', icon: <Wind size={32} style={{ transform: 'scaleX(-1)' }} />, accent: T.warm },
    { key: 'autoClimate', label: 'AUTO\n공조', icon: <Cloud size={32} />, accent: T.accent },
    { key: 'driverHeat', label: '운전석\n시트 열선', icon: <Flame size={32} />, accent: T.warm },
    { key: 'passengerHeat', label: '동승석\n시트 열선', icon: <Flame size={32} />, accent: T.warm },
    { key: 'driverVent', label: '운전석\n시트 통풍', icon: <Snowflake size={32} />, accent: T.cool },
    { key: 'passengerVent', label: '동승석\n시트 통풍', icon: <Snowflake size={32} />, accent: T.cool },
    { key: 'recirculate', label: '내기\n순환', icon: <RotateCcw size={32} />, accent: T.accent },
    { key: 'steeringHeat', label: '운전대\n열선', icon: <Flame size={32} />, accent: T.warm },
  ]

  const apps = [
    { key: 'netflix', label: 'Netflix', icon: <span style={{ fontSize: 42, fontWeight: 900, fontFamily: 'serif' }}>N</span>, color: '#e50914' },
    { key: 'youtube', label: 'YouTube', icon: <Play size={44} fill="white" strokeWidth={0} />, color: '#ff0000' },
    { key: 'tving', label: 'TVING', icon: <span style={{ fontSize: 32, fontWeight: 800 }}>T</span>, color: '#ec0a8c' },
    { key: 'wavve', label: 'Wavve', icon: <span style={{ fontSize: 30, fontWeight: 800 }}>w</span>, color: '#0077ff' },
    { key: 'disney', label: 'Disney+', icon: <span style={{ fontSize: 28, fontWeight: 800, fontStyle: 'italic' }}>D+</span>, color: '#0f1f4d' },
    { key: 'spotify', label: 'Spotify', icon: <Music size={42} fill="white" strokeWidth={0} />, color: '#1db954' },
    { key: 'apple', label: 'Apple TV', icon: <Tv size={44} />, color: '#000000' },
    { key: 'store', label: '앱 마켓', icon: <Store size={42} />, color: T.accent },
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
        <div style={{
          flex: 1, display: 'flex', overflow: 'hidden',
        }}>
          {/* Left: vehicle controls — primary depth */}
          <div style={{
            flex: 1.4, padding: 36, overflowY: 'auto',
            borderRight: `1px solid ${T.divider}`,
          }}>
            <SectionHeader title="차량 제어" subtitle="공조 · 시트 · 유리" />
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14,
            }}>
              {vehicleControls.map(c => (
                <ControlTile
                  key={c.key}
                  icon={c.icon}
                  label={c.label}
                  active={controls[c.key]}
                  accent={c.accent}
                  onClick={() => toggle(c.key)}
                />
              ))}
            </div>
          </div>

          {/* Right: apps & media — separate hierarchy */}
          <div style={{
            flex: 1, padding: 36, overflowY: 'auto',
            background: T.card,
          }}>
            <SectionHeader title="미디어 & 앱" subtitle="자율주행 중 즐기는 OTT · 음악" />
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, columnGap: 12,
              marginBottom: 36,
            }}>
              {apps.map(a => (
                <AppTile
                  key={a.key}
                  icon={a.icon}
                  label={a.label}
                  color={a.color}
                  onClick={() => {}}
                />
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
      </motion.div>
    </motion.div>
  )
}
