// tojeong.js — 토정비결
//
// 괘를 뽑는 방법은 전통 작괘법 그대로다. 다만 **괘사 문장은 우리가 직접 썼다.**
// 시중에 도는 번역문을 가져다 쓰지 않았다. 어느 책의 문장도 옮기지 않았다.
// 계산 방법과 이 사실은 /about 페이지에 그대로 공개한다.
//
// 작괘 (8 × 6 × 3 = 144괘)
//   나이   = 세는나이 = 대상연도 − 태어난 해 + 1
//   태세수 = 대상연도 간지의 (천간 순번 + 지지 순번)
//   월건수 = 태어난 달 월주 간지의 (천간 순번 + 지지 순번)
//   일진수 = 태어난 날 일주 간지의 (천간 순번 + 지지 순번)
//   월대소 = 태어난 음력 달의 일수 (29 또는 30)
//
//   상괘 = (태세수 + 나이)   mod 8 → 0이면 8
//   중괘 = (월건수 + 월대소) mod 6 → 0이면 6
//   하괘 = (일진수 + 음력 생일) mod 3 → 0이면 3

import { computeSaju, STEMS_HAN, BRANCHES_HAN, sipsin, SIPSIN } from './saju.js';
import { solarToLunar, lunarMonthLength } from './astro.js';

/* ── 상괘: 팔괘의 물상 ── */
const SANG = [
  null,
  { n: '건', han: '乾', img: '하늘', tone: 'gold',
    head: '하늘이 열리는 해',
    body: '위에서 길이 먼저 열립니다. 내가 밀지 않아도 자리가 만들어지는 흐름이라, 올해는 크게 잡아도 됩니다. 다만 다 가지려 들면 그 자리가 도로 무거워집니다.' },
  { n: '태', han: '兌', img: '못', tone: 'green',
    head: '물이 고이는 해',
    body: '말과 사람으로 풀리는 해입니다. 웃으며 건넨 한마디가 일을 만듭니다. 대신 입에서 새는 것도 이 해라, 하지 않아도 될 말은 삼키는 편이 낫습니다.' },
  { n: '리', han: '離', img: '불', tone: 'red',
    head: '불이 밝은 해',
    body: '드러나는 해입니다. 그동안 안 보이던 것이 눈에 띄고, 이름이 알려집니다. 밝은 만큼 그늘도 선명해지니 감추던 일은 미리 정리해 두세요.' },
  { n: '진', han: '震', img: '우레', tone: 'amber',
    head: '우레가 치는 해',
    body: '움직이는 해입니다. 자리를 옮기거나 새로 시작할 일이 생깁니다. 소리는 큰데 비는 적을 수 있으니, 벌인 뒤에 수습할 사람을 먼저 정해두세요.' },
  { n: '손', han: '巽', img: '바람', tone: 'blue',
    head: '바람이 드는 해',
    body: '스며드는 해입니다. 한 번에 되는 일은 없지만 꾸준히 밀면 어느새 자리가 잡힙니다. 방향만 자주 바꾸지 않으면 됩니다.' },
  { n: '감', han: '坎', img: '물', tone: 'gray',
    head: '물을 건너는 해',
    body: '한 고비가 있는 해입니다. 얕아 보여도 발을 담그면 깊습니다. 서두르지 말고 돌아가는 길을 택하면 큰 손해는 없습니다.' },
  { n: '간', han: '艮', img: '산', tone: 'blue',
    head: '산에 머무는 해',
    body: '멈춰야 이기는 해입니다. 답답해도 지금은 자리를 지키는 게 이득입니다. 이 해에 참은 것이 다음 해에 값을 합니다.' },
  { n: '곤', han: '坤', img: '땅', tone: 'green',
    head: '땅이 두터운 해',
    body: '받아주는 해입니다. 내가 나서기보다 남을 도우면 그게 돌아옵니다. 크게 벌기보다 넓게 쌓아두는 쪽이 맞습니다.' },
];

