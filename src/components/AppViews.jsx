import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, Search, MapPin, Navigation as NavIcon,
  Phone as PhoneIcon, PhoneOff, Star,
  Play, Pause, SkipBack, SkipForward, Heart,
  Clock, Plus, X, CircleDot, AlertTriangle, Volume2, VolumeX, Map,
  Mic, MicOff, Shuffle, Repeat, Repeat1, UserPlus, Minus,
} from 'lucide-react'

/* ============================================================
   Design tokens — sub-level of the main screen.
   Targets a 16" automotive panel; the host slot is 482×828.
   Main screen uses 34–78px display type; apps use 22–36px.
   ============================================================ */

const T = {
  bg: '#f7f8fa',        // --bg-primary
  card: '#ffffff',      // --bg-white
  // Chip / pill background — main suggestion-chip gradient
  chipGrad: 'linear-gradient(87deg, #ffffff 5%, #edeef2 95%)',
  text: '#131417',      // --text-primary
  sub: '#5c668d',       // brand muted — hero & chip label color
  faint: '#99a1af',     // --text-secondary
  divider: 'rgba(19, 20, 23, 0.08)',
  border: '1.5px solid rgba(0, 0, 0, 0.08)',
  // Active/selected — main confirmation bubble gradient
  keyGrad: 'linear-gradient(-90deg, #77a9e8 0%, #2d7cf1 100%)',
  accent: '#2d7cf1',
  accentHi: '#5ba3d9',
  accentSoft: 'rgba(45, 124, 241, 0.12)',
  accentGlow: 'rgba(45, 124, 241, 0.32)',
  danger: '#d54848',
  radiusCard: 32,       // matches main ai-option-card
  radiusChip: 999,
  shadow: '0px 6px 12px rgba(0, 0, 0, 0.08)', // --shadow-level1
  headerH: 96,
  pad: 28,
}

function Shell({ title, onBack, children }) {
  return (
    <div style={{
      width: '100%', height: '100%', background: T.bg, color: T.text,
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
    }}>
      <div style={{
        height: T.headerH, padding: `0 ${T.pad}px`, display: 'flex', alignItems: 'center', gap: 14,
        borderBottom: `1px solid ${T.divider}`, background: T.card, flexShrink: 0,
      }}>
        {onBack && (
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={onBack}
            style={{
              background: 'transparent', border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: 6, color: T.text, borderRadius: 16,
              width: 56, height: 56, marginLeft: -8,
            }}
          >
            <ChevronLeft size={40} strokeWidth={2.2} />
          </motion.button>
        )}
        <div style={{
          fontSize: 32, fontWeight: 600, letterSpacing: -1,
          color: T.text, fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
        }}>{title}</div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: T.pad }}>{children}</div>
    </div>
  )
}

function ListItem({ leading, title, subtitle, trailing, onClick }) {
  return (
    <motion.button
      whileTap={{ scale: 0.985 }}
      onClick={onClick}
      style={{
        width: '100%', padding: '22px 26px', marginBottom: 14,
        background: T.card, border: T.border,
        borderRadius: 24, cursor: onClick ? 'pointer' : 'default',
        display: 'flex', alignItems: 'center', gap: 18, textAlign: 'left',
        boxShadow: T.shadow,
      }}
    >
      {leading && <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{leading}</div>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 27, fontWeight: 600, color: T.text, letterSpacing: -0.6,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{title}</div>
        {subtitle && (
          <div style={{
            fontSize: 19, color: T.sub, marginTop: 4, fontWeight: 500, letterSpacing: -0.3,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{subtitle}</div>
        )}
      </div>
      {trailing && <div style={{ flexShrink: 0, color: T.sub, fontSize: 20, fontWeight: 600 }}>{trailing}</div>}
    </motion.button>
  )
}

function Avatar({ initials, color, size = 60 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color, color: 'white',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.4, fontWeight: 600,
    }}>{initials}</div>
  )
}

function SectionLabel({ children, style }) {
  return (
    <div style={{
      fontSize: 20, color: T.sub, fontWeight: 600, marginBottom: 12,
      paddingLeft: 6, letterSpacing: -0.4,
      fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
      ...style,
    }}>{children}</div>
  )
}

function PrimaryButton({ children, onClick, style }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      style={{
        width: '100%', padding: '24px', borderRadius: T.radiusChip,
        background: T.keyGrad, color: 'white', border: 'none', cursor: 'pointer',
        fontSize: 26, fontWeight: 600, letterSpacing: -0.6,
        fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
        boxShadow: `0 10px 24px ${T.accentGlow}`,
        ...style,
      }}
    >{children}</motion.button>
  )
}

/* ============================================================
   Navigation
   ============================================================ */

const NAV_PLACES = [
  { id: 1, name: '집', addr: '서울 마포구 합정동', icon: '🏠', eta: 18, km: 9.2, cat: 'home' },
  { id: 2, name: '회사', addr: '서울 강남구 테헤란로 152', icon: '🏢', eta: 24, km: 12.4, cat: 'work' },
  { id: 3, name: '스타벅스 강남점', addr: '서울 강남구 강남대로 390', icon: '☕', eta: 8, km: 3.1, cat: 'cafe' },
  { id: 4, name: '아버지 댁', addr: '경기 성남시 분당구 정자동', icon: '👨', eta: 32, km: 18.6, cat: 'family' },
  { id: 5, name: 'SK주유소 양재점', addr: '서울 서초구 양재대로 100', icon: '⛽', eta: 12, km: 5.4, cat: 'fuel' },
  { id: 6, name: '코엑스 주차장', addr: '서울 강남구 영동대로 513', icon: '🅿️', eta: 16, km: 8.1, cat: 'parking' },
  { id: 7, name: '한남동 맛집거리', addr: '서울 용산구 한남대로 27', icon: '🍽️', eta: 22, km: 10.7, cat: 'food' },
  { id: 8, name: 'GS칼텍스 충전소', addr: '서울 강남구 봉은사로 524', icon: '⚡', eta: 14, km: 6.8, cat: 'charge' },
]

