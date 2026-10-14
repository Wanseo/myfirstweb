# GA4 이벤트 목록

측정 ID: `G-W9LT6QTPJ4` · 사이트: https://wanseo.github.io/myfirstweb/

현재 방명록만 공개되어 있습니다. 다른 예제의 공개 여부는 변경하지 않았고,
향후 공개되면 이미 추가된 이벤트가 작동합니다.

## 공통 이벤트

모든 커스텀 이벤트에 `example_id`를 붙이고 위 측정 ID로 전송합니다.
GA4가 이벤트 수신 시각을 기록합니다.

| 이벤트 | 발생 시점 | 추가 정보 |
| --- | --- | --- |
| `example_view` | 예제에 진입할 때 | `example_id` |
| `example_start` | 예제가 화면에 표시되거나 숨긴 탭으로 돌아올 때 | `reason`, `segment` |
| `example_end` | 다른 예제로 이동, 탭 숨김, 페이지 이탈 | `duration_ms`, `reason`, `segment` |
| `example_restart` | Dodge 또는 레모네이드의 다시 시작 버튼 | `example_id` |
| `camera_request` | 카메라 예제에서 시작 요청 | `example_id` |
| `camera_ready` | 영상 재생과 손 추적 초기화 완료, 실제 체험 준비 완료 | `example_id` |
| `camera_error` | 미지원, 권한 거절 또는 초기화 실패 | `reason`: `unsupported`, `permission_denied`, `initialization_failed` |
| `camera_stop` | 카메라 예제를 떠나 카메라 스트림을 정리할 때 | `example_id` |

`example_start/end`는 화면 이용 구간을 측정합니다. 카메라 체험의 실제 준비 시점은
`camera_ready`로 구분합니다. `duration_ms`는 해당 구간에서 화면이 표시된 시간이며
탭을 숨긴 시간은 제외합니다. 같은 화면을 다시 선택해도 중복 진입을 기록하지 않습니다.
`segment`는 예제 진입마다 1부터 시작하여 탭 복귀 때 증가하는 구간 번호입니다.
`reason` 값은 시작 시 `view_open`, `tab_visible`, `page_show`, 종료 시
`view_change`, `tab_hidden`, `page_exit`입니다.

## 예제별 주요 이벤트

| 예제 (`example_id`) | 이벤트 | 발생 시점 / 정보 |
| --- | --- | --- |
| 방명록 (`guestbook`) | `guestbook_submit` | 유효한 작성/수정 제출 시도 · `operation`: `create`/`edit` |
| 방명록 | `guestbook_save` | 서버 저장 성공 · `operation` |
| 방명록 | `guestbook_save_error` | 저장 실패 · `operation` |
| 방명록 | `guestbook_load_more` | 더 보기 요청 |
| 방명록 | `guestbook_theme` | 낮/밤 전환 · `theme`: `day`/`night` |
| 방명록 | `guestbook_music` | 음악 버튼 전환 · `enabled` (버튼 상태, 실제 재생 여부 아님) |
| Orbi (`orbi`) | `orbi_wink` | 클릭/터치로 윙크 · 최대 1초에 1회 |
| 레모네이드 (`juice`) | `lemon_squeezed` | 레몬 하나의 즙을 전부 짠 시점 |
| 레모네이드 | `juice_complete` | 모든 레몬이 사라져 완성 상태에 도달 · `juice_amount` (게임 내부 수치) · 다시 시작 전 1회 |
| Dodge (`dodge`) | `dodge_answer` | 정답 제출 결과 · `result`: `correct`/`incorrect` |
| Dodge | `dodge_game_over` | 충돌로 게임 종료 · `score` |
| 인형뽑기 (`claw`) | `claw_attempt` | 집게 하강 시작 |
| 인형뽑기 | `claw_prize` | 인형이 출구에 도달하여 획득 확정 · 누적 `score` |
| 인형뽑기 | `claw_cycle_complete` | 집게가 원위치로 복귀하여 한 사이클 종료 |
| 샘플러 (`sampler`) | `sampler_pad` | 직접 패드 연주 · `pad_key` · 최대 0.5초에 1회 (자동 루프 제외) |
| 샘플러 | `sampler_pad_edit` | 패드 설정 버튼 사용 · `pad_key`, `action` |
| 샘플러 | `sampler_record_start` | 녹음 시작 · `mode`: `new`/`overdub` |
| 샘플러 | `sampler_record_end` | 녹음 종료 · `mode`, `duration_ms`, `note_count` |
| 샘플러 | `sampler_loop_start`, `sampler_loop_end` | 반복 재생 시작/종료 (녹음 및 화면 이동에 따른 자동 종료 포함) |
| WaterTouch (`watertouch`) | `water_touch` | 손끝 인식으로 물과 상호작용 · 최대 5초에 1회 |
| WaterTouch | `water_feeder_toggle` | 제스처로 먹이통 표시/숨김 · `enabled` |
| 풍선 (`balloon`) | `balloon_pop` | 풍선 터뜨림 · 누적 `score` |
| 풍선 | `balloon_grab` | 핀치로 풍선 끈 잡기 · 최대 1초에 1회 |
| 촬영 (현재 예제) | `capture_photo` | 사진 생성 성공 (방명록 전용 촬영 포함) |
| 촬영 | `capture_video_start`, `capture_video_end` | 영상 녹화 시작/결과 생성 성공 · 종료에 `duration_ms` |
| 촬영 | `capture_share` | 브라우저 공유 API 성공 |

## GA4에서 확인하기

사이트에서 실제 동작을 수행한 뒤 GA4 실시간 보고서에서 이벤트 이름을 확인합니다.
브라우저 개발자 도구에서 `g/collect` 요청의 `tid=G-W9LT6QTPJ4` 및 `en`도 확인할 수 있습니다.
일반 보고서/탐색에서 예제별 비교를 하려면 GA4 관리 → 맞춤 정의에서
이벤트 범위 맞춤 측정기준 `example_id`를 등록합니다.
필요에 따라 `reason`, `operation`, `result`, `mode`, `pad_key`, `theme`, `action`, `enabled`도 등록합니다.
시간과 점수를 집계하려면 `duration_ms`(밀리초), `score`, `note_count`, `juice_amount`를
맞춤 측정항목으로 등록합니다. 맞춤 정의 반영에는 24–48시간이 걸릴 수 있습니다.
GA4 계정의 맞춤 정의는 이 저장소 코드 배포만으로 등록되지 않습니다.

이름, 방명록 본문, 편집 토큰, 이미지/영상, 음성, 원본 오류 메시지를 커스텀 이벤트에 포함하지 않습니다.
GA가 차단되거나 실패해도 예제 동작은 계속됩니다.
종료 전송은 최선의 시도이며 브라우저 강제 종료/네트워크 단절 시 누락될 수 있습니다.
백그라운드 탭의 상호작용 이벤트는 전송하지 않습니다.

## 검증

- `node --test tests/analytics.test.mjs`: 화면 전환, 탭 숨김/복귀, 페이지 이탈/복원,
  중복 종료 방지, 빈도 제한, GA 함수 미존재/실패 검증.
- `npm run build`: TypeScript 검사 및 프로덕션 빌드.
- 실제 GA4 수신 보고서는 계정 접근 권한이 없어 직접 확인하지 않았습니다.

공식 문서:
- https://developers.google.com/analytics/devguides/collection/ga4/events
- https://support.google.com/analytics/answer/14240153?hl=en
