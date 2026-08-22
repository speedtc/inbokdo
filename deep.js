// deep.js — 사주 심화 풀이
//
// 원국 여덟 글자에 대해
//   ① 십신 배치      ② 지장간       ③ 십이운성   ④ 공망
//   ⑤ 신강·신약      ⑥ 격국         ⑦ 용신(억부+조후)
//   ⑧ 신살           ⑨ 궁별 해석    ⑩ 대운 10년 흐름   ⑪ 올해 세운
// 까지 한 번에 뽑는다.
//
// 계산은 전통 방식 그대로 쓰고, 풀이 문장은 직접 썼다.

import {
  STEMS, STEMS_HAN, BRANCHES, BRANCHES_HAN, ELEMENTS, ELEMENT_HAN,
  SIPSIN, sipsin, sipsinTally, stemElem, branchElem, gen, ctl,
  STEM_YANG, HIDDEN, CHEONEUL, SAMHAP, CHUNG, YUKHAP,
} from './saju.js';
import { termJD } from './astro.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const r1 = (v) => Math.round(v * 10) / 10;

/* ══════════════ 표 ══════════════ */

/* 십이운성 — 양간 순행 / 음간 역행 */
export const UNSEONG = ['장생', '목욕', '관대', '건록', '제왕', '쇠', '병', '사', '묘', '절', '태', '양'];
const UNSEONG_HAN = ['長生', '沐浴', '冠帶', '建祿', '帝旺', '衰', '病', '死', '墓', '絶', '胎', '養'];
const JANGSAENG = [11, 6, 2, 9, 2, 9, 5, 0, 8, 3]; // 갑해 을오 병인 정유 무인 기유 경사 신자 임신 계묘
const UNSEONG_TXT = [
  ['새로 시작하는 자리', '기운이 막 태어나는 자리입니다. 순하고 사람이 잘 붙습니다. 다만 세게 밀어붙이는 힘은 약합니다.', 2],
  ['씻고 꾸미는 자리', '멋과 끼가 있는 자리입니다. 사람 눈에 잘 띄는 대신 마음이 자주 흔들립니다.', 0],
  ['옷을 갖춰 입는 자리', '스스로를 세우는 자리입니다. 자신감이 있고 고집도 같이 셉니다.', 2],
  ['제 밥그릇을 얻는 자리', '남에게 기대지 않고 제 몫을 챙기는 자리입니다. 자립하는 힘이 가장 분명합니다.', 3],
  ['가장 센 자리', '기운이 꼭대기에 오른 자리입니다. 앞에 서는 힘이 있고, 그만큼 굽히기를 싫어합니다.', 3],
  ['한 걸음 물러선 자리', '정점을 지나 차분해진 자리입니다. 무리하지 않고 지키는 쪽이 잘 맞습니다.', 1],
  ['예민해지는 자리', '기운이 약해진 자리입니다. 남의 사정을 잘 헤아리는 대신 몸이 먼저 지칩니다.', 0],
  ['멈추어 생각하는 자리', '움직임이 끊긴 자리입니다. 공부·연구·기술처럼 파고드는 일에서 오히려 강합니다.', 1],
  ['갈무리하는 자리', '거두어 넣는 자리입니다. 모으고 저장하는 데 능하고, 마무리를 잘 짓습니다.', 1],
  ['끊어지는 자리', '기운이 끊긴 자리입니다. 변화가 잦고 한 자리에 오래 머물기 어렵습니다.', 0],
  ['아이가 드는 자리', '아직 형태가 잡히지 않은 자리입니다. 생각이 많고 기대는 마음이 있습니다.', 1],
  ['길러지는 자리', '보살핌을 받는 자리입니다. 무던하고 오래 버팁니다. 큰 굴곡이 적습니다.', 2],
];

/* 신살 위치표 */
const MUNCHANG = [5, 6, 8, 9, 8, 9, 11, 0, 2, 3];              // 문창귀인 (일간)
const YANGIN = { 0: 3, 2: 6, 4: 6, 6: 9, 8: 0 };                 // 양인 (양간만)
const HONGYEOM = { 0: 6, 1: 6, 2: 2, 3: 7, 4: 4, 5: 4, 6: 10, 7: 9, 8: 0, 9: 8 };
const DOHWA_OF = [9, 0, 3, 6];   // SAMHAP 순서 [신자진, 해묘미, 인오술, 사유축]
const YEOKMA_OF = [2, 5, 8, 11];
const HWAGAE_OF = [4, 7, 10, 1];
const GOEGANG = [[6, 4], [6, 10], [8, 4], [4, 10]];              // 경진 경술 임진 무술
const BAEKHO = [[0, 4], [1, 7], [2, 10], [3, 1], [4, 4], [8, 10], [9, 1]];
const WOLDEOK = { 2: 2, 6: 2, 10: 2, 8: 8, 0: 8, 4: 8, 11: 0, 3: 0, 7: 0, 5: 6, 9: 6, 1: 6 };
const CHEONDEOK = { // 월지 → [천간] 또는 ['b', 지지]
  2: ['s', 3], 3: ['b', 8], 4: ['s', 8], 5: ['s', 7], 6: ['b', 11], 7: ['s', 0],
  8: ['s', 9], 9: ['b', 2], 10: ['s', 2], 11: ['s', 1], 0: ['b', 5], 1: ['s', 6],
};

function samhapGroup(b) {
  for (let i = 0; i < SAMHAP.length; i++) if (SAMHAP[i].includes(b)) return i;
  return -1;
}
function gzIndex(st, br) { for (let i = 0; i < 60; i++) if (i % 10 === st && i % 12 === br) return i; return 0; }

/* ══════════════ 십신 텍스트 ══════════════ */

const SIPSIN_INFO = [
  { n: '비견', h: '比肩', g: '비겁', c: '#9aa3b8',
    one: '나와 나란한 기운',
    much: '고집이 단단합니다. 남 밑에서 오래 견디기 어렵고, 내 이름 걸고 하는 일에서 힘이 납니다. 대신 같은 자리를 두고 겹치는 사람이 늘 생깁니다.',
    none: '남과 겨루는 일에 흥미가 적습니다. 혼자 밀어붙이기보다 사람을 끼고 가면 훨씬 수월합니다.' },
  { n: '겁재', h: '劫財', g: '비겁', c: '#8b93a8',
    one: '내 몫을 나눠 가는 기운',
    much: '추진력이 세지만 나가는 돈도 같이 셉니다. 동업과 보증에서 손실이 나기 쉽습니다. 돈 이야기는 문서로 남기세요.',
    none: '무리해서 판을 벌이지 않습니다. 큰 손실도 드문 편입니다.' },
  { n: '식신', h: '食神', g: '식상', c: '#e2a06a',
    one: '먹고 만들어 내는 기운',
    much: '표현이 자연스럽고 잘 먹고 잘 놉니다. 손으로 만들거나 말로 푸는 일에서 실력이 납니다. 다만 편해지면 늘어집니다.',
    none: '속마음이 밖으로 잘 안 나옵니다. 말로 한 번 꺼내는 연습이 필요합니다.' },
  { n: '상관', h: '傷官', g: '식상', c: '#e2734a',
    one: '틀을 깨고 나가는 기운',
    much: '머리가 빠르고 말이 셉니다. 기획·창작·발표에서 두각을 냅니다. 대신 윗사람과 부딪히기 쉬우니 한 박자만 참으면 됩니다.',
    none: '튀는 것을 좋아하지 않습니다. 안정된 자리에서 오래 가는 쪽입니다.' },
  { n: '편재', h: '偏財', g: '재성', c: '#d9b45b',
    one: '넓게 벌리는 돈 기운',
    much: '판을 크게 보고 기회를 여러 갈래로 잡습니다. 사업·영업 쪽 감이 있습니다. 다 잡으려다 하나도 못 잡는 것만 조심하세요.',
    none: '한 방을 노리지 않습니다. 큰돈은 늦게 붙지만 새는 곳도 적습니다.' },
  { n: '정재', h: '正財', g: '재성', c: '#c9a227',
    one: '차곡차곡 쌓는 돈 기운',
    much: '숫자에 밝고 계산이 정확합니다. 꾸준히 들어오는 구조를 만들면 가장 강합니다. 지나치면 인색해 보일 수 있습니다.',
    none: '돈을 직접 좇기보다 실력과 사람을 쌓아두면 나중에 그것이 돈이 됩니다.' },
  { n: '편관', h: '偏官', g: '관성', c: '#c0704f',
    one: '나를 밀어붙이는 기운',
    much: '압박을 견디는 힘이 있습니다. 승부처에서 강하고 결단이 빠릅니다. 대신 몸이 먼저 상하니 쉬는 시간을 일정에 넣으세요.',
    none: '누가 몰아붙이는 환경이 잘 안 맞습니다. 스스로 기한을 정해두는 편이 낫습니다.' },
  { n: '정관', h: '正官', g: '관성', c: '#4f86c6',
    one: '자리와 규칙의 기운',
    much: '절차를 지키는 것이 그대로 무기가 됩니다. 조직·공공·전문 자격 쪽에서 힘이 납니다. 지나치면 융통성이 줄어듭니다.',
    none: '직함보다 결과물로 증명하는 쪽이 맞습니다. 규칙이 촘촘한 곳은 답답합니다.' },
  { n: '편인', h: '偏印', g: '인성', c: '#7f8fa8',
    one: '남다르게 파고드는 기운',
    much: '관심사가 깊고 좁습니다. 전문·기술·역술·의료처럼 파고드는 분야가 맞습니다. 생각만 하다 때를 놓치기 쉽습니다.',
    none: '이론보다 몸으로 익히는 쪽이 빠릅니다.' },
  { n: '정인', h: '正印', g: '인성', c: '#7ec9a2',
    one: '배움과 도움이 들어오는 기운',
    much: '윗사람 덕과 문서 복이 있습니다. 자격증·학위가 그대로 길이 됩니다. 다만 기대는 게 익숙해지면 결정이 늦어집니다.',
    none: '스스로 부딪혀 배우는 쪽입니다. 도움을 기다리기보다 먼저 요청하세요.' },
];
const GROUPS = ['비겁', '식상', '재성', '관성', '인성'];
const GROUP_IDX = { 비겁: [0, 1], 식상: [2, 3], 재성: [4, 5], 관성: [6, 7], 인성: [8, 9] };

