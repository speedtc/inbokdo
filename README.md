# 인복도 人福圖

사주 명리로 그리는 사람 별자리 지도. 생년월일을 넣고 링크를 공유하면, 참여한 친구들이 각자의 일간(日干) 오행 방위에 별처럼 배치되고 나와 기운이 잘 맞을수록 안쪽으로 들어옵니다.

Cloudflare Workers + D1 위에서 돌아갑니다. 서버 코드 한 덩어리, 프론트 파일 하나. 빌드 도구가 따로 없습니다.

---

## 1. 무엇이 들어 있나

```
src/
  index.js    Worker 진입점 — 라우팅, API, 페이지 렌더, OG 태그
  app.html    프론트엔드 전체 (HTML + CSS + JS 한 파일)
  saju.js     사주 산출 — 년월일시 사주, 오행 분포, 십신, 합충, 신살
  compat.js   관계 판정 — 궁합 점수, 12가지 관계 유형, 10가지 천간 캐릭터
  astro.js    절기·삭(신월) 계산, 음양력 변환, ΔT, 한국 표준시 변천
  vsop.js     VSOP87 축약 급수 — 태양 겉보기 황경 (절기 시각 계산용)
  auth.js     카카오·네이버 OAuth 2.0 로그인
  legal.js    이용약관 / 개인정보처리방침
  og.png      카카오톡·SNS 공유 썸네일 (1200×630)
test/
  astro.test.mjs   음양력 변환·절기 검증
  saju.test.mjs    사주 산출 교차검증 (lunar-javascript 대조)
tools/
  mkog.py     OG 이미지 생성 스크립트 (Pillow)
```

### 계산의 정확도

- 절기 시각은 VSOP87 축약 급수로 직접 계산합니다. 한국천문연구원 발표 시각과 **분 단위까지 일치**합니다.
- 음양력 변환은 삭(新月) 시각과 중기(中氣) 배치로 윤달을 판정합니다. 1988년처럼 한국과 중국의 음력 날짜가 하루 어긋나는 경우도 **한국 기준으로** 맞습니다.
- 사주 산출은 널리 검증된 `lunar-javascript`와 3,817건을 교차검증해 3,806건이 완전 일치합니다. 나머지 11건은 전부 **한국 표준시 vs 베이징 표준시** 차이로 설명되며, 한국 기준으로는 이 구현이 맞습니다.
- 1954~1961년 표준시 변경(UTC+8:30)과 1948~1988년 서머타임 시행 기간을 반영합니다.

---

## 2. 배포하기

### 방법 A — 깃허브 연동 (추천)

한 번 연결해두면 `git push`만으로 배포됩니다.

1. 깃허브에 새 저장소를 만들고 이 폴더를 통째로 올립니다.

   ```bash
   git init
   git add .
   git commit -m "인복도 첫 배포"
   git branch -M main
   git remote add origin https://github.com/<사용자명>/inbokdo.git
   git push -u origin main
   ```

2. **D1 데이터베이스를 먼저 만듭니다.** Cloudflare 대시보드 → **Storage & Databases** → **D1** → **Create**
   - 이름: `inbokdo`
   - 위치: **Asia-Pacific**
   - 만들고 나면 나오는 **Database ID**를 복사합니다.

3. `wrangler.toml`의 `database_id`를 복사한 값으로 바꾸고 다시 push 합니다.

4. Cloudflare 대시보드 → **Compute (Workers)** → **Create** → **Import a repository**
   - 깃허브 계정을 연결하고 방금 만든 저장소를 선택합니다.
   - Build command: **비워둡니다**
   - Deploy command: `npx wrangler deploy`
   - **Create and deploy**

5. 배포가 끝나면 `https://inbokdo.<계정명>.workers.dev` 주소가 나옵니다.

### 방법 B — 명령어로 바로

```bash
npm install
npx wrangler login          # 브라우저가 열립니다
npx wrangler d1 create inbokdo --location apac
# 출력된 database_id 를 wrangler.toml 에 붙여넣고
npx wrangler deploy
```

