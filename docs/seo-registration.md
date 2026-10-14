# Google·네이버 검색 등록 안내

대상 사이트: https://wanseo.github.io/myfirstweb/
사이트맵: https://wanseo.github.io/myfirstweb/sitemap.xml

검색 등록은 검색엔진에 사이트와 소유자를 알리는 작업입니다. 등록 후에도 검색엔진이 수집과 색인 여부를 결정하므로 즉시 노출되거나 특정 순위가 보장되지는 않습니다.

## Google: 한 단계씩 진행하기

1. https://search.google.com/search-console/ 에 접속하고 Google 계정으로 로그인하세요.
2. '속성 추가'에서 **URL 접두어**를 선택하세요.
3. 주소 입력칸에 `https://wanseo.github.io/myfirstweb/`를 붙여 넣고 '계속'을 누르세요.
4. 소유권 확인 방법 중 **HTML 태그**를 여세요. `google-site-verification`이 들어간 태그 전체를 복사하세요.
5. 복사한 태그를 이 채팅에 보내주세요. 프로젝트의 `index.html`에 추가하여 배포할 수 있습니다. 직접 코드를 편집할 필요가 없습니다.
6. 배포 완료 안내를 받은 다음 Google 화면으로 돌아가 **확인**을 누르세요. 소유권 확인 태그는 이후에도 삭제하지 마세요.
7. 왼쪽 메뉴의 **Sitemaps**로 들어가세요. 입력칸에 `sitemap.xml`을 입력하고 '제출'을 누르세요. 전체 주소 입력 방식이라면 `https://wanseo.github.io/myfirstweb/sitemap.xml`을 입력하세요.
8. 위쪽 **URL 검사** 입력칸에 `https://wanseo.github.io/myfirstweb/`를 붙여 넣으세요.
9. 결과 화면에서 **색인 생성 요청**을 누르세요. 필요한 경우 '실제 URL 테스트'를 먼저 실행하세요.
10. 이후 Search Console의 페이지 색인 생성 보고서에서 처리 상태를 확인하세요.

이미 이 주소가 확인된 속성으로 등록되어 있다면 7번부터 진행하면 됩니다.
GitHub Pages 기본 주소는 DNS를 직접 관리할 수 없으므로 여기서는 URL 접두어 방식을 사용합니다.
GA4와 Search Console은 별도 도구이며 GA4 설치만으로 사이트 등록이 완료되는 것은 아닙니다.

공식 안내: https://support.google.com/webmasters/answer/9008080?hl=ko
사이트맵 안내: https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap

## 네이버: 한 단계씩 진행하기

네이버는 호스트 단위로 사이트를 등록합니다. 이 프로젝트는 `/myfirstweb/` 하위 경로이므로 등록 주소는 **`https://wanseo.github.io`**입니다. 해당 루트에는 별도의 블로그가 있습니다. 블로그 루트의 소유권을 확인한 뒤 이 방명록의 사이트맵과 페이지를 제출하는 구조입니다.