/* ══════════════ 격국 ══════════════ */
const GYEOK = {
  건록: { han: '建祿格', lead: '제 힘으로 서는 격',
    text: '태어난 달이 그대로 내 기운입니다. 물려받기보다 스스로 벌어 세우는 구조입니다. 남 밑에서 오래 있기 어렵고, 내 이름을 걸었을 때 가장 힘이 납니다.',
    tip: '초반에 기댈 곳이 적은 대신 중년 이후가 두텁습니다. 자격이나 기술 하나를 내 것으로 만들어 두세요.' },
  양인: { han: '羊刃格', lead: '칼을 쥔 격',
    text: '기운이 지나치게 셉니다. 승부처에서 강하고 밀리지 않습니다. 대신 세게 나가다 부딪히는 일이 잦습니다. 그 힘을 눌러줄 관성이나 빼줄 식상이 있어야 제값을 합니다.',
    tip: '경쟁이 분명한 분야, 몸이나 도구를 쓰는 분야에서 오히려 안전합니다. 감정이 올라올 때 결정을 미루는 습관 하나면 절반은 막힙니다.' },
  식신: { han: '食神格', lead: '만들어 내는 격',
    text: '내 안의 것을 밖으로 꺼내 먹고사는 구조입니다. 손재주·말재주·기술이 그대로 밥이 됩니다. 무리하지 않아도 굶지 않는 격입니다.',
    tip: '결과물이 눈에 보이는 일을 고르세요. 편해지면 늘어지는 것만 관리하면 됩니다.' },
  상관: { han: '傷官格', lead: '틀을 깨는 격',
    text: '머리가 빠르고 표현이 셉니다. 남이 안 하던 방식으로 길을 냅니다. 다만 위를 치는 기운이라 조직 안에서 마찰이 잦습니다.',
    tip: '재성이 같이 있으면 그 재주가 그대로 돈이 됩니다. 상사와 부딪히기 전에 결과부터 보여주는 순서가 좋습니다.' },
  편재: { han: '偏財格', lead: '판을 벌이는 격',
    text: '돈이 흘러 다니는 구조를 읽는 눈이 있습니다. 사업·영업·유통처럼 회전이 빠른 쪽이 맞습니다. 큰 기회가 여러 번 옵니다.',
    tip: '감당할 힘(일간)이 얇으면 벌어도 남지 않습니다. 규모를 늘리기 전에 내 체력과 관리 인력을 먼저 보세요.' },
  정재: { han: '正財格', lead: '쌓아 가는 격',
    text: '정직하게 들어오는 구조입니다. 계산이 맞아떨어지고 새는 곳이 적습니다. 한 방보다 반복해서 들어오는 형태가 맞습니다.',
    tip: '월급·임대·구독처럼 주기가 있는 수입을 여러 개 만들어 두면 가장 잘 맞습니다.' },
  편관: { han: '偏官格', lead: '몰아붙여 이기는 격',
    text: '칠살(七殺)이라고도 합니다. 압박이 강한 자리에서 오히려 성과가 납니다. 위기 대응과 결단이 빠릅니다.',
    tip: '인성이 있으면 그 압박이 실력으로 바뀝니다(살인상생). 자격증·전문성 하나가 인생을 크게 바꿉니다.' },
  정관: { han: '正官格', lead: '자리로 크는 격',
    text: '규칙과 직함이 있는 곳에서 힘이 납니다. 절차를 지키는 것이 그대로 성과가 되는 구조입니다. 신뢰가 자산입니다.',
    tip: '큰 조직·공공·전문 자격 쪽이 맞습니다. 급하게 판을 뒤엎는 선택은 이 격에서 가장 손해입니다.' },
  편인: { han: '偏印格', lead: '파고드는 격',
    text: '남들이 안 보는 곳을 봅니다. 전문·기술·연구·의료·상담처럼 깊이가 필요한 분야가 맞습니다. 관심 밖의 일에는 아예 힘이 안 납니다.',
    tip: '준비만 하다 때를 놓치기 쉽습니다. 완성도 80%에서 한 번 내놓는 연습이 필요합니다.' },
  정인: { han: '正印格', lead: '배워서 크는 격',
    text: '문서와 자격이 길을 열어줍니다. 윗사람 덕이 있고 배운 것이 낭비되지 않습니다. 가르치고 설명하는 일에도 잘 맞습니다.',
    tip: '재성이 너무 세면 공부가 끊깁니다. 반대로 재성이 아예 없으면 실속이 얇아지니 한 가지는 돈으로 이어붙이세요.' },
};

/* ══════════════ 용신 ══════════════ */
const ELEM_USE = [
  { color: '초록·청록', dir: '동쪽', season: '봄', num: '3·8',
    job: '교육·기획·출판·나무와 종이·성장하는 조직',
    tip: '새로 시작하고 뻗어 나가는 기운입니다. 아침 산책, 화분 하나, 초록색 소품처럼 사소한 것도 도움이 됩니다.' },
  { color: '빨강·주황', dir: '남쪽', season: '여름', num: '2·7',
    job: '방송·홍보·조명·전기·요식·사람 앞에 서는 일',
    tip: '드러내고 밝히는 기운입니다. 볕을 자주 쬐고, 사람 만나는 자리를 늘리면 운이 붙습니다.' },
  { color: '노랑·베이지', dir: '중앙', season: '환절기', num: '5·10',
    job: '부동산·건설·중개·신용을 다루는 일·관리직',
    tip: '가운데를 잡아주는 기운입니다. 약속을 지키고 자리를 오래 지키는 것이 그대로 운이 됩니다.' },
  { color: '흰색·은색', dir: '서쪽', season: '가을', num: '4·9',
    job: '금융·법·의료·기계·정밀·자르고 정리하는 일',
    tip: '맺고 끊는 기운입니다. 정리·정산·결단을 미루지 않는 것이 이 기운을 살립니다.' },
  { color: '검정·남색', dir: '북쪽', season: '겨울', num: '1·6',
    job: '연구·유통·물류·수산·유동적인 자금을 다루는 일',
    tip: '흐르고 스며드는 기운입니다. 물을 자주 마시고, 한 가지를 오래 파고드는 습관이 잘 맞습니다.' },
];

/* ══════════════ 궁 ══════════════ */
const GUNG_BASE = [
  { key: 'year', title: '년주 — 초년과 뿌리', age: '0 ~ 15세 · 조상과 부모의 자리',
    b: '태어난 환경과 어릴 때의 결을 봅니다.' },
  { key: 'month', title: '월주 — 청년과 사회', age: '16 ~ 30세 · 부모·형제와 직업의 자리',
    b: '사주에서 가장 힘이 센 자리입니다. 직업의 뿌리와 사회에서의 위치를 봅니다.' },
  { key: 'day', title: '일주 — 중년과 배우자', age: '31 ~ 45세 · 나 자신과 배우자의 자리',
    b: '일간은 나 자신이고, 일지는 내가 깔고 앉은 자리이자 배우자궁입니다.' },
  { key: 'hour', title: '시주 — 말년과 자녀', age: '46세 이후 · 자녀와 노후의 자리',
    b: '거두어들이는 자리입니다. 말년의 모양과 자녀 인연을 봅니다.' },
];
const GUNG_TXT = {
  year: {
    비겁: '어릴 때부터 제 고집이 있었습니다. 형제나 또래와 부딪히면서 컸고, 물려받기보다 스스로 챙기는 쪽이었습니다.',
    식상: '어릴 때 표현이 밝고 활발했습니다. 재주가 일찍 드러나는 편이고, 집안 분위기도 답답하지 않았습니다.',
    재성: '어릴 때부터 현실 감각이 있었습니다. 집안의 살림이나 돈 이야기를 일찍 접했을 수 있습니다.',
    관성: '규칙이 분명한 환경에서 컸습니다. 부모나 웃어른의 기대가 컸고, 그만큼 눌린 기억도 남아 있습니다.',
    인성: '보살핌을 받고 자란 자리입니다. 윗사람 덕이 있고, 배움이 일찍 붙었습니다.',
  },
  month: {
    비겁: '동료·동업과 얽히는 사회생활입니다. 사람은 잘 모이는데 같은 몫을 두고 겹칩니다. 역할을 먼저 나누면 오래갑니다.',
    식상: '만들어 내는 일이 직업이 됩니다. 기획·창작·기술·영업처럼 결과물이 눈에 보이는 쪽이 천직에 가깝습니다.',
    재성: '돈을 직접 다루는 일이 맞습니다. 실적과 숫자로 평가받는 자리에서 힘이 납니다.',
    관성: '조직에서 자리를 얻는 힘이 뿌리부터 있습니다. 직함과 절차가 있는 곳이 유리합니다.',
    인성: '배운 것이 그대로 직업이 됩니다. 자격·문서·학위가 길을 열어주고, 가르치는 일도 잘 맞습니다.',
  },
  day: {
    비겁: '배우자 자리에 나와 같은 기운이 앉았습니다. 친구 같은 인연이거나, 서로 지지 않으려는 관계가 되기 쉽습니다.',
    식상: '배우자 자리에 표현하는 기운이 앉았습니다. 대화가 많은 관계이고, 자녀 인연도 두터운 편입니다.',
    재성: '배우자 자리가 그대로 배우자성입니다. 인연이 제자리에 앉은 배치라 결혼운이 안정적인 편입니다.',
    관성: '배우자 자리에 나를 다잡는 기운이 앉았습니다. 든든한 대신 눌리는 느낌이 들 수 있습니다.',
    인성: '배우자 자리에 나를 살리는 기운이 앉았습니다. 곁에 둔 사람 덕을 보는 자리입니다.',
  },
  hour: {
    비겁: '말년에도 제 손으로 움직입니다. 자녀와도 상하보다 친구처럼 지내는 쪽입니다.',
    식상: '말년에 재주가 다시 살아납니다. 취미가 일이 되기도 하고, 자녀 복이 있는 배치입니다.',
    재성: '거두어들이는 자리에 재물이 앉았습니다. 노후 준비가 결실을 보는 형태입니다.',
    관성: '말년까지 자리와 이름이 따라옵니다. 다만 끝까지 책임이 붙으니 놓는 연습도 필요합니다.',
    인성: '말년에 배움과 정리로 갑니다. 가르치고 물려주는 일에서 보람이 납니다.',
  },
};

/* ══════════════ 대운 ══════════════ */
const DAEUN_TXT = [
  ['나를 세우는 10년', '내 뜻대로 밀어붙이게 됩니다. 독립·이직·창업이 자주 걸립니다. 대신 사람과 몫을 두고 부딪히니 조건은 문서로 남기세요.'],
  ['나가는 것이 늘어나는 10년', '기회도 지출도 같이 커집니다. 동업·보증·큰 투자는 이 시기에 특히 조심해야 합니다.'],
  ['만들어 내는 10년', '재주가 밖으로 나오고 몸도 마음도 편해집니다. 새로 배우고 벌이기 좋은 때입니다.'],
  ['판을 흔드는 10년', '아이디어가 터지고 말이 세집니다. 이름을 알리기 좋지만 윗사람·조직과 마찰이 잦습니다.'],
  ['판이 커지는 10년', '돈이 여러 갈래로 들어옵니다. 활동 범위가 넓어집니다. 다 잡으려 하면 새니 하나만 크게 가세요.'],
  ['차곡차곡 쌓이는 10년', '수입이 안정되고 계산이 맞아떨어집니다. 집·계약·정산 같은 매듭짓는 일에 좋습니다.'],
  ['밀려서 크는 10년', '압박이 세게 들어옵니다. 견디면 크게 올라가고, 피하면 더 커집니다. 건강 관리가 성패를 가릅니다.'],
  ['자리가 붙는 10년', '직함·승진·자격이 따라옵니다. 절차를 지키는 것이 그대로 성과가 되는 때입니다.'],
  ['깊어지는 10년', '안으로 파고듭니다. 공부·전문성·자격에 좋고, 크게 벌이는 일에는 힘이 덜 실립니다.'],
  ['도움이 들어오는 10년', '윗사람과 문서의 덕이 있습니다. 배우고 정리하고 자격을 갖추기에 가장 좋은 때입니다.'],
];

/* ══════════════ 본체 ══════════════ */

