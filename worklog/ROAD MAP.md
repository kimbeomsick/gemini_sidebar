# Gemini Sidebar - Road Map

## Phase 1: 프로젝트 초기 설정
- [x] 프로젝트 구조 생성 (manifest.json, tsconfig, package.json)
- [x] 빌드 시스템 구성 (tsc + build.mjs, generate-icons.mjs)
- [x] 아이콘 생성 (16, 48, 128px)
- [x] .gitignore 설정

## Phase 2: 핵심 기능 개발
- [x] 사이드바 UI 구현 (질문, 보관, 메모 3탭)
- [x] 질문 CRUD (추가, 수정, 삭제)
- [x] 마크다운 메모 (쓰기/읽기 토글, marked.js)
- [x] XSS 보안 처리 (DOMParser 기반 sanitize)
- [x] 북마크/보관 시스템 (보호 삭제 "완전삭제" 입력)
- [x] Gemini 채팅에 적용 버튼
- [x] 드래그 리사이즈 (250~600px)
- [x] 4가지 테마 (다크, 라이트, 미드나잇, 모카)
- [x] 페이지 레이아웃 조정 (Gemini 화면 겹침 방지)
- [x] URL 변경 감지 및 세션 자동 전환
- [x] background.ts 서비스 워커 (아이콘 클릭 토글)

## Phase 3: Supabase 클라우드 동기화
- [x] Supabase 프로젝트 생성 및 테이블 설계
- [x] sessions 테이블 (메모 저장)
- [x] questions 테이블 (질문 + bookmarked 컬럼)
- [x] REST API 연동 (supabaseFetch)
- [x] 저장 시 클라우드 자동 동기화
- [x] 로드 시 클라우드 데이터 복원

## Phase 4: 문서화 및 배포
- [ ] PROGRESS.md 작성
- [ ] 배포 가이드 작성 (worklog/deploy-guide.md)
- [ ] Git 초기화 및 커밋
- [ ] GitHub 원격 연결 및 푸쉬

## 향후 계획
- [ ] Supabase Auth 로그인 구현
- [ ] 데이터 내보내기/가져오기 (JSON)
- [ ] Chrome Web Store 배포
- [ ] 다국어 지원 (영어)
