# Gemini Sidebar Extension - Implementation Plan

## 1. Requirements Summary

Gemini 웹 페이지(gemini.google.com) 좌측에 사이드바 패널을 삽입하는 크롬 확장 프로그램.
사용자가 질문을 카드 형태로 저장하고, 마크다운 메모를 작성할 수 있으며, 모든 데이터는 Gemini 세션(대화)별로 분리 저장된다.

### Core Features
- **질문 카드 리스트**: 하단 입력창에서 Enter로 질문을 카드 형태로 추가, 세로 스크롤 나열
- **마크다운 메모 탭**: Obsidian 스타일 마크다운 에디터 (라이브 프리뷰)
- **세션별 저장**: Gemini 대화 세션마다 독립적인 질문/메모 데이터
- **최소 UI**: 단순하고 깔끔한 디자인

### Supplemented Requirements (원본에서 보완)
- **패널 토글**: 확장 아이콘 클릭 또는 단축키(Ctrl+Shift+G)로 사이드바 열기/닫기
- **세션 감지**: Gemini URL 경로에서 대화 ID 추출하여 세션 식별
- **계정별 저장**: Gemini 페이지 DOM에서 로그인 계정 이메일을 추출하여 계정별 데이터 분리 저장
  - 로그인 상태: `{email}_session_{id}` 키로 저장
  - 비로그인 상태: 계정 구분 없이 `default_session_{id}` 키로 저장
- **카드 삭제/편집**: 저장된 질문 카드 삭제 기능 (X 버튼)
- **마크다운 에디터**: 편집/미리보기 토글 (2가지 모드)
- **데이터 저장소**: chrome.storage.local (5MB 제한, 충분)
- **반응형 폭**: 사이드바 기본 너비 320px, 드래그로 리사이즈 가능
- **빈 상태 UI**: 질문/메모가 없을 때 안내 메시지 표시

---

## 2. Architecture

```
gemini-sidebar/
├── manifest.json              # Chrome Extension Manifest V3
├── content.js                 # Content script - Gemini 페이지에 사이드바 주입
├── content.css                # 사이드바 스타일
├── background.js              # Service worker - 아이콘 클릭, 단축키 처리
├── libs/
│   └── marked.min.js          # 마크다운 파서 (marked.js, 경량)
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

### 기술 스택
- **Vanilla JS + CSS**: 프레임워크 없이 순수 구현 (경량, 빠른 로드)
- **marked.js**: 마크다운 → HTML 변환 (CDN 대신 번들 포함, ~28KB)
- **Chrome Storage API**: 세션별 데이터 영속화
- **Content Script**: Gemini 페이지 DOM에 직접 사이드바 주입

### 왜 Content Script 방식인가?
- Chrome Side Panel API는 별도 창으로 열려서 Gemini 페이지와 나란히 배치 불가
- Content Script로 Gemini 페이지 내부에 직접 패널을 삽입하면 자연스러운 좌측 사이드바 구현 가능
- Gemini 페이지의 메인 콘텐츠 영역을 오른쪽으로 밀어서 공간 확보

---

## 3. UI Layout

```
┌─────────────────────────────────────────────────────────┐
│ [Gemini 페이지]                                          │
│                                                         │
│ ┌──────────────┐ ┌────────────────────────────────────┐ │
│ │  SIDEBAR     │ │                                    │ │
│ │              │ │  Gemini 메인 콘텐츠                  │ │
│ │ [질문] [메모] │ │  (응답 영역)                        │ │
│ │ ─────────── │ │                                    │ │
│ │              │ │                                    │ │
│ │ ┌──────────┐ │ │                                    │ │
│ │ │ 카드 1   │ │ │                                    │ │
│ │ │ 질문내용  │ │ │                                    │ │
│ │ └──────────┘ │ │                                    │ │
│ │ ┌──────────┐ │ │                                    │ │
│ │ │ 카드 2   │ │ │                                    │ │
│ │ │ 질문내용  │ │ │                                    │ │
│ │ └──────────┘ │ │                                    │ │
│ │              │ │                                    │ │
│ │ (스크롤 영역) │ │                                    │ │
│ │              │ │                                    │ │
│ │ ┌──────────┐ │ │                                    │ │
│ │ │ 입력창   │ │ │                                    │ │
│ │ │          │ │ │  Gemini 입력창                      │ │
│ │ └──────────┘ │ │                                    │ │
│ └──────────────┘ └────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### 탭 구조
- **질문 탭**: 카드 리스트 + 하단 입력창
- **메모 탭**: 마크다운 에디터 (편집 모드 / 미리보기 모드 토글)

