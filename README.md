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