export function deepSaju(s, opt) {
  const o = opt || {};
  const me = s.dayStem;
  const meE = stemElem(me);
  const P = s.pillars;
  const t = sipsinTally(s);

  /* ── 1. 원국 표 ── */
  const gongmang = [(P.day.branch - P.day.stem + 10) % 12, (P.day.branch - P.day.stem + 11) % 12];
  const posDefs = [['year', '년주', P.year], ['month', '월주', P.month], ['day', '일주', P.day], ['hour', '시주', P.hour]];
  const chart = [];
  for (const [key, label, pl] of posDefs) {
    if (!pl) { chart.push({ key, label, empty: true }); continue; }
    const ss = key === 'day' ? -1 : sipsin(me, pl.stem);
    const bs = sipsin(me, HIDDEN[pl.branch][0][0]);
    chart.push({
      key, label,
      stem: pl.stem, branch: pl.branch,
      stemHan: STEMS_HAN[pl.stem], branchHan: BRANCHES_HAN[pl.branch],
      stemKo: STEMS[pl.stem], branchKo: BRANCHES[pl.branch],
      stemElem: ELEMENT_HAN[stemElem(pl.stem)], branchElem: ELEMENT_HAN[branchElem(pl.branch)],
      stemSipsin: ss < 0 ? '나 (일간)' : SIPSIN[ss],
      branchSipsin: SIPSIN[bs],
      hidden: HIDDEN[pl.branch].map(([hs]) => ({ han: STEMS_HAN[hs], sipsin: SIPSIN[sipsin(me, hs)] })),
      unseong: unseongOf(me, pl.branch),
      gongmang: gongmang.includes(pl.branch),
    });
  }

  /* ── 2. 신강 · 신약 ── */
  const bi = t[0] + t[1], sik = t[2] + t[3], jae = t[4] + t[5], gwan = t[6] + t[7], iny = t[8] + t[9];
  const inyE = (meE + 4) % 5, gwanE = (meE + 3) % 5, jaeE = ctl(meE), sikE = gen(meE);
  const wolji = P.month.branch, woljiE = branchElem(wolji);
  const iljiE = branchElem(P.day.branch);
  const deukryeong = woljiE === meE || woljiE === inyE;
  const deukji = iljiE === meE || iljiE === inyE;
  let bs = bi + iny;
  if (deukryeong) bs += 12;
  if (deukji) bs += 7;
  const level = bs >= 74 ? '극신강' : bs >= 57 ? '신강' : bs >= 38 ? '중화' : bs >= 24 ? '신약' : '극신약';
  const strong = level === '극신강' || level === '신강';
  const weak = level === '극신약' || level === '신약';

  const strengthTxt = {
    극신강: '나를 밀어주는 기운이 지나치게 두텁습니다. 힘은 넘치는데 그 힘을 쓸 자리가 좁습니다. 밖으로 내보내는 통로(일·표현·돈 쓰는 곳)를 반드시 만들어야 합니다.',
    신강: '나를 밀어주는 기운이 두텁습니다. 스스로 판단하고 밀어붙이는 힘이 있습니다. 대신 남 말이 잘 안 들어오고, 혼자 다 쥐려다 놓치는 일이 생깁니다.',
    중화: '한쪽으로 크게 치우치지 않았습니다. 상황에 맞춰 모양을 바꿀 수 있는 유연한 구조라 어떤 환경에도 적응합니다. 대신 색이 흐려 보일 수 있으니 내 것 하나는 뾰족하게 잡아두세요.',
    신약: '나를 밀어주는 기운이 얇습니다. 혼자보다 사람을 끼고 가는 쪽이 훨씬 유리합니다. 도와주는 사람과 배워 둔 것이 그대로 자산이 됩니다.',
    극신약: '해야 할 일이 감당할 힘보다 큽니다. 혼자 다 쥐면 몸이 먼저 무너집니다. 나눠 지는 구조를 만들고, 기댈 곳을 부끄러워하지 마세요.',
  }[level];
  const strengthDetail = (deukryeong ? `태어난 달(${BRANCHES_HAN[wolji]})이 나를 돕습니다(득령). ` : `태어난 달(${BRANCHES_HAN[wolji]})은 나를 돕지 않습니다(실령). `)
    + (deukji ? `일지 ${BRANCHES_HAN[P.day.branch]}도 내 편입니다(득지).` : `일지 ${BRANCHES_HAN[P.day.branch]}도 내 편은 아닙니다(실지).`);

  /* ── 3. 격국 ── */
  const gyeok = pickGyeok(s, me, t);

  /* ── 4. 용신 ── */
  const yong = pickYongsin({ meE, inyE, gwanE, jaeE, sikE, bi, sik, jae, gwan, iny, strong, weak, level, wolji });

  /* ── 5. 신살 ── */
  const sinsal = pickSinsal(s, me, gongmang);

  /* ── 6. 궁별 해석 ── */
  const gung = GUNG_BASE.map((g, i) => {
    const c = chart[i];
    if (c.empty) {
      return { ...g, lead: '태어난 시각을 모릅니다', text: '시주를 세우지 못해 말년과 자녀 자리는 비워 둡니다. 태어난 시각을 알게 되면 이 자리까지 채워서 볼 수 있습니다.', chips: [] };
    }
    const grp = g.key === 'day' ? groupOf(sipsin(me, HIDDEN[c.branch][0][0])) : groupOf(sipsin(me, c.stem));
    const un = c.unseong;
    return {
      ...g,
      gz: STEMS_HAN[c.stem] + BRANCHES_HAN[c.branch],
      lead: `${g.key === 'day' ? '일지' : '이 자리'}는 ${grp}입니다`,
      text: GUNG_TXT[g.key][grp] + ' ' + UNSEONG_TXT[un.i][1]
        + (c.gongmang ? ' 다만 이 자리는 공망(空亡)이라, 있어도 온전히 내 것으로 잡히지 않는 느낌이 따라옵니다.' : ''),
      chips: [grp, un.name + ' ' + UNSEONG_HAN[un.i]].concat(c.gongmang ? ['공망'] : []),
    };
  });

  /* ── 7. 대운 ── */
  const daeun = buildDaeun(s, o);

  /* ── 8. 세운 ── */
  const seun = buildSeun(s, o.year || nowYearKST(), daeun);

  /* ── 9. 십신 요약 ── */
  const groupPct = { 비겁: r1(bi), 식상: r1(sik), 재성: r1(jae), 관성: r1(gwan), 인성: r1(iny) };
  const ranked = SIPSIN_INFO.map((info, i) => ({ i, pct: t[i], ...info })).sort((a, b) => b.pct - a.pct);
  const topSipsin = ranked.filter((x) => x.pct >= 9).slice(0, 3)
    .map((x) => ({ name: x.n, han: x.h, pct: r1(x.pct), color: x.c, one: x.one, text: x.much }));
  const missing = ranked.filter((x) => x.pct < 2.5).map((x) => ({ name: x.n, han: x.h, text: x.none }));

  const ilju = iljuOf(P.day.stem, P.day.branch);

  // 총평 — 전체를 한 문단으로 묶는다
  const curD = daeun && !daeun.need && daeun.current >= 0 ? daeun.list[daeun.current] : null;
  const summary = [
    `${ilju.gz} 일주, ${ilju.name}입니다. ${ilju.text}`,
    `기운의 세기는 ${level}이고 격국은 ${gyeok.name}, 곧 ${gyeok.lead}입니다. ${gyeok.text}`,
    `살려 쓸 기운(용신)은 ${yong.yong.han}${yong.yong.name}이고 피할 기운(기신)은 ${yong.gi.han}${yong.gi.name}입니다. ${yong.why}`,
    curD
      ? `지금은 ${curD.age}~${curD.ageTo}세 ${curD.gz} 대운(${curD.sipsin}) 한가운데입니다. ${curD.head} — ${curD.text.split('.')[0]}.`
      : (daeun && !daeun.need ? `${daeun.start}세부터 대운이 시작됩니다. 그 전까지는 월주의 기운을 그대로 씁니다.` : ''),
    `${seun.year}년 세운은 ${seun.gz}, 십신으로는 ${seun.sipsin}이고 십이운성은 ${seun.unseong}입니다. ${seun.text}`
      + (seun.notes.length ? ` 특히 ${seun.notes.map((n) => n.t).join('·')}이 걸려 있습니다.` : ''),
  ].filter(Boolean);

  return {
    gongmang: gongmang.map((b) => BRANCHES_HAN[b]).join(''),
    ilju, summary,
    chart,
    tally: t.map((v, i) => ({ name: SIPSIN[i], pct: r1(v), color: SIPSIN_INFO[i].c })),
    groups: groupPct,
    topSipsin,
    missing: missing.slice(0, 3),
    strength: { level, score: Math.round(bs), text: strengthTxt, detail: strengthDetail, deukryeong, deukji },
    gyeokguk: gyeok,
    yongsin: yong,
    sinsal,
    gung,
    daeun,
    seun,
  };
}

/* ══════════════ 세부 ══════════════ */

function unseongOf(stem, branch) {
  const base = JANGSAENG[stem];
  const i = STEM_YANG[stem] ? ((branch - base + 12) % 12) : ((base - branch + 12) % 12);
  return { i, name: UNSEONG[i], han: UNSEONG_HAN[i], lead: UNSEONG_TXT[i][0], text: UNSEONG_TXT[i][1], tone: UNSEONG_TXT[i][2] };
}
function groupOf(sinIdx) { return SIPSIN_INFO[sinIdx].g; }
function nowYearKST() { return new Date(Date.now() + 9 * 3600 * 1000).getUTCFullYear(); }

/* 격국 — 월지 지장간 중 천간에 투출한 것 */
function pickGyeok(s, me, t) {
  const P = s.pillars;
  const wolji = P.month.branch;
  const hid = HIDDEN[wolji];
  const outStems = [P.year.stem, P.month.stem].concat(P.hour ? [P.hour.stem] : []);

  // 월지 본기가 비겁이면 건록격/양인격으로 먼저 잡는다
  const bon = hid[0][0];
  const bonSin = sipsin(me, bon);
  let pickStem = null, tuchul = false, key = null;
  if (bonSin === 0) { key = '건록'; pickStem = bon; }
  else if (bonSin === 1) { key = STEM_YANG[me] ? '양인' : '건록'; pickStem = bon; }
  else {
    // 투출: 지장간(본기→중기→여기)이 천간에 그대로 떠 있는가. 비겁은 격으로 잡지 않는다.
    for (const [hs] of hid) {
      const sn = sipsin(me, hs);
      if (sn === 0 || sn === 1) continue;
      if (outStems.includes(hs)) { pickStem = hs; tuchul = true; break; }
    }
    if (pickStem === null) pickStem = bon;   // 투출이 없으면 본기로
    key = SIPSIN[sipsin(me, pickStem)];
  }
  const sin = sipsin(me, pickStem);

  const g = GYEOK[key] || GYEOK.식신;
  return {
    key, name: key + '격', han: g.han, lead: g.lead, text: g.text, tip: g.tip,
    from: `월지 ${BRANCHES_HAN[wolji]}의 지장간 ${STEMS_HAN[pickStem]}` + (tuchul ? '이 천간에 떠 있어(투출) 격으로 잡았습니다.' : '(본기)으로 격을 잡았습니다.'),
    pct: r1(t[sin]),
  };
}