테이블은 첫 요청이 들어올 때 자동으로 만들어집니다. 마이그레이션 명령을 따로 돌릴 필요가 없습니다.

---

## 3. 도메인 연결

`workers.dev` 주소로도 잘 돌아가지만, 카카오 로그인 심사와 공유 링크의 신뢰도를 생각하면 도메인을 붙이는 편이 좋습니다.

Cloudflare 대시보드 → 해당 Worker → **Settings** → **Domains & Routes** → **Add** → **Custom domain**

---

## 4. 환경변수

전부 **선택 사항**입니다. 하나도 설정하지 않아도 서비스는 그대로 돌아갑니다 (로그인 버튼만 안 보임).

대시보드에서 넣는 법: Worker → **Settings** → **Variables and Secrets** → **Add**
명령어로 넣는 법: `npx wrangler secret put KAKAO_REST_KEY`

| 이름 | 쓰임 | 없으면 |
|---|---|---|
| `KAKAO_REST_KEY` | 카카오 로그인 | 카카오 버튼 숨김 |
| `KAKAO_CLIENT_SECRET` | 카카오 로그인 | 〃 |
| `KAKAO_JS_KEY` | 카카오톡 공유 (Kakao SDK) | 기본 공유(Web Share)로 대체 |
| `NAVER_CLIENT_ID` | 네이버 로그인 | 네이버 버튼 숨김 |
| `NAVER_CLIENT_SECRET` | 네이버 로그인 | 〃 |
| `SESSION_SECRET` | 세션 state 서명 | 다른 시크릿으로 대체 (설정 권장) |
| `CONTACT_EMAIL` | 약관·방침의 문의처 | "설정해 주세요" 문구 노출 |
| `POLICY_DATE` | 약관 시행일 | 2026-08-20 |
| `PAY_PROVIDER` | 결제 연동 활성화 | 정원 해제 API가 "준비 중" 반환 |

> `SESSION_SECRET`은 아무 긴 랜덤 문자열이면 됩니다. `openssl rand -base64 32`

---

## 5. 카카오 / 네이버 로그인 붙이기

**배포해서 주소가 나온 다음에** 진행해야 합니다. Redirect URI를 등록해야 하기 때문입니다.

### 카카오

1. https://developers.kakao.com → **내 애플리케이션** → **애플리케이션 추가하기**
2. **앱 설정 → 플랫폼 → Web** 에 사이트 도메인 등록 (`https://내주소`)
3. **제품 설정 → 카카오 로그인** → 활성화 ON
4. **Redirect URI** 에 `https://내주소/auth/kakao/callback` 등록
5. **동의항목** 에서 **닉네임**과 **프로필 사진**을 "필수 동의"로 설정
6. **보안** 탭에서 **Client Secret** 생성 후 "사용함"으로 설정
7. **앱 키** 탭의 **REST API 키** → `KAKAO_REST_KEY`, **JavaScript 키** → `KAKAO_JS_KEY`
8. **비즈니스 채널 연결과 개인정보처리방침 URL**(`https://내주소/privacy`)을 등록해야 심사가 통과됩니다

### 네이버

1. https://developers.naver.com/apps → **애플리케이션 등록**
2. 사용 API: **네이버 로그인**, 제공 정보: **닉네임**, **프로필 사진**
3. 환경: **PC 웹**, 서비스 URL `https://내주소`
4. Callback URL: `https://내주소/auth/naver/callback`
5. 발급된 **Client ID / Client Secret**을 환경변수에 넣습니다

---

## 6. 정원과 성장 구조

| 항목 | 값 | 코드 위치 |
|---|---|---|
| 기본 정원 | 10명 | `src/index.js` `FREE_LIMIT` |
| 출석으로 늘릴 수 있는 최대 | 30명 | `CHECKIN_CAP` |
| 초대 1명당 보너스 | +2자리 | `REF_BONUS` |
| 초대 포함 상한 | 60명 | `REF_CAP` |
| 절대 상한 | 300명 | `HARD_CAP` |

