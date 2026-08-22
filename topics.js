// topics.js — 분야별 지도 레지스트리
//
// 방(room) 하나가 어떤 주제를 다루는지는 여기서만 정의한다.
// 새 분야를 붙이려면 엔진 파일 하나 만들고 이 표에 한 줄 넣으면 끝이다.

import { wealthScore, WAXES, WAXIS_ORDER, WRINGS, wealthBand } from './wealth.js';
import * as love from './love.js';
import * as work from './work.js';
import {
  STEMS_HAN, BRANCHES_HAN, SIPSIN, sipsin, CHEONEUL, CHUNG, YUKHAP, SAMHAP,
} from './saju.js';

export const TOPICS = {
  wealth: {
    key: 'wealth',
    han: '財',
    center: '재물',
    label: '재물지도',
    path: '/wealth',
    tagline: '누가 돈그릇이 제일 큰 사람일까',
    lead: '가운데가 財, 안쪽에 있을수록 재물 그릇이 큰 사람입니다. 돈 액수는 묻지 않습니다.',
    listTitle: '재물 순위',
    listNote: '사주로 본 재물 그릇의 크기입니다. 지금 가진 돈이 아닙니다.',
    myLabel: '내가 돈을 버는 방식',
    shareLine: '우리 방 재물운 순위 뽑아볼래요?',
    shareTxt: '우리 방 재물운 순위 뽑아보자. 생일만 넣으면 사주로 나옴. 돈 액수는 안 물어봄',
    footer: '재물운은 타고난 그릇을 보는 것이지 지금 통장 잔고가 아닙니다. 투자 판단의 근거로 쓰지 마세요.',
    axes: WAXES, order: WAXIS_ORDER, rings: WRINGS,
    score: wealthScore, band: wealthBand,
    parts: [
      ['jae', '재성 (돈 자리)', '#d9b45b'],
      ['body', '일간의 힘', '#4ea87a'],
      ['sik', '식상 (만드는 힘)', '#e2734a'],
      ['gwan', '관성 (자리)', '#4f86c6'],
    ],
    partsNote: '재성이 두터워도 그걸 감당할 힘(일간)이 얇으면 돈이 오히려 나를 부립니다. 두 막대의 균형이 점수를 크게 좌우합니다.',
  },

  love: {
    key: 'love',
    han: '緣',
    center: '인연',
    label: '연애지도',
    path: '/love',
    tagline: '누구에게 인연이 먼저 올까',
    lead: '가운데가 緣, 안쪽에 있을수록 인연이 두터운 사람입니다. 애인 유무는 묻지 않습니다.',
    listTitle: '인연 순위',
    listNote: '사주로 본 인연의 두께입니다. 지금 연애 중인지와는 상관없습니다.',
    myLabel: '내가 사랑하는 방식',
    shareLine: '우리 방에서 누가 제일 인기 사주일까',
    shareTxt: '우리 방 연애운 순위 뽑아보자. 생일만 넣으면 사주로 나옴. 애인 있냐고 안 물어봄',
    footer: '연애운은 타고난 결을 보는 것이지 지금 연애 상태가 아닙니다. 사람을 고르는 기준으로 쓰지 마세요.',
    axes: love.AXES, order: love.ORDER, rings: love.RINGS,
    score: love.score, band: love.band,
    parts: [
      ['spouse', '배우자성 (인연)', '#e58fb0'],
      ['body', '나의 힘', '#4ea87a'],
      ['sik', '식상 (표현력)', '#e2734a'],
      ['hap', '지지의 합', '#4f86c6'],
    ],
    partsNote: '배우자성이 두터우면 인연이 여럿 스치고, 표현력(식상)이 있어야 그 마음이 밖으로 나옵니다. 합이 많으면 사람과 잘 엮입니다.',
  },

  work: {
    key: 'work',
    han: '業',
    center: '성취',
    label: '일운지도',
    path: '/work',
    tagline: '누가 크게 쓰일 사람일까',
    lead: '가운데가 業, 안쪽에 있을수록 크게 쓰이는 사주입니다. 직업이나 연봉은 묻지 않습니다.',
    listTitle: '성취 순위',
    listNote: '사주로 본 쓰임의 크기입니다. 지금 직급이나 연봉이 아닙니다.',
    myLabel: '내가 커가는 방식',
    shareLine: '우리 방에서 누가 제일 크게 될까',
    shareTxt: '우리 방 일운 순위 뽑아보자. 생일만 넣으면 사주로 나옴. 직업 안 물어봄',
    footer: '일운은 타고난 쓰임을 보는 것이지 지금 직급이 아닙니다. 채용이나 평가의 근거로 쓰지 마세요.',
    axes: work.AXES, order: work.ORDER, rings: work.RINGS,
    score: work.score, band: work.band,
    parts: [
      ['gwan', '관성 (자리)', '#4f86c6'],
      ['body', '밀고 갈 힘', '#4ea87a'],
      ['sik', '식상 (만드는 힘)', '#e2734a'],
      ['iny', '인성 (자격)', '#7ec9a2'],
    ],
    partsNote: '밀고 나갈 힘(일간)과 밖으로 쓰이는 자리(관성·식상)가 균형을 이룰 때 가장 크게 쓰입니다. 한쪽만 크면 힘이 새거나 눌립니다.',
  },
};