1. https://searchadvisor.naver.com/ 에 접속하고 네이버 계정으로 로그인하세요.
2. **웹마스터 도구**를 누르세요.
3. 사이트 등록 입력칸에 **`https://wanseo.github.io`**를 입력하고 등록하세요. `/myfirstweb/`는 이 단계에서 넣지 마세요.
4. 소유 확인 화면에서 **HTML 파일 업로드**를 선택하고 안내된 확인 파일을 내려받으세요.
5. 그 파일을 GitHub의 **`Wanseo/wanseo.github.io` 저장소 루트**에 업로드해야 합니다. `myfirstweb` 저장소에 올리면 필요한 루트 주소에서 열리지 않습니다. GitHub에서 해당 저장소를 열고 'Add file → Upload files'로 파일을 원래 이름 그대로 올리고 커밋하세요. 기존 블로그 배포 설정에 따라 게시될 때까지 기다리세요. 루트 저장소를 찾기 어렵거나 업로드가 어렵다면 확인 파일명과 파일 내용을 이 채팅에 보내주세요. 파일의 공개 URL과 루트 저장소 설정을 먼저 확인한 뒤 적용할 수 있습니다.
6. 네이버가 안내한 `https://wanseo.github.io/naver….html` 주소를 브라우저에서 여세요. 확인 파일이 정상 표시되면 네이버로 돌아가 **소유 확인**을 누르세요. 확인 파일은 이후에도 삭제하지 마세요.
7. 등록된 `https://wanseo.github.io`를 클릭하여 관리 화면으로 들어가세요.
8. **요청 → 사이트맵 제출**을 열고 `https://wanseo.github.io/myfirstweb/sitemap.xml`을 입력하여 제출하세요. 루트 주소가 이미 붙어 있는 입력칸이면 `myfirstweb/sitemap.xml`만 입력하세요.
9. **요청 → 웹 페이지 수집**을 열고 `https://wanseo.github.io/myfirstweb/`를 입력하여 요청하세요. 루트 주소가 이미 붙어 있다면 `myfirstweb/`만 입력하세요.
10. 이후 **검증 → 웹 페이지 최적화**에서 방명록 주소를 검사하고, 수집·색인 보고서를 확인하세요. 네이버 검색창의 `site:wanseo.github.io/myfirstweb/` 검색은 노출 확인을 보조하는 방법입니다.

이미 루트 주소 소유 확인을 완료했다면 7번부터 진행하면 됩니다. HTML 태그 방식도 가능하지만 태그는 **루트 블로그의 초기 HTML `<head>`**에 있어야 합니다. 방명록의 `<head>`에만 넣으면 루트 소유 확인을 할 수 없습니다.

공식 등록 기준: https://searchadvisor.naver.com/guide/seo-basic-intro
소유 확인: https://searchadvisor.naver.com/guide/faq-start-register
HTML 파일 확인: https://help.naver.com/service/30010/bookmark/17594
사이트맵 제출: https://searchadvisor.naver.com/guide/request-feed

## 이 프로젝트에서 적용하는 SEO

- 사용자에게 확인받은 제목·설명, Open Graph·Twitter 설명을 초기 HTML에 포함합니다.
- 대표 주소(canonical)를 `https://wanseo.github.io/myfirstweb/`로 고정합니다.
- 한국어 문서 언어, 한국어 공유 메타 정보 및 검색 허용 메타 태그를 제공합니다.
- 실제 공개 페이지 한 개만 담은 XML 사이트맵을 제공합니다. 숨긴 예제의 해시 주소는 사이트맵에 넣지 않습니다.
- 기존 방명록의 같은 마크업을 초기 HTML에도 포함하여 자바스크립트 실행 전에도 본문을 읽을 수 있게 합니다. 방명록의 동적 게시물은 기존대로 브라우저에서 불러옵니다.
- 기존 'Guestbook' 표시를 시각적으로 바꾸지 않고 접근성 제목 역할을 추가합니다.
- GitHub Pages의 `/myfirstweb/` 하위 경로로 빌드를 검증합니다.

`robots.txt`는 `https://wanseo.github.io/robots.txt`에서만 효력이 있습니다. 확인 시점의 루트 파일에는 수집 차단 규칙이 없었습니다. 이 프로젝트의 `public/robots.txt`로 만들어지는 `/myfirstweb/robots.txt`는 유효한 루트 설정이 아니므로 추가하지 않습니다. 루트 파일에는 별도 블로그의 사이트맵이 등록되어 있으며, 방명록 사이트맵은 각 검색 도구에 직접 제출합니다. 루트 블로그와 그 설정은 이번 작업에서 수정하지 않습니다.

robots.txt 공식 안내: https://searchadvisor.naver.com/guide/seo-basic-robots
JavaScript SEO: https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