const NAV_CATEGORIES = [
  { id: 'fuel', label: '주유소', icon: '⛽' },
  { id: 'parking', label: '주차장', icon: '🅿️' },
  { id: 'charge', label: '충전소', icon: '⚡' },
  { id: 'cafe', label: '카페', icon: '☕' },
  { id: 'food', label: '맛집', icon: '🍽️' },
]

const NAV_RECENT_SEARCHES = ['강남역', '집', '코엑스', '연남동 카페', '인천공항']

const NAV_ROUTES = [
  { label: '추천', etaDelta: 0, kmDelta: 0, detail: '통행료 2,300원 · 신호 6개', tag: '가장 빠름' },
  { label: '최단', etaDelta: -2, kmDelta: -0.4, detail: '통행료 3,800원 · 신호 4개', tag: '짧음' },
  { label: '무료', etaDelta: 6, kmDelta: 1.8, detail: '통행료 0원 · 신호 11개', tag: '무료' },
]

function NavigationApp({ onClose }) {
  const [view, setView] = useState('home')
  const [destination, setDestination] = useState(null)
  const [stopovers, setStopovers] = useState([])
  const [routeIdx, setRouteIdx] = useState(0)
  const [favIds, setFavIds] = useState(new Set([1, 2]))
  const [avoidHighway, setAvoidHighway] = useState(false)
  const [avoidToll, setAvoidToll] = useState(false)
  const [departWhen, setDepartWhen] = useState('now')
  const [muted, setMuted] = useState(false)
  const [overview, setOverview] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(null)

  const toggleFav = (id) => {
    setFavIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  /* ── SEARCH VIEW ───────────────────────────────────────── */
  if (view === 'search') {
    const filtered = searchText.trim()
      ? NAV_PLACES.filter(p => p.name.includes(searchText) || p.addr.includes(searchText))
      : NAV_PLACES.filter(p => !selectedCategory || p.cat === selectedCategory)
    return (
      <Shell title="검색" onBack={() => { setView('home'); setSearchText(''); setSelectedCategory(null) }}>
        <NavSearchBar value={searchText} onChange={setSearchText} autoFocus />
        <NavCategoryRow selected={selectedCategory} onSelect={(id) => setSelectedCategory(prev => prev === id ? null : id)} />
        {!searchText && (
          <>
            <SectionLabel>최근 검색</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 22 }}>
              {NAV_RECENT_SEARCHES.map(q => (
                <NavChip key={q} onClick={() => setSearchText(q)}>
                  <Clock size={16} /> {q}
                </NavChip>
              ))}
            </div>
          </>
        )}
        <SectionLabel>{searchText ? `'${searchText}' 검색 결과` : selectedCategory ? '카테고리 결과' : '추천 장소'}</SectionLabel>
        {filtered.length === 0 ? (
          <div style={{ padding: 28, textAlign: 'center', color: T.faint, fontSize: 18 }}>일치하는 장소가 없습니다</div>
        ) : filtered.slice(0, 4).map(p => (
          <ListItem
            key={p.id}
            leading={<div style={{ fontSize: 38, width: 56, textAlign: 'center' }}>{p.icon}</div>}
            title={p.name}
            subtitle={p.addr}
            trailing={`${p.eta}분`}
            onClick={() => { setDestination(p); setRouteIdx(0); setStopovers([]); setView('preview') }}
          />
        ))}
      </Shell>
    )
  }

  /* ── STOPOVER PICKER ───────────────────────────────────── */
  if (view === 'stopover') {
    const candidates = NAV_PLACES.filter(p => p.id !== destination?.id && !stopovers.find(s => s.id === p.id))
    return (
      <Shell title="경유지 추가" onBack={() => setView('preview')}>
        <SectionLabel>자주 가는 장소</SectionLabel>
        {candidates.slice(0, 4).map(p => (
          <ListItem
            key={p.id}
            leading={<div style={{ fontSize: 38, width: 56, textAlign: 'center' }}>{p.icon}</div>}
            title={p.name}
            subtitle={p.addr}
            trailing={<Plus size={26} color={T.accent} />}
            onClick={() => { setStopovers(prev => [...prev, p]); setView('preview') }}
          />
        ))}
      </Shell>
    )
  }

  /* ── GUIDING VIEW ──────────────────────────────────────── */
  if (view === 'guiding') {
    const r = NAV_ROUTES[routeIdx]
    const etaTotal = (destination?.eta ?? 0) + r.etaDelta + stopovers.length * 5
    const kmTotal = (destination?.km ?? 0) + r.kmDelta + stopovers.length * 2.5
    return (
      <Shell title="안내 중" onBack={() => setView('preview')}>
        <div style={{
          background: T.keyGrad, color: 'white',
          borderRadius: T.radiusCard, padding: 26, marginBottom: 16,
          boxShadow: `0 10px 28px ${T.accentGlow}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ fontSize: 78, lineHeight: 1 }}>↱</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 19, opacity: 0.88, fontWeight: 500, letterSpacing: -0.3 }}>800m 후</div>
              <div style={{ fontSize: 42, fontWeight: 700, marginTop: 4, letterSpacing: -1.4 }}>우회전</div>
              <div style={{ fontSize: 21, marginTop: 6, opacity: 0.92 }}>강남대로</div>
            </div>
          </div>
        </div>

        <NavSpeedHero current={52} limit={60} />

        <div style={{
          background: T.card, borderRadius: 24, padding: '20px 24px', marginBottom: 16,
          border: T.border, boxShadow: T.shadow,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14,
        }}>
          <div>
            <div style={{ fontSize: 17, color: T.faint, fontWeight: 600, letterSpacing: -0.3 }}>도착 예정</div>
            <div style={{ fontSize: 34, fontWeight: 700, marginTop: 4, letterSpacing: -0.9 }}>{etaTotal}분</div>
            <div style={{ fontSize: 18, color: T.sub, marginTop: 2, fontWeight: 500 }}>{kmTotal.toFixed(1)} km · {destination?.name}</div>
          </div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 18px', borderRadius: T.radiusChip,
            background: '#fff3cd', color: '#a86b00',
            fontSize: 17, fontWeight: 600, letterSpacing: -0.3,
          }}>
            <AlertTriangle size={18} /> 사고 1건
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <NavQuickAction
            icon={muted ? <VolumeX size={28} /> : <Volume2 size={28} />}
            label={muted ? '음소거' : '음성안내'}
            active={!muted}
            onClick={() => setMuted(m => !m)}
          />
          <NavQuickAction
            icon={<Map size={28} />}
            label="전체보기"
            active={overview}
            onClick={() => setOverview(v => !v)}
          />
          <NavQuickAction
            icon={<AlertTriangle size={28} />}
            label="신고"
            onClick={() => {}}
          />
        </div>

        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => { setView('home'); setDestination(null); setStopovers([]); setRouteIdx(0) }}
          style={{
            width: '100%', padding: 22, borderRadius: T.radiusChip, border: 'none', cursor: 'pointer',
            background: '#ffefef', color: T.danger,
            fontSize: 22, fontWeight: 600, letterSpacing: -0.4,
            fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
          }}
        >안내 종료</motion.button>
      </Shell>
    )
  }

  /* ── PREVIEW VIEW ──────────────────────────────────────── */
  if (view === 'preview' && destination) {
    const sel = NAV_ROUTES[routeIdx]
    return (
      <Shell title="경로 미리보기" onBack={() => { setView('home'); setStopovers([]); setRouteIdx(0) }}>
        <div style={{
          background: T.card, borderRadius: T.radiusCard, padding: 22, marginBottom: 14,
          border: T.border, boxShadow: T.shadow,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <MapPin size={32} color={T.accent} />
            <div style={{
              flex: 1, fontSize: 28, fontWeight: 700, letterSpacing: -0.7,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{destination.name}</div>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => toggleFav(destination.id)}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}
            >
              <Star size={32} fill={favIds.has(destination.id) ? T.accent : 'none'} color={favIds.has(destination.id) ? T.accent : T.faint} />
            </motion.button>
          </div>
          <div style={{ fontSize: 19, color: T.sub, marginTop: 8, fontWeight: 500 }}>{destination.addr}</div>
        </div>

        {stopovers.length > 0 && stopovers.map((s, i) => (
          <div key={s.id} style={{
            background: T.card, borderRadius: 20, padding: '16px 20px', marginBottom: 10,
            border: T.border, boxShadow: T.shadow,
            display: 'flex', alignItems: 'center', gap: 14,
          }}>
            <div style={{
              fontSize: 16, fontWeight: 700, color: T.accent,
              padding: '6px 16px', background: T.accentSoft, borderRadius: T.radiusChip,
              letterSpacing: -0.3,
            }}>경유 {i + 1}</div>
            <div style={{
              flex: 1, fontSize: 21, fontWeight: 600, letterSpacing: -0.4,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>{s.name}</div>
            <motion.button
              whileTap={{ scale: 0.88 }}
              onClick={() => setStopovers(prev => prev.filter(p => p.id !== s.id))}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6, color: T.faint }}
            >
              <X size={24} />
            </motion.button>
          </div>
        ))}

        {stopovers.length < 2 && (
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => setView('stopover')}
            style={{
              width: '100%', padding: 18, marginBottom: 18,
              background: 'transparent', border: `2px dashed ${T.faint}`, borderRadius: T.radiusChip,
              color: T.sub, fontSize: 19, fontWeight: 500, cursor: 'pointer', letterSpacing: -0.4,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
            }}
          >
            <Plus size={22} /> 경유지 추가
          </motion.button>
        )}

        <SectionLabel>경로 선택</SectionLabel>
        <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
          {NAV_ROUTES.map((rt, i) => {
            const active = i === routeIdx
            return (
              <motion.button
                whileTap={{ scale: 0.97 }}
                key={rt.label}
                onClick={() => setRouteIdx(i)}
                style={{
                  flex: 1, padding: '20px 8px', borderRadius: 24, textAlign: 'center',
                  background: active ? T.keyGrad : T.chipGrad,
                  color: active ? 'white' : T.sub,
                  border: active ? 'none' : T.border,
                  cursor: 'pointer',
                  boxShadow: active ? `0 8px 20px ${T.accentGlow}` : 'none',
                  fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
                }}
              >
                <div style={{ fontSize: 16, opacity: 0.88, fontWeight: 500, letterSpacing: -0.3 }}>{rt.label}</div>
                <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6, letterSpacing: -0.7 }}>{destination.eta + rt.etaDelta}분</div>
                <div style={{ fontSize: 14, opacity: 0.85, marginTop: 2 }}>{(destination.km + rt.kmDelta).toFixed(1)} km</div>
              </motion.button>
            )
          })}
        </div>

        <div style={{
          background: T.accentSoft, borderRadius: 20, padding: '14px 20px', marginBottom: 18,
          display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <CircleDot size={20} color={T.accent} />
          <div style={{ flex: 1, fontSize: 17, color: T.text, fontWeight: 500, letterSpacing: -0.3 }}>{sel.detail}</div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
          <NavToggleChip active={avoidHighway} onClick={() => setAvoidHighway(v => !v)}>고속도로 회피</NavToggleChip>
          <NavToggleChip active={avoidToll} onClick={() => setAvoidToll(v => !v)}>유료도로 회피</NavToggleChip>
        </div>

        <PrimaryButton onClick={() => setView('guiding')}>
          <NavIcon size={26} /> 안내 시작
        </PrimaryButton>
      </Shell>
    )
  }

  /* ── HOME VIEW ─────────────────────────────────────────── */
  const sorted = [...NAV_PLACES]
    .sort((a, b) => Number(favIds.has(b.id)) - Number(favIds.has(a.id)))
    .slice(0, 4)
  return (
    <Shell title="내비게이션" onBack={onClose}>
      <motion.button
        whileTap={{ scale: 0.985 }}
        onClick={() => setView('search')}
        style={{
          width: '100%',
          background: T.chipGrad, borderRadius: T.radiusChip, padding: '22px 28px',
          display: 'flex', alignItems: 'center', gap: 16, marginBottom: 18,
          border: T.border, boxShadow: T.shadow, cursor: 'pointer',
          fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
        }}
      >
        <Search size={28} color={T.sub} />
        <div style={{
          flex: 1, textAlign: 'left', fontSize: 23, color: T.sub,
          fontWeight: 500, letterSpacing: -0.5,
        }}>어디로 갈까요?</div>
      </motion.button>
      <NavCategoryRow onSelect={(id) => { setSelectedCategory(id); setView('search') }} />
      <SectionLabel>최근 · 즐겨찾기</SectionLabel>
      {sorted.map(p => (
        <ListItem
          key={p.id}
          leading={<div style={{ fontSize: 38, width: 56, textAlign: 'center' }}>{p.icon}</div>}
          title={p.name}
          subtitle={p.addr}
          trailing={
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <motion.button
                whileTap={{ scale: 0.85 }}
                onClick={(e) => { e.stopPropagation(); toggleFav(p.id) }}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4 }}
              >
                <Star size={24} fill={favIds.has(p.id) ? T.accent : 'none'} color={favIds.has(p.id) ? T.accent : T.faint} />
              </motion.button>
              <div style={{ fontSize: 17, fontWeight: 500, color: T.sub }}>{p.eta}분</div>
            </div>
          }
          onClick={() => { setDestination(p); setRouteIdx(0); setStopovers([]); setView('preview') }}
        />
      ))}
    </Shell>
  )
}

/* ── Navigation helper components ─────────────────────── */

function NavSearchBar({ value, onChange, autoFocus }) {
  return (
    <div style={{
      background: T.chipGrad, borderRadius: T.radiusChip, padding: '22px 28px',
      display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20,
      border: T.border, boxShadow: T.shadow,
    }}>
      <Search size={28} color={T.sub} />
      <input
        autoFocus={autoFocus}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="장소, 주소, 카테고리"
        style={{
          flex: 1, border: 'none', outline: 'none', fontSize: 24, background: 'transparent',
          color: T.text, fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
          fontWeight: 500, letterSpacing: -0.5,
        }}
      />
      {value && (
        <motion.button
          whileTap={{ scale: 0.88 }}
          onClick={() => onChange('')}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: T.faint }}
        >
          <X size={26} />
        </motion.button>
      )}
    </div>
  )
}

function NavCategoryRow({ selected, onSelect }) {
  return (
    <div style={{ display: 'flex', gap: 10, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
      {NAV_CATEGORIES.map(c => {
        const active = selected === c.id
        return (
          <motion.button
            whileTap={{ scale: 0.94 }}
            key={c.id}
            onClick={() => onSelect(c.id)}
            style={{
              padding: '14px 22px', borderRadius: T.radiusChip,
              border: active ? 'none' : T.border,
              background: active ? T.keyGrad : T.chipGrad,
              color: active ? 'white' : T.sub,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 20, fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0,
              letterSpacing: -0.4,
              boxShadow: active ? `0 6px 16px ${T.accentGlow}` : 'none',
              fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
            }}
          >
            <span style={{ fontSize: 22 }}>{c.icon}</span>{c.label}
          </motion.button>
        )
      })}
    </div>
  )
}

function NavChip({ children, onClick }) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      style={{
        padding: '12px 20px', borderRadius: T.radiusChip,
        border: T.border, background: T.chipGrad, color: T.sub,
        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 8,
        fontSize: 18, fontWeight: 500, letterSpacing: -0.3,
        fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
      }}
    >{children}</motion.button>
  )
}

function NavToggleChip({ children, active, onClick }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      style={{
        padding: '14px 22px', borderRadius: T.radiusChip,
        background: active ? T.keyGrad : T.chipGrad,
        color: active ? 'white' : T.sub,
        border: active ? 'none' : T.border,
        cursor: 'pointer', fontSize: 19, fontWeight: 500, letterSpacing: -0.4,
        display: 'inline-flex', alignItems: 'center', gap: 8,
        boxShadow: active ? `0 6px 16px ${T.accentGlow}` : 'none',
        fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
        transition: 'background 0.2s, color 0.2s',
      }}
    >{children}</motion.button>
  )
}

function NavSpeedHero({ current, limit }) {
  const over = current > limit
  return (
    <div style={{
      background: T.card, borderRadius: T.radiusCard, padding: '20px 26px',
      border: T.border, boxShadow: T.shadow,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16,
      marginBottom: 16,
      fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
    }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, minWidth: 0 }}>
        <div>
          <div style={{
            fontSize: 16, color: T.faint, fontWeight: 600, letterSpacing: -0.3,
            marginBottom: 2,
          }}>현재 속도</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div style={{
              fontSize: 76, fontWeight: 700, lineHeight: 1,
              color: over ? T.danger : T.text, letterSpacing: -3,
            }}>{current}</div>
            <div style={{
              fontSize: 22, fontWeight: 600, color: T.sub, letterSpacing: -0.5,
            }}>km/h</div>
          </div>
        </div>
      </div>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        flexShrink: 0,
      }}>
        <div style={{
          width: 76, height: 76, borderRadius: '50%', background: 'white',
          border: '5px solid #e54848', color: T.text, fontSize: 30, fontWeight: 800,
          display: 'flex', alignItems: 'center', justifyContent: 'center', letterSpacing: -0.7,
        }}>{limit}</div>
        <div style={{ fontSize: 12, color: T.faint, fontWeight: 600 }}>제한 속도</div>
      </div>
    </div>
  )
}

function NavQuickAction({ icon, label, active, onClick }) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      style={{
        flex: 1, padding: '18px 6px', borderRadius: 20, cursor: 'pointer',
        background: active ? T.keyGrad : T.chipGrad,
        border: active ? 'none' : T.border,
        color: active ? 'white' : T.sub,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        fontSize: 17, fontWeight: 600, letterSpacing: -0.3,
        boxShadow: active ? `0 6px 16px ${T.accentGlow}` : 'none',
        fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
      }}
    >
      {icon}<span>{label}</span>
    </motion.button>
  )
}

/* ============================================================
   Phone
   ============================================================ */

function PhoneApp({ onClose }) {
  const [tab, setTab] = useState('favorites')
  const [calling, setCalling] = useState(null)
  const [muted, setMuted] = useState(false)
  const [speaker, setSpeaker] = useState(true)

  // Driving essentials only: a few one-tap contacts + recent callbacks.
  const favorites = [
    { id: 1, name: '엄마', sub: '010-1234-5678', initials: '엄', color: '#f59e0b' },
    { id: 2, name: '김민지', sub: 'PM · 회사', initials: '김', color: '#10b981' },
    { id: 3, name: '박사장님', sub: '010-9999-0001', initials: '박', color: '#6366f1' },
    { id: 4, name: '집', sub: '02-555-1234', initials: '집', color: '#0ea5e9' },
  ]
  const recents = [
    { id: 11, name: '엄마', when: '오늘 오전 9:12', dir: '발신', color: '#f59e0b', initials: '엄' },
    { id: 12, name: '02-555-0188', when: '어제 오후 6:40', dir: '부재중', color: '#9ca3af', initials: '?' },
    { id: 13, name: '이수현', when: '어제 오후 2:05', dir: '수신', color: '#ef4444', initials: '이' },
  ]

  if (calling) {
    return (
      <Shell title="통화 중" onBack={() => { setCalling(null); setMuted(false) }}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          paddingTop: 16, paddingBottom: 8,
        }}>
          <Avatar initials={calling.initials} color={calling.color} size={170} />
          <div style={{
            fontSize: 36, fontWeight: 600, marginTop: 22, letterSpacing: -0.9,
            fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
          }}>{calling.name}</div>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            padding: '10px 20px', borderRadius: T.radiusChip, marginTop: 12,
            background: T.accentSoft, color: T.accent,
            fontSize: 18, fontWeight: 600, letterSpacing: -0.3,
          }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: T.accent }} />
            연결됨 · 00:12
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 36, marginBottom: 28 }}>
          <PhoneControl
            icon={muted ? <MicOff size={30} /> : <Mic size={30} />}
            label={muted ? '음소거됨' : '음소거'}
            active={muted}
            onClick={() => setMuted(m => !m)}
          />
          <PhoneControl
            icon={<Volume2 size={30} />}
            label="스피커"
            active={speaker}
            onClick={() => setSpeaker(s => !s)}
          />
          <PhoneControl
            icon={<UserPlus size={30} />}
            label="통화 추가"
            onClick={() => {}}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => { setCalling(null); setMuted(false) }}
            style={{
              width: 112, height: 112, borderRadius: '50%',
              background: T.danger, border: 'none', color: 'white', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 12px 28px rgba(213, 72, 72, 0.45)',
            }}
          ><PhoneOff size={48} /></motion.button>
        </div>
      </Shell>
    )
  }

  return (
    <Shell title="전화" onBack={onClose}>
      <div style={{
        display: 'flex', background: T.chipGrad, borderRadius: T.radiusChip, padding: 8, marginBottom: 22,
        border: T.border, boxShadow: T.shadow,
      }}>
        {[{ k: 'favorites', label: '즐겨찾기' }, { k: 'recents', label: '최근 통화' }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} style={{
            flex: 1, padding: '18px 0', border: 'none', cursor: 'pointer',
            background: tab === t.k ? T.keyGrad : 'transparent',
            color: tab === t.k ? 'white' : T.sub,
            borderRadius: T.radiusChip, fontSize: 22, fontWeight: 600, letterSpacing: -0.4,
            boxShadow: tab === t.k ? `0 6px 16px ${T.accentGlow}` : 'none',
            fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
            transition: 'background 0.2s, color 0.2s',
          }}>{t.label}</button>
        ))}
      </div>
      {tab === 'favorites' ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          {favorites.map(c => (
            <motion.button
              whileTap={{ scale: 0.96 }}
              key={c.id}
              onClick={() => setCalling(c)}
              style={{
                background: T.card, border: T.border,
                borderRadius: T.radiusCard, padding: '24px 16px',
                cursor: 'pointer', boxShadow: T.shadow,
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
              }}
            >
              <Avatar initials={c.initials} color={c.color} size={76} />
              <div style={{
                fontSize: 24, fontWeight: 600, color: T.text, letterSpacing: -0.5,
              }}>{c.name}</div>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 18px', borderRadius: T.radiusChip,
                background: T.accentSoft, color: T.accent,
                fontSize: 16, fontWeight: 600, letterSpacing: -0.3,
              }}>
                <PhoneIcon size={16} /> 통화
              </div>
            </motion.button>
          ))}
        </div>
      ) : (
        recents.map(item => (
          <ListItem
            key={item.id}
            leading={<Avatar initials={item.initials} color={item.color} />}
            title={item.name}
            subtitle={`${item.when} · ${item.dir}`}
            trailing={<PhoneIcon size={28} color={T.accent} />}
            onClick={() => setCalling(item)}
          />
        ))
      )}
    </Shell>
  )
}

function PhoneControl({ icon, label, active, onClick }) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      style={{
        flex: 1, padding: '22px 6px', borderRadius: 24, cursor: 'pointer',
        background: active ? T.keyGrad : T.chipGrad,
        border: active ? 'none' : T.border,
        color: active ? 'white' : T.sub,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
        fontSize: 17, fontWeight: 600, letterSpacing: -0.3,
        boxShadow: active ? `0 6px 16px ${T.accentGlow}` : 'none',
        fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
      }}
    >
      {icon}<span>{label}</span>
    </motion.button>
  )
}

/* ============================================================
   Music
   ============================================================ */

const MUSIC_PLAYLISTS = [
  { id: 'drive', name: '드라이브 믹스', count: 24, mood: '시원한 팝', icon: '🚗' },
  { id: 'calm', name: 'Calm', count: 18, mood: '잔잔한 어쿠스틱', icon: '🌙' },
  { id: 'kindie', name: '한국 인디', count: 32, mood: '봄날의 멜로디', icon: '🎵' },
  { id: 'jazz', name: 'Late Night Jazz', count: 15, mood: '재즈 클래식', icon: '🎷' },
]

function MusicApp({ onClose }) {
  const [view, setView] = useState('player') // player | playlists
  const [playlist, setPlaylist] = useState('드라이브 믹스')
  const [trackIdx, setTrackIdx] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat] = useState('off') // off | all | one
  const [vol, setVol] = useState(60)

  const queue = [
    { title: 'Drive', artist: 'The Cars', dur: '3:55' },
    { title: '하루의 끝', artist: '오존', dur: '4:12' },
    { title: 'Sunset Boulevard', artist: 'Lo-Fi Lab', dur: '3:34' },
    { title: '봄이 오는 길', artist: '김다영', dur: '3:18' },
    { title: 'Night Run', artist: 'Synthwave Crew', dur: '4:48' },
  ]
  const cur = queue[trackIdx]
  const goNext = () => setTrackIdx(i => (i + 1) % queue.length)
  const goPrev = () => setTrackIdx(i => (i - 1 + queue.length) % queue.length)
  const adjustVol = (d) => setVol(v => Math.max(0, Math.min(100, v + d)))
  const cycleRepeat = () => setRepeat(r => r === 'off' ? 'all' : r === 'all' ? 'one' : 'off')

  /* ── PLAYLIST PICKER ─────────────────────────────────── */
  if (view === 'playlists') {
    return (
      <Shell title="플레이리스트" onBack={() => setView('player')}>
        {MUSIC_PLAYLISTS.map(p => {
          const active = p.name === playlist
          return (
            <motion.button
              whileTap={{ scale: 0.985 }}
              key={p.id}
              onClick={() => { setPlaylist(p.name); setTrackIdx(0); setPlaying(true); setView('player') }}
              style={{
                width: '100%', padding: '22px 26px', marginBottom: 14,
                background: active ? T.keyGrad : T.card,
                border: active ? 'none' : T.border,
                borderRadius: T.radiusCard, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 18, textAlign: 'left',
                boxShadow: active ? `0 8px 20px ${T.accentGlow}` : T.shadow,
                fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
              }}
            >
              <div style={{ fontSize: 40, width: 56, textAlign: 'center' }}>{p.icon}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 26, fontWeight: 600, letterSpacing: -0.6,
                  color: active ? 'white' : T.text,
                }}>{p.name}</div>
                <div style={{
                  fontSize: 19, marginTop: 4, fontWeight: 500, letterSpacing: -0.3,
                  color: active ? 'rgba(255,255,255,0.85)' : T.sub,
                }}>{p.count}곡 · {p.mood}</div>
              </div>
              {active && <CircleDot size={26} color="white" />}
            </motion.button>
          )
        })}
      </Shell>
    )
  }

  /* ── PLAYER VIEW ─────────────────────────────────────── */
  const repeatIcon = repeat === 'one' ? <Repeat1 size={20} /> : <Repeat size={20} />
  const repeatLabel = repeat === 'one' ? '한 곡' : repeat === 'all' ? '전체' : '반복'

  const nextUp = queue.filter((_, i) => i !== trackIdx).slice(0, 2)

  return (
    <Shell title="음악" onBack={onClose}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 14, gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
          <div style={{ fontSize: 15, color: T.faint, fontWeight: 600, flexShrink: 0, letterSpacing: -0.3 }}>지금 재생</div>
          <div style={{
            fontSize: 19, fontWeight: 600, color: T.text, letterSpacing: -0.4,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{playlist}</div>
        </div>
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={() => setView('playlists')}
          style={{
            background: T.chipGrad, color: T.sub, border: T.border, cursor: 'pointer',
            padding: '8px 16px', borderRadius: T.radiusChip,
            fontSize: 15, fontWeight: 600, letterSpacing: -0.3, flexShrink: 0,
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
          }}
        >변경 →</motion.button>
      </div>

      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        marginBottom: 16,
      }}>
        <div style={{
          width: 240, height: 240,
          background: `linear-gradient(135deg, ${T.accentHi} 0%, #8b5cf6 100%)`,
          borderRadius: T.radiusCard, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          color: 'white', fontSize: 110, fontWeight: 800,
          boxShadow: `0 16px 36px ${T.accentGlow}`,
          marginBottom: 18,
        }}>♪</div>
        <div style={{
          fontSize: 26, fontWeight: 600, letterSpacing: -0.7,
          fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
          color: T.text, textAlign: 'center',
          maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{cur.title}</div>
        <div style={{
          fontSize: 18, color: T.sub, marginTop: 6, fontWeight: 500, letterSpacing: -0.3,
        }}>{cur.artist}</div>
      </div>

      <div style={{ height: 5, background: T.divider, borderRadius: 3, marginBottom: 4, position: 'relative' }}>
        <div style={{ width: '38%', height: '100%', background: T.keyGrad, borderRadius: 3 }} />
      </div>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: 13, color: T.faint, marginBottom: 12, fontWeight: 600,
      }}>
        <span>1:28</span><span>{cur.dur}</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, marginBottom: 14 }}>
        <MusicSmallToggle
          icon={<Shuffle size={22} />}
          active={shuffle}
          onClick={() => setShuffle(s => !s)}
        />
        <motion.button whileTap={{ scale: 0.9 }} onClick={goPrev} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: T.text }}>
          <SkipBack size={38} />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setPlaying(p => !p)}
          style={{
            width: 80, height: 80, borderRadius: '50%', background: T.keyGrad,
            border: 'none', cursor: 'pointer', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 10px 24px ${T.accentGlow}`,
          }}
        >
          {playing ? <Pause size={36} fill="white" /> : <Play size={36} fill="white" />}
        </motion.button>
        <motion.button whileTap={{ scale: 0.9 }} onClick={goNext} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, color: T.text }}>
          <SkipForward size={38} />
        </motion.button>
        <MusicSmallToggle
          icon={repeatIcon}
          active={repeat !== 'off'}
          label={repeat !== 'off' ? repeatLabel : null}
          onClick={cycleRepeat}
        />
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        background: T.card, borderRadius: T.radiusChip, padding: '8px 14px',
        border: T.border, boxShadow: T.shadow, marginBottom: 14,
      }}>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => adjustVol(-10)}
          style={{
            width: 40, height: 40, borderRadius: '50%',
            background: T.bg, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: T.text,
          }}
        ><Minus size={22} strokeWidth={2.4} /></motion.button>
        <div style={{ flex: 1, height: 6, background: T.divider, borderRadius: 3, position: 'relative' }}>
          <div style={{ width: `${vol}%`, height: '100%', background: T.keyGrad, borderRadius: 3 }} />
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => adjustVol(10)}
          style={{
            width: 40, height: 40, borderRadius: '50%',
            background: T.bg, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: T.text,
          }}
        ><Plus size={22} strokeWidth={2.4} /></motion.button>
        <div style={{
          fontSize: 16, fontWeight: 700, color: T.sub, minWidth: 36,
          textAlign: 'right', letterSpacing: -0.3,
        }}>{vol}</div>
      </div>

      <div style={{
        fontSize: 14, color: T.faint, fontWeight: 600, marginBottom: 6,
        paddingLeft: 4, letterSpacing: -0.2,
        fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
      }}>다음 곡</div>
      {nextUp.map((t) => {
        const realIdx = queue.indexOf(t)
        return (
          <motion.button
            whileTap={{ scale: 0.985 }}
            key={realIdx}
            onClick={() => { setTrackIdx(realIdx); setPlaying(true) }}
            style={{
              width: '100%', padding: '10px 14px', marginBottom: 6,
              background: T.card, border: T.border, borderRadius: 14,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
              fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: `linear-gradient(135deg, ${T.accentHi} 0%, #8b5cf6 100%)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: 18, flexShrink: 0,
            }}>♪</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 17, fontWeight: 600, color: T.text, letterSpacing: -0.3,
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>{t.title}</div>
              <div style={{ fontSize: 13, color: T.sub, marginTop: 1 }}>{t.artist}</div>
            </div>
            <div style={{ fontSize: 13, color: T.faint, fontWeight: 600 }}>{t.dur}</div>
          </motion.button>
        )
      })}
    </Shell>
  )
}