/* ── 중괘: 때의 마디 ── */
const JUNG = [
  null,
  { n: '이른 봄', line: '언 땅 밑에서 싹이 먼저 움직인다', when: '기미는 이미 보이는데 아직 눈에 띄지 않습니다. 봄이 오기 전에 준비를 마치세요.' },
  { n: '늦봄', line: '꽃이 피니 벌이 절로 찾아온다', when: '사람이 먼저 붙습니다. 이때 만난 인연이 한 해를 끌고 갑니다.' },
  { n: '한여름', line: '해가 높으니 그림자가 짧다', when: '가장 바쁜 때입니다. 힘을 몰아 쓰되 몸을 상하지 않게 하세요.' },
  { n: '초가을', line: '이삭이 여물어 고개를 숙인다', when: '거두는 때입니다. 벌이던 것을 접고 매듭을 지으면 남는 게 생깁니다.' },
  { n: '늦가을', line: '서리가 내려 남을 것만 남는다', when: '가려지는 때입니다. 붙잡고 있던 것 중 하나는 놓아야 합니다.' },
  { n: '한겨울', line: '눈 아래 뿌리가 조용히 자란다', when: '겉으로는 멈춘 듯한 때입니다. 이 시기에 쌓아둔 것은 밖에서 안 보일 뿐 사라지지 않습니다.' },
];

/* ── 하괘: 맺음 ── */
const HA = [
  null,
  { n: '이룸', tone: 1, close: '뜻한 바가 손에 닿는다', adv: '망설이지 말고 한 발 먼저 내디디세요. 올해는 움직인 쪽이 가져갑니다.' },
  { n: '기다림', tone: 0, close: '때가 아직 이르니 서두르지 말라', adv: '조급함이 가장 큰 손해입니다. 한 계절만 늦춰도 결과가 달라집니다.' },
  { n: '조심', tone: -1, close: '문단속을 하고 말을 아껴라', adv: '돈과 말, 이 둘만 단속하면 큰일은 없습니다. 보증과 즉답을 피하세요.' },
];

/* 상괘 × 하괘 = 24가지 한 해의 결 */
const CROSS = {
  '1-1': '큰 자리가 열립니다. 미루던 일을 올해 결정하세요.',
  '1-2': '자리는 보이는데 아직 내 것이 아닙니다. 준비된 사람에게 갑니다.',
  '1-3': '높이 오를수록 발밑이 위태롭습니다. 교만이 유일한 적입니다.',
  '2-1': '말이 곧 재산이 됩니다. 사람을 만나는 자리에 나가세요.',
  '2-2': '좋은 말이 오가지만 아직 문서로는 이르지 않습니다.',
  '2-3': '구설이 따릅니다. 남의 일에 편들지 마세요.',
  '3-1': '이름이 밝혀집니다. 내놓을 것이 있다면 올해 내놓으세요.',
  '3-2': '드러나기 전에 다듬을 시간이 조금 더 필요합니다.',
  '3-3': '드러난 만큼 시비도 따라옵니다. 문서를 두 번 읽으세요.',
  '4-1': '움직이면 열립니다. 이사나 이직이 좋게 작용합니다.',
  '4-2': '움직일 마음은 굴뚝같으나 아직 발을 떼지 마세요.',
  '4-3': '급하게 벌인 일이 탈이 됩니다. 계약과 운전을 조심하세요.',
  '5-1': '꾸준히 밀던 일이 자리를 잡습니다. 방향을 바꾸지 마세요.',
  '5-2': '바람은 부는데 아직 방향이 잡히지 않았습니다. 지켜보세요.',
  '5-3': '이 말 저 말에 흔들립니다. 결정은 혼자 하세요.',
  '6-1': '한 고비를 넘기면 그 뒤가 편합니다. 도움을 청하세요.',
  '6-2': '물이 아직 깊습니다. 건널 때를 기다리는 게 상책입니다.',
  '6-3': '물가에 서지 마세요. 돈을 빌려주는 일을 특히 피하세요.',
  '7-1': '멈춘 자리에서 오히려 얻습니다. 지금 있는 곳을 지키세요.',
  '7-2': '산은 넘는 게 아니라 돌아가는 것입니다. 우회로를 찾으세요.',
  '7-3': '무리하게 넘으려다 다칩니다. 몸부터 챙기세요.',
  '8-1': '베푼 것이 그대로 돌아옵니다. 사람에게 쓰는 돈이 아깝지 않습니다.',
  '8-2': '땅은 넓은데 아직 씨를 뿌릴 때가 아닙니다.',
  '8-3': '다 받아주다 내가 빕니다. 거절하는 법을 배우세요.',
};

