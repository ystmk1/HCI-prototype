// 시뮬레이터 시나리오의 화면 메인 텍스트 시퀀스. drive.md 원본 + Figma 286:2120
// 디자인 패턴(핵심 동작/수치 Bold 강조) 기반.
//
// 시나리오마다 페이즈 개수가 다름:
//   • frustration_roundabout_loop (C1, Alt+Q): 13 페이즈
//   • anxiety_hydroplaning       (C2, Alt+W): 6 페이즈
//
// 시뮬 진행에 맞춰 오퍼레이터가 HMI에서 Ctrl+← / Ctrl+→ 로 페이즈 이동.
// (또는 오퍼레이터 콘솔의 페이즈 패널에서 직접 클릭.) Gemini 응답 지연이 없도록
// 화면 판단 메시지는 모두 코드 스크립트로 박혀 있음 — Gemini는 채팅 추가 응답만 담당.
//
// 각 페이즈:
//   • status   — 좌상단 알림 필 { tone: 'normal'|'warning', text }
//   • judgment — 히어로 영역 2줄 타이핑 메시지. `**...**` 구간은 Bold로 렌더.
//   • prompt   — Gemini systemInstruction 맨 끝에 한 줄로 부착 (모델 컨텍스트)

// drive.md 명시 — 4가지 상태 문구. 정상은 normal 톤, 나머지 3개는 warning.
const STATUS_OK     = { tone: 'normal',  text: '정상 주행 중입니다' }
const STATUS_DETECT = { tone: 'warning', text: '오류가 감지되었습니다' }
const STATUS_CAUSE  = { tone: 'warning', text: '오류 원인을 파악 중입니다' }
const STATUS_RESOLVE = { tone: 'warning', text: '오류를 해결 중입니다' }

const C1_PHASES = [
  {
    status: STATUS_OK,
    judgment: [
      '**회전교차로**에 진입했습니다.',
      '곧 **합류를 시도**합니다.',
    ],
  },
  {
    status: STATUS_OK,
    judgment: [
      '앞 차량이 멈춰 **합류 간격을 탐색** 중입니다.',
      '**약 N초 내 진입**할 것으로 예상됩니다.',
    ],
  },
  {
    status: STATUS_DETECT,
    judgment: [
      '대기 시간이 **비정상적으로 길어지고** 있습니다.',
      '**정상 대기 범위를 초과**해 상황을 재분석합니다.',
    ],
  },
  {
    status: STATUS_CAUSE,
    judgment: [
      '앞 차량이 **정차가 아닌 주차**로 확인되었습니다.',
      '**합류 대기로는 통과가 불가능**합니다.',
    ],
  },
  {
    status: STATUS_RESOLVE,
    judgment: [
      '**우회 경로**로 전환합니다.',
      '**약 N초 후 정상 주행**으로 복귀할 예정입니다.',
    ],
  },
  {
    status: STATUS_OK,
    judgment: [
      '**회전교차로**에 진입했습니다.',
      '**목표 출구**로 진출할 예정입니다.',
    ],
  },
  {
    status: STATUS_OK,
    judgment: [
      '**출구 진출**을 시도합니다.',
      '**진입 각**을 확보하는 중입니다.',
    ],
  },
  {
    status: STATUS_OK,
    judgment: [
      '출구 진입에 실패해 **한 바퀴 더 회전**합니다.',
      '**다음 진출 기회**를 탐색합니다.',
    ],
  },
  {
    status: STATUS_OK,
    judgment: [
      '진출에 다시 실패해 **또 한 바퀴 회전**합니다.',
      '**진입 가능 구간**을 재탐색합니다.',
    ],
  },
  {
    status: STATUS_DETECT,
    judgment: [
      '**비정상적으로 여러 바퀴**를 회전하고 있습니다.',
      '**정상 진출 범위를 초과**했습니다.',
    ],
  },
  {
    status: STATUS_CAUSE,
    judgment: [
      '출구의 **주차 차량이 진입 각을 막고** 있습니다.',
      '**앞 차량을 정차로 오판**한 것이 원인입니다.',
    ],
  },
  {
    status: STATUS_RESOLVE,
    judgment: [
      '한 바퀴 돌아 **목표 출구로 진출**합니다.',
      '**약 N초 후 진출** 예정입니다.',
    ],
  },
  {
    status: STATUS_OK,
    judgment: [
      '**출구 탈출에 성공**했습니다.',
      '**정상 주행**을 재개합니다.',
    ],
  },
]

