# GitHub Pages 자동 배포

이 프로젝트는 정적 Vite 사이트입니다. GitHub Pages가 화면을 제공하고, 브라우저에서 Supabase로 직접 방명록을 조회·저장합니다.

## GitHub에서 처음 한 번 설정

1. **이 프로젝트를 올릴 저장소**를 준비합니다. 이전에 확인한 `Wanseo/interactive_web_01`은 다른 안경 체험 사이트이므로 이번 프로젝트의 대상이 아닙니다.
2. 저장소 **Settings → Secrets and variables → Actions → New repository secret**에서 다음 두 항목을 등록합니다. 로컬 `.env.local`에 있는 값을 각각 복사하면 됩니다.

   | Name | Secret 값 |
   | --- | --- |
   | `VITE_SUPABASE_URL` | Supabase Project URL |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase Publishable key |

3. 저장소 **Settings → Pages → Build and deployment → Source**에서 **GitHub Actions**를 선택합니다.
4. 프로젝트 소스와 `.github/workflows/deploy-pages.yml`을 **main 브랜치**에 커밋·푸시합니다. `src/assets/guestbook-characters/`의 PNG들도 포함하세요.
5. **Actions → Deploy to GitHub Pages**에서 실행 상태를 확인합니다. build와 deploy가 모두 성공하면 **Settings → Pages → Visit site**로 사이트를 엽니다.

`.env.local`, `node_modules`, `dist`, `.DS_Store`는 올리지 않습니다. `.gitignore`에 이미 제외되어 있습니다. `.env.example`은 값 없는 설정 예시이므로 포함합니다.

기본 브랜치가 `main`이 아니라면 workflow의 `branches: [main]`을 실제 배포 브랜치로 바꿉니다. 기존 자동 배포 파일이 있는 저장소에는 동일 사이트를 두 번 배포하지 않도록 이번 파일과 통합하세요.

## 이후 업데이트

- **main 브랜치에 푸시 → 자동 빌드 → 자동 배포** 순으로 반영됩니다.
- Secret만 바꿨다면 **Actions → Deploy to GitHub Pages → Run workflow**로 다시 실행합니다.
- 새 파일을 올리거나 키를 등록하는 것만으로 이전 배포가 바뀌지는 않습니다. 새 빌드가 성공해야 반영됩니다.

## 파일 경로

workflow가 `actions/configure-pages`의 `base_path`를 읽어 `BASE_PATH`로 Vite에 전달합니다. 저장소 이름을 코드에 직접 넣을 필요가 없습니다.

- 저장소 사이트: `https://사용자.github.io/저장소이름/`
- 사용자 사이트 또는 루트 도메인: `https://사용자.github.io/`
- 로컬 개발: `http://localhost:5173/`

이미지·배경은 Vite가 빌드 경로로 변환합니다. `public`의 모델·WASM·오디오 등은 `import.meta.env.BASE_URL`을 사용합니다. 메뉴 이동은 `#orbi`, `#guestbook` 등의 해시 방식이라 새로고침 시 별도의 404 설정이 필요하지 않습니다. 기본 첫 화면은 방명록입니다.

## 로컬 빌드 확인

```sh
npm ci
npm run build
```

저장소 하위 경로를 직접 시험하려면:

```sh
BASE_PATH=/pages-path-check/ npm run build
BASE_PATH=/pages-path-check/ npm run preview -- --port 5174
```

`http://localhost:5174/pages-path-check/`를 엽니다. `dist`는 Actions가 생성·업로드하므로 Git에 넣지 않습니다.

## 배포 후 확인

1. 방명록이 기본 화면으로 열리고 배경과 캐릭터 이미지가 보이는지 확인합니다.
2. name과 message를 입력하고 commit을 눌러 저장합니다.
3. 새로고침 후에도 같은 글이 남아 있는지 확인합니다.
4. 두 탭에서 방명록을 열고 한 탭에 작성했을 때 다른 탭에도 나타나는지 확인합니다.
5. 오른쪽 위 `=` 메뉴에서 다른 화면으로 이동합니다.

Secret 이름이 누락되어 있으면 workflow가 빌드를 중단하고 누락된 이름을 알려줍니다. 실패한 실행을 열고 build 로그를 확인하세요.

공식 문서:
- https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
- https://vite.dev/guide/static-deploy.html#github-pages
