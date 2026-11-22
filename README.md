# 올해 첫 곡은 뭐양? · 복주머니 레코드

붉은 양이 눈을 세 번 깜빡이고, 고개를 한 번 끄덕이고, 무음으로 흥얼거리는 인사가 끝나면 이름을 입력하고 복주머니를 엽니다. 서버가 27곡 중 한 곡과 27개 덕담 중 하나를 각각 추첨하고, 공식 YouTube 영상으로 들을 수 있으며 이름이 들어간 900×1100 PNG 티켓을 저장할 수 있습니다.

Next.js App Router · React · TypeScript(strict) · styled-components. DB, 회원가입, API 키가 필요 없습니다.

## 실행

Node.js 20.9 이상(개발·검증은 Node 24에서 했습니다).

```bash
npm install
npm run dev        # http://localhost:3027 (개발 서버)
npm run typecheck  # next typegen + tsc --noEmit
npm test           # vitest: 추첨·기간 경계·API·저장·티켓 레이아웃·인트로 시간축
npm run build
npm start          # http://localhost:3027 (프로덕션 서버)
```

처음 실행하면 **테스트 모드**라서 날짜와 상관없이 바로 참여하고 여러 번 다시 뽑을 수 있습니다.

## 테스트 / 정식 모드 전환

`.env.example`을 `.env.local`로 복사해 `EVENT_MODE`를 바꾼 뒤 서버를 다시 시작합니다. 값이 없거나 `live`가 아니면 항상 `test`입니다.

| 값 | 동작 |
|---|---|
| `EVENT_MODE=test` (기본) | 언제든 열림. 다시 뽑기는 직전 곡·덕담을 각각 제외합니다. |
| `EVENT_MODE=live` | 2027-01-01 00:00 ~ 2027-01-02 00:00 **한국시간**(UTC 2026-12-31T15:00Z ~ 2027-01-01T15:00Z)에만 열림. 그 전은 대기, 이후는 마감. 같은 브라우저에서는 처음 받은 곡·덕담을 다시 보여 줍니다. |

PowerShell에서 한 번만 정식 모드로 띄우려면:

```powershell
$env:EVENT_MODE='live'; npm start
```

모드는 서버에서만 읽고 `GET /api/event` 응답으로 화면에 전달됩니다. 정식 모드의 “1회”는 같은 브라우저 저장소 기준 UX이며 로그인·IP·기기 간 동기화는 하지 않습니다.

## 곡·덕담 수정

- 곡: `src/data/songs.ts` — `{ title, artist, videoId }`. `videoId`는 YouTube 영상 ID 11자(대소문자·밑줄·하이픈 그대로).
- 덕담: `src/data/blessings.ts`.

배열 길이는 코드에서 읽으므로 개수를 바꿔도 됩니다. 다만 브라우저에는 “인덱스 + 영상 ID”로 마지막 결과가 저장되므로, **순서를 바꾸거나 영상 ID를 바꾸면 이전에 저장된 결과는 자동으로 폐기**됩니다. 수정 후 `npm test`의 데이터 검사(개수·ID 중복·형식)를 함께 고쳐 주세요.

## 구조

```text
src/app/layout.tsx            한국어 문서, 메타데이터·viewport·테마색, styled-components 레지스트리
src/app/page.tsx              서버 컴포넌트 진입점 (인트로 포스터가 초기 HTML에 포함)
src/app/api/event/route.ts    GET  현재 모드·기간·서버 시각·곡 메타데이터
src/app/api/draw/route.ts     POST 이름 검증 + 균등 추첨 (테스트 재추첨은 ?song=&wish=)
src/components/               NewYearExperience(흐름) · IntroPortrait · FortuneScene · DrawResult · PlayerDialog · HelpDialog · Modal
src/lib/event.ts              모드/기간 판정, 이름 검증, Web Crypto 균등 추첨, 핸들러(시각·난수 주입 가능)
src/lib/portrait.ts           인트로 얼굴 합성·끄덕임·음표 (원본 1254px 좌표)
src/lib/art.ts                336×272 픽셀 풍경, 84×88 복주머니
src/lib/ticket.ts             티켓 레이아웃(실측 줄바꿈)과 PNG 저장
src/lib/storage.ts            모드별 마지막 결과(이름 제외) · 구버전 v1 키 호환 · 저장소 차단 시 메모리
src/styles/                   SSR 레지스트리, 전역 토큰
public/assets/yang.png        마스코트 원화 1254×1254 (인트로·장면·티켓 공용)
```

## 참고

- 음악은 사용자가 ‘첫 곡 듣기’를 누를 때만 YouTube 임베드가 생성됩니다. 일부 영상은 지역·권리 설정으로 임베드가 막힐 수 있어 모달에 원문 링크가 항상 있습니다. YouTube 광고가 나올 수 있습니다.
- 글꼴은 Pretendard → Apple SD Gothic Neo → Malgun Gothic 순서로 기기에 설치된 글꼴을 씁니다. Pretendard를 모든 기기에 강제하려면 웹폰트를 `layout.tsx`에서 불러오세요.
