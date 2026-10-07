# 방명록 연결 및 GitHub Pages 배포

구현된 기능: 오른쪽 위 방명록 메뉴, 이름·메시지 입력, Supabase 저장, 픽셀 캐릭터와 말풍선, 목록 보기, 저장 직후 추가 애니메이션, 다른 방문자의 글 실시간 수신, 이전 글 더 보기, 새로고침, 모바일 화면.

브라우저가 Supabase에 직접 연결합니다. 별도 서버는 필요하지 않습니다. GitHub Actions는 정적 파일을 빌드하고 GitHub Pages로 배포하는 용도로만 사용합니다.

## 1. Supabase 테이블 생성

1. 생성한 Supabase 프로젝트를 엽니다.
2. 왼쪽 **SQL Editor** → **New query**를 선택합니다.
3. 프로젝트의 `supabase/guestbook.sql` 내용을 전부 복사해 붙여 넣습니다.
4. **Run**을 눌러 실행합니다.
5. **Table Editor**에서 `guestbook_entries` 테이블이 생성됐는지 확인합니다.

SQL에는 테이블, 이름 1~30자·내용 1~500자 제한, 조회/작성 RLS 정책, Realtime publication 설정이 모두 포함되어 있습니다. 방문자는 읽기와 작성만 가능하며 수정·삭제는 허용하지 않습니다. 관리자는 Supabase Table Editor에서 글을 관리할 수 있습니다. 기존에 동일한 테이블 이름을 다른 용도로 사용했다면 먼저 스키마를 비교하세요.

## 2. URL과 공개용 키 확인

Supabase 프로젝트의 **Connect** 대화상자 또는 **Settings → API Keys / Data API**에서 다음 값을 확인합니다.

- Project URL: `https://프로젝트ID.supabase.co`
- Publishable key: `sb_publishable_...`

기존 프로젝트의 legacy `anon` 키도 사용할 수 있습니다. **Secret key (`sb_secret_...`)와 `service_role` 키는 입력하지 마세요.** 브라우저에 들어가는 `VITE_` 변수는 배포 파일에 포함됩니다. 공개용 키의 데이터 접근 범위는 1단계의 RLS와 DB 권한으로 제한합니다.

공식 문서: https://supabase.com/docs/guides/api/api-keys

## 3. 내 컴퓨터에서 연결

프로젝트 폴더에서 터미널을 열고 실행합니다.

```sh
cp .env.example .env.local
```

`.env.local`을 열고 실제 값으로 교체합니다.

```dotenv
VITE_SUPABASE_URL=https://프로젝트ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_실제키
```

파일을 저장하고 실행 중인 Vite를 종료한 뒤 다시 실행합니다.

```sh
npm run dev
```

터미널에 표시되는 주소를 엽니다. 기본 포트가 비어 있으면 `http://localhost:5173/`입니다. 오른쪽 위 **방명록**을 누르거나 `http://localhost:5173/#guestbook`을 엽니다.

`.env.local`은 Git에서 제외됩니다. 이 파일을 GitHub에 올릴 필요는 없습니다.

## 4. 저장과 실시간 수신 확인

1. 이름과 내용을 입력하고 **commit**를 누릅니다.
2. 캐릭터와 말풍선이 나타나고 Supabase Table Editor에 같은 내용이 저장되는지 확인합니다.
3. 페이지를 새로고침해도 글이 남아 있는지 확인합니다.
4. 브라우저 탭 두 개에서 방명록을 엽니다. 한 탭에서 글을 작성했을 때 다른 탭에도 자동으로 나타나는지 확인합니다.
5. 모바일 크기에서 입력칸과 포스트잇 목록을 확인합니다.

연결 정보가 없는 상태에서는 저장 버튼이 비활성화됩니다. 저장 실패 시 입력 내용은 유지됩니다. 실시간 연결 실패 시 목록의 새로고침 버튼을 사용할 수 있습니다.

## 5. GitHub에 코드 반영

기존 GitHub Pages 사이트를 배포하는 저장소에 수정 파일을 반영합니다. 현재 로컬 폴더에는 `.git` 정보가 없어서 저장소 주소나 기존 배포 방법을 자동으로 확인할 수 없었습니다. 기존 저장소를 사용하고 있다면 해당 저장소의 로컬 체크아웃에 파일을 반영해 커밋·푸시하세요. `node_modules`, `.env.local`, `dist`는 커밋 대상이 아닙니다.

기존 배포 절차가 있다면 그대로 사용해도 됩니다. 중요한 것은 **빌드 시점**에 두 환경변수를 넣고 새로 만들어진 `dist`를 배포하는 것입니다. GitHub에 키를 설정하는 것만으로 이미 배포된 파일이 바뀌지는 않습니다.