/* 용신 — 억부 우선, 중화면 조후 */
function pickYongsin(x) {
  const { meE, inyE, gwanE, jaeE, sikE, bi, sik, jae, gwan, iny, strong, weak, level, wolji } = x;
  let yong, hui, gi, why;

  if (strong) {
    if (iny > bi + 6) {
      yong = jaeE; hui = sikE; gi = inyE;
      why = '나를 밀어주는 인성이 지나칩니다. 그 인성을 눌러줄 재성(財)이 약이 됩니다. 실물과 숫자를 다루는 쪽으로 기운을 돌리세요.';
    } else if (gwan >= 9) {
      yong = gwanE; hui = jaeE; gi = meE;
      why = '기운이 센데 그것을 잡아줄 관성(官)이 살아 있습니다. 규칙과 책임이 있는 자리에 들어갈수록 오히려 편해집니다.';
    } else {
      yong = sikE; hui = jaeE; gi = inyE;
      why = '넘치는 힘을 밖으로 빼주는 식상(食傷)이 약입니다. 만들고 표현하고 움직이는 일이 그대로 처방입니다.';
    }
  } else if (weak) {
    if (gwan + sik > jae + 8) {
      yong = inyE; hui = meE; gi = gwanE;
      why = '나를 빼내고 누르는 기운이 셉니다. 나를 살려주는 인성(印)이 약입니다. 배움·자격·윗사람의 도움이 그대로 힘이 됩니다.';
    } else {
      yong = meE; hui = inyE; gi = jaeE;
      why = '재물의 기운이 내 힘보다 큽니다. 같이 밀어줄 비겁(比劫)이 약입니다. 혼자 다 쥐지 말고 사람을 붙여야 합니다.';
    }
  } else {
    const winter = [11, 0, 1].includes(wolji), summer = [5, 6, 7].includes(wolji);
    if (winter) { yong = 1; hui = 0; gi = 4; why = '겨울에 태어나 사주가 찹니다. 따뜻하게 데워주는 화(火)가 약입니다(조후).'; }
    else if (summer) { yong = 4; hui = 3; gi = 1; why = '여름에 태어나 사주가 뜨겁습니다. 식혀주는 수(水)가 약입니다(조후).'; }
    else {
      const order = [bi, sik, jae, gwan, iny];
      const elems = [meE, sikE, jaeE, gwanE, inyE];
      let lo = 0; for (let i = 1; i < 5; i++) if (order[i] < order[lo]) lo = i;
      yong = elems[lo]; hui = elems[(lo + 4) % 5]; gi = elems[(lo + 2) % 5];
      why = `치우침이 크지 않아 가장 얇은 ${ELEMENT_HAN[yong]}${ELEMENTS[yong]}을 채우는 쪽으로 잡았습니다.`;
    }
  }

  const u = ELEM_USE[yong];
  return {
    level,
    yong: { i: yong, name: ELEMENTS[yong], han: ELEMENT_HAN[yong] },
    hui: { i: hui, name: ELEMENTS[hui], han: ELEMENT_HAN[hui] },
    gi: { i: gi, name: ELEMENTS[gi], han: ELEMENT_HAN[gi] },
    why,
    color: u.color, dir: u.dir, num: u.num, job: u.job, tip: u.tip,
  };
}

/* 신살 */
function pickSinsal(s, me, gongmang) {
  const P = s.pillars, B = s.branches, out = [];
  const has = (b) => B.filter((x) => x === b).length;
  const where = (b) => {
    const n = [];
    if (P.year.branch === b) n.push('년지');
    if (P.month.branch === b) n.push('월지');
    if (P.day.branch === b) n.push('일지');
    if (P.hour && P.hour.branch === b) n.push('시지');
    return n.join('·');
  };
  const add = (name, han, b, good, text) => out.push({ name, han, at: where(b), pos: BRANCHES_HAN[b], good, text });

  // 천을귀인
  for (const b of (CHEONEUL[me] || [])) if (has(b)) {
    add('천을귀인', '天乙貴人', b, 1, '사주에서 가장 좋은 신살로 봅니다. 결정적인 순간에 사람이 나타나 길을 열어줍니다. 어려운 부탁을 꺼내야 할 때 이 기운을 믿어도 됩니다.');
    break;
  }
  // 문창귀인
  if (has(MUNCHANG[me])) add('문창귀인', '文昌貴人', MUNCHANG[me], 1, '글과 공부의 별입니다. 머리 회전이 빠르고 배운 것을 잘 정리합니다. 시험·자격·글로 먹고사는 일에서 힘이 납니다.');
  // 월덕귀인
  const wd = WOLDEOK[P.month.branch];
  if (s.stems.includes(wd)) out.push({ name: '월덕귀인', han: '月德貴人', at: '천간', pos: STEMS_HAN[wd], good: 1, text: '달의 덕을 받는 별입니다. 큰 사고나 구설을 비껴가게 해줍니다. 사람 사이에서 원만하다는 말을 듣습니다.' });
  // 천덕귀인
  const cd = CHEONDEOK[P.month.branch];
  if (cd) {
    if (cd[0] === 's' && s.stems.includes(cd[1])) out.push({ name: '천덕귀인', han: '天德貴人', at: '천간', pos: STEMS_HAN[cd[1]], good: 1, text: '하늘의 덕을 받는 별입니다. 위기에서 한 번은 크게 도움을 받는 기운으로 봅니다.' });
    if (cd[0] === 'b' && has(cd[1])) add('천덕귀인', '天德貴人', cd[1], 1, '하늘의 덕을 받는 별입니다. 위기에서 한 번은 크게 도움을 받는 기운으로 봅니다.');
  }
  // 도화
  const g = samhapGroup(P.day.branch) >= 0 ? samhapGroup(P.day.branch) : samhapGroup(P.year.branch);
  if (g >= 0 && has(DOHWA_OF[g])) add('도화살', '桃花殺', DOHWA_OF[g], 1, '눈길을 끄는 별입니다. 애써 꾸미지 않아도 사람이 봅니다. 사람 앞에 서는 일에서 크게 유리하고, 관심이 여러 갈래로 흩어지는 것만 관리하면 됩니다.');
  // 홍염
  if (has(HONGYEOM[me])) add('홍염살', '紅艶殺', HONGYEOM[me], 1, '드러내지 않아도 스며드는 매력입니다. 처음보다 오래 볼수록 좋아진다는 말을 듣습니다.');
  // 양인
  if (YANGIN[me] !== undefined && has(YANGIN[me])) add('양인살', '羊刃殺', YANGIN[me], -1, '칼을 쥔 별입니다. 결단이 빠르고 승부처에서 밀리지 않습니다. 대신 감정이 올라올 때 크게 부딪히니, 화가 날 때 결정을 미루는 습관 하나가 절반을 막아줍니다.');
  // 괴강
  if (GOEGANG.some(([a, b]) => a === P.day.stem && b === P.day.branch)) out.push({ name: '괴강살', han: '魁罡殺', at: '일주', pos: STEMS_HAN[P.day.stem] + BRANCHES_HAN[P.day.branch], good: 0, text: '극단으로 가는 별입니다. 크게 되거나 크게 꺾이거나 둘 중 하나로 갑니다. 리더십이 강하고 카리스마가 있습니다. 중간을 노리면 오히려 애매해집니다.' });
  // 백호
  for (const [a, b] of BAEKHO) {
    if (a === P.day.stem && b === P.day.branch) { out.push({ name: '백호대살', han: '白虎大殺', at: '일주', pos: STEMS_HAN[a] + BRANCHES_HAN[b], good: -1, text: '기운이 거칠고 센 별입니다. 옛날에는 흉하게 봤지만, 지금은 몸을 쓰거나 생사를 다루는 전문 분야에서 오히려 크게 쓰이는 기운으로 봅니다. 건강과 안전만 챙기세요.' }); break; }
  }
  // 공망
  const gm = [];
  if (P.year.branch === gongmang[0] || P.year.branch === gongmang[1]) gm.push('년지');
  if (P.month.branch === gongmang[0] || P.month.branch === gongmang[1]) gm.push('월지');
  if (P.hour && (P.hour.branch === gongmang[0] || P.hour.branch === gongmang[1])) gm.push('시지');
  if (gm.length) out.push({ name: '공망', han: '空亡', at: gm.join('·'), pos: gongmang.map((b) => BRANCHES_HAN[b]).join(''), good: 0, text: `${gm.join('·')}가 비어 있습니다. 그 자리의 일은 손에 잡힐 듯 안 잡히는 느낌이 따라옵니다. 대신 욕심을 비우고 대하면 오히려 편해지는 자리이기도 합니다.` });

  return out;
}

/* 대운 */
function buildDaeun(s, o) {
  const gender = o.gender || s.gender;
  if (gender !== 'm' && gender !== 'f') {
    return { need: true, note: '대운은 남녀에 따라 흐르는 방향이 반대입니다(양남음녀 순행 · 음남양녀 역행). 성별을 알려주시면 10년 단위 흐름까지 뽑아 드립니다.' };
  }
  const yangYear = STEM_YANG[s.pillars.year.stem] === 1;
  const forward = (yangYear && gender === 'm') || (!yangYear && gender === 'f');

  const y = s.solar.y;
  const jd = s.jdUT;
  const prev = prevJeol(jd, y, s.monthOff);
  const next = nextJeol(prev);
  const days = forward ? (next.jd - jd) : (jd - prev.jd);
  let start = Math.round(days / 3);
  if (start < 1) start = 1;
  if (start > 10) start = 10;

  const mGZ = gzIndex(s.pillars.month.stem, s.pillars.month.branch);
  const me = s.dayStem;
  const thisY = nowYearKST();
  const age = thisY - y; // 만 나이에 가까운 근사

  const list = [];
  for (let i = 0; i < 9; i++) {
    const gz = ((mGZ + (forward ? (i + 1) : -(i + 1))) % 60 + 60) % 60;
    const st = gz % 10, br = gz % 12;
    const a0 = start + i * 10;
    const sinIdx = sipsin(me, st);
    const un = unseongOf(me, br);
    list.push({
      age: a0, ageTo: a0 + 9, year: y + a0, yearTo: y + a0 + 9,
      stem: st, branch: br, gz: STEMS_HAN[st] + BRANCHES_HAN[br], gzKo: STEMS[st] + BRANCHES[br],
      sipsin: SIPSIN[sinIdx], group: SIPSIN_INFO[sinIdx].g, color: SIPSIN_INFO[sinIdx].c,
      unseong: un.name, unseongHan: un.han,
      head: DAEUN_TXT[sinIdx][0], text: DAEUN_TXT[sinIdx][1] + ' 이 10년의 십이운성은 ' + un.name + '입니다 — ' + un.lead + '.',
      elem: ELEMENT_HAN[stemElem(st)],
    });
  }
  let cur = -1;
  for (let i = 0; i < list.length; i++) if (age >= list[i].age) cur = i;

  return {
    need: false, gender, dir: forward ? '순행' : '역행', start, list, current: cur,
    note: `년간이 ${yangYear ? '양(陽)' : '음(陰)'}이고 ${gender === 'm' ? '남자' : '여자'}이므로 ${forward ? '순행' : '역행'}합니다. `
      + `태어난 시각에서 ${forward ? '다음' : '이전'} 절입(節入)까지 ${days.toFixed(1)}일, 3일을 1년으로 쳐서 ${start}세부터 시작합니다.`,
    before: `${start}세 이전은 월주(${STEMS_HAN[s.pillars.month.stem]}${BRANCHES_HAN[s.pillars.month.branch]})의 기운을 그대로 씁니다.`,
  };
}

function prevJeol(jd, y, monthOff) {
  let k = 2 + monthOff * 2; if (k >= 24) k -= 24;
  let best = null;
  for (const yy of [y - 1, y, y + 1]) {
    const j = termJD(yy, k);
    if (j <= jd && (!best || j > best.jd)) best = { jd: j, k, y: yy };
  }
  if (!best) best = { jd: termJD(y, k), k, y };
  return best;
}
function nextJeol(prev) {
  let k = prev.k + 2, y = prev.y;
  if (k >= 24) { k -= 24; y += 1; }
  return { jd: termJD(y, k), k, y };
}

