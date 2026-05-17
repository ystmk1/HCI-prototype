import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronLeft, Search, MapPin, Navigation as NavIcon,
  Phone as PhoneIcon, PhoneOff, Star,
  Play, Pause, SkipBack, SkipForward, Heart,
  Clock,
} from 'lucide-react'

/* ============================================================
   Design tokens — sub-level of the main screen.
   Targets a 16" automotive panel; the host slot is 482×828.
   Main screen uses 34–78px display type; apps use 22–36px.
   ============================================================ */

const T = {
  bg: '#f7f8fa',        // matches --bg-primary
  card: '#ffffff',      // matches --bg-white
  text: '#131417',      // --text-primary
  sub: '#5c668d',       // brand muted (used by chips/hero)
  faint: '#99a1af',     // --text-secondary
  divider: 'rgba(19, 20, 23, 0.08)',
  accent: '#5c668d',
  accentHi: '#2d7cf1',
  danger: '#d54848',
  radiusCard: 24,
  radiusChip: 999,
  shadow: '0 6px 18px rgba(0, 0, 0, 0.06)',
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
              padding: 8, color: T.text, borderRadius: 12,
              width: 56, height: 56, marginLeft: -8,
            }}
          >
            <ChevronLeft size={36} strokeWidth={2.2} />
          </motion.button>
        )}
        <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: -0.8 }}>{title}</div>
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
        width: '100%', padding: '20px 22px', marginBottom: 14,
        background: T.card, border: `1px solid ${T.divider}`,
        borderRadius: 20, cursor: onClick ? 'pointer' : 'default',
        display: 'flex', alignItems: 'center', gap: 18, textAlign: 'left',
        boxShadow: T.shadow,
      }}
    >
      {leading && <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center' }}>{leading}</div>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontSize: 24, fontWeight: 600, color: T.text, letterSpacing: -0.4,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{title}</div>
        {subtitle && (
          <div style={{
            fontSize: 18, color: T.faint, marginTop: 4, fontWeight: 500,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{subtitle}</div>
        )}
      </div>
      {trailing && <div style={{ flexShrink: 0, color: T.sub, fontSize: 18, fontWeight: 500 }}>{trailing}</div>}
    </motion.button>
  )
}

function Avatar({ initials, color, size = 56 }) {
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
      fontSize: 18, color: T.faint, fontWeight: 600, marginBottom: 12,
      paddingLeft: 4, letterSpacing: -0.3, ...style,
    }}>{children}</div>
  )
}

function PrimaryButton({ children, onClick, style }) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      style={{
        width: '100%', padding: '22px', borderRadius: 18,
        background: T.accent, color: 'white', border: 'none', cursor: 'pointer',
        fontSize: 24, fontWeight: 600, letterSpacing: -0.4,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        boxShadow: '0 6px 16px rgba(92, 102, 141, 0.32)',
        ...style,
      }}
    >{children}</motion.button>
  )
}

/* ============================================================
   Navigation
   ============================================================ */