- **출석체크**: 하루 1회, 자리 1개. 한국 날짜 기준으로 서버가 판정하므로 시간대를 바꿔도 중복이 안 됩니다.
- **초대 보상**: 내 링크로 들어온 사람이 **자기 지도를 만들면** 내 정원이 2 늘어납니다. 공유 버튼을 눌렀는지가 아니라 실제 결과를 기준으로 하므로 조작이 불가능합니다.

---

## 7. 결제 붙이는 자리

`src/index.js`의 이 함수 하나만 채우면 됩니다.

```js
async function verifyPayment(env, body) {
  return false;   // ← 여기
}
```

`POST /api/maps/:code/unlock` 이 지도 주인 토큰을 검증한 뒤 이 함수를 호출하고, `true`가 돌아오면 정원을 `HARD_CAP`으로 올립니다. `PAY_PROVIDER` 환경변수가 없으면 아예 호출되지 않고 "준비 중"을 반환합니다.

**토스페이먼츠 예시**

```js
async function verifyPayment(env, body) {
  const res = await fetch('https://api.tosspayments.com/v1/payments/confirm', {
    method: 'POST',
    headers: {
      authorization: 'Basic ' + btoa(env.TOSS_SECRET_KEY + ':'),
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      paymentKey: body.paymentKey,
      orderId: body.orderId,
      amount: body.amount,
    }),
  });
  if (!res.ok) return false;
  const j = await res.json();
  return j.status === 'DONE' && j.totalAmount === 기대금액;
}
```

> 검증은 **반드시 서버에서** 해야 합니다. 클라이언트가 보낸 "결제 성공"을 그대로 믿으면 개발자도구로 누구나 무료 해제가 됩니다.

---

## 8. 로컬에서 돌려보기

```bash
npm install
npx wrangler dev --local
# http://127.0.0.1:8787
```

로그인까지 시험하려면 프로젝트 루트에 `.dev.vars` 파일을 만듭니다 (깃에 올리지 마세요).

```
KAKAO_REST_KEY=...
KAKAO_CLIENT_SECRET=...
SESSION_SECRET=아무_긴_랜덤_문자열
```

검증 스크립트:

```bash
node test/astro.test.mjs    # 음양력·절기
node test/saju.test.mjs     # 사주 교차검증 (npm i lunar-javascript 필요)
```

OG 썸네일을 다시 만들려면:

```bash
pip install pillow
python3 tools/mkog.py
```

---

## 9. API

| 메서드 | 경로 | 설명 |
|---|---|---|
| POST | `/api/maps` | 지도 생성 `{name, birth, ref?}` |
| GET | `/api/maps/:code` | 지도 조회 (`?token=` 있으면 주인 뷰) |
| POST | `/api/maps/:code/join` | 참여 `{name, birth}` — 정원 초과 시 402 |
| GET | `/api/maps/:code/entries/:id?token=` | 내 결과 다시 보기 |
| DELETE | `/api/maps/:code/entries/:id?token=` | 참여자 삭제 (주인만) |
| POST | `/api/maps/:code/checkin` | 출석체크 |
| POST | `/api/maps/:code/unlock` | 정원 해제 (결제 연동 자리) |
| POST | `/api/maps/:code/claim` | 브라우저 지도를 로그인 계정에 붙이기 |
| GET | `/api/me` | 내 정보 + 내 지도 목록 |
| GET | `/api/lunar?y=` | 해당 연도의 윤달 |
| POST | `/api/saju` | 사주만 계산 |
| GET | `/api/meta` | 관계 유형·캐릭터 정의 |

### 개인정보 취급

참여자의 생년월일은 궁합 계산을 위해 저장되지만, **어떤 API로도 외부에 노출되지 않습니다.** 지도 주인에게도 보이지 않습니다. 다른 참여자에게 보이는 것은 이름, 점수, 관계 유형, 일간 캐릭터뿐입니다.

---

## 10. 남은 일

- [ ] 카카오 / 네이버 앱 등록 후 키 연결
- [ ] `CONTACT_EMAIL` 설정 (약관·방침에 필요)
- [ ] 결제 또는 후원 링크 연결
- [ ] 지도 삭제 기능 (개인정보 삭제 요구권 대응)
- [ ] 참여자 신고 / 닉네임 필터
