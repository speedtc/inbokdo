// saju.js — 사주(四柱) 산출 + 오행/십신/신살 판정
import {
  gregToJD, jdToGreg, localDay, sunLongitudeUT, termJD,
  lunarToSolar, solarToLunar, KST,
} from './astro.js';

export const STEMS = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계'];
export const STEMS_HAN = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
export const BRANCHES = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해'];
export const BRANCHES_HAN = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
export const ZODIAC = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지'];

// 오행: 0목 1화 2토 3금 4수
export const ELEMENTS = ['목', '화', '토', '금', '수'];
export const ELEMENT_HAN = ['木', '火', '土', '金', '水'];
const STEM_ELEM = [0, 0, 1, 1, 2, 2, 3, 3, 4, 4];
const STEM_YANG = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0];
const BRANCH_ELEM = [4, 2, 0, 0, 2, 1, 1, 2, 3, 3, 2, 4]; // 자수 축토 인목 묘목 진토 사화 오화 미토 신금 유금 술토 해수
const BRANCH_YANG = [1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0];

// 지장간 (본기 위주 가중치)
const HIDDEN = [
  [[9, 1.0]],                          // 자 - 계
  [[5, 0.6], [9, 0.2], [7, 0.2]],      // 축 - 기,계,신
  [[0, 0.6], [2, 0.2], [4, 0.2]],      // 인 - 갑,병,무
  [[1, 1.0]],                          // 묘 - 을
  [[4, 0.6], [1, 0.2], [9, 0.2]],      // 진 - 무,을,계
  [[2, 0.6], [4, 0.2], [6, 0.2]],      // 사 - 병,무,경
  [[3, 0.7], [5, 0.3]],                // 오 - 정,기
  [[5, 0.6], [3, 0.2], [1, 0.2]],      // 미 - 기,정,을
  [[6, 0.6], [8, 0.2], [4, 0.2]],      // 신 - 경,임,무
  [[7, 1.0]],                          // 유 - 신
  [[4, 0.6], [7, 0.2], [3, 0.2]],      // 술 - 무,신,정
  [[8, 0.7], [0, 0.3]],                // 해 - 임,갑
];

export function stemElem(s) { return STEM_ELEM[s]; }
export function branchElem(b) { return BRANCH_ELEM[b]; }

// 상생: e -> (e+1)%5 (목생화 화생토 토생금 금생수 수생목)
// 상극: e -> (e+2)%5 (목극토 화극금 토극수 금극목 수극화)
export const gen = (e) => (e + 1) % 5;
export const ctl = (e) => (e + 2) % 5;

// ---------- 한국 표준시 역사 ----------
const DST_RANGES = [
  ['1948-06-01', '1948-09-13'], ['1949-04-03', '1949-09-11'],
  ['1950-04-01', '1950-09-10'], ['1951-05-06', '1951-09-09'],
  ['1955-05-05', '1955-09-09'], ['1956-05-20', '1956-09-30'],
  ['1957-05-05', '1957-09-22'], ['1958-05-04', '1958-09-21'],
  ['1959-05-03', '1959-09-20'], ['1960-05-01', '1960-09-18'],
  ['1987-05-10', '1987-10-11'], ['1988-05-08', '1988-10-09'],
].map(([a, b]) => [a.replace(/-/g, ''), b.replace(/-/g, '')]);

/** 그 날짜에 실제로 시계가 가리키던 시간대 오프셋(시간 단위) */
export function koreaOffset(y, m, d) {
  const key = `${y}${String(m).padStart(2, '0')}${String(d).padStart(2, '0')}`;
  let base = 9;
  if (key < '19080401') base = 8.5;        // 편의상 LMT 대신 8.5 적용
  else if (key < '19120101') base = 8.5;
  else if (key < '19540321') base = 9;
  else if (key < '19610810') base = 8.5;
  else base = 9;
  for (const [a, b] of DST_RANGES) if (key >= a && key <= b) base += 1;
  return base;
}

const HOUR_BRANCH = (h) => (h === 23 ? 0 : Math.floor((h + 1) / 2));

/**
 * 사주 산출
 * @param {object} p
 *  y,m,d      : 생년월일 (lunar=true 이면 음력)
 *  hour,minute: 태어난 시각 (0-23). unknownTime 이면 무시
 *  unknownTime: 시간 모름
 *  lunar      : 음력 입력 여부
 *  leap       : 윤달 여부
 *  trueSolar  : 진태양시 보정(경도 127도 기준 -32분)
 */