export const TOPIC_KEYS = Object.keys(TOPICS);
export function isTopic(k) { return Object.prototype.hasOwnProperty.call(TOPICS, k); }

/** 프런트에 내려보낼 UI 정보만 추린다 (점수 함수는 서버에만 둔다) */
export function topicsPayload() {
  const out = {};
  for (const k of TOPIC_KEYS) {
    const t = TOPICS[k];
    out[k] = {
      key: t.key, han: t.han, center: t.center, label: t.label, path: t.path,
      tagline: t.tagline, lead: t.lead,
      listTitle: t.listTitle, listNote: t.listNote, myLabel: t.myLabel,
      shareLine: t.shareLine, shareTxt: t.shareTxt, footer: t.footer,
      axes: t.axes, order: t.order, rings: t.rings,
      parts: t.parts, partsNote: t.partsNote,
    };
  }
  return out;
}

/* ══════════════════════════════════════════════
   분야별 지도 — 심화 (올해 흐름 · 실천 항목)
   ══════════════════════════════════════════════ */


/* 주제별 · 십신별 올해 한 줄 */
const YEAR_LINE = {
  wealth: [
    '내 힘으로 벌어야 하는 해입니다. 누가 대신 벌어주지 않습니다. 대신 벌면 온전히 내 것이 됩니다.',
    '나가는 돈이 눈에 띄게 늘어납니다. 보증·대여·즉흥 투자는 올해 가장 위험합니다.',
    '만들어서 파는 구조가 잘 돕니다. 새 상품, 새 서비스, 부업을 시작하기 좋은 해입니다.',
    '아이디어로 돈을 버는 해입니다. 다만 벌인 만큼 관리가 안 되면 새어 나갑니다.',
    '큰 기회가 여러 갈래로 들어옵니다. 다 잡으려 하면 하나도 못 잡습니다. 하나만 크게 가세요.',
    '수입이 안정되는 해입니다. 계약·정산·부동산처럼 문서로 남는 돈에 특히 좋습니다.',
    '돈이 압박으로 오는 해입니다. 대출과 세금 일정을 미리 정리해 두세요.',
    '정당한 몫이 들어오는 해입니다. 승진·연봉·공식 수입이 오르는 쪽입니다.',
    '돈보다 배움에 쓰이는 해입니다. 지금 쓴 비용이 나중에 수입이 됩니다.',
    '도움으로 들어오는 해입니다. 윗사람이나 문서를 통해 기회가 옵니다.',
  ],
  love: [
    '혼자 있는 시간이 늘어나는 해입니다. 나를 세우고 나면 사람이 붙습니다.',
    '경쟁이 생기는 해입니다. 관계에 제삼자가 끼기 쉬우니 표현을 분명히 하세요.',
    '마음이 편해지는 해입니다. 자연스럽게 만나고 자연스럽게 이어집니다.',
    '표현이 세지는 해입니다. 매력은 커지는데 말로 상처를 주기도 쉽습니다.',
    '만남이 많아지는 해입니다. 여러 인연이 스치니 고르는 눈이 중요합니다.',
    '안정된 인연이 붙는 해입니다. 혼담이나 약속이 오갈 수 있습니다.',
    '끌리는 힘이 강한 해입니다. 뜨거운 만큼 빠르게 식지 않게 속도를 조절하세요.',
    '관계가 공식화되는 해입니다. 소개·상견례·결혼 이야기가 나오기 좋습니다.',
    '생각이 많아지는 해입니다. 마음을 확인하는 데 시간이 걸립니다.',
    '보살핌을 받는 해입니다. 오래 곁에 있던 사람이 다시 보일 수 있습니다.',
  ],
  work: [
    '내 이름으로 서고 싶어지는 해입니다. 독립·이직 생각이 자주 듭니다.',
    '동료와 몫을 두고 부딪히는 해입니다. 역할을 문서로 정리해 두세요.',
    '만들어 낸 것이 인정받는 해입니다. 포트폴리오를 정리하기 좋습니다.',
    '판을 흔드는 해입니다. 새 시도가 통하지만 윗사람과 마찰이 잦습니다.',
    '실적으로 평가받는 해입니다. 숫자가 나오는 일에 집중하세요.',
    '꾸준함이 값을 하는 해입니다. 정산·계약·관리 업무에서 성과가 납니다.',
    '압박이 세게 들어오는 해입니다. 견디면 다음 자리가 열립니다.',
    '자리가 붙는 해입니다. 승진·자격·공식 임명에 가장 좋습니다.',
    '배우고 준비하는 해입니다. 자격증과 공부에 시간을 쓰세요.',
    '윗사람 덕이 있는 해입니다. 추천과 문서로 길이 열립니다.',
  ],
};