## 6. 제공된 GitHub Actions로 배포하기

기존 배포를 대체할 경우 다음 순서로 진행합니다. 기존에 자동 배포 workflow가 있다면 두 절차가 동시에 배포하지 않도록 정리하세요.

1. GitHub 저장소 → **Settings → Secrets and variables → Actions → New repository secret**에서 아래 두 개를 등록합니다.

   | 이름 | 값 |
   | --- | --- |
   | `VITE_SUPABASE_URL` | 2단계 Project URL |
   | `VITE_SUPABASE_PUBLISHABLE_KEY` | 2단계 publishable 또는 legacy anon 키 |

2. 저장소 → **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 설정합니다.
3. `.github/workflows/deploy-pages.yml`을 포함한 변경사항이 기본 브랜치에 올라가 있는지 확인합니다.
4. **Actions → Deploy to GitHub Pages → Run workflow**를 누릅니다.
5. build와 deploy가 모두 성공하면 Pages에 표시되는 사이트 주소를 엽니다.
6. 방명록 작성·새로고침·두 탭 실시간 수신을 다시 확인합니다.

제공된 workflow는 `main` 브랜치에 푸시하면 자동으로 실행됩니다. 키만 변경했을 때는 **Run workflow**로 다시 배포하세요. Vite는 GitHub Pages가 알려 주는 실제 경로(`BASE_PATH`)를 사용하고, `#guestbook` 주소로 저장소 하위 경로에서도 파일과 방명록 페이지를 불러올 수 있습니다. 별도의 404 리디렉션 설정은 필요하지 않습니다.

## 문제 해결

- **연결 준비 중**: 환경변수 이름과 값을 확인하고 Vite를 재시작합니다. 배포 사이트는 환경변수를 넣어 다시 빌드·배포합니다.
- **조회/저장 실패**: URL/키가 같은 프로젝트인지, 프로젝트가 활성 상태인지, SQL이 성공했는지 확인합니다. 브라우저 개발자 도구의 Network에서 Supabase 요청 응답을 확인할 수 있습니다.
- **내 글은 보이지만 다른 탭에 자동으로 안 보임**: SQL의 publication 설정이 실행됐는지 확인합니다. Supabase의 `supabase_realtime` publication에 `guestbook_entries`가 포함되어 있어야 합니다.
- **배포가 예전 화면 그대로**: Actions 성공 여부와 Pages 배포 주소를 확인한 뒤 브라우저를 새로고침합니다.

로그인 없이 누구나 글을 남기는 공개 방명록입니다. DB가 글 길이와 수정·삭제 권한은 제한하지만, 도배를 막는 인증·요청 횟수 제한은 이번 구현에 포함되지 않습니다.

## 내 글 수정 기능 켜기

Supabase **SQL Editor → New query**에서 `supabase/guestbook-edit.sql` 전체를 붙여 넣고 **Run**을 누릅니다. 기존 데이터는 삭제하지 않습니다. 추가 설정은 비공개 수정 키 저장 테이블과 작성/수정 함수만 생성합니다.

실행 이후 새로 작성한 글은 **목록 보기 → 수정**으로 이름과 메시지를 바꿀 수 있습니다. 수정 버튼을 누르면 왼쪽 작성 창에 원래 글이 채워집니다. **수정 저장**으로 반영하거나 **취소**로 나올 수 있습니다. 다른 방문자 화면에도 UPDATE 이벤트로 변경이 전달됩니다.

로그인 대신 브라우저에 무작위 비공개 키를 보관하며, DB에는 해당 키의 SHA-256 해시만 보관합니다. 수정 요청마다 DB에서 키를 검증합니다. 다른 사람의 글에는 수정 버튼이 없으며 직접 UPDATE도 허용되지 않습니다.

- 같은 사이트 주소와 같은 브라우저에서 작성한 글만 수정할 수 있습니다.
- 브라우저 데이터를 지우거나 다른 기기·브라우저로 접속하면 수정 키를 사용할 수 없습니다.
- 기존 글은 작성자 확인용 키가 없어서 수정 대상으로 전환하지 않습니다.
- SQL 실행 전에도 기존 방식의 새 글 저장은 가능하지만, 그 글은 수정 키가 발급되지 않습니다.

설정 확인: SQL 실행 → 사이트에서 새 글 작성 → 목록 보기 → 수정 → 수정 저장 → 새로고침 → 수정된 글 확인. 다른 브라우저에서는 해당 글의 수정 버튼이 나타나지 않는지 확인하세요.
