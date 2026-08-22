// topics.js — 분야별 지도 레지스트리
//
// 방(room) 하나가 어떤 주제를 다루는지는 여기서만 정의한다.
// 새 분야를 붙이려면 엔진 파일 하나 만들고 이 표에 한 줄 넣으면 끝이다.

import { wealthScore, WAXES, WAXIS_ORDER, WRINGS, wealthBand } from './wealth.js';
import * as love from './love.js';
import * as work from './work.js';

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
