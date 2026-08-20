// astro.js — 태양 황경 / 삭(신월) / 절기 / 음양력 변환
// Meeus, Astronomical Algorithms 기반

import { apparentSunLongitude } from './vsop.js';

const RAD = Math.PI / 180;
const sin = (d) => Math.sin(d * RAD);
const mod360 = (x) => ((x % 360) + 360) % 360;

export function gregToJD(y, m, d) {
  // d 는 소수 가능. 결과는 JD (UT)
  if (m <= 2) { y -= 1; m += 12; }
  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
}

export function jdToGreg(jd) {
  const z = Math.floor(jd + 0.5);
  const f = jd + 0.5 - z;
  let A = z;
  if (z >= 2299161) {
    const alpha = Math.floor((z - 1867216.25) / 36524.25);
    A = z + 1 + alpha - Math.floor(alpha / 4);
  }
  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);
  const dayF = B - D - Math.floor(30.6001 * E) + f;
  const month = E < 14 ? E - 1 : E - 13;
  const year = month > 2 ? C - 4716 : C - 4715;
  const day = Math.floor(dayF);
  return { y: year, m: month, d: day, frac: dayF - day };
}

// ΔT (초) — Espenak & Meeus 다항식
export function deltaT(y) {
  let t;
  if (y < 1600) { t = (y - 1820) / 100; return -20 + 32 * t * t; }
  if (y < 1700) { t = y - 1600; return 120 - 0.9808 * t - 0.01532 * t * t + t ** 3 / 7129; }
  if (y < 1800) { t = y - 1700; return 8.83 + 0.1603 * t - 0.0059285 * t * t + 0.00013336 * t ** 3 - t ** 4 / 1174000; }
  if (y < 1860) {
    t = y - 1800;
    return 13.72 - 0.332447 * t + 0.0068612 * t * t + 0.0041116 * t ** 3 - 0.00037436 * t ** 4
      + 0.0000121272 * t ** 5 - 0.0000001699 * t ** 6 + 0.000000000875 * t ** 7;
  }
  if (y < 1900) { t = y - 1860; return 7.62 + 0.5737 * t - 0.251754 * t * t + 0.01680668 * t ** 3 - 0.0004473624 * t ** 4 + t ** 5 / 233174; }
  if (y < 1920) { t = y - 1900; return -2.79 + 1.494119 * t - 0.0598939 * t * t + 0.0061966 * t ** 3 - 0.000197 * t ** 4; }
  if (y < 1941) { t = y - 1920; return 21.20 + 0.84493 * t - 0.076100 * t * t + 0.0020936 * t ** 3; }
  if (y < 1961) { t = y - 1950; return 29.07 + 0.407 * t - t * t / 233 + t ** 3 / 2547; }
  if (y < 1986) { t = y - 1975; return 45.45 + 1.067 * t - t * t / 260 - t ** 3 / 718; }
  if (y < 2005) { t = y - 2000; return 63.86 + 0.3345 * t - 0.060374 * t * t + 0.0017275 * t ** 3 + 0.000651814 * t ** 4 + 0.00002373599 * t ** 5; }
  if (y < 2050) { t = y - 2000; return 62.92 + 0.32217 * t + 0.005589 * t * t; }
  if (y < 2150) { return -20 + 32 * ((y - 1820) / 100) ** 2 - 0.5628 * (2150 - y); }
  t = (y - 1820) / 100; return -20 + 32 * t * t;
}

function jdYear(jd) { return 2000 + (jd - 2451545.0) / 365.2425; }

// 태양 겉보기 황경 (도). jde 는 TT 기준 JD
export const sunLongitude = apparentSunLongitude;

// UT 기준 JD 로 태양 황경
export function sunLongitudeUT(jdUT) {
  return sunLongitude(jdUT + deltaT(jdYear(jdUT)) / 86400);
}

// 24절기 황경 (양력 1월부터 순서: 소한 ... 동지)
export const TERM_LONGS = [285, 300, 315, 330, 345, 0, 15, 30, 45, 60, 75, 90,
  105, 120, 135, 150, 165, 180, 195, 210, 225, 240, 255, 270];
export const TERM_NAMES = ['소한', '대한', '입춘', '우수', '경칩', '춘분', '청명', '곡우', '입하', '소만', '망종', '하지',
  '소서', '대서', '입추', '처서', '백로', '추분', '한로', '상강', '입동', '소설', '대설', '동지'];

