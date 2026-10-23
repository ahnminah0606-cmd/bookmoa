# Bookmoa

두 사람이 함께 읽은 책과 사유를 기록하는 React 앱입니다. AI 요약은 OpenAI API를 서버에서만 호출합니다.

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. `.env.example`을 `.env.local`로 복사하고 `OPENAI_API_KEY`, `FIREBASE_PROJECT_ID`, Firebase 클라이언트 설정을 입력합니다. `OPENAI_API_KEY`에는 `VITE_` 접두어를 붙이지 마세요.
3. Run the app:
   `npm run dev`

## Deploy

OpenAI 비밀 키가 필요하므로 GitHub Pages만으로는 배포할 수 없습니다. Vercel에 저장소를 연결하고 프로젝트 환경 변수에 `OPENAI_API_KEY`, `FIREBASE_PROJECT_ID`, Firebase 값을 등록하세요. `api/summarize.ts`가 Firebase 로그인 토큰을 검증한 뒤 Vercel Serverless Function에서만 OpenAI를 호출합니다.

## 책 속 문장

로그인한 서재에서 책을 추가하면 `/api/quotes`가 서점(교보문고, YES24, 알라딘)의 공개 발췌문을 한 번 검색합니다. 검색 결과의 출처와 실제 페이지의 책 제목·저자·문장을 대조한 짧은 문장을 최대 3개까지 책의 `quoteLookup`에 저장합니다. 홈은 읽기 상태와 관계없이 저장된 목록만 표시하고 출처 링크를 제공합니다. 기존 책은 업데이트 후 처음 로그인했을 때 한 번씩 순서대로 검색합니다.

검색 실패/문장 없음도 저장하므로 홈 방문이나 새로고침으로 재검색하지 않습니다. 홈의 ‘문장을 저장하지 못한 책’에서 ‘다시 찾기’를 눌러 재시도할 수 있습니다. 제목·저자·ISBN을 바꾸면 새 도서 정보로 다시 검색합니다. 삭제한 책의 문장은 홈에서 제외합니다. 공개된 본문이 없거나 출처 페이지를 확인할 수 없으면 문장을 만들어 채우지 않습니다.

기존 서버 환경 변수 `OPENAI_API_KEY`, `FIREBASE_PROJECT_ID`를 사용하며 검색 모델은 `OPENAI_QUOTE_MODEL`로 선택할 수 있습니다(기본 `gpt-5-mini`). 모델의 웹 검색 도구 접근이 필요하고 책별 최초 검색과 수동 재시도에는 API 사용료가 발생합니다. Vercel 배포 시 `/api/quotes`의 최대 실행 시간은 60초입니다.