export function computeSaju(p) {
  let { y, m, d } = p;
  const hour = p.unknownTime ? 12 : (p.hour ?? 12);
  const minute = p.unknownTime ? 0 : (p.minute ?? 0);

  let lunarInfo = null;
  if (p.lunar) {
    const s = lunarToSolar(y, m, d, !!p.leap);
    if (!s) throw new Error('존재하지 않는 음력 날짜입니다.');
    lunarInfo = { y, m, d, leap: !!p.leap };
    y = s.y; m = s.m; d = s.d;
  } else {
    lunarInfo = solarToLunar(y, m, d);
  }

  const tz = koreaOffset(y, m, d);

  // 진태양시 보정: 시계시각에서 32분을 뺀 "체감 시각"
  let clockH = hour, clockMin = minute;
  if (p.trueSolar && !p.unknownTime) {
    let t = hour * 60 + minute - 32;
    if (t < 0) t += 1440;
    clockH = Math.floor(t / 60); clockMin = t % 60;
  }

  // 출생 순간의 JD(UT)
  const jdUT = gregToJD(y, m, d + (hour * 60 + minute) / 1440) - tz / 24;

  // ---- 일주 ----
  // 야자시: 23시 이후는 다음 날 일진
  let dayNum = localDay(gregToJD(y, m, d + 0.5) - 9 / 24, KST);
  if (!p.unknownTime && clockH === 23) dayNum += 1;
  const dayGZ = ((dayNum + 49) % 60 + 60) % 60;

  // ---- 년주 / 월주 (절기 기준) ----
  const lam = sunLongitudeUT(jdUT);
  // 월지: 입춘(315도)부터 30도씩. 0=인
  const monthOff = Math.floor((((lam - 315) % 360) + 360) % 360 / 30);
  const monthBranch = (monthOff + 2) % 12;

  // 년: 입춘 이전이면 전년
  const ipchun = termJD(y, 2);
  let sajuYear = y;
  if (jdUT < ipchun) sajuYear = y - 1;
  const yearStem = ((sajuYear - 4) % 10 + 10) % 10;
  const yearBranch = ((sajuYear - 4) % 12 + 12) % 12;

  // 월간: 오호둔 — 갑기년 병인월두
  const monthStem = ((yearStem % 5) * 2 + 2 + monthOff) % 10;

  // ---- 시주 ----
  let hourBranch = null, hourStem = null;
  if (!p.unknownTime) {
    hourBranch = HOUR_BRANCH(clockH);
    const dayStem = dayGZ % 10;
    hourStem = ((dayStem % 5) * 2 + hourBranch) % 10; // 오자둔
  }

  const pillars = {
    year: { stem: yearStem, branch: yearBranch },
    month: { stem: monthStem, branch: monthBranch },
    day: { stem: dayGZ % 10, branch: dayGZ % 12 },
    hour: p.unknownTime ? null : { stem: hourStem, branch: hourBranch },
  };

  // ---- 오행 분포 ----
  const dist = [0, 0, 0, 0, 0];
  const addStem = (s, w) => { dist[STEM_ELEM[s]] += w; };
  const addBranch = (b, w) => {
    for (const [hs, hw] of HIDDEN[b]) dist[STEM_ELEM[hs]] += w * hw;
  };
  addStem(pillars.year.stem, 1.0); addBranch(pillars.year.branch, 1.0);
  addStem(pillars.month.stem, 1.4); addBranch(pillars.month.branch, 1.6);
  addStem(pillars.day.stem, 1.6); addBranch(pillars.day.branch, 1.4);
  if (pillars.hour) { addStem(pillars.hour.stem, 1.0); addBranch(pillars.hour.branch, 1.0); }
  const total = dist.reduce((a, b) => a + b, 0);
  const distPct = dist.map((v) => Math.round((v / total) * 1000) / 10);

  const branches = [pillars.year.branch, pillars.month.branch, pillars.day.branch]
    .concat(pillars.hour ? [pillars.hour.branch] : []);
  const stems = [pillars.year.stem, pillars.month.stem, pillars.day.stem]
    .concat(pillars.hour ? [pillars.hour.stem] : []);

  return {
    solar: { y, m, d, hour: p.unknownTime ? null : hour, minute: p.unknownTime ? null : minute },
    lunar: lunarInfo,
    unknownTime: !!p.unknownTime,
    tz,
    pillars, stems, branches,
    dayStem: pillars.day.stem,
    dayBranch: pillars.day.branch,
    dist: distPct,
    strongest: distPct.indexOf(Math.max(...distPct)),
    weakest: distPct.indexOf(Math.min(...distPct)),
    zodiac: ZODIAC[pillars.year.branch],
  };
}

export function gzText(stem, branch) {
  return STEMS[stem] + BRANCHES[branch] + ` (${STEMS_HAN[stem]}${BRANCHES_HAN[branch]})`;
}

// ---------- 관계 판정 테이블 ----------
// 천을귀인: 일간 → 지지
export const CHEONEUL = {
  0: [1, 7], 4: [1, 7], 6: [1, 7],   // 갑 무 경 → 축 미
  1: [0, 8], 5: [0, 8],              // 을 기 → 자 신
  2: [11, 9], 3: [11, 9],            // 병 정 → 해 유
  7: [2, 6],                         // 신 → 인 오
  8: [5, 3], 9: [5, 3],              // 임 계 → 사 묘
};