### 카드 컴포넌트
```
┌─────────────────────────┐
│ 질문 내용 텍스트...      │  ← 최대 3줄 미리보기
│                         │
│ 2024-02-24 14:30  [✕]   │  ← 타임스탬프 + 삭제 버튼
└─────────────────────────┘
```

---

## 4. Acceptance Criteria

- [ ] AC1: Gemini 페이지(gemini.google.com/*) 접속 시 좌측에 사이드바가 표시된다
- [ ] AC2: 확장 아이콘 클릭 시 사이드바가 토글(열기/닫기)된다
- [ ] AC3: 하단 입력창에 텍스트 입력 후 Enter → 카드가 리스트에 추가된다
- [ ] AC4: 하단 입력창에서 Shift+Enter → 줄바꿈이 된다
- [ ] AC5: 카드의 X 버튼 클릭 시 해당 카드가 삭제된다
- [ ] AC6: "메모" 탭 클릭 시 마크다운 에디터가 표시된다
- [ ] AC7: 마크다운 에디터에서 편집/미리보기 토글이 동작한다
- [ ] AC8: 마크다운 미리보기 시 헤더, 볼드, 이탤릭, 코드블록, 리스트가 렌더링된다
- [ ] AC9: Gemini URL 변경(세션 전환) 시 해당 세션의 데이터가 로드된다
- [ ] AC10: 새 세션 접속 시 빈 질문 리스트와 빈 메모가 표시된다
- [ ] AC11: 페이지 새로고침 후에도 저장된 데이터가 유지된다
- [ ] AC12: 사이드바가 열릴 때 Gemini 메인 콘텐츠가 오른쪽으로 밀린다 (겹침 없음)
- [ ] AC13: 로그인 상태에서 계정 이메일이 저장 키에 포함된다 (계정별 데이터 분리)
- [ ] AC14: 비로그인 상태에서는 "default" 접두사로 저장되며 정상 동작한다
- [ ] AC15: 계정 전환 시 해당 계정의 데이터만 표시된다

---

## 5. Implementation Steps

### Step 1: 프로젝트 구조 및 Manifest 생성
- `manifest.json` 작성 (Manifest V3)
  - permissions: `storage`, `activeTab`
  - content_scripts: gemini.google.com 매칭
  - action: 아이콘 클릭 핸들러
  - commands: 단축키 등록
- 아이콘 파일 생성 (간단한 SVG → PNG)

### Step 2: Content Script - 사이드바 컨테이너 주입
- `content.js`에서 DOM 로드 후 사이드바 HTML 구조 생성
- Gemini 페이지의 메인 콘텐츠 영역을 찾아 margin-left 조정
- 사이드바 토글 로직 구현
- Shadow DOM 사용하여 Gemini 스타일과 충돌 방지

### Step 3: 탭 시스템 구현
- 질문/메모 2개 탭 전환 UI
- 활성 탭 하이라이트 스타일
- 탭 전환 시 컨텐츠 영역 교체

### Step 4: 질문 카드 시스템 구현
- 하단 textarea 입력창 구현
- Enter 키 → 카드 생성 로직
- Shift+Enter → 줄바꿈 처리
- 카드 HTML 템플릿 (내용, 타임스탬프, 삭제 버튼)
- 카드 삭제 기능
- 스크롤 영역 설정

### Step 5: 마크다운 메모 에디터 구현
- textarea 기반 편집 모드
- marked.js로 HTML 변환하여 미리보기 모드
- 편집/미리보기 토글 버튼
- 기본 마크다운 지원: 헤더, 볼드, 이탤릭, 코드블록, 리스트, 링크

### Step 6: 계정 감지
- Gemini 페이지 DOM에서 로그인된 Google 계정 이메일 추출
  - 방법: 우측 상단 프로필 버튼의 `aria-label` 또는 내부 텍스트에서 이메일 파싱
  - 셀렉터 후보: `a[aria-label*="Google 계정"]`, `header img[data-src]` 등
  - MutationObserver로 DOM 로드 대기 후 추출
- 이메일 추출 성공 → 계정 식별자로 사용
- 이메일 추출 실패 (비로그인) → `"default"` 사용, 계정 구분 로직 스킵

### Step 7: 세션 감지 및 데이터 저장
- Gemini URL에서 세션 ID 추출 (`/app/` 뒤의 경로 또는 conversation ID)
- URL 변경 감지 (popstate, pushstate 오버라이드)
- chrome.storage.local에 계정+세션별 데이터 CRUD
- 데이터 구조:
  ```json
  {
    "{email}_session_{sessionId}": {
      "questions": [
        { "id": "uuid", "text": "질문 내용", "createdAt": "ISO timestamp" }
      ],
      "memo": "마크다운 텍스트 내용"
    }
  }
  ```
  - 로그인 시: `"user@gmail.com_session_abc123"`
  - 비로그인 시: `"default_session_abc123"`
- 자동 저장: 질문 추가/삭제 시 즉시, 메모는 500ms 디바운스

### Step 8: Background Service Worker
- `background.js`에서 확장 아이콘 클릭 이벤트 처리
- content script에 토글 메시지 전송
- 단축키(Ctrl+Shift+G) 커맨드 처리

### Step 9: CSS 스타일링
- `content.css`에 사이드바 전체 스타일
- 다크 테마 (Gemini 기본 테마에 맞춤)
- 깔끔한 카드 디자인 (미니멀 그림자, 둥근 모서리)
- 마크다운 미리보기 스타일 (코드블록 하이라이트 등)
- 트랜지션 애니메이션 (사이드바 열기/닫기)

---

## 6. Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Gemini DOM 구조 변경 시 사이드바 주입 실패 | 높음 | 여러 셀렉터 후보 + MutationObserver로 DOM 준비 대기 |
| Gemini CSS와 사이드바 스타일 충돌 | 중간 | Shadow DOM으로 스타일 격리 |
| chrome.storage.local 5MB 용량 초과 | 낮음 | 오래된 세션 자동 정리 (30일 이상) |
| Gemini SPA 라우팅으로 URL 변경 감지 실패 | 중간 | History API 오버라이드 + MutationObserver 이중 감지 |
| Content Security Policy 제한 | 중간 | marked.js를 로컬 번들로 포함, inline script 회피 |
| 계정 이메일 DOM 추출 실패 (Gemini UI 변경) | 중간 | 다중 셀렉터 후보 사용 + 실패 시 graceful fallback("default") |

---

## 7. Verification Steps

1. Chrome에서 `chrome://extensions` → 개발자 모드 → "압축 해제된 확장 프로그램 로드"
2. gemini.google.com 접속 → 좌측 사이드바 표시 확인
3. 확장 아이콘 클릭 → 사이드바 토글 확인
4. 질문 입력 후 Enter → 카드 생성 확인
5. Shift+Enter → 줄바꿈 확인
6. 카드 X 버튼 → 삭제 확인
7. 메모 탭 → 마크다운 입력 → 미리보기 렌더링 확인
8. 페이지 새로고침 → 데이터 유지 확인
9. 다른 Gemini 세션으로 이동 → 독립 데이터 확인
10. 원래 세션으로 복귀 → 이전 데이터 로드 확인
11. **계정별 저장 확인**: 로그인 상태에서 데이터 저장 → 다른 계정 전환 → 데이터 분리 확인
12. **비로그인 fallback**: 비로그인 상태에서도 세션별 저장이 정상 동작 확인
