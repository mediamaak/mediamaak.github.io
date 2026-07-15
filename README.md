# MediaMak GitHub Pages static draft

배포 주소: https://mediamaak.github.io

## 배포 방식

- GitHub Pages로 배포한다.
- custom domain은 사용하지 않는다.
- `CNAME` 파일은 사용하지 않는다.
- 브라우저는 Flask API를 직접 호출하지 않고 `data/*.json` 파일만 읽는다.

## 데이터 업데이트 방식

1. 공개 가능한 집계 payload를 만든다.
2. `github_pages_site/data/*.json` 파일을 같은 스키마로 덮어쓴다.
3. 변경 파일을 GitHub Pages 저장소에 반영한다.
4. 배포 후 페이지와 JSON URL을 확인한다.

## 로컬 미리보기

PowerShell에서 이 폴더로 이동한 뒤 간단한 정적 서버를 실행한다.

```powershell
cd github_pages_site
python -m http.server 8080
```

브라우저에서 `http://127.0.0.1:8080/`을 연다.

`file://`로 직접 열면 브라우저 보안 정책 때문에 `fetch("data/*.json")`이 막힐 수 있다.