export const YUKHAP = { 0: 1, 1: 0, 2: 11, 11: 2, 3: 10, 10: 3, 4: 9, 9: 4, 5: 8, 8: 5, 6: 7, 7: 6 };
export const SAMHAP = [[8, 0, 4], [11, 3, 7], [2, 6, 10], [5, 9, 1]]; // 수 목 화 금
export const SAMHAP_ELEM = [4, 0, 1, 3];
export const CHUNG = { 0: 6, 6: 0, 1: 7, 7: 1, 2: 8, 8: 2, 3: 9, 9: 3, 4: 10, 10: 4, 5: 11, 11: 5 };
export const HAE = { 0: 7, 7: 0, 1: 6, 6: 1, 2: 5, 5: 2, 3: 4, 4: 3, 8: 11, 11: 8, 9: 10, 10: 9 };
export const PA = { 0: 9, 9: 0, 3: 6, 6: 3, 4: 1, 1: 4, 10: 7, 7: 10, 2: 11, 11: 2, 5: 8, 8: 5 };
const HYEONG3 = [[2, 5, 8], [1, 10, 7]];
const HYEONG_SELF = [4, 6, 9, 11];

// 천간합 / 천간충
export const GAN_HAP = { 0: 5, 5: 0, 1: 6, 6: 1, 2: 7, 7: 2, 3: 8, 8: 3, 4: 9, 9: 4 };
export const GAN_HAP_ELEM = { '0-5': 2, '1-6': 3, '2-7': 4, '3-8': 0, '4-9': 1 };
export const GAN_CHUNG = { 0: 6, 6: 0, 1: 7, 7: 1, 2: 8, 8: 2, 3: 9, 9: 3 };

export const SIPSIN = ['비견', '겁재', '식신', '상관', '편재', '정재', '편관', '정관', '편인', '정인'];

/** 나(me)의 일간 기준, 상대 천간의 십신 */
/**
 * 원국 전체의 십신 비중(%) — 지장간까지 가중해서 센다.
 * 일간 자신은 제외한다(비견으로 세면 왜곡됨).
 * 반환: [비견, 겁재, 식신, 상관, 편재, 정재, 편관, 정관, 편인, 정인]
 */
export function sipsinTally(s) {
  const t = new Array(10).fill(0);
  const me = s.dayStem, P = s.pillars;
  const addStem = (st, w) => { t[sipsin(me, st)] += w; };
  const addBranch = (b, w) => { for (const [hs, hw] of HIDDEN[b]) t[sipsin(me, hs)] += w * hw; };
  addStem(P.year.stem, 1.0); addBranch(P.year.branch, 1.0);
  addStem(P.month.stem, 1.4); addBranch(P.month.branch, 1.6);
  addBranch(P.day.branch, 1.4);
  if (P.hour) { addStem(P.hour.stem, 1.0); addBranch(P.hour.branch, 1.0); }
  const total = t.reduce((a, b) => a + b, 0) || 1;
  return t.map((v) => Math.round((v / total) * 1000) / 10);
}

export function sipsin(meStem, otherStem) {
  const me = STEM_ELEM[meStem], ot = STEM_ELEM[otherStem];
  const same = STEM_YANG[meStem] === STEM_YANG[otherStem];
  if (ot === me) return same ? 0 : 1;
  if (ot === gen(me)) return same ? 2 : 3;      // 내가 생함
  if (ot === ctl(me)) return same ? 4 : 5;      // 내가 극함
  if (me === ctl(ot)) return same ? 6 : 7;      // 상대가 나를 극함
  if (me === gen(ot)) return same ? 8 : 9;      // 상대가 나를 생함
  return 0;
}

export function branchRelation(a, b) {
  const r = [];
  if (YUKHAP[a] === b) r.push({ k: 'yukhap', label: '육합', w: 12 });
  for (let i = 0; i < 4; i++) {
    const s = SAMHAP[i];
    if (s.includes(a) && s.includes(b) && a !== b) r.push({ k: 'samhap', label: '삼합', w: 10, elem: SAMHAP_ELEM[i] });
  }
  if (CHUNG[a] === b) r.push({ k: 'chung', label: '충', w: -11 });
  for (const h of HYEONG3) if (h.includes(a) && h.includes(b) && a !== b) r.push({ k: 'hyeong', label: '형', w: -8 });
  if (a === b && HYEONG_SELF.includes(a)) r.push({ k: 'jahyeong', label: '자형', w: -5 });
  if (HAE[a] === b) r.push({ k: 'hae', label: '해', w: -6 });
  if (PA[a] === b) r.push({ k: 'pa', label: '파', w: -4 });
  if (a === b && !HYEONG_SELF.includes(a)) r.push({ k: 'same', label: '같은 지지', w: 4 });
  return r;
}

export { gregToJD, jdToGreg, solarToLunar, lunarToSolar };