/* 세운 */
function buildSeun(s, year, daeun) {
  const st = ((year - 4) % 10 + 10) % 10;
  const br = ((year - 4) % 12 + 12) % 12;
  const me = s.dayStem;
  const sinIdx = sipsin(me, st);
  const un = unseongOf(me, br);

  const notes = [];
  let score = 52;
  score += [4, -5, 9, 2, 6, 9, -6, 6, 0, 10][sinIdx];
  score += [6, 1, 5, 8, 8, 2, -1, 0, -1, -6, 1, 4][un.i] * 0.8;

  if (CHUNG[s.dayBranch] === br) { score -= 9; notes.push({ t: '일지충', d: '내 자리와 정면으로 부딪히는 해입니다. 이동·이사·이직 같은 변동수가 붙습니다. 급할 때 결정하면 오래 못 갑니다.' }); }
  if (YUKHAP[s.dayBranch] === br) { score += 7; notes.push({ t: '일지 육합', d: '내 자리와 손을 잡는 해입니다. 사람 일이 잘 풀리고 미뤄둔 만남이 성사됩니다.' }); }
  if (samhapGroup(s.dayBranch) >= 0 && samhapGroup(s.dayBranch) === samhapGroup(br)) { score += 6; notes.push({ t: '일지 삼합', d: '흩어져 있던 일이 하나로 모이는 해입니다. 협업과 팀 단위 일에서 성과가 납니다.' }); }
  if ((CHEONEUL[me] || []).includes(br)) { score += 9; notes.push({ t: '천을귀인 해', d: '귀인이 들어오는 해입니다. 어려운 부탁, 큰 결정, 사람을 통해 푸는 일에 유리합니다.' }); }
  if (s.branches.some((b) => CHUNG[s.pillars.month.branch] === br && b === s.pillars.month.branch)) { score -= 5; notes.push({ t: '월지충', d: '직업과 사회적 자리가 흔들립니다. 옮기더라도 한 가지는 챙겨 나오세요.' }); }

  const gm = [(s.pillars.day.branch - s.pillars.day.stem + 10) % 12, (s.pillars.day.branch - s.pillars.day.stem + 11) % 12];
  if (gm.includes(br)) { score -= 4; notes.push({ t: '세운 공망', d: '올해 지지가 내 공망(空亡)에 듭니다. 애써도 손에 잘 안 잡히는 느낌이 따라옵니다. 크게 벌이기보다 정리하고 배우는 해로 쓰면 오히려 좋습니다.' }); }

  const cur = daeun && !daeun.need && daeun.current >= 0 ? daeun.list[daeun.current] : null;
  if (cur) {
    if (CHUNG[cur.branch] === br) { score -= 6; notes.push({ t: '대운과 충', d: `지금 대운 ${cur.gz}와 올해가 부딪힙니다. 10년의 흐름이 한 번 크게 흔들리는 해입니다.` }); }
  }

  score = clamp(Math.round(score), 15, 96);

  return {
    year, stem: st, branch: br, gz: STEMS_HAN[st] + BRANCHES_HAN[br], gzKo: STEMS[st] + BRANCHES[br],
    sipsin: SIPSIN[sinIdx], group: SIPSIN_INFO[sinIdx].g, color: SIPSIN_INFO[sinIdx].c,
    unseong: un.name, unseongHan: un.han, unseongLead: un.lead,
    head: DAEUN_TXT[sinIdx][0].replace('10년', '한 해'),
    text: DAEUN_TXT[sinIdx][1],
    daeunGZ: cur ? cur.gz : null, daeunSipsin: cur ? cur.sipsin : null,
    score, notes: notes.slice(0, 4),
  };
}

/* ══════════════════════════════════════════════
   확장 — 12신살 · 추가 신살 · 지지관계 · 육친
          직업 · 건강 · 성격 · 월운
   ══════════════════════════════════════════════ */

/* ── 12신살 ── */
const SIN12 = ['겁살', '재살', '천살', '지살', '연살', '월살', '망신살', '장성살', '반안살', '역마살', '육해살', '화개살'];
const SIN12_HAN = ['劫殺', '災殺', '天殺', '地殺', '年殺', '月殺', '亡身殺', '將星殺', '攀鞍殺', '驛馬殺', '六害殺', '華蓋殺'];
const SIN12_TXT = [
  ['빼앗기는 자리', '내 것을 남에게 내주는 기운입니다. 보증·투자·동업에서 손실이 나기 쉽습니다. 대신 위험을 미리 읽는 감각이 남다릅니다.', -1],
  ['갇히는 자리', '뜻하지 않게 막히는 기운입니다. 송사나 구설이 붙기도 합니다. 반대로 위기관리·수사·감사처럼 막는 일에는 강합니다.', -1],
  ['하늘이 정하는 자리', '내 힘 밖의 일이 걸립니다. 억지로 밀면 더 안 됩니다. 때를 기다릴 줄 아는 것이 이 자리의 능력입니다.', 0],
  ['새로 터를 잡는 자리', '움직여서 자리를 만드는 기운입니다. 이사·독립·개업과 인연이 깊습니다.', 1],
  ['눈길을 끄는 자리', '도화와 같은 자리입니다. 사람이 먼저 봅니다. 사람 앞에 서는 일에서 유리합니다.', 1],
  ['메마르는 자리', '기운이 마르는 자리입니다. 일이 더디게 풀립니다. 서두르지 않으면 결국은 됩니다.', -1],
  ['체면이 깎이는 자리', '내가 벌인 일로 내가 곤란해지는 기운입니다. 대신 자기 속을 잘 알아서, 스스로를 다루는 힘이 큽니다.', -1],
  ['가운데 서는 자리', '무리의 중심에 서는 기운입니다. 리더 자리가 잘 어울리고 책임을 맡을수록 힘이 납니다.', 1],
  ['안장에 앉는 자리', '자리와 재물이 따라오는 기운입니다. 승진·저축·안정에 좋습니다.', 1],
  ['달리는 자리', '움직여야 풀리는 기운입니다. 이동·출장·해외가 잦고, 묶어두면 답답해집니다.', 0],
  ['걸리는 자리', '사람이나 몸에 자잘하게 걸리는 기운입니다. 건강과 인간관계를 한 번씩 점검하세요.', -1],
  ['덮는 자리', '혼자 파고드는 기운입니다. 종교·예술·학문·기술과 인연이 깊습니다.', 0],
];

/* ── 추가 신살 표 ── */
const WONJIN = { 0: 7, 7: 0, 1: 6, 6: 1, 2: 9, 9: 2, 3: 8, 8: 3, 4: 11, 11: 4, 5: 10, 10: 5 };
const GWIMUN = { 0: 9, 9: 0, 1: 6, 6: 1, 2: 7, 7: 2, 3: 8, 8: 3, 4: 11, 11: 4, 5: 10, 10: 5 };
const GEUMYEO = [4, 5, 7, 8, 7, 8, 10, 11, 1, 2];
const AMROK = [11, 10, 8, 7, 8, 7, 5, 4, 2, 1];
const SAMJAE_YEARS = [[2, 3, 4], [5, 6, 7], [8, 9, 10], [11, 0, 1]]; // 신자진 / 해묘미 / 인오술 / 사유축 생

/* ── 오행 ↔ 몸 ── */
const HEALTH = [
  { organ: '간·담', part: '근육·힘줄·눈·신경', over: '화를 참다 터뜨리는 습관, 늦은 술자리', under: '눈이 쉽게 피로하고 근육이 잘 뭉칩니다', care: '스트레칭과 규칙적인 취침. 술을 줄이는 것이 가장 빠릅니다.' },
  { organ: '심장·소장', part: '혈압·순환·혀·정신', over: '급하게 서두르는 성격, 과한 카페인', under: '가슴이 두근거리고 잠이 얕아집니다', care: '카페인을 줄이고 가벼운 유산소를 꾸준히. 화를 식히는 시간이 필요합니다.' },
  { organ: '위·비장', part: '소화기·살·입', over: '불규칙한 식사, 단 음식과 밀가루', under: '소화가 더디고 생각이 많아 잠이 안 옵니다', care: '식사 시간을 고정하는 것만으로 절반이 잡힙니다.' },
  { organ: '폐·대장', part: '호흡기·피부·코·대장', over: '건조한 공기, 미세먼지, 흡연', under: '환절기마다 목과 피부가 먼저 반응합니다', care: '가습과 유산소 호흡 운동. 환절기 앞뒤로 미리 관리하세요.' },
  { organ: '신장·방광', part: '허리·뼈·귀·생식기', over: '찬 것, 수면 부족, 과로', under: '허리와 무릎이 먼저 신호를 보냅니다', care: '아랫배와 발을 따뜻하게. 수면 시간을 늘리는 것이 최우선입니다.' },
];

/* ── 일간 성격 ── */
const ILGAN_CHAR = [
  ['큰 나무', '곧게 자라는 기운입니다. 원칙이 분명하고 한번 정하면 잘 안 바꿉니다. 앞장서는 일이 어울리고, 굽히기를 싫어해 손해를 보기도 합니다.'],
  ['덩굴과 화초', '휘어지되 부러지지 않는 기운입니다. 사람에 맞춰 유연하게 움직이고, 어디에 놓아도 살아남습니다. 속으로는 대단히 질깁니다.'],
  ['태양', '드러내고 밝히는 기운입니다. 숨기는 게 없고 표현이 시원합니다. 사람을 끌어당기는 대신 감정이 그대로 얼굴에 납니다.'],
  ['등불과 촛불', '가까운 곳을 밝히는 기운입니다. 섬세하고 배려가 깊습니다. 겉은 조용해도 안에서 오래 타는 쪽입니다.'],
  ['큰 산과 대지', '움직이지 않는 기운입니다. 믿음직하고 무겁습니다. 한번 맡으면 끝까지 지고 가지만, 변화에는 느립니다.'],
  ['밭과 정원의 흙', '길러내는 기운입니다. 실속이 있고 현실 감각이 뛰어납니다. 남을 챙기다 자기 것을 놓치기 쉽습니다.'],
  ['원석과 쇳덩이', '다듬어지지 않은 강한 기운입니다. 의리가 있고 결단이 빠릅니다. 부딪히면 세게 부딪히니 조율이 과제입니다.'],
  ['보석과 칼날', '정교하게 다듬어진 기운입니다. 깔끔하고 예민하며 기준이 높습니다. 완벽하지 않으면 아예 안 하려 합니다.'],
  ['바다와 큰 강', '넓게 흐르는 기운입니다. 포용력이 크고 머리가 좋습니다. 흐름을 타는 대신 한곳에 오래 머물지 못합니다.'],
  ['이슬과 시냇물', '스며드는 기운입니다. 조용하고 생각이 깊습니다. 티 안 나게 파고들어 결국 해내는 쪽입니다.'],
];

/* ── 직업 적성: 격국 × 용신 오행 ── */
const JOB_BY_GYEOK = {
  건록: '자기 이름을 거는 일 — 전문직 개업, 1인 기업, 프리랜서, 기술 기반 자영업',
  양인: '승부와 결단이 필요한 일 — 영업 총괄, 경찰·군인, 외과·응급, 스포츠, 기계·설비',
  식신: '만들어 내는 일 — 요식, 제조, 콘텐츠 제작, 교육, 돌봄, 손기술',
  상관: '틀을 깨는 일 — 기획, 광고, 방송, 디자인, 강의, 변호·협상',
  편재: '회전이 빠른 일 — 유통, 무역, 부동산, 영업, 플랫폼, 투자 중개',
  정재: '반복해서 들어오는 일 — 회계, 은행, 임대, 구독형 사업, 관리·총무',
  편관: '압박을 다루는 일 — 검경·법조, 감사, 위기관리, 군, 의료, 건설 현장',
  정관: '자리와 절차가 있는 일 — 공직, 대기업 관리직, 인사·법무, 공기업, 전문 자격',
  편인: '깊게 파고드는 일 — 연구, 의료, 상담·심리, 역술, IT, 특수기술',
  정인: '가르치고 인증하는 일 — 교육, 출판, 연구, 행정, 자격·면허 기반 전문직',
};