// year 의 k 번째 절기 시각 (JD, UT)
export function termJD(year, k) {
  const L = TERM_LONGS[k];
  let jde = gregToJD(year, 1, 5.5) + k * 15.21843;
  for (let i = 0; i < 12; i++) {
    const cur = sunLongitude(jde);
    const diff = mod360(L - cur + 180) - 180;
    if (Math.abs(diff) < 1e-9) break;
    jde += diff * 1.014569;
  }
  return jde - deltaT(year) / 86400;
}

// 삭(new moon) 시각. k 는 정수 (k=0 → 2000-01-06). 반환 JD(UT)
export function newMoonJD(k) {
  const T = k / 1236.85;
  let jde = 2451550.09766 + 29.530588861 * k + 0.00015437 * T * T
    - 0.000000150 * T ** 3 + 0.00000000073 * T ** 4;
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;
  const M = 2.5534 + 29.10535670 * k - 0.0000014 * T * T - 0.00000011 * T ** 3;
  const Mp = 201.5643 + 385.81693528 * k + 0.0107582 * T * T + 0.00001238 * T ** 3 - 0.000000058 * T ** 4;
  const F = 160.7108 + 390.67050284 * k - 0.0016118 * T * T - 0.00000227 * T ** 3 + 0.000000011 * T ** 4;
  const Om = 124.7746 - 1.56375588 * k + 0.0020672 * T * T + 0.00000215 * T ** 3;
  let c = 0;
  c += -0.40720 * sin(Mp);
  c += 0.17241 * E * sin(M);
  c += 0.01608 * sin(2 * Mp);
  c += 0.01039 * sin(2 * F);
  c += 0.00739 * E * sin(Mp - M);
  c += -0.00514 * E * sin(Mp + M);
  c += 0.00208 * E * E * sin(2 * M);
  c += -0.00111 * sin(Mp - 2 * F);
  c += -0.00057 * sin(Mp + 2 * F);
  c += 0.00056 * E * sin(2 * Mp + M);
  c += -0.00042 * sin(3 * Mp);
  c += 0.00042 * E * sin(M + 2 * F);
  c += 0.00038 * E * sin(M - 2 * F);
  c += -0.00024 * E * sin(2 * Mp - M);
  c += -0.00017 * sin(Om);
  c += -0.00007 * sin(Mp + 2 * M);
  c += 0.00004 * sin(2 * Mp - 2 * F);
  c += 0.00004 * sin(3 * M);
  c += 0.00003 * sin(Mp + M - 2 * F);
  c += 0.00003 * sin(2 * Mp + 2 * F);
  c += -0.00003 * sin(Mp + M + 2 * F);
  c += 0.00003 * sin(Mp - M + 2 * F);
  c += -0.00002 * sin(Mp - M - 2 * F);
  c += -0.00002 * sin(3 * Mp + M);
  c += 0.00002 * sin(4 * Mp);
  jde += c;
  const A = [
    [299.77 + 0.107408 * k - 0.009173 * T * T, 0.000325],
    [251.88 + 0.016321 * k, 0.000165],
    [251.83 + 26.651886 * k, 0.000164],
    [349.42 + 36.412478 * k, 0.000126],
    [84.66 + 18.206239 * k, 0.000110],
    [141.74 + 53.303771 * k, 0.000062],
    [207.14 + 2.453732 * k, 0.000060],
    [154.84 + 7.306860 * k, 0.000056],
    [34.52 + 27.261239 * k, 0.000047],
    [207.19 + 0.121824 * k, 0.000042],
    [291.34 + 1.844379 * k, 0.000040],
    [161.72 + 24.198154 * k, 0.000037],
    [239.56 + 25.513099 * k, 0.000035],
    [331.55 + 3.592518 * k, 0.000023],
  ];
  for (const [ang, amp] of A) jde += amp * sin(ang);
  return jde - deltaT(2000 + k / 12.3685) / 86400;
}

export const KST = 9; // 음양력 계산 기준 시간대 (한국천문연구원 기준)

// JD(UT) → 현지 날짜 일련번호(정수). 같은 현지 날짜면 같은 값
export function localDay(jdUT, tz = KST) {
  return Math.floor(jdUT + 0.5 + tz / 24);
}
export function dayToGreg(dayNum) {
  return jdToGreg(dayNum); // dayNum 은 그 날 12시 UT 근처의 JD 정수와 동일
}