function MusicSmallToggle({ icon, active, label, onClick }) {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      style={{
        background: active ? T.keyGrad : 'transparent', border: 'none', cursor: 'pointer',
        padding: active ? '8px 14px' : 6,
        borderRadius: T.radiusChip,
        color: active ? 'white' : T.faint,
        display: 'inline-flex', alignItems: 'center', gap: 6,
        fontSize: 14, fontWeight: 600, letterSpacing: -0.3,
        fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
        boxShadow: active ? `0 4px 12px ${T.accentGlow}` : 'none',
      }}
    >
      {icon}{label && <span>{label}</span>}
    </motion.button>
  )
}

/* ============================================================
   Mail
   ============================================================ */

function MailApp({ onClose }) {
  const [openId, setOpenId] = useState(null)

  const mails = [
    { id: 1, from: '카카오 알림', subject: '이번 주 일정 요약', preview: '오늘 회의 3건, 내일 1건이 예정되어 있습니다…', time: '오전 9:42', body: '안녕하세요.\n이번 주에 예정된 일정 요약입니다.\n\n• 오늘 10:00 디자인 리뷰\n• 오늘 14:30 사용자 테스트\n• 오늘 17:00 주간 회고\n• 내일 11:00 외부 미팅\n\n좋은 하루 보내세요!', unread: true },
    { id: 2, from: '쿠팡', subject: '주문하신 상품이 배송 출발했습니다', preview: '주문번호 92013483, 오늘 도착 예정…', time: '오전 8:15', body: '주문하신 상품(블루투스 키보드 외 1건)이 오늘 18시 이전에 도착할 예정입니다.\n현재 위치: 동탄 물류센터 출발 완료.', unread: true },
    { id: 3, from: '김민지', subject: '회의 자료 공유드립니다', preview: '첨부드린 자료 검토 부탁드려요…', time: '어제', body: '안녕하세요 PM님,\n내일 회의에 사용할 자료를 첨부드립니다. 검토 후 코멘트 부탁드립니다.\n\n감사합니다.\n김민지 드림', unread: false },
    { id: 4, from: 'GitHub', subject: '[PR] feat: add wake word integration', preview: 'A new pull request has been opened…', time: '어제', body: 'ystmk1 opened pull request #42 in HCI-prototype: feat: add wake word integration.\n+312 -47 lines.', unread: false },
    { id: 5, from: '하나카드', subject: '이번 달 청구 금액 안내', preview: '청구 예정 금액은 423,500원입니다…', time: '월요일', body: '안녕하세요. 5월 결제 예정 금액 안내드립니다.\n\n청구액: 423,500원\n결제일: 5월 25일', unread: false },
  ]

  const open = mails.find(m => m.id === openId)
  if (open) {
    return (
      <Shell title="메일" onBack={() => setOpenId(null)}>
        <div style={{
          fontSize: 30, fontWeight: 600, marginBottom: 18, letterSpacing: -0.8, lineHeight: 1.25,
          fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
        }}>{open.subject}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <Avatar initials={open.from[0]} color="#6366f1" />
          <div>
            <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: -0.4 }}>{open.from}</div>
            <div style={{ fontSize: 17, color: T.faint, marginTop: 2 }}>{open.time}</div>
          </div>
        </div>
        <div style={{
          background: T.card, borderRadius: T.radiusCard, padding: 26,
          border: T.border, boxShadow: T.shadow,
          fontSize: 22, lineHeight: 1.65, fontWeight: 500, letterSpacing: -0.4,
          whiteSpace: 'pre-wrap', color: T.text,
          fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
        }}>{open.body}</div>
      </Shell>
    )
  }

  return (
    <Shell title="메일" onBack={onClose}>
      <SectionLabel>받은 편지함 · {mails.filter(m => m.unread).length}개 안 읽음</SectionLabel>
      {mails.slice(0, 4).map(m => (
        <ListItem
          key={m.id}
          leading={
            <div style={{
              width: 12, height: 12, borderRadius: '50%',
              background: m.unread ? T.accent : 'transparent',
              marginLeft: 6,
            }} />
          }
          title={m.subject}
          subtitle={`${m.from} · ${m.preview}`}
          trailing={m.time}
          onClick={() => setOpenId(m.id)}
        />
      ))}
    </Shell>
  )
}

