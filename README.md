# Gemini Sidebar - 질문 & 메모

Google Gemini 페이지에 사이드바를 추가하여 질문을 저장하고, 북마크하고, 마크다운 메모를 작성할 수 있는 Chrome 확장프로그램입니다.

## 주요 기능

### 질문 관리
- 질문 저장, 수정, 삭제
- Gemini 채팅에 바로 적용 버튼
- URL별 세션 자동 분리

### 보관 (북마크)
- 중요한 질문 북마크
- 보관 탭에서 모아보기
- 보호 삭제 ("완전삭제" 입력 필요)
- 일괄 삭제 기능

### 마크다운 메모
- 쓰기/읽기 모드 토글
- marked.js 기반 마크다운 렌더링
- 자동 저장 (500ms 디바운스)

### UI/UX
- 4가지 테마 (다크, 라이트, 미드나잇, 모카)
- 드래그로 사이드바 너비 조절 (250~600px)
- Gemini 페이지와 겹치지 않는 레이아웃
- 단축키: `Ctrl+Shift+G` 토글

### 클라우드 동기화
- Supabase 연동
- 로컬 저장 + 클라우드 백업
- 계정별 데이터 분리

## 설치 방법

### 개발자 모드 설치
1. 이 저장소를 클론합니다
```bash
git clone https://github.com/kimbeomsick/gemini_sidebar.git
cd gemini_sidebar
```

2. 의존성 설치 및 빌드
```bash
npm install
npm run build
```

3. Chrome에 로드
   - `chrome://extensions` 접속
   - 개발자 모드 ON
   - "압축 해제된 확장 프로그램을 로드합니다" 클릭
   - `dist/` 폴더 선택

4. [gemini.google.com](https://gemini.google.com) 접속하여 사용

## 기술 스택

| 기술 | 용도 |
|------|------|
| TypeScript | 메인 소스 코드 |
| Chrome Extension Manifest V3 | 확장프로그램 기반 |
| chrome.storage.local | 로컬 데이터 저장 |
| Supabase | 클라우드 데이터 동기화 |
| marked.js | 마크다운 파싱 |
| CSS Custom Properties | 테마 시스템 |

## 프로젝트 구조

```
gemini-sidebar/
├── src/
│   ├── content.ts      # 메인 콘텐츠 스크립트 (사이드바 UI + 로직)
│   └── background.ts   # 서비스 워커 (아이콘 클릭 처리)
├── content.css          # 스타일 (CSS 변수 기반 4테마)
├── libs/
│   └── marked.min.js    # 마크다운 파서
├── icons/               # 확장프로그램 아이콘 (16, 48, 128px)
├── dist/                # 빌드 결과물 (Chrome에 로드할 폴더)
├── worklog/             # 작업 기록
│   ├── ROAD MAP.md      # 로드맵
│   └── deploy-guide.md  # 배포 가이드
├── manifest.json        # Chrome Extension 설정
├── build.mjs            # 빌드 스크립트 (에셋 복사)
├── tsconfig.json        # TypeScript 설정
└── package.json         # 프로젝트 설정
```

## 빌드

```bash
npm run build
```

`tsc`로 TypeScript 컴파일 후 `build.mjs`로 정적 에셋을 `dist/`에 복사합니다.

## 라이선스

MIT