/* ── 월운 ── */
const MONTH_LABEL = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
const MONTH_TERM = ['소한', '입춘', '경칩', '청명', '입하', '망종', '소서', '입추', '백로', '한로', '입동', '대설'];

export function extendDeep(s, base, opt) {
  const o = opt || {};
  const me = s.dayStem, meE = stemElem(me), P = s.pillars, B = s.branches;
  const t = sipsinTally(s);
  const gender = o.gender || s.gender || null;

  /* ── 12신살 ── */
  const gy = samhapGroup(P.year.branch);
  const sin12 = [];
  if (gy >= 0) {
    const gyeopsal = (SAMHAP[gy][0] + 9) % 12;
    const seen = {};
    for (const [key, label, pl] of [['year', '년지', P.year], ['month', '월지', P.month], ['day', '일지', P.day], ['hour', '시지', P.hour]]) {
      if (!pl) continue;
      const i = (pl.branch - gyeopsal + 12) % 12;
      if (seen[i]) { seen[i].at += '·' + label; continue; }
      const row = {
        idx: i, name: SIN12[i], han: SIN12_HAN[i], at: label, pos: BRANCHES_HAN[pl.branch],
        lead: SIN12_TXT[i][0], text: SIN12_TXT[i][1], good: SIN12_TXT[i][2],
      };
      seen[i] = row; sin12.push(row);
    }
  }

  /* ── 추가 신살 ── */
  const extra = [];
  const has = (b) => B.includes(b);
  const whereOf = (b) => {
    const n = [];
    if (P.year.branch === b) n.push('년지');
    if (P.month.branch === b) n.push('월지');
    if (P.day.branch === b) n.push('일지');
    if (P.hour && P.hour.branch === b) n.push('시지');
    return n.join('·');
  };
  if (has(JANGSAENG[me])) extra.push({ name: '학당귀인', han: '學堂貴人', at: whereOf(JANGSAENG[me]), pos: BRANCHES_HAN[JANGSAENG[me]], good: 1, text: '배움의 별입니다. 가르치고 배우는 일에 인연이 깊고, 나이 들어 시작한 공부도 끝까지 갑니다.' });
  if (has(AMROK[me])) extra.push({ name: '암록', han: '暗祿', at: whereOf(AMROK[me]), pos: BRANCHES_HAN[AMROK[me]], good: 1, text: '보이지 않는 밥그릇입니다. 막다른 곳에서 뜻밖의 도움이 나타나 길이 열리는 기운입니다.' });
  if (has(GEUMYEO[me])) extra.push({ name: '금여록', han: '金輿祿', at: whereOf(GEUMYEO[me]), pos: BRANCHES_HAN[GEUMYEO[me]], good: 1, text: '좋은 수레를 타는 별입니다. 배우자 복과 생활의 안정으로 봅니다. 사람이 순하다는 말을 듣습니다.' });
  const cheonui = (P.month.branch + 11) % 12;
  if (has(cheonui)) extra.push({ name: '천의성', han: '天醫星', at: whereOf(cheonui), pos: BRANCHES_HAN[cheonui], good: 1, text: '사람을 살리는 별입니다(활인성). 의료·상담·복지·역술처럼 남의 어려움을 다루는 일과 인연이 깊습니다.' });
  // 원진 · 귀문
  for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
    if (WONJIN[B[i]] === B[j]) { extra.push({ name: '원진살', han: '怨嗔殺', at: '원국', pos: BRANCHES_HAN[B[i]] + BRANCHES_HAN[B[j]], good: -1, text: `${BRANCHES_HAN[B[i]]}과 ${BRANCHES_HAN[B[j]]}이 서로 미워하는 배치입니다. 이유 없이 껄끄러운 사람이 생기고, 가까운 사이일수록 사소한 일로 오래 갑니다. 말로 풀지 말고 시간을 두세요.` }); break; }
  }
  for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
    if (GWIMUN[B[i]] === B[j]) { extra.push({ name: '귀문관살', han: '鬼門關殺', at: '원국', pos: BRANCHES_HAN[B[i]] + BRANCHES_HAN[B[j]], good: 0, text: '예민하고 촉이 남다른 배치입니다. 남이 못 보는 것을 봅니다. 예술·기획·상담·기술에서 크게 쓰이지만, 생각이 한 곳에 고이면 스스로를 갉아먹으니 몸을 쓰는 시간을 꼭 만드세요.' }); break; }
  }
  // 고신 · 과숙
  const yb = P.year.branch;
  const gosin = [11, 0, 1].includes(yb) ? 2 : [2, 3, 4].includes(yb) ? 5 : [5, 6, 7].includes(yb) ? 8 : 11;
  const gwasuk = [11, 0, 1].includes(yb) ? 10 : [2, 3, 4].includes(yb) ? 1 : [5, 6, 7].includes(yb) ? 4 : 7;
  if (has(gosin)) extra.push({ name: '고신살', han: '孤辰殺', at: whereOf(gosin), pos: BRANCHES_HAN[gosin], good: 0, text: '홀로 있는 시간이 필요한 별입니다. 사람 속에서도 한 발 떨어져 있는 편입니다. 결이 맞는 소수와 깊게 가면 오히려 편안합니다.' });
  if (has(gwasuk)) extra.push({ name: '과숙살', han: '寡宿殺', at: whereOf(gwasuk), pos: BRANCHES_HAN[gwasuk], good: 0, text: '조용하고 담백한 별입니다. 북적이는 자리보다 혼자 정리하는 시간에서 힘이 납니다. 외로움이 아니라 성향으로 보시면 됩니다.' });

  /* ── 삼재 ── */
  let samjae = null;
  if (gy >= 0) {
    const yrs = SAMJAE_YEARS[gy];
    const nowY = o.year || nowYearKST();
    const list = [];
    for (let dy = 0; dy <= 12; dy++) {
      const Y = nowY + dy - 2;
      const b = ((Y - 4) % 12 + 12) % 12;
      const k = yrs.indexOf(b);
      if (k >= 0) list.push({ year: Y, kind: ['들삼재', '눌삼재', '날삼재'][k] });
    }
    const near = list.filter((x) => x.year >= nowY).slice(0, 3);
    const cur = near.find((x) => x.year === nowY) || null;
    samjae = {
      cycle: yrs.map((b) => BRANCHES_HAN[b]).join('·'),
      now: cur, next: near,
      text: cur
        ? `올해는 ${cur.kind}입니다. 삼재는 3년에 걸쳐 지나가는 시기로, 새로 크게 벌이기보다 지키고 정리하는 해로 봅니다. 다만 삼재라고 다 나쁜 것은 아니고, 원국이 튼튼하면 오히려 정리하고 넘어가는 계기가 됩니다.`
        : `${BRANCHES_HAN[P.year.branch]}년생은 ${yrs.map((b) => BRANCHES_HAN[b]).join('·')}년이 삼재입니다. 올해는 삼재에 들지 않습니다.`,
    };
  }

  /* ── 지지 관계 (원국 내부) ── */
  const rel = [];
  const posName = ['년지', '월지', '일지', '시지'];
  for (let i = 0; i < B.length; i++) for (let j = i + 1; j < B.length; j++) {
    for (const r of branchRelationLocal(B[i], B[j])) {
      rel.push({
        k: r.k, label: r.label, a: BRANCHES_HAN[B[i]], b: BRANCHES_HAN[B[j]],
        at: posName[i] + '–' + posName[j], good: r.w > 0 ? 1 : -1, text: REL_TXT[r.k],
      });
    }
  }
  // 천간합 · 천간충
  const S = s.stems;
  for (let i = 0; i < S.length; i++) for (let j = i + 1; j < S.length; j++) {
    if (GAN_HAP_L[S[i]] === S[j]) rel.push({ k: 'ganhap', label: '천간합', a: STEMS_HAN[S[i]], b: STEMS_HAN[S[j]], at: posName[i].replace('지', '간') + '–' + posName[j].replace('지', '간'), good: 1, text: '하늘의 두 글자가 손을 잡습니다. 인연과 협력이 잘 붙는 배치입니다. 다만 묶인 글자는 제 역할을 덜 하게 됩니다.' });
    if (GAN_CHUNG_L[S[i]] === S[j]) rel.push({ k: 'ganchung', label: '천간충', a: STEMS_HAN[S[i]], b: STEMS_HAN[S[j]], at: posName[i].replace('지', '간') + '–' + posName[j].replace('지', '간'), good: -1, text: '하늘의 두 글자가 정면으로 부딪힙니다. 생각이 자주 갈리고 결정이 늦어집니다. 대신 한번 정하면 강하게 밀어붙입니다.' });
  }

  /* ── 육친 ── */
  const yukchin = buildYukchin(t, gender, me);

  /* ── 직업 ── */
  const job = {
    main: JOB_BY_GYEOK[base.gyeokguk.key] || JOB_BY_GYEOK.식신,
    elem: ELEM_USE[base.yongsin.yong.i].job,
    text: `격국은 ${base.gyeokguk.name}이고 용신은 ${base.yongsin.yong.han}${base.yongsin.yong.name}입니다. `
      + `격국이 "어떤 방식으로 일하는 사람인가"를, 용신이 "어떤 분야에서 힘이 붙는가"를 말해 줍니다. 두 줄이 겹치는 지점이 가장 잘 맞는 자리입니다.`,
  };

  /* ── 건강 ── */
  const d = s.dist;
  const weakest = d.indexOf(Math.min(...d));
  const strongest = d.indexOf(Math.max(...d));
  const health = {
    weak: { i: weakest, elem: ELEMENT_HAN[weakest] + ELEMENTS[weakest], ...HEALTH[weakest] },
    strong: { i: strongest, elem: ELEMENT_HAN[strongest] + ELEMENTS[strongest], ...HEALTH[strongest] },
    lead: `${ELEMENT_HAN[weakest]}${ELEMENTS[weakest]} 기운이 가장 얇고, ${ELEMENT_HAN[strongest]}${ELEMENTS[strongest]} 기운이 가장 두텁습니다.`,
    text: `얇은 쪽인 ${HEALTH[weakest].organ}(${HEALTH[weakest].part})이 먼저 신호를 보냅니다. ${HEALTH[weakest].under}. ${HEALTH[weakest].care} `
      + (d[strongest] > 38
        ? `반대로 ${ELEMENT_HAN[strongest]}${ELEMENTS[strongest]}이 지나치게 몰려 ${HEALTH[strongest].organ} 쪽에 부담이 갑니다. ${HEALTH[strongest].over}이 겹치면 바로 티가 납니다.`
        : '두터운 쪽이 극단적이지는 않아, 관리만 하면 큰 문제로 가지 않습니다.'),
    note: '사주로 보는 건강은 타고난 체질의 경향입니다. 의학적 진단이 아니며, 증상이 있으면 반드시 병원에서 확인하세요.',
  };

  /* ── 성격 ── */
  const ic = ILGAN_CHAR[me];
  const topSin = base.topSipsin[0];
  const personality = {
    lead: `${STEMS_HAN[me]}${STEMS[me]} — ${ic[0]}`,
    text: ic[1],
    add: (topSin ? `여기에 ${topSin.name}(${topSin.han})이 ${topSin.pct}%로 가장 두텁습니다. ${topSin.text} ` : '')
      + `기운의 세기는 ${base.strength.level}이라, ${base.strength.level === '중화' ? '상황에 따라 결이 달라집니다.' : base.strength.level.includes('강') ? '스스로 결정하고 밀어붙이는 쪽으로 기울어집니다.' : '사람과 환경에 기대어 힘을 얻는 쪽으로 기울어집니다.'}`,
  };

  /* ── 월운 ── */
  const wolun = buildWolun(s, base.seun.year, me);

  return { sin12, extra, samjae, rel, yukchin, job, health, personality, wolun };
}