function NavigationApp({ onClose }) {
  const [view, setView] = useState('home')
  const [destination, setDestination] = useState(null)

  const recents = [
    { id: 1, name: '집', addr: '서울 마포구 합정동', icon: '🏠', eta: 18, km: 9.2 },
    { id: 2, name: '회사', addr: '서울 강남구 테헤란로 152', icon: '🏢', eta: 24, km: 12.4 },
    { id: 3, name: '스타벅스 강남점', addr: '서울 강남구 강남대로 390', icon: '☕', eta: 8, km: 3.1 },
    { id: 4, name: '아버지 댁', addr: '경기 성남시 분당구 정자동', icon: '👨', eta: 32, km: 18.6 },
  ]

  if (view === 'guiding') {
    return (
      <Shell title="안내 중" onBack={() => setView('preview')}>
        <div style={{
          background: `linear-gradient(135deg, ${T.accent} 0%, ${T.accentHi} 100%)`,
          color: 'white', borderRadius: T.radiusCard, padding: 28, marginBottom: 18,
          boxShadow: T.shadow,
        }}>
          <div style={{ fontSize: 18, opacity: 0.85, fontWeight: 500 }}>다음 안내</div>
          <div style={{ fontSize: 38, fontWeight: 700, marginTop: 8, letterSpacing: -1 }}>800m 후 우회전</div>
          <div style={{ fontSize: 20, marginTop: 6, opacity: 0.9 }}>강남대로</div>
        </div>
        <div style={{
          background: T.card, borderRadius: 20, padding: 22, marginBottom: 18,
          border: `1px solid ${T.divider}`,
        }}>
          <div style={{ fontSize: 16, color: T.faint, fontWeight: 500 }}>도착 예정</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginTop: 6, letterSpacing: -0.6 }}>
            {destination?.name} · {destination?.eta}분
          </div>
          <div style={{ fontSize: 18, color: T.faint, marginTop: 4 }}>{destination?.km} km 남음</div>
        </div>
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => { setView('home'); setDestination(null) }}
          style={{
            width: '100%', padding: 22, borderRadius: 18, border: 'none', cursor: 'pointer',
            background: '#ffefef', color: T.danger,
            fontSize: 22, fontWeight: 600,
          }}
        >안내 종료</motion.button>
      </Shell>
    )
  }

  if (view === 'preview' && destination) {
    return (
      <Shell title="경로 미리보기" onBack={() => setView('home')}>
        <div style={{
          background: T.card, borderRadius: 20, padding: 24, marginBottom: 20,
          border: `1px solid ${T.divider}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <MapPin size={26} color={T.accentHi} />
            <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5 }}>{destination.name}</div>
          </div>
          <div style={{ fontSize: 18, color: T.faint }}>{destination.addr}</div>
        </div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 22 }}>
          {['추천', '최단', '무료'].map((label, i) => {
            const active = i === 0
            return (
              <div key={label} style={{
                flex: 1, padding: '20px 12px', borderRadius: 18, textAlign: 'center',
                background: active ? T.accent : T.card,
                color: active ? 'white' : T.text,
                border: `1px solid ${active ? T.accent : T.divider}`,
                boxShadow: active ? '0 6px 16px rgba(92,102,141,0.28)' : 'none',
              }}>
                <div style={{ fontSize: 16, opacity: 0.85, fontWeight: 500 }}>{label}</div>
                <div style={{ fontSize: 26, fontWeight: 700, marginTop: 6, letterSpacing: -0.5 }}>
                  {destination.eta + (i === 1 ? -2 : i === 2 ? 6 : 0)}분
                </div>
                <div style={{ fontSize: 14, opacity: 0.85, marginTop: 2 }}>
                  {(destination.km + (i === 1 ? -0.4 : i === 2 ? 1.8 : 0)).toFixed(1)} km
                </div>
              </div>
            )
          })}
        </div>
        <PrimaryButton onClick={() => setView('guiding')}>
          <NavIcon size={24} /> 안내 시작
        </PrimaryButton>
      </Shell>
    )
  }

  return (
    <Shell title="내비게이션" onBack={onClose}>
      <div style={{
        background: T.card, borderRadius: T.radiusChip, padding: '20px 26px',
        display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24,
        border: `1px solid ${T.divider}`, boxShadow: T.shadow,
      }}>
        <Search size={26} color={T.faint} />
        <input
          placeholder="어디로 갈까요?"
          style={{
            flex: 1, border: 'none', outline: 'none', fontSize: 22, background: 'transparent',
            color: T.text, fontFamily: 'inherit',
          }}
        />
      </div>
      <SectionLabel>최근 · 즐겨찾기</SectionLabel>
      {recents.map(r => (
        <ListItem
          key={r.id}
          leading={<div style={{ fontSize: 36, width: 56, textAlign: 'center' }}>{r.icon}</div>}
          title={r.name}
          subtitle={r.addr}
          trailing={`${r.eta}분`}
          onClick={() => { setDestination(r); setView('preview') }}
        />
      ))}
    </Shell>
  )
}

/* ============================================================
   Phone
   ============================================================ */

function PhoneApp({ onClose }) {
  const [tab, setTab] = useState('favorites')
  const [calling, setCalling] = useState(null)

  const favorites = [
    { id: 1, name: '엄마', detail: '010-1234-5678', initials: '엄', color: '#f59e0b' },
    { id: 2, name: '김민지', detail: '010-2222-3333', initials: '김', color: '#10b981' },
    { id: 3, name: '박사장님', detail: '010-9999-0001', initials: '박', color: '#6366f1' },
  ]
  const recents = [
    { id: 11, name: '엄마', when: '오늘 오전 9:12', dir: '발신', color: '#f59e0b', initials: '엄' },
    { id: 12, name: '02-555-0188', when: '어제 오후 6:40', dir: '부재중', color: '#9ca3af', initials: '?' },
    { id: 13, name: '이수현', when: '어제 오후 2:05', dir: '수신', color: '#ef4444', initials: '이' },
    { id: 14, name: '김민지', when: '월요일', dir: '발신', color: '#10b981', initials: '김' },
  ]

  if (calling) {
    return (
      <Shell title="통화 중" onBack={() => setCalling(null)}>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          paddingTop: 32, paddingBottom: 12,
        }}>
          <Avatar initials={calling.initials} color={calling.color} size={160} />
          <div style={{ fontSize: 34, fontWeight: 700, marginTop: 24, letterSpacing: -0.8 }}>{calling.name}</div>
          <div style={{ fontSize: 20, color: T.faint, marginTop: 8 }}>연결 중 · 00:08</div>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setCalling(null)}
            style={{
              marginTop: 64, width: 112, height: 112, borderRadius: '50%',
              background: T.danger, border: 'none', color: 'white', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 10px 24px rgba(213, 72, 72, 0.45)',
            }}
          ><PhoneOff size={44} /></motion.button>
        </div>
      </Shell>
    )
  }

  const list = tab === 'favorites' ? favorites : recents
  return (
    <Shell title="전화" onBack={onClose}>
      <div style={{
        display: 'flex', background: T.card, borderRadius: T.radiusChip, padding: 6, marginBottom: 22,
        border: `1px solid ${T.divider}`, boxShadow: T.shadow,
      }}>
        {[{ k: 'favorites', label: '즐겨찾기' }, { k: 'recents', label: '최근 통화' }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k)} style={{
            flex: 1, padding: '16px 0', border: 'none', cursor: 'pointer',
            background: tab === t.k ? T.accent : 'transparent',
            color: tab === t.k ? 'white' : T.text,
            borderRadius: T.radiusChip, fontSize: 20, fontWeight: 600,
            transition: 'background 0.2s, color 0.2s',
          }}>{t.label}</button>
        ))}
      </div>
      {list.map(item => (
        <ListItem
          key={item.id}
          leading={<Avatar initials={item.initials} color={item.color} />}
          title={item.name}
          subtitle={item.detail || `${item.when} · ${item.dir}`}
          trailing={tab === 'favorites'
            ? <Star size={24} fill={T.accent} stroke={T.accent} />
            : <PhoneIcon size={24} color={T.accent} />}
          onClick={() => setCalling(item)}
        />
      ))}
    </Shell>
  )
}

/* ============================================================
   Music
   ============================================================ */

function MusicApp({ onClose }) {
  const [playing, setPlaying] = useState(true)
  const [trackIdx, setTrackIdx] = useState(0)
  const [liked, setLiked] = useState(false)

  const queue = [
    { title: 'Drive', artist: 'The Cars', album: 'Heartbeat City', dur: '3:55' },
    { title: '하루의 끝', artist: '오존', album: 'Calm', dur: '4:12' },
    { title: 'Sunset Boulevard', artist: 'Lo-Fi Lab', album: 'Cruising', dur: '3:34' },
    { title: '봄이 오는 길', artist: '김다영', album: 'Spring', dur: '3:18' },
    { title: 'Night Run', artist: 'Synthwave Crew', album: 'Neon', dur: '4:48' },
  ]
  const cur = queue[trackIdx]
  const next = () => { setTrackIdx(i => (i + 1) % queue.length); setLiked(false) }
  const prev = () => { setTrackIdx(i => (i - 1 + queue.length) % queue.length); setLiked(false) }

  return (
    <Shell title="음악" onBack={onClose}>
      <div style={{
        background: 'linear-gradient(135deg, #5ba3d9 0%, #8b5cf6 100%)',
        borderRadius: T.radiusCard, aspectRatio: '1', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 24, color: 'white', fontSize: 110, fontWeight: 800,
        boxShadow: '0 10px 30px rgba(91, 163, 217, 0.32)',
      }}>♪</div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 18, gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 28, fontWeight: 700, letterSpacing: -0.6,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{cur.title}</div>
          <div style={{ fontSize: 18, color: T.faint, marginTop: 4, fontWeight: 500 }}>{cur.artist} · {cur.album}</div>
        </div>
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => setLiked(v => !v)}
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 6 }}
        >
          <Heart size={32} fill={liked ? T.danger : 'none'} color={liked ? T.danger : T.faint} />
        </motion.button>
      </div>
      <div style={{ height: 6, background: T.divider, borderRadius: 3, marginBottom: 8, position: 'relative' }}>
        <div style={{ width: '38%', height: '100%', background: T.accent, borderRadius: 3 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: T.faint, marginBottom: 24, fontWeight: 500 }}>
        <span>1:28</span><span>{cur.dur}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 36, marginBottom: 30 }}>
        <motion.button whileTap={{ scale: 0.9 }} onClick={prev} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 8, color: T.text }}>
          <SkipBack size={38} />
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => setPlaying(p => !p)}
          style={{
            width: 88, height: 88, borderRadius: '50%', background: T.accent,
            border: 'none', cursor: 'pointer', color: 'white',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 22px rgba(92,102,141,0.4)',
          }}
        >
          {playing ? <Pause size={38} fill="white" /> : <Play size={38} fill="white" />}
        </motion.button>
        <motion.button whileTap={{ scale: 0.9 }} onClick={next} style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: 8, color: T.text }}>
          <SkipForward size={38} />
        </motion.button>
      </div>
      <SectionLabel>다음 곡</SectionLabel>
      {queue.map((t, i) => i !== trackIdx && (
        <ListItem
          key={i}
          title={t.title}
          subtitle={t.artist}
          trailing={t.dur}
          onClick={() => { setTrackIdx(i); setPlaying(true); setLiked(false) }}
        />
      ))}
    </Shell>
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
        <div style={{ fontSize: 26, fontWeight: 700, marginBottom: 16, letterSpacing: -0.6, lineHeight: 1.3 }}>
          {open.subject}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 22 }}>
          <Avatar initials={open.from[0]} color="#6366f1" />
          <div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>{open.from}</div>
            <div style={{ fontSize: 16, color: T.faint, marginTop: 2 }}>{open.time}</div>
          </div>
        </div>
        <div style={{
          background: T.card, borderRadius: 20, padding: 24,
          border: `1px solid ${T.divider}`, fontSize: 19, lineHeight: 1.65,
          whiteSpace: 'pre-wrap', color: T.text,
        }}>{open.body}</div>
      </Shell>
    )
  }

  return (
    <Shell title="메일" onBack={onClose}>
      <SectionLabel>받은 편지함 · {mails.filter(m => m.unread).length}개 안 읽음</SectionLabel>
      {mails.map(m => (
        <ListItem
          key={m.id}
          leading={
            <div style={{
              width: 12, height: 12, borderRadius: '50%',
              background: m.unread ? T.accentHi : 'transparent',
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
          background: T.card, borderRadius: 20, padding: 24,
          border: `1px solid ${T.divider}`, boxShadow: T.shadow,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18 }}>
            <div style={{ width: 14, height: 38, borderRadius: 4, background: open.color }} />
            <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: -0.6 }}>{open.title}</div>
          </div>
          <Detail icon={<Clock size={22} />} label={open.when} />
          <Detail icon={<MapPin size={22} />} label={open.where} />
          <div style={{
            borderTop: `1px solid ${T.divider}`, marginTop: 18, paddingTop: 18,
            fontSize: 19, lineHeight: 1.65, color: T.text,
          }}>{open.notes}</div>
        </div>
      </Shell>
    )
  }

  const today_ = events.filter(e => e.group === 'today')
  const upcoming = events.filter(e => e.group === 'upcoming')

  return (
    <Shell title="일정" onBack={onClose}>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 16, color: T.faint, fontWeight: 500 }}>오늘</div>
        <div style={{ fontSize: 26, fontWeight: 700, marginTop: 4, letterSpacing: -0.6 }}>{ymd}</div>
      </div>
      <SectionLabel>오늘 일정</SectionLabel>
      {today_.map(e => (
        <ListItem
          key={e.id}
          leading={<div style={{ width: 6, height: 52, background: e.color, borderRadius: 3 }} />}
          title={e.title}
          subtitle={`${e.when.replace('오늘 ', '')} · ${e.where}`}
          onClick={() => setOpenId(e.id)}
        />
      ))}
      <SectionLabel style={{ marginTop: 22 }}>다가오는 일정</SectionLabel>
      {upcoming.map(e => (
        <ListItem
          key={e.id}
          leading={<div style={{ width: 6, height: 52, background: e.color, borderRadius: 3 }} />}
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
      display: 'flex', alignItems: 'center', gap: 12,
      color: T.faint, marginBottom: 10, fontSize: 19, fontWeight: 500,
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
