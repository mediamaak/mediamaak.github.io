# MediaMak GitHub Pages technical blog

배포 주소: https://mediamaak.github.io

## 배포 방식

- GitHub Pages로 배포한다.
- custom domain은 사용하지 않는다.
- `CNAME` 파일은 사용하지 않는다.
- 브라우저는 Flask API를 직접 호출하지 않고 `data/*.json` 파일만 읽는다.
- 홈은 기술블로그, 출판용 책 목차, 자동매매 검증 기록의 진입점 역할을 한다.

## 데이터 업데이트 방식

1. 공개 가능한 집계 payload를 만든다.
2. `github_pages_site/data/*.json` 파일을 같은 스키마로 덮어쓴다.
3. 변경 파일을 GitHub Pages 저장소에 반영한다.
4. 배포 후 페이지와 JSON URL을 확인한다.

## 1차 홈 이전 상태

- `index.html`은 자동매매 시스템 개발 기록을 위한 기술블로그 홈이다.
- 홈에는 대표 글, 최신 글, 주제별 읽기, 출판용 책 목차, 자동매매 검증 기록, 시스템 흐름, 공개 원칙을 표시한다.
- 홈 JS는 `/api/*`, `/auth/*`, `/admin`, `/console`을 호출하지 않는다.
- `data/home.json`, `data/book-toc.json`, `data/evidence-index.json`, `data/posts.json`을 읽는다.
- 기존 백테스트/실거래 페이지는 홈의 주요 목적이 아니라 검증 기록의 하위 자료로 둔다.
- 로그인, 관리자 콘솔, 게시판 작성, 서버 API 기능은 포함하지 않는다.

## 로컬 미리보기

PowerShell에서 이 폴더로 이동한 뒤 간단한 정적 서버를 실행한다.

```powershell
cd mediamaak_github_pages_worktree
python -m http.server 8080
```

브라우저에서 `http://127.0.0.1:8080/`을 연다.

`file://`로 직접 열면 브라우저 보안 정책 때문에 `fetch("data/*.json")`이 막힐 수 있다.
