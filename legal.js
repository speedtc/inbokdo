// legal.js — 이용약관 / 개인정보처리방침
// 문의는 카카오톡 오픈채팅. CONTACT_KAKAO 환경변수로 바꿀 수 있습니다.

const SHELL = (title, body) => `<!DOCTYPE html>
<html lang="ko"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#080b14">
<meta name="robots" content="index,follow">
<title>${title} · 스피드 운세지도</title>
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css">
<style>
*,*::before,*::after{box-sizing:border-box}
body{margin:0;background:#080b14;color:#e9e5db;
 font-family:-apple-system,BlinkMacSystemFont,'Pretendard Variable',Pretendard,system-ui,sans-serif;
 font-size:16px;line-height:1.75;letter-spacing:-.02em;-webkit-font-smoothing:antialiased}
.w{max-width:640px;margin:0 auto;padding:40px 22px 90px}
a{color:#d9b45b}
h1{font-size:29px;font-weight:700;letter-spacing:-.04em;margin:0 0 6px}
h2{font-size:18px;font-weight:700;letter-spacing:-.03em;margin:38px 0 10px;color:#f2dfa5}
p,li{color:#c3cad8;font-size:15.5px}
ul{padding-left:19px;margin:10px 0}
li{margin:5px 0}
table{width:100%;border-collapse:collapse;margin:12px 0;font-size:14.5px}
th,td{border:1px solid rgba(255,255,255,.12);padding:9px 11px;text-align:left;vertical-align:top}
th{background:rgba(255,255,255,.05);color:#e9e5db;font-weight:600;white-space:nowrap}
td{color:#c3cad8}
.date{color:#5d6579;font-size:13.5px}
.back{display:inline-block;margin-bottom:26px;color:#8a92a6;font-size:14px;text-decoration:none}
.note{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.10);border-radius:14px;padding:16px;margin:18px 0}
footer{margin-top:56px;padding-top:20px;border-top:1px solid rgba(255,255,255,.09);color:#5d6579;font-size:13px}
</style></head>
<body><div class="w"><a class="back" href="/">← 스피드 운세지도</a>${body}
<footer>📚 스피드 운세지도 運勢地圖</footer></div></body></html>`;

export function privacyPage(env) {
  const kakao = env.CONTACT_KAKAO || 'https://open.kakao.com/me/speedtc';
  const contact = `<a href="${kakao}" target="_blank" rel="noopener">카카오톡 오픈채팅으로 문의하기</a>`;
  const updated = env.POLICY_DATE || '2026-08-20';
  return SHELL('개인정보처리방침', `
<h1>개인정보처리방침</h1>
<p class="date">시행일 ${updated}</p>

<p>스피드 운세지도(이하 "서비스", 구 인연지도)는 이용자의 개인정보를 소중히 다루며, 「개인정보 보호법」을 비롯한 관련 법령을 준수합니다.</p>

<h2>1. 수집하는 개인정보</h2>
<table>
<tr><th>구분</th><th>항목</th><th>수집 방법</th></tr>
<tr><td>필수</td><td>이름 또는 닉네임, 생년월일, 태어난 시각(선택), 양력·음력 구분</td><td>이용자 직접 입력</td></tr>
<tr><td>로그인 시</td><td>소셜 로그인 제공자의 회원 식별번호, 닉네임, 프로필 이미지</td><td>카카오·네이버 로그인 연동</td></tr>
<tr><td>자동 생성</td><td>지도·방 식별 코드, 접속 일시</td><td>서비스 이용 과정</td></tr>
</table>
<p>서비스는 이메일 주소, 전화번호, 주소, 결제 정보를 수집하지 않습니다.</p>

<h2>2. 이용 목적</h2>
<ul>
<li>입력한 생년월일시를 사주(四柱)로 환산하여 두 사람 사이의 관계를 분석</li>
<li>같은 방식으로 재물 등 분야별 지도의 개인 점수를 산출</li>
<li>이용자가 만든 지도와 방의 저장 및 재접속 시 조회</li>
</ul>

<h2>3. 보유 및 파기</h2>
<ul>
<li>회원 정보: 계정 삭제 요청 시 지체 없이 파기합니다.</li>
<li>지도 및 참여 기록: 마지막 접속일로부터 1년이 지나면 파기합니다.</li>
<li>로그인하지 않고 만든 지도: 생성일로부터 1년이 지나면 파기합니다.</li>
</ul>

<h2>4. 제3자 제공</h2>
<p>서비스는 이용자의 개인정보를 제3자에게 제공하지 않습니다. 다른 참여자에게는 <b>이름(닉네임), 궁합 점수, 관계 유형, 일간 캐릭터</b>만 표시되며 <b>생년월일과 태어난 시각은 지도 주인을 포함한 누구에게도 공개되지 않습니다.</b></p>

<h2>5. 처리 위탁</h2>
<table>
<tr><th>수탁자</th><th>업무</th></tr>
<tr><td>Cloudflare, Inc.</td><td>서비스 호스팅 및 데이터 저장</td></tr>
</table>

<h2>6. 이용자의 권리</h2>
<p>이용자는 언제든지 자신의 개인정보에 대한 열람·정정·삭제·처리정지를 요구할 수 있습니다. 로그인 후 지도를 삭제하거나, 아래 연락처로 요청하시면 처리해 드립니다.</p>

<h2>7. 만 14세 미만 아동</h2>
<p>만 14세 미만 아동의 개인정보를 수집할 때에는 법정대리인의 동의가 필요합니다. 만 14세 미만 이용자는 법정대리인의 동의를 받은 후 이용해 주시기 바랍니다.</p>

<h2>8. 안전성 확보 조치</h2>
<ul>
<li>모든 통신은 HTTPS로 암호화됩니다.</li>
<li>지도 접근 권한은 추측이 어려운 임의 코드와 세션으로 관리됩니다.</li>
<li>개인정보 취급자를 최소한으로 제한합니다.</li>
</ul>

<h2>9. 쿠키</h2>
<p>로그인 상태 유지를 위해 필수 쿠키만 사용하며, 광고나 행태정보 수집 목적의 쿠키는 사용하지 않습니다.</p>

<h2>10. 개인정보 보호책임자</h2>
<p>후원·광고 문의 및 프로그램 사용 문의는 아래로 주세요.</p>
<p>${contact}</p>
<p class="date">본 방침이 변경되는 경우 서비스 내 공지를 통해 알려드립니다.</p>
`);
}