const REL_TXT = {
  yukhap: '두 글자가 손을 잡습니다. 그 자리의 일이 부드럽게 이어지고 사람이 잘 붙습니다.',
  samhap: '세 글자가 모여 하나의 국(局)을 이루려는 배치입니다. 흩어진 일이 한 방향으로 모입니다. 사주에서 가장 힘이 세게 작용하는 결합입니다.',
  chung: '두 글자가 정면으로 부딪힙니다. 그 자리의 일에 변동이 잦습니다. 나쁘게만 볼 것은 아니고, 고여 있던 것을 깨고 나가는 힘이기도 합니다.',
  hyeong: '서로를 다듬으려다 상처를 내는 배치입니다. 시비·구설·수술수로 봅니다. 대신 법·의료·감사처럼 남을 다루는 일에서는 오히려 쓰입니다.',
  jahyeong: '같은 글자가 스스로를 찌르는 배치입니다. 자책이 잦고 혼자 끙끙 앓는 편입니다.',
  hae: '자잘하게 어긋나는 배치입니다. 큰일은 아닌데 계속 걸립니다. 사람 관계에서 특히 그렇습니다.',
  pa: '깨뜨리는 배치입니다. 다 되어가던 일이 마지막에 한 번 틀어지는 형태로 나타납니다.',
  same: '같은 글자가 겹쳤습니다. 그 기운이 두 배로 진해집니다. 좋은 쪽이든 나쁜 쪽이든 뚜렷하게 나타납니다.',
};
const GAN_HAP_L = { 0: 5, 5: 0, 1: 6, 6: 1, 2: 7, 7: 2, 3: 8, 8: 3, 4: 9, 9: 4 };
const GAN_CHUNG_L = { 0: 6, 6: 0, 1: 7, 7: 1, 2: 8, 8: 2, 3: 9, 9: 3 };
const HYEONG3_L = [[2, 5, 8], [1, 10, 7]];
const HYEONG_SELF_L = [4, 6, 9, 11];
const HAE_L = { 0: 7, 7: 0, 1: 6, 6: 1, 2: 5, 5: 2, 3: 4, 4: 3, 8: 11, 11: 8, 9: 10, 10: 9 };
const PA_L = { 0: 9, 9: 0, 3: 6, 6: 3, 4: 1, 1: 4, 10: 7, 7: 10, 2: 11, 11: 2, 5: 8, 8: 5 };
function branchRelationLocal(a, b) {
  const r = [];
  if (YUKHAP[a] === b) r.push({ k: 'yukhap', label: '육합', w: 1 });
  for (let i = 0; i < 4; i++) if (SAMHAP[i].includes(a) && SAMHAP[i].includes(b) && a !== b) r.push({ k: 'samhap', label: '삼합', w: 1 });
  if (CHUNG[a] === b) r.push({ k: 'chung', label: '충', w: -1 });
  for (const h of HYEONG3_L) if (h.includes(a) && h.includes(b) && a !== b) r.push({ k: 'hyeong', label: '형', w: -1 });
  if (a === b && HYEONG_SELF_L.includes(a)) r.push({ k: 'jahyeong', label: '자형', w: -1 });
  if (HAE_L[a] === b) r.push({ k: 'hae', label: '해', w: -1 });
  if (PA_L[a] === b) r.push({ k: 'pa', label: '파', w: -1 });
  if (a === b && !HYEONG_SELF_L.includes(a)) r.push({ k: 'same', label: '복음', w: 1 });
  return r;
}

/* 육친 */
function buildYukchin(t, gender, me) {
  const lv = (v) => (v >= 22 ? 'high' : v >= 9 ? 'mid' : v >= 2.5 ? 'low' : 'none');
  const bi = t[0] + t[1], sik = t[2] + t[3], jae = t[4] + t[5], gwan = t[6] + t[7], iny = t[8] + t[9];
  const rows = [];
  const push = (title, sub, v, texts) => rows.push({ title, sub, pct: r1(v), level: lv(v), text: texts[lv(v)] });

  push('아버지', '편재(偏財)로 봅니다', t[4], {
    high: '아버지 쪽 인연이 두텁습니다. 영향을 많이 받고 자랐거나, 아버지가 활동적인 분이었을 가능성이 높습니다.',
    mid: '아버지와의 인연이 무난합니다. 크게 기대지도, 멀지도 않은 거리입니다.',
    low: '아버지와의 거리가 조금 있는 편입니다. 표현이 적었거나 일로 바빴을 수 있습니다.',
    none: '아버지 자리가 얇습니다. 일찍 독립했거나 스스로 길을 찾은 쪽입니다. 나쁘게 볼 것은 아니고, 기대지 않고 큰 힘이 있다는 뜻이기도 합니다.',
  });
  push('어머니', '정인(正印)으로 봅니다', t[9], {
    high: '어머니 덕이 두텁습니다. 보살핌을 충분히 받았고, 지금도 정신적으로 기대는 부분이 있습니다.',
    mid: '어머니와의 인연이 무난합니다. 필요한 때 받을 만큼 받았습니다.',
    low: '어머니와의 인연이 조금 얇습니다. 애정은 있어도 표현이 서툰 관계였을 수 있습니다.',
    none: '어머니 자리가 얇습니다. 일찍 알아서 크는 쪽이었습니다. 대신 내가 누군가를 챙기는 자리에 서면 잘합니다.',
  });
  push('형제·동료', '비겁(比劫)으로 봅니다', bi, {
    high: '형제와 동료가 인생에 크게 작용합니다. 사람이 잘 모이는 대신 같은 몫을 두고 겹치는 일이 잦습니다. 역할과 조건을 먼저 정하세요.',
    mid: '형제·동료와의 관계가 무난합니다. 필요할 때 손을 잡고, 적당한 거리를 지킵니다.',
    low: '또래보다 혼자 하는 것이 편합니다. 동업보다는 단독으로 가는 쪽이 잘 맞습니다.',
    none: '기댈 동료가 얇은 자리입니다. 혼자 다 하려다 지치기 쉬우니, 일부러라도 사람을 붙이세요.',
  });
  const spouseKey = gender === 'f' ? '관성(官星)' : gender === 'm' ? '재성(財星)' : '재성·관성';
  const spouseV = gender === 'f' ? gwan : gender === 'm' ? jae : (jae + gwan) / 2;
  push('배우자', `${spouseKey}으로 봅니다`, spouseV, {
    high: '배우자 인연이 두텁습니다. 인연이 여럿 스치는 만큼 고르는 눈이 중요합니다. 처음부터 조건을 좁혀두는 편이 낫습니다.',
    mid: '배우자 인연이 안정적입니다. 때가 되면 자연스럽게 이어지는 형태입니다.',
    low: '인연이 늦게 오거나 한 번에 깊게 오는 편입니다. 조급해할 필요는 없습니다.',
    none: '배우자성이 얇습니다. 가만히 기다리면 잘 안 옵니다. 사람이 모이는 자리에 나를 놓아두는 것이 방법입니다.',
  });
  const childKey = gender === 'f' ? '식상(食傷)' : gender === 'm' ? '관성(官星)' : '식상·관성';
  const childV = gender === 'f' ? sik : gender === 'm' ? gwan : (sik + gwan) / 2;
  push('자녀', `${childKey}으로 봅니다`, childV, {
    high: '자녀 인연이 두텁습니다. 아이에게 쏟는 마음이 크고, 아이 일로 인생의 방향이 바뀌기도 합니다.',
    mid: '자녀와의 인연이 무난합니다. 주고받는 균형이 좋습니다.',
    low: '자녀 인연이 조금 얇습니다. 늦게 두거나, 수가 적을 수 있습니다.',
    none: '자녀 자리가 얇습니다. 꼭 자식이 없다는 뜻은 아니고, 그 자리에 다른 것(제자·후배·작품)이 들어오는 경우가 많습니다.',
  });
  return {
    rows,
    note: gender ? '' : '성별을 알려주시면 배우자·자녀 자리를 전통 방식(남자는 재성=처, 여자는 관성=남편)으로 정확히 갈라서 봅니다. 지금은 두 가지를 합쳐 보고 있습니다.',
  };
}

/* 월운 12개월 */
function buildWolun(s, year, me) {
  const yStem = ((year - 4) % 10 + 10) % 10;
  const inStem = ((yStem % 5) * 2 + 2) % 10;   // 오호둔: 인월의 천간
  const out = [];
  for (let i = 0; i < 12; i++) {
    // i=0 → 인월(양력 2월경)
    const st = (inStem + i) % 10;
    const br = (2 + i) % 12;
    const sinIdx = sipsin(me, st);
    const un = unseongOf(me, br);
    let sc = 52 + [4, -5, 9, 2, 6, 9, -6, 6, 0, 10][sinIdx] + [6, 1, 5, 8, 8, 2, -1, 0, -1, -6, 1, 4][un.i] * 0.7;
    const tags = [];
    if (CHUNG[s.dayBranch] === br) { sc -= 8; tags.push('일지충'); }
    if (YUKHAP[s.dayBranch] === br) { sc += 6; tags.push('육합'); }
    if ((CHEONEUL[me] || []).includes(br)) { sc += 8; tags.push('천을귀인'); }
    if (samhapGroup(s.dayBranch) >= 0 && samhapGroup(s.dayBranch) === samhapGroup(br)) { sc += 5; tags.push('삼합'); }
    out.push({
      m: i + 1,
      label: `${MONTH_TERM[(i + 1) % 12]} 이후`,
      solar: i === 11 ? `${year + 1}년 1월` : MONTH_LABEL[i + 1],
      gz: STEMS_HAN[st] + BRANCHES_HAN[br],
      sipsin: SIPSIN[sinIdx], group: SIPSIN_INFO[sinIdx].g, color: SIPSIN_INFO[sinIdx].c,
      unseong: un.name,
      score: clamp(Math.round(sc), 18, 95),
      head: DAEUN_TXT[sinIdx][0].replace('10년', '달'),
      text: MONTH_TIP[sinIdx],
      tags,
    });
  }
  return { year, list: out, note: '월운은 절기 기준입니다. 예를 들어 인월(寅月)은 입춘부터 경칩 전까지로, 양력 2월 초부터 3월 초까지입니다.' };
}
const MONTH_TIP = [
  '내 뜻대로 밀어붙이게 되는 달입니다. 결정을 미루지 마세요. 대신 사람과 몫을 두고 부딪히기 쉽습니다.',
  '지출이 늘어나는 달입니다. 큰 계약과 보증은 다음 달로 미루는 편이 낫습니다.',
  '몸도 마음도 편해지는 달입니다. 미뤄둔 일을 꺼내고 사람을 만나기 좋습니다.',
  '아이디어가 터지고 말이 세지는 달입니다. 발표와 기획에 좋고, 윗사람 앞에서는 한 박자 참으세요.',
  '판이 커지는 달입니다. 기회가 여러 갈래로 들어옵니다. 하나만 골라 크게 가세요.',
  '계산이 맞아떨어지는 달입니다. 정산·계약·정리에 가장 좋습니다.',
  '압박이 들어오는 달입니다. 피하면 커지니 짧게 정면으로 처리하세요. 건강과 운전을 조심하세요.',
  '자세를 고쳐 앉는 달입니다. 서류·보고·공식 자리에 유리합니다. 지각과 말실수만 조심하세요.',
  '생각이 깊어지는 달입니다. 공부와 자료 정리에 좋지만 큰 결정은 미루는 편이 낫습니다.',
  '도움이 들어오는 달입니다. 부탁할 일이 있으면 이 달에 말을 꺼내세요.',
];