/* 월운 — 그 달의 월건과 내 일간의 십신으로 낸다 */
const MONTH_SIPSIN = [
  { k: '비견', tone: 'gray', s: '내 뜻대로 밀어붙이게 되는 달입니다. 고집을 조금만 덜면 무리가 없습니다.' },
  { k: '겁재', tone: 'amber', s: '나가는 돈이 늘어납니다. 빌려주는 일과 동업 이야기를 미루세요.' },
  { k: '식신', tone: 'green', s: '먹고 웃을 일이 생깁니다. 미뤄둔 일을 꺼내기 좋은 달입니다.' },
  { k: '상관', tone: 'blue', s: '아이디어가 터지지만 말이 세게 나갑니다. 윗사람 앞에서 한 박자 참으세요.' },
  { k: '편재', tone: 'gold', s: '기회가 여러 갈래로 옵니다. 하나만 골라 잡는 달입니다.' },
  { k: '정재', tone: 'gold', s: '계산이 맞아떨어집니다. 정산과 계약에 좋은 달입니다.' },
  { k: '편관', tone: 'red', s: '압박이 들어옵니다. 피하지 말고 짧게 정면으로 처리하세요.' },
  { k: '정관', tone: 'blue', s: '자세가 잡히는 달입니다. 서류와 공식 자리에 유리합니다.' },
  { k: '편인', tone: 'gray', s: '생각이 깊어집니다. 공부와 정리에 좋고 결정은 미루는 게 낫습니다.' },
  { k: '정인', tone: 'green', s: '도움이 들어옵니다. 부탁할 일이 있으면 이 달에 꺼내세요.' },
];

/**
 * 토정비결
 * @param {object} birth 사용자가 입력한 생년월일 (normBirth 결과)
 * @param {number} year 볼 연도
 */
export function tojeong(birth, year) {
  const s = computeSaju(birth);
  const sol = s.solar;

  // 음력 생일
  const lun = s.lunar || solarToLunar(sol.y, sol.m, sol.d);
  if (!lun) throw new Error('음력을 계산할 수 없습니다.');

  // 세는나이 (음력 해 기준)
  const age = year - lun.y + 1;
  if (age < 1) throw new Error('태어나기 전 해는 볼 수 없습니다.');

  // 대상 연도의 간지 = 그 해 6월의 년주 (입춘 지난 시점)
  const taese = computeSaju({ y: year, m: 6, d: 15, unknownTime: true }).pillars.year;
  const taeseNum = (taese.stem + 1) + (taese.branch + 1);

  const wolju = s.pillars.month;
  const woljuNum = (wolju.stem + 1) + (wolju.branch + 1);
  const ilju = s.pillars.day;
  const iljuNum = (ilju.stem + 1) + (ilju.branch + 1);

  const monLen = lunarMonthLength(lun.y, lun.m, lun.leap) || 30;

  const sang = ((taeseNum + age) % 8) || 8;
  const jung = ((woljuNum + monLen) % 6) || 6;
  const ha = ((iljuNum + lun.d) % 3) || 3;

  const S = SANG[sang], J = JUNG[jung], H = HA[ha];
  const cross = CROSS[sang + '-' + ha];

  // 괘사 4행
  const verse = [
    `${S.img}의 기운이 한 해를 이끈다`,
    J.line,
    cross,
    H.close,
  ];

  // 월운 12개월 — 그 해 각 달의 월주와 내 일간
  const months = [];
  for (let m = 1; m <= 12; m++) {
    const mp = computeSaju({ y: year, m, d: 16, unknownTime: true }).pillars.month;
    const sin = sipsin(s.dayStem, mp.stem);
    const info = MONTH_SIPSIN[sin];
    months.push({
      m,
      gz: STEMS_HAN[mp.stem] + BRANCHES_HAN[mp.branch],
      sipsin: SIPSIN[sin],
      tone: info.tone,
      text: info.s,
    });
  }

  return {
    year,
    age,
    lunar: { y: lun.y, m: lun.m, d: lun.d, leap: !!lun.leap },
    gwae: { sang, jung, ha, num: sang * 100 + jung * 10 + ha },
    name: `${S.han}${S.n} · ${J.n} · ${H.n}`,
    head: S.head,
    tone: H.tone > 0 ? S.tone : H.tone === 0 ? 'blue' : 'gray',
    verse,
    body: S.body,
    when: J.when,
    advice: H.adv,
    cross,
    taese: STEMS_HAN[taese.stem] + BRANCHES_HAN[taese.branch],
    months,
  };
}