const ACTION = {
  wealth: {
    gotgan: ['들어오는 통로를 하나 더 만드세요. 이미 그릇은 충분합니다.', '버는 사람과 지키는 사람을 나누세요.', '큰 결정은 좋은 달에 맞추세요.'],
    doneun: ['회전이 빠른 쪽에 힘을 실으세요.', '벌린 판의 개수를 하나 줄이세요.', '세금과 현금 흐름을 월 단위로 보세요.'],
    ssuneun: ['고정 지출을 항목별로 한 번 정리하세요.', '수입 주기를 하나 더 만드세요.', '큰돈이 오가는 일은 문서로 남기세요.'],
    saram: ['혼자 벌기보다 사람을 붙이세요.', '동업 조건은 시작 전에 정하세요.', '보증과 대여는 피하세요.'],
    ssiat: ['지금은 실력과 사람을 쌓을 때입니다.', '본업을 두껍게 하세요.', '무리한 투자보다 저축 습관을 만드세요.'],
  },
  love: {
    gipeun: ['먼저 자리를 만드세요. 기다리지 않아도 됩니다.', '조건을 처음부터 좁혀두세요.', '고마운 마음은 말로 꺼내세요.'],
    sunhwan: ['소개와 모임을 마다하지 마세요.', '두 번째 만남까지는 판단을 미루세요.', '연락 주기를 일정하게 유지하세요.'],
    bogotong: ['시간을 두고 알아가는 방식이 맞습니다.', '같이 하는 활동에서 인연이 생깁니다.', '조급함이 가장 큰 적입니다.'],
    honja: ['혼자 있는 시간을 죄책감 없이 쓰세요.', '결이 맞는 한 사람이면 충분합니다.', '나를 설명하는 연습을 하세요.'],
    jaram: ['지금은 나를 세우는 시기입니다.', '취미나 배움에서 사람을 만나세요.', '외모보다 생활 리듬을 정돈하세요.'],
  },
  work: {
    jeongsang: ['자리를 맡으라고 하면 받으세요.', '팀을 만들고 권한을 나누세요.', '건강 관리가 성패를 가릅니다.'],
    oreum: ['방향을 한 번 정하고 3년은 밀어보세요.', '기록으로 남기는 습관을 만드세요.', '평가받을 수 있는 지표를 만드세요.'],
    dajim: ['한 곳에서 오래 버티는 것이 무기입니다.', '자격이나 기술 하나를 내 것으로 만드세요.', '옮길 때마다 한 가지는 챙겨 나오세요.'],
    jaebae: ['남의 기준을 버리고 내 것을 좁히세요.', '잘하는 한 가지에 시간을 몰아주세요.', '비교를 줄이면 속도가 붙습니다.'],
    junbi: ['지금 익힌 것이 다음 자리에서 값을 합니다.', '작게라도 결과물을 만들어 두세요.', '사람을 만나는 자리를 유지하세요.'],
  },
};

const YSC = [4, -6, 9, 2, 7, 9, -6, 7, 0, 9];

/** 그 해 이 분야의 흐름 */
export function topicYear(s, topicKey, year) {
  const me = s.dayStem;
  const st = ((year - 4) % 10 + 10) % 10;
  const br = ((year - 4) % 12 + 12) % 12;
  const sinIdx = sipsin(me, st);
  let sc = 52 + YSC[sinIdx];
  const tags = [];
  if (CHUNG[s.dayBranch] === br) { sc -= 8; tags.push('일지충'); }
  if (YUKHAP[s.dayBranch] === br) { sc += 7; tags.push('육합'); }
  for (const g of SAMHAP) if (g.includes(s.dayBranch) && g.includes(br)) { sc += 5; tags.push('삼합'); break; }
  if ((CHEONEUL[me] || []).includes(br)) { sc += 9; tags.push('천을귀인'); }
  const lines = YEAR_LINE[topicKey] || YEAR_LINE.wealth;
  return {
    year, gz: STEMS_HAN[st] + BRANCHES_HAN[br], sipsin: SIPSIN[sinIdx],
    score: Math.max(15, Math.min(96, Math.round(sc))),
    text: lines[sinIdx], tags,
  };
}

/** 밴드별 실천 항목 3가지 */
export function topicActions(topicKey, band) {
  const m = ACTION[topicKey] || ACTION.wealth;
  return m[band] || Object.values(m)[0];
}