/* ── 60갑자 일주론 ── */
const ILJU = [
  ['甲子', '물 위의 큰 나무', '물이 넉넉한 자리에 선 나무입니다. 머리가 좋고 배움이 빠릅니다. 다만 뿌리가 물에 잠겨 결정이 자주 미뤄집니다.'],
  ['乙丑', '언 땅의 새싹', '찬 흙을 뚫고 나오는 싹입니다. 시작이 더디지만 한번 붙잡으면 놓지 않습니다. 끈기로 이기는 자리입니다.'],
  ['丙寅', '동틀 무렵의 해', '막 떠오르는 해입니다. 기운이 시원하고 앞장서기를 좋아합니다. 사람을 밝히는 힘이 있습니다.'],
  ['丁卯', '등불 옆의 화초', '은근하게 오래 타는 불입니다. 섬세하고 눈치가 빠릅니다. 가까운 사람을 잘 챙깁니다.'],
  ['戊辰', '용이 든 큰 산', '안에 물과 기운을 품은 산입니다. 스케일이 크고 배포가 있습니다. 한번 정하면 잘 안 바꿉니다.'],
  ['己巳', '볕 좋은 밭', '해가 잘 드는 기름진 흙입니다. 실속이 있고 사람을 길러냅니다. 계산도 정확합니다.'],
  ['庚午', '불에 든 쇠', '달궈지는 쇳덩이입니다. 성격이 급하고 뜨겁습니다. 제련이 끝나면 아주 단단해집니다.'],
  ['辛未', '흙에 묻힌 보석', '아직 닦이지 않은 보석입니다. 기준이 높고 예민합니다. 알아봐 주는 사람을 만나면 크게 빛납니다.'],
  ['壬申', '샘이 솟는 물', '마르지 않는 물줄기입니다. 머리가 잘 돌고 활동 범위가 넓습니다. 한자리에 오래 머물기 어렵습니다.'],
  ['癸酉', '바위에 맺힌 이슬', '맑고 차가운 물입니다. 깔끔하고 판단이 정확합니다. 정이 없어 보일 만큼 냉정할 때가 있습니다.'],
  ['甲戌', '마른 땅의 큰 나무', '척박한 땅에 선 나무입니다. 자수성가형입니다. 초년이 고단해도 뒤로 갈수록 두터워집니다.'],
  ['乙亥', '물가에 뻗은 덩굴', '물이 풍부한 자리의 덩굴입니다. 사람과 잘 어울리고 어디서든 살아남습니다.'],
  ['丙子', '한밤중의 태양', '어두운 자리에 뜬 해입니다. 남과 다르게 보고 다르게 갑니다. 인정받기까지 시간이 걸립니다.'],
  ['丁丑', '언 흙 속의 불씨', '안에서 조용히 타는 불입니다. 겉은 무던한데 속이 단단합니다. 오래 참고 끝을 봅니다.'],
  ['戊寅', '나무를 품은 산', '숲이 우거진 산입니다. 사람을 품고 이끄는 힘이 있습니다. 책임을 잘 맡습니다.'],
  ['己卯', '싹이 돋은 밭', '작은 것을 길러내는 흙입니다. 섬세하고 부지런합니다. 남을 챙기다 자기 걸 놓칩니다.'],
  ['庚辰', '용을 탄 쇠', '괴강(魁罡)의 자리입니다. 기운이 크고 카리스마가 있습니다. 중간이 없는 편입니다.'],
  ['辛巳', '불에 든 보석', '달궈지며 다듬어지는 보석입니다. 압박 속에서 실력이 나옵니다. 예민한 만큼 정교합니다.'],
  ['壬午', '한낮의 강물', '해를 안고 흐르는 큰 물입니다. 활달하고 사교적입니다. 돈과 사람이 같이 붙습니다.'],
  ['癸未', '마른 땅의 이슬', '메마른 흙 위의 물입니다. 쓰임이 절실한 자리라 어디서나 필요한 사람이 됩니다.'],
  ['甲申', '바위 틈의 나무', '단단한 곳에 뿌리내린 나무입니다. 부딪히며 큽니다. 강단이 있고 잘 꺾이지 않습니다.'],
  ['乙酉', '가위 밑의 화초', '다듬어지는 자리의 화초입니다. 예민하고 기준이 높습니다. 미적 감각이 남다릅니다.'],
  ['丙戌', '저녁놀', '산 너머로 지는 해입니다. 정이 많고 사람을 잘 품습니다. 마무리를 잘 짓습니다.'],
  ['丁亥', '물 위의 등불', '어두운 물 위를 밝히는 불입니다. 남의 어려움을 잘 봅니다. 상담·의료·종교와 인연이 깊습니다.'],
  ['戊子', '물을 막은 둑', '흐르는 물을 잡아두는 흙입니다. 재물을 모으는 힘이 있습니다. 융통성만 조금 더 있으면 됩니다.'],
  ['己丑', '얼어붙은 밭', '찬 흙입니다. 겉으로는 조용한데 속에 쌓아둔 것이 많습니다. 늦게 크게 됩니다.'],
  ['庚寅', '나무를 자르는 도끼', '쓸 데가 분명한 쇠입니다. 결단이 빠르고 실행이 확실합니다. 움직임이 많은 자리입니다.'],
  ['辛卯', '화초를 다듬는 칼', '섬세한 손끝의 자리입니다. 미세한 차이를 봅니다. 예술·기술·미용과 인연이 깊습니다.'],
  ['壬辰', '용이 든 바다', '깊고 큰 물입니다. 포부가 크고 사람을 크게 품습니다. 괴강의 힘이 함께 있습니다.'],
  ['癸巳', '불 위의 이슬', '뜨거운 자리에 놓인 물입니다. 머리가 아주 빠릅니다. 위기에서 오히려 잘 판단합니다.'],
  ['甲午', '한여름의 나무', '잎이 무성한 나무입니다. 표현이 시원하고 사람이 잘 모입니다. 속으로는 지치기 쉽습니다.'],
  ['乙未', '마른 흙의 덩굴', '제 밭을 가진 화초입니다. 실속을 챙기고 뿌리를 내립니다. 고집이 은근히 셉니다.'],
  ['丙申', '물가에 지는 해', '쇠와 물이 있는 자리의 해입니다. 재주가 많고 활동 범위가 넓습니다. 변화가 잦습니다.'],
  ['丁酉', '보석을 비추는 등불', '가장 잘 어울리는 조합입니다. 세련되고 감각이 좋습니다. 사람 앞에 서는 일에서 빛납니다.'],
  ['戊戌', '마른 산', '단단하고 두꺼운 흙입니다. 괴강의 자리라 고집과 뚝심이 셉니다. 한번 맡으면 끝까지 갑니다.'],
  ['己亥', '물 곁의 밭', '물을 머금은 기름진 흙입니다. 재물을 다루는 감각이 있습니다. 사람에게 후합니다.'],
  ['庚子', '물에 씻긴 쇠', '맑게 씻긴 쇳덩이입니다. 총명하고 표현이 시원합니다. 하고 싶은 말은 하고 삽니다.'],
  ['辛丑', '흙 속의 보석', '묻혀 있는 보석입니다. 참을성이 대단합니다. 시간이 지날수록 값이 오릅니다.'],
  ['壬寅', '나무를 키우는 물', '베푸는 자리의 물입니다. 인덕이 있고 남을 잘 세워줍니다. 스스로는 손해를 보기도 합니다.'],
  ['癸卯', '화초를 적시는 이슬', '꼭 필요한 곳에 스며드는 물입니다. 조용히 남을 살립니다. 교육·돌봄과 인연이 깊습니다.'],
  ['甲辰', '용을 탄 나무', '기운이 큰 자리의 나무입니다. 포부가 크고 시작을 잘합니다. 백호의 힘이 함께 있습니다.'],
  ['乙巳', '볕을 받은 화초', '꽃이 피는 자리입니다. 밝고 사람을 끌어당깁니다. 표현이 자연스럽습니다.'],
  ['丙午', '한낮의 해', '가장 센 불입니다. 숨기는 게 없고 시원합니다. 양인의 자리라 밀어붙이는 힘이 강합니다.'],
  ['丁未', '마른 흙 위의 등불', '은근히 오래 가는 불입니다. 속이 깊고 정이 많습니다. 겉으로는 잘 드러내지 않습니다.'],
  ['戊申', '돌이 많은 산', '광물을 품은 산입니다. 실속이 있고 움직임이 많습니다. 사업 감각이 있습니다.'],
  ['己酉', '보석이 든 밭', '작고 정교한 것을 길러내는 흙입니다. 꼼꼼하고 손끝이 야무집니다.'],
  ['庚戌', '흙 속의 쇳덩이', '단단한 자리의 쇠입니다. 괴강의 자리라 기운이 셉니다. 의리가 있고 밀리지 않습니다.'],
  ['辛亥', '물에 씻긴 보석', '맑게 닦인 보석입니다. 총명하고 감각이 뛰어납니다. 표현이 세련됐습니다.'],
  ['壬子', '깊은 바다', '가장 센 물입니다. 머리가 아주 좋고 생각이 깊습니다. 양인의 자리라 한번 정하면 안 굽힙니다.'],
  ['癸丑', '언 땅의 물', '갇힌 물입니다. 겉은 조용한데 안에 힘이 쌓여 있습니다. 인내로 이기는 자리입니다.'],
  ['甲寅', '숲을 이룬 나무', '제 자리를 얻은 나무입니다. 자립심이 강하고 남에게 기대지 않습니다. 건록의 자리입니다.'],
  ['乙卯', '봄의 화초', '가장 잘 자라는 자리의 화초입니다. 부드럽지만 질깁니다. 사람과 잘 어울립니다.'],
  ['丙辰', '물 머금은 땅 위의 해', '기운을 저장하는 자리의 해입니다. 사람을 품고 오래 갑니다.'],
  ['丁巳', '불 속의 등불', '제 자리를 얻은 불입니다. 밝고 열정이 셉니다. 하고 싶은 일에 몰입합니다.'],
  ['戊午', '한낮의 산', '해를 정면으로 받는 산입니다. 기운이 크고 양인의 힘이 있습니다. 고집이 세고 뚝심이 있습니다.'],
  ['己未', '한여름의 밭', '마른 흙입니다. 실속을 챙기고 끝까지 지킵니다. 겉보다 속이 단단합니다.'],
  ['庚申', '제 자리를 얻은 쇠', '가장 단단한 쇠입니다. 건록의 자리라 자립심이 강합니다. 의리가 있고 결단이 빠릅니다.'],
  ['辛酉', '다듬어진 보석', '가장 정교한 자리입니다. 깔끔하고 기준이 높습니다. 완벽하지 않으면 아예 안 합니다.'],
  ['壬戌', '산에 갇힌 물', '저장된 큰 물입니다. 속이 깊고 잘 드러내지 않습니다. 한번 터지면 크게 움직입니다.'],
  ['癸亥', '바다로 흘러든 물', '끝없이 흐르는 물입니다. 상상력이 풍부하고 정이 많습니다. 경계가 흐려 마음 고생을 하기도 합니다.'],
];
export function iljuOf(stem, branch) {
  let i = 0;
  for (let k = 0; k < 60; k++) if (k % 10 === stem && k % 12 === branch) { i = k; break; }
  const r = ILJU[i];
  return { idx: i, gz: r[0], name: r[1], text: r[2] };
}