export function termsPage(env) {
  const kakao = env.CONTACT_KAKAO || 'https://open.kakao.com/me/speedtc';
  const contact = `<a href="${kakao}" target="_blank" rel="noopener">카카오톡 오픈채팅으로 문의하기</a>`;
  const updated = env.POLICY_DATE || '2026-08-20';
  return SHELL('이용약관', `
<h1>이용약관</h1>
<p class="date">시행일 ${updated}</p>

<h2>제1조 (목적)</h2>
<p>이 약관은 스피드 운세지도(이하 "서비스", 구 인연지도)의 이용 조건과 절차, 이용자와 서비스의 권리·의무를 정합니다.</p>

<h2>제2조 (서비스의 성격)</h2>
<div class="note">
<p style="margin:0"><b>서비스가 제공하는 결과는 사주 명리학에 기반한 해석이며, 오락과 참고를 목적으로 합니다.</b> 의료·법률·재무·진로에 관한 전문적 조언이 아니며, 결과를 근거로 발생한 판단과 그 결과에 대해 서비스는 책임지지 않습니다. 사람을 평가하거나 차별하는 근거로 사용하지 마십시오.</p>
</div>

<h2>제3조 (이용 요금)</h2>
<ul>
<li><b>서비스의 모든 기능은 무료입니다.</b> 인연지도, 재물지도, 오늘의 운세, 사주팔자, 분야별 풀이 어느 것도 요금을 받지 않습니다.</li>
<li>참여 인원에 제한을 두지 않습니다. 다만 서버 보호를 위해 지도·방 하나당 최대 300명까지만 기록합니다.</li>
<li>서비스는 <b>기능을 잠그고 요금을 받는 방식으로 운영하지 않습니다.</b> 운영 비용은 이용자의 자발적인 후원과 광고로 충당합니다.</li>
<li>후원은 순수한 자발적 지원이며, 후원 여부에 따라 이용할 수 있는 기능이나 결과가 달라지지 않습니다. 후원한다고 점수가 좋아지지 않습니다.</li>
<li>서비스는 결제 수단이나 결제 정보를 직접 수집·보관하지 않습니다.</li>
</ul>

<h2>제4조 (이용자의 의무)</h2>
<ul>
<li>타인의 생년월일을 본인 동의 없이 입력해서는 안 됩니다.</li>
<li>타인을 사칭하거나 모욕·비방하는 닉네임을 사용해서는 안 됩니다.</li>
<li>자동화된 수단으로 서비스에 반복 접근하거나 정상적인 운영을 방해해서는 안 됩니다.</li>
<li>서비스의 계산 결과를 무단으로 복제하여 영리 목적으로 재배포해서는 안 됩니다.</li>
</ul>

<h2>제5조 (게시물의 관리)</h2>
<p>서비스는 제4조를 위반한 닉네임이나 참여 기록을 사전 통지 없이 삭제할 수 있습니다.</p>

<h2>제6조 (서비스의 변경과 중단)</h2>
<p>서비스는 운영상·기술상 필요에 따라 제공하는 기능의 전부 또는 일부를 변경하거나 중단할 수 있습니다. 중대한 변경이 있는 경우 서비스 내에 공지합니다.</p>

<h2>제7조 (책임의 제한)</h2>
<p>서비스는 천재지변, 회선 장애, 이용자의 귀책사유로 인한 손해에 대해 책임지지 않습니다. 무료로 제공되는 서비스의 이용과 관련하여 발생한 손해에 대해서는 법령에 특별한 규정이 없는 한 배상 책임을 지지 않습니다.</p>

<h2>제8조 (준거법 및 관할)</h2>
<p>이 약관은 대한민국 법령에 따라 해석되며, 분쟁이 발생한 경우 민사소송법상의 관할 법원에 제소합니다.</p>

<h2>제9조 (문의)</h2>
<p>후원·광고 문의 및 프로그램 사용 문의는 아래로 주세요.</p>
<p>${contact}</p>
`);
}