/* ============================================================
   Calendar
   ============================================================ */

function CalendarApp({ onClose }) {
  const [openId, setOpenId] = useState(null)
  const today = new Date()
  const ymd = `${today.getFullYear()}년 ${today.getMonth() + 1}월 ${today.getDate()}일 ${['일', '월', '화', '수', '목', '금', '토'][today.getDay()]}요일`

  const events = [
    { id: 1, title: '디자인 리뷰', when: '오늘 10:00 – 11:00', where: '회의실 A', notes: 'V2 와이어프레임 리뷰. 채팅 UX 변경점 위주.', color: '#5ba3d9', group: 'today' },
    { id: 2, title: '사용자 테스트', when: '오늘 14:30 – 16:00', where: '사용자 연구실', notes: '참가자 4명. 음성 wake-word 시나리오.', color: '#10b981', group: 'today' },
    { id: 3, title: '주간 회고', when: '오늘 17:00 – 17:30', where: '온라인 (Zoom)', notes: '이번 주 진행 상황 공유.', color: '#f59e0b', group: 'today' },
    { id: 4, title: '외부 미팅 (현대모비스)', when: '내일 11:00 – 12:30', where: '판교 본사', notes: 'HCI 협업안 1차 미팅.', color: '#6366f1', group: 'upcoming' },
    { id: 5, title: '치과 예약', when: '5월 19일 09:00', where: '강남 본점', notes: '정기 검진.', color: '#ef4444', group: 'upcoming' },
    { id: 6, title: '엄마 생신', when: '5월 22일 종일', where: '본가', notes: '저녁 식사 예약 필요.', color: '#ec4899', group: 'upcoming' },
  ]

  const open = events.find(e => e.id === openId)
  if (open) {
    return (
      <Shell title="일정" onBack={() => setOpenId(null)}>
        <div style={{
          background: T.card, borderRadius: T.radiusCard, padding: 26,
          border: T.border, boxShadow: T.shadow,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
            <div style={{ width: 14, height: 44, borderRadius: 4, background: open.color }} />
            <div style={{
              fontSize: 30, fontWeight: 600, letterSpacing: -0.8,
              fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
            }}>{open.title}</div>
          </div>
          <Detail icon={<Clock size={24} />} label={open.when} />
          <Detail icon={<MapPin size={24} />} label={open.where} />
          <div style={{
            borderTop: `1px solid ${T.divider}`, marginTop: 20, paddingTop: 20,
            fontSize: 22, lineHeight: 1.6, color: T.text, fontWeight: 500, letterSpacing: -0.4,
            fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
          }}>{open.notes}</div>
        </div>
      </Shell>
    )
  }

  const today_ = events.filter(e => e.group === 'today')
  const upcoming = events.filter(e => e.group === 'upcoming')

  return (
    <Shell title="일정" onBack={onClose}>
      <div style={{ marginBottom: 20 }}>
        <div style={{
          fontSize: 26, fontWeight: 600, letterSpacing: -0.7,
          fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
        }}>{ymd}</div>
      </div>
      <SectionLabel>오늘 일정</SectionLabel>
      {today_.slice(0, 2).map(e => (
        <ListItem
          key={e.id}
          leading={<div style={{ width: 8, height: 56, background: e.color, borderRadius: 4 }} />}
          title={e.title}
          subtitle={`${e.when.replace('오늘 ', '')} · ${e.where}`}
          onClick={() => setOpenId(e.id)}
        />
      ))}
      <SectionLabel style={{ marginTop: 22 }}>다가오는 일정</SectionLabel>
      {upcoming.slice(0, 2).map(e => (
        <ListItem
          key={e.id}
          leading={<div style={{ width: 8, height: 56, background: e.color, borderRadius: 4 }} />}
          title={e.title}
          subtitle={`${e.when} · ${e.where}`}
          onClick={() => setOpenId(e.id)}
        />
      ))}
    </Shell>
  )
}

function Detail({ icon, label }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      color: T.sub, marginBottom: 12, fontSize: 21, fontWeight: 500, letterSpacing: -0.4,
      fontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
    }}>
      {icon}<span>{label}</span>
    </div>
  )
}

/* ============================================================
   Router
   ============================================================ */

export default function AppView({ id, onClose }) {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={id}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.18 }}
        style={{ width: '100%', height: '100%' }}
      >
        {id === 'Navigation' && <NavigationApp onClose={onClose} />}
        {id === 'Phone' && <PhoneApp onClose={onClose} />}
        {id === 'Music' && <MusicApp onClose={onClose} />}
        {id === 'Mail' && <MailApp onClose={onClose} />}
        {id === 'Calendar' && <CalendarApp onClose={onClose} />}
      </motion.div>
    </AnimatePresence>
  )
}