// C2: drive.md에 status 명시는 없지만 동일 패턴(감지→원인 파악→해결 중→정상)을 적용.
// 3=요동/접지력 저하 = 감지, 4=물웅덩이 미감지 원인 파악, 5=속도 저감 해결중, 6=정상 복귀.
const C2_PHASES = [
  {
    status: STATUS_OK,
    judgment: [
      '빗길을 **정상 주행** 중입니다.',
      '**전방 경로**를 따라 주행합니다.',
    ],
  },
  {
    status: STATUS_OK,
    judgment: [
      '**빗길 주행**을 계속합니다.',
      '**목적지까지 정상 운행** 중입니다.',
    ],
  },
  {
    status: STATUS_DETECT,
    judgment: [
      '**차량이 순간적으로 크게 요동**쳤습니다.',
      '**타이어 접지력이 급격히 저하**되었습니다.',
    ],
  },
  {
    status: STATUS_CAUSE,
    judgment: [
      '노면의 **물웅덩이를 감지하지 못**했습니다.',
      '이로 인해 **수막현상이 발생**했습니다.',
    ],
  },
  {
    status: STATUS_RESOLVE,
    judgment: [
      '**수막현상 재발 방지**를 위해 속도를 낮춥니다.',
      '**약 N초 후 정상 마찰 상태**로 복귀할 예정입니다.',
    ],
  },
  {
    status: STATUS_OK,
    judgment: [
      '**정상 마찰 상태**로 복귀했습니다.',
      '**정상 주행**을 재개합니다.',
    ],
  },
]

// Attach the `phase` index for UI labels (1-based) so callers don't need to
// derive it from array position.
function withIndex(arr) {
  return arr.map((p, i) => ({ phase: i + 1, ...p }))
}

export const DRIVE_PHASES_BY_SCENARIO = {
  frustration_roundabout_loop: withIndex(C1_PHASES),
  anxiety_hydroplaning:       withIndex(C2_PHASES),
}

export const PHASE_NONE = 0

// Default pill state when no phase is active (idle / pre-drive).
export const DEFAULT_STATUS = { tone: 'normal', text: '정상 주행 중입니다' }

export function getPhases(scenarioId) {
  return DRIVE_PHASES_BY_SCENARIO[scenarioId] ?? []
}

export function getPhaseCount(scenarioId) {
  return getPhases(scenarioId).length
}

export function getPhase(scenarioId, n) {
  const phases = getPhases(scenarioId)
  if (!Number.isInteger(n) || n < 1 || n > phases.length) return null
  return phases[n - 1]
}

// Strip the `**bold**` markers — used when a plain-text version of the
// judgment is needed (Gemini context, operator log preview, etc.).
export function stripMarkers(text) {
  return (text ?? '').replace(/\*\*/g, '')
}

// One-line phase context appended to Gemini's systemInstruction. Derived from
// the on-screen judgment text so the model's understanding always matches
// what the user is reading.
export function getPhasePrompt(scenarioId, n) {
  const p = getPhase(scenarioId, n)
  if (!p) return ''
  const total = getPhaseCount(scenarioId)
  const plain = p.judgment.map(stripMarkers).join(' ')
  return `[현재 주행 단계 ${p.phase}/${total} — 화면 판단 메시지: "${plain}". 모든 발화는 이 시점 맥락에서 해석.]`
}

// Parse `**bold**` segments out of a single line. Returns an array of
// { text, bold } chunks. Useful for typewriter rendering that needs to keep
// the bold/regular boundaries while characters are revealed one at a time.
export function parseBoldSegments(line) {
  const out = []
  const re = /\*\*([^*]+)\*\*/g
  let i = 0
  let m
  while ((m = re.exec(line)) !== null) {
    if (m.index > i) out.push({ text: line.slice(i, m.index), bold: false })
    out.push({ text: m[1], bold: true })
    i = m.index + m[0].length
  }
  if (i < line.length) out.push({ text: line.slice(i), bold: false })
  return out.length ? out : [{ text: '', bold: false }]
}
