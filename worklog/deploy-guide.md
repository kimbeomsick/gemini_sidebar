# Chrome Web Store 배포 가이드

## 1. 사전 준비

### 개발자 등록
1. [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/) 접속
2. Google 계정 로그인
3. 개발자 등록비 **$5** (1회성) 결제
4. 개발자 약관 동의

### 배포용 zip 파일 생성
```bash
cd ~/Desktop/gemini-sidebar
npm run build
# PowerShell로 zip 생성
powershell -Command "Compress-Archive -Path 'dist/*' -DestinationPath 'gemini-sidebar.zip' -Force"
```
결과: 프로젝트 루트에 `gemini-sidebar.zip` 생성

---

## 2. Chrome Web Store 업로드

1. Developer Dashboard → **"새 항목"** 클릭
2. `gemini-sidebar.zip` 파일 업로드

---

## 3. 스토어 정보 입력

| 항목 | 내용 |
|------|------|
| 이름 | Gemini Sidebar - 질문 & 메모 |
| 설명 | Gemini 페이지에서 질문을 저장하고, 북마크하고, 마크다운 메모를 작성할 수 있는 사이드바 |
| 카테고리 | 생산성 (Productivity) |
| 언어 | 한국어 |

### 필수 이미지
| 항목 | 크기 | 설명 |
|------|------|------|
| 스크린샷 | 1280x800 또는 640x400 | 최소 1장, 최대 5장 |
| 아이콘 | 128x128 | `icons/icon128.png` 사용 |
| 프로모션 타일 (선택) | 440x280 | 스토어 홍보용 |

> 스크린샷: Gemini 페이지에서 사이드바가 열린 상태를 캡처

---

## 4. 개인정보처리방침 (Privacy Policy)

사용자 이메일을 수집하므로 Privacy Policy 페이지가 필요함.

### 간단한 방법: GitHub Pages
1. GitHub repo 생성 (예: `gemini-sidebar-privacy`)
2. `index.html` 또는 `privacy.md` 작성
3. GitHub Pages 활성화
4. URL을 스토어 등록 시 입력

### Privacy Policy 필수 내용
- 수집하는 데이터: 이메일 (Gemini 계정 식별용)
- 저장 위치: Supabase 클라우드
- 용도: 사용자별 데이터 동기화
- 제3자 공유: 없음

---

## 5. 심사 제출

1. 모든 정보 입력 완료 후 **"심사를 위해 제출"** 클릭
2. 심사 기간: **1~3일** (길면 1주일)
3. 승인되면 자동으로 스토어에 공개
4. 거절 시 사유가 이메일로 전달됨 → 수정 후 재제출

---

## 6. 업데이트 배포

코드 수정 후 재배포할 때:

1. `manifest.json`의 `version` 올리기 (예: `1.0.0` → `1.0.1`)
2. 빌드 + zip 생성
```bash
npm run build
powershell -Command "Compress-Archive -Path 'dist/*' -DestinationPath 'gemini-sidebar.zip' -Force"
```
3. Developer Dashboard → 해당 확장프로그램 → **"패키지"** → 새 zip 업로드
4. 다시 심사 제출 (업데이트 심사는 보통 더 빠름)

---

## 주의사항

- **Supabase anon key**: 공개용 키라 코드에 포함해도 괜찮음. 단, RLS 정책으로 데이터 접근 제한 필수
- **사용자 증가 시**: Supabase Auth 도입하여 보안 강화 권장
- **스토어 정책**: 확장프로그램이 설명과 다른 동작을 하면 거절됨. 정직하게 기능 설명할 것