function nmIndexNear(jd) {
  return Math.floor((jd - 2451550.09766) / 29.530588861);
}
function newMoonOnOrBefore(jd) {
  let k = nmIndexNear(jd) + 2;
  while (localDay(newMoonJD(k)) > localDay(jd)) k--;
  return k;
}

const lunarCache = new Map();

/**
 * 음력 달 테이블 생성.
 * 반환: [{num, leap, startDay}] — (lunarYear-1)년 11월 ~ lunarYear년 10월
 */
export function buildLunarMonths(lunarYear) {
  if (lunarCache.has(lunarYear)) return lunarCache.get(lunarYear);
  const ws1 = termJD(lunarYear - 1, 23); // 전년 동지
  const ws2 = termJD(lunarYear, 23);     // 당년 동지
  const k1 = newMoonOnOrBefore(ws1);
  const k2 = newMoonOnOrBefore(ws2);
  const n = k2 - k1; // 12 또는 13
  const starts = [];
  for (let i = 0; i <= n; i++) starts.push(localDay(newMoonJD(k1 + i)));

  // 중기(황경 30배수) 날짜 모음
  const majors = [];
  for (const yy of [lunarYear - 1, lunarYear, lunarYear + 1]) {
    for (let k = 1; k < 24; k += 2) majors.push(localDay(termJD(yy, k)));
  }

  let leapOff = -1;
  if (n === 13) {
    for (let i = 1; i < n; i++) {
      const s = starts[i], e = starts[i + 1] - 1;
      const has = majors.some((d) => d >= s && d <= e);
      if (!has) { leapOff = i; break; }
    }
    if (leapOff < 0) leapOff = n - 1;
  }

  const months = [];
  let num = 11;
  for (let i = 0; i < n; i++) {
    if (i === leapOff) {
      months.push({ num: months[months.length - 1].num, leap: true, startDay: starts[i], endDay: starts[i + 1] - 1 });
    } else {
      months.push({ num, leap: false, startDay: starts[i], endDay: starts[i + 1] - 1 });
      num = num === 12 ? 1 : num + 1;
    }
  }
  lunarCache.set(lunarYear, months);
  return months;
}

/** 음력 → 양력. 실패 시 null */
export function lunarToSolar(ly, lm, ld, leap = false) {
  const table = lm >= 11 ? buildLunarMonths(ly + 1) : buildLunarMonths(ly);
  const found = table.find((x) => x.num === lm && x.leap === !!leap);
  if (!found) return null;
  const len = found.endDay - found.startDay + 1;
  if (ld < 1 || ld > len) return null;
  const g = jdToGreg(found.startDay + (ld - 1));
  return { y: g.y, m: g.m, d: g.d };
}

/** 양력 → 음력 */
export function solarToLunar(y, m, d) {
  const day = localDay(gregToJD(y, m, d + 0.5) - KST / 24);
  for (const ly of [y, y + 1]) {
    const table = buildLunarMonths(ly);
    for (const mo of table) {
      if (day >= mo.startDay && day <= mo.endDay) {
        // 연도 판정: 11·12월은 ly-1 소속(테이블 앞부분)
        let year = ly;
        const idx = table.indexOf(mo);
        const firstJan = table.findIndex((x) => x.num === 1 && !x.leap);
        if (idx < firstJan) year = ly - 1;
        return { y: year, m: mo.num, d: day - mo.startDay + 1, leap: mo.leap };
      }
    }
  }
  return null;
}

/** 음력 달의 일수 */
export function lunarMonthLength(ly, lm, leap = false) {
  const table = lm >= 11 ? buildLunarMonths(ly + 1) : buildLunarMonths(ly);
  const found = table.find((x) => x.num === lm && x.leap === !!leap);
  return found ? found.endDay - found.startDay + 1 : 0;
}

/** 해당 음력 연도의 윤달 번호 (없으면 0) */
export function leapMonthOf(ly) {
  const a = buildLunarMonths(ly).find((x) => x.leap && x.num <= 10);
  if (a) return a.num;
  const b = buildLunarMonths(ly + 1).find((x) => x.leap && x.num >= 11);
  return b ? b.num : 0;
}
