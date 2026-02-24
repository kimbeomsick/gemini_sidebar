# Gemini Sidebar Extension - 진행 상황

## 완료된 작업

### 1. 플랜 작성 완료
- `.omc/plans/gemini-sidebar-extension.md` 에 전체 플랜 저장됨
- 계정별 저장 (DOM에서 이메일 추출 → storage key prefix)
- 비로그인 시 "default" fallback

### 2. 생성된 파일들 (모두 완료)

| 파일 | 상태 | 설명 |
|------|------|------|
| `manifest.json` | 완료 | Chrome Manifest V3 설정 |
| `package.json` | 완료 | devDeps: typescript, @types/chrome |
| `tsconfig.json` | 완료 | target ES2022, module None, outDir dist |
| `build.mjs` | 완료 | 정적 에셋을 dist/로 복사 |
| `generate-icons.mjs` | 완료 | PNG 아이콘 생성 스크립트 |
| `content.css` | 완료 | 사이드바 전체 스타일 (다크 테마) |
| `icons/icon16.png` | 완료 | 확장 아이콘 |
| `icons/icon48.png` | 완료 | 확장 아이콘 |
| `icons/icon128.png` | 완료 | 확장 아이콘 |
| `libs/marked.min.js` | 완료 | 마크다운 파서 라이브러리 |
| `src/content.ts` | 완료 | 메인 콘텐츠 스크립트 (전체 로직) |
| `src/background.ts` | 완료 | 서비스 워커 (아이콘 클릭 처리) |
| `src/types.ts` | 완료 | 타입 정의 (사용 안 함, content.ts에 내장) |
| `src/storage.ts` | 완료 | 스토리지 모듈 (사용 안 함, content.ts에 내장) |
| `node_modules/` | 완료 | npm install 성공 |

### 3. 불필요한 파일 (삭제 가능)
- `src/types.ts` - content.ts에 타입이 내장되어 있어 불필요
- `src/storage.ts` - content.ts에 스토리지 로직이 내장되어 있어 불필요

## 남은 작업

### 1. 폴더명 변경
```
"확장 프로그램" → "gemini-sidebar"
```

### 2. TypeScript 컴파일
```bash
npm run build
```
이 명령어가 실행되면:
- `tsc`로 src/*.ts → dist/*.js 컴파일
- `build.mjs`로 manifest.json, content.css, libs/, icons/ → dist/에 복사

### 3. Chrome에 로드
1. `chrome://extensions` → 개발자 모드 ON
2. "압축 해제된 확장 프로그램을 로드합니다" 클릭
3. `dist/` 폴더 선택
4. gemini.google.com 접속하여 테스트

## 재개 시 명령어

```bash
cd ~/Desktop/gemini-sidebar
npm run build
```

빌드가 또 segfault 나면:
```bash
npx tsc
# 또는
node ./node_modules/typescript/bin/tsc
```

## 아키텍처 요약

```
src/content.ts  → 사이드바 UI, 탭, 카드, 마크다운, 계정 감지, 세션 저장
src/background.ts → 확장 아이콘 클릭 시 toggle-sidebar 메시지 전송
content.css     → 다크 테마 스타일 (Gemini 색상 맞춤)
libs/marked.min.js → 마크다운 → HTML 변환
```
