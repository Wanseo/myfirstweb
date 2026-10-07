import './style.css'
import { guestbookMarkup, initGuestbook } from './guestbook'
import flowerGirlRunner from './assets/flower-girl-runner.png'
import greenWatercolorBackground from './assets/green-watercolor-bg.png'
import { initGlobalCapture } from './capture'
import { initClawMachine } from './claw-machine'
import { initLemonade } from './lemonade'
import { initSampler } from './sampler'
import { initWaterTouch } from './watertouch'
import { initBalloon } from './balloon'

const createStars = (count: number) =>
  Array.from({ length: count }, () => {
    const size = 1 + Math.random() * 3.1
    const opacity = 0.28 + Math.random() * 0.72
    const duration = 1.15 + Math.random() * 3.5
    const delay = -(Math.random() * duration)

    return `<i class="star" style="
      --x: ${(Math.random() * 100).toFixed(2)}%;
      --y: ${(Math.random() * 100).toFixed(2)}%;
      --size: ${size.toFixed(1)}px;
      --opacity: ${opacity.toFixed(2)};
      --dim-opacity: ${(opacity * 0.16).toFixed(2)};
      --mid-opacity: ${(opacity * 0.55).toFixed(2)};
      --glow: ${(size * 7).toFixed(1)}px;
      --glow-far: ${(size * 12).toFixed(1)}px;
      --duration: ${duration.toFixed(2)}s;
      --delay: ${delay.toFixed(2)}s;
    "></i>`
  }).join('')

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <button class="menu-toggle" id="menu-toggle" type="button" aria-label="다른 메뉴 열기" aria-expanded="false" aria-controls="project-menu">=</button>
  <nav class="top-menu" id="project-menu" aria-label="프로젝트 메뉴" hidden>
    <button class="menu-button is-active" type="button" data-view="orbi" aria-selected="true">오르비</button>
    <button class="menu-button" type="button" data-view="juice" aria-selected="false">즙짜기</button>
    <button class="menu-button" type="button" data-view="dodge" aria-selected="false">피하기</button>
    <button class="menu-button" type="button" data-view="claw" aria-selected="false">인형뽑기</button>
    <button class="menu-button" type="button" data-view="sampler" aria-selected="false">샘플러</button>
    <button class="menu-button" type="button" data-view="watertouch" aria-selected="false">WaterTouch</button>
    <button class="menu-button" type="button" data-view="balloon" aria-selected="false">Balloon</button>
    <button class="menu-button" type="button" data-view="guestbook" aria-selected="false">방명록 ↗</button>
  </nav>
  ${guestbookMarkup}

  <div class="global-capture">
    <span class="capture-timer" id="capture-timer">00:00</span>
    <button id="global-capture-button" type="button" aria-label="촬영 버튼: 짧게 사진, 길게 영상" aria-pressed="false">
      <span class="capture-stop-shape" aria-hidden="true"></span>
    </button>
    <span class="capture-hint">TAP PHOTO · HOLD VIDEO</span>
  </div>

  <div class="capture-toast" id="capture-toast" role="status" aria-live="polite"></div>

  <section class="capture-result" role="dialog" aria-modal="true" aria-labelledby="capture-result-title" hidden>
    <div class="capture-result-card">
      <div class="capture-result-head">
        <div><small>CAPTURED</small><h2 id="capture-result-title">촬영 완료</h2></div>
        <button id="capture-close" type="button" aria-label="미리보기 닫기">×</button>
      </div>
      <div class="capture-result-media"></div>
      <div class="capture-result-actions">
        <a id="capture-download" href="#" download>기기에 저장</a>
        <button id="capture-share" type="button">공유</button>
      </div>
    </div>
  </section>

  <main class="view space-stage is-active" id="orbi-view" aria-hidden="false">
    <div class="nebula nebula--violet" aria-hidden="true"></div>
    <div class="nebula nebula--cyan" aria-hidden="true"></div>
    <div class="star-field" aria-hidden="true">${createStars(190)}</div>
    <div class="shooting-star" aria-hidden="true"></div>

    <section class="orb-scene" aria-label="시선을 따라 움직이는 오르비 캐릭터">
      <div class="speech-bubble" role="status" aria-live="polite">
        <span></span>
        <i class="bubble-tail" aria-hidden="true"></i>
      </div>

      <div class="character-frame" id="orbi">
        <div class="character" aria-hidden="true">
          <div class="character-body">
            <div class="face-rig">
              <span class="eyebrow eyebrow--left"></span>
              <span class="eyebrow eyebrow--right"></span>

              <span class="eye eye--left">
                <i class="pupil"><b></b></i>
              </span>
              <span class="eye eye--right">
                <i class="pupil"><b></b></i>
              </span>

              <span class="cheek cheek--left"></span>
              <span class="cheek cheek--right"></span>
              <span class="mouth"></span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <p class="interaction-hint">
      <span aria-hidden="true">✦</span>
      포인터를 움직여 시선을 만나고, 클릭해서 윙크해 보세요
      <span aria-hidden="true">✦</span>
    </p>
  </main>

  <main class="view juice-view" id="juice-view" aria-hidden="true" hidden>
    <video id="lemonade-camera" autoplay muted playsinline aria-label="레모네이드 손 추적 카메라"></video>
    <canvas id="lemonade-canvas" aria-label="떠다니는 레몬과 레모네이드 컵"></canvas>

    <header class="lemonade-heading">
      <span>EXPERIMENT 07 · MEDIAPIPE</span>
      <h1 id="juice-title">Lemonade.</h1>
    </header>

    <aside class="lemonade-guide" aria-label="게임 방법">
      <div><b>L</b><span><strong>왼손</strong> 레몬 가까이에서 주먹 쥐기</span></div>
      <div><b>R</b><span><strong>오른손</strong> 손바닥으로 컵 옮기기</span></div>
    </aside>

    <div class="lemonade-progress">
      <span>LEMONADE</span>
      <div class="lemonade-fill-bar"><i></i></div>
      <strong id="lemonade-fill-value">0%</strong>
    </div>

    <div class="lemonade-status" role="status" aria-live="polite">
      <small id="lemonade-status-label">CAMERA READY</small>
      <span id="lemonade-status-text">카메라를 시작해 주세요.</span>
    </div>

    <div class="lemonade-counter">LEMONS <strong id="lemonade-count">7 / 7</strong></div>
    <button class="lemonade-reset" id="lemonade-reset" type="button">RESET ↻</button>

    <section class="lemonade-start" aria-label="카메라 시작">
      <small>07 / LEMONADE</small>
      <h2>손으로 짜는<br>레모네이드</h2>
      <p id="lemonade-start-message">카메라는 손의 움직임을 인식하는 데만 사용되며<br>영상은 저장되거나 전송되지 않습니다.</p>
      <button id="lemonade-start-button" type="button">카메라 시작</button>
    </section>
  </main>

  <main class="view watertouch-view" id="watertouch-view" aria-hidden="true" hidden>
    <video id="watertouch-camera" autoplay muted playsinline aria-label="WaterTouch 손 추적 카메라"></video>
    <canvas id="watertouch-canvas" aria-label="손끝에 반응하는 물결 카메라 화면"></canvas>
    <canvas id="watertouch-fish-canvas" aria-label="손끝을 피해 헤엄치는 물고기 무리"></canvas>

    <header class="watertouch-heading">
      <span>EXPERIMENT 08 · HAND-TRACKED FLUID</span>
      <h1>WaterTouch<span>.</span></h1>
      <p>YOUR FINGERTIPS BECOME WATER</p>
    </header>

    <div class="watertouch-meter" aria-label="인식 상태">
      <div><small>HANDS</small><strong id="watertouch-hand-count">0</strong><span>/ 2</span></div>
      <i></i>
      <div><small>FINGERTIPS</small><strong id="watertouch-finger-count">0</strong><span>/ 10</span></div>
    </div>

    <div class="watertouch-status" role="status" aria-live="polite">
      <i aria-hidden="true"></i>
      <div><small id="watertouch-status-label">CAMERA READY</small><span id="watertouch-status-text">카메라를 시작해 주세요.</span></div>
    </div>

    <p class="watertouch-guide">
      <span>주먹 → 손 펴기 · 먹이통 켜기/끄기</span><i></i>
      <span>엄지+검지 집기 · 먹이통 잡기</span><i></i>
      <span>흔들기 · 먹이 뿌리기</span>
    </p>

    <section class="watertouch-start" aria-label="WaterTouch 카메라 시작">
      <div class="watertouch-start-ripple" aria-hidden="true"><i></i><i></i><i></i></div>
      <small>08 / WATERTOUCH</small>
      <h2>Touch the<br><em>surface.</em></h2>
      <p id="watertouch-start-message">카메라는 손끝 좌표를 계산하는 데만 사용되며<br>영상은 저장되거나 전송되지 않습니다.</p>
      <button id="watertouch-start-button" type="button"><span>카메라 시작</span><b aria-hidden="true">↗</b></button>
    </section>
  </main>

  <main class="view balloon-view" id="balloon-view" aria-hidden="true" hidden>
    <video id="balloon-camera" autoplay muted playsinline aria-label="Balloon 손 추적 카메라"></video>
    <canvas id="balloon-canvas" aria-label="손으로 터뜨리고 잡을 수 있는 풍선"></canvas>

    <header class="balloon-heading">
      <span>EXPERIMENT 09 · HAND-TRACKED PHYSICS</span>
      <h1>Balloon<span>.</span></h1>
    </header>

    <div class="balloon-score" aria-label="풍선 현황">
      <div><small>FLOATING</small><strong id="balloon-count">0</strong></div>
      <i></i>
      <div><small>POPPED</small><strong id="balloon-popped">0</strong></div>
    </div>

    <div class="balloon-status" role="status" aria-live="polite">
      <i aria-hidden="true"></i>
      <div><small id="balloon-status-label">CAMERA READY</small><span id="balloon-status-text">카메라를 시작해 주세요.</span></div>
    </div>

    <p class="balloon-guide">
      <span><b>검지</b> 풍선 터뜨리기</span><i></i>
      <span><b>엄지 + 검지</b> 끈 잡기</span>
    </p>

    <section class="balloon-start" aria-label="Balloon 카메라 시작">
      <div class="balloon-start-art" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
      <small>09 / BALLOON</small>
      <h2>Catch it.<br><em>Pop it.</em></h2>
      <p id="balloon-start-message">카메라는 손의 움직임을 인식하는 데만 사용되며<br>영상은 저장되거나 전송되지 않습니다.</p>
      <button id="balloon-start-button" type="button"><span>카메라 시작</span><b aria-hidden="true">↑</b></button>
    </section>
  </main>

  <main
    class="view dodge-view"
    id="dodge-view"
    style="--dodge-background: url('${greenWatercolorBackground}')"
    aria-hidden="true"
    hidden
  >
    <div class="typing-challenge" id="typing-challenge" aria-live="polite">
      <small>떨어지기 전에 입력하고 ENTER</small>
      <div class="target-word" id="target-word"></div>
      <input
        class="typed-word"
        id="typing-input"
        type="text"
        autocomplete="off"
        autocapitalize="off"
        spellcheck="false"
        placeholder="입력을 시작하세요"
        aria-label="제시된 한글 단어 입력"
      />
    </div>

    <section class="typing-game" aria-label="한글 타이핑 피하기 게임">
      <div class="game-score" aria-live="polite">
        <small>DODGED</small>
        <strong id="score">0</strong>
      </div>

      <div class="falling-letters" aria-hidden="true"></div>

      <div class="runner" id="runner" aria-label="떨어지는 글자를 피하는 사람 캐릭터">
        <div class="runner-figure">
          <img class="runner-sprite" src="${flowerGirlRunner}" alt="" />
        </div>
      </div>
    </section>

    <div class="game-over" id="game-over" role="dialog" aria-modal="true" aria-labelledby="game-over-title" hidden>
      <div class="game-over-card">
        <div class="browser-bar" aria-hidden="true">
          <span class="window-dots">
            <i class="window-dot window-dot--red"></i>
            <i class="window-dot window-dot--yellow"></i>
            <i class="window-dot window-dot--green"></i>
          </span>
          <span class="browser-nav">
            <i>←</i>
            <i>→</i>
          </span>
          <span class="browser-address"><i></i></span>
          <span class="browser-more">⋮</span>
        </div>

        <div class="game-over-content">
          <span class="impact-mark" aria-hidden="true">✦</span>
          <p>LETTER COLLISION</p>
          <h2 id="game-over-title">게임 종료!</h2>
          <span class="final-score">피한 글자 <strong id="final-score">0</strong>개</span>
          <button id="restart-game" type="button">다시 시작</button>
        </div>
      </div>
    </div>

    <p class="game-instruction">
      <span aria-hidden="true">✦</span>
      가운데 한글 단어를 빠르게 입력하고 Enter를 누르세요
      <span aria-hidden="true">✦</span>
    </p>
  </main>

  <main class="view claw-view" id="claw-view" aria-hidden="true" hidden>
    <section class="claw-game" aria-label="3차원 인형뽑기 게임">
      <canvas class="claw-canvas" id="claw-canvas" aria-label="3차원 인형뽑기 기계"></canvas>

      <div class="claw-hud">
        <span class="claw-live"><i></i> CLAW MACHINE</span>
        <span class="claw-prize-count">뽑은 인형 <strong id="claw-prize-count">0</strong></span>
      </div>

      <div class="claw-status" role="status" aria-live="polite">
        <small id="claw-state-label">READY</small>
        <strong id="claw-status-text">방향키로 집게 위치를 정해 주세요</strong>
      </div>

      <div class="claw-help">
        <span><kbd>↑</kbd><kbd>↓</kbd><kbd>←</kbd><kbd>→</kbd> 위치 이동</span>
        <span><kbd>SPACE</kbd> 내리기 · 집기</span>
      </div>

      <div class="claw-controls" aria-label="인형뽑기 조작 버튼">
        <div class="direction-pad">
          <button class="claw-control claw-control--up" type="button" data-claw-key="ArrowUp" aria-label="집게를 앞으로 이동">↑</button>
          <button class="claw-control claw-control--left" type="button" data-claw-key="ArrowLeft" aria-label="집게를 왼쪽으로 이동">←</button>
          <button class="claw-control claw-control--down" type="button" data-claw-key="ArrowDown" aria-label="집게를 뒤로 이동">↓</button>
          <button class="claw-control claw-control--right" type="button" data-claw-key="ArrowRight" aria-label="집게를 오른쪽으로 이동">→</button>
        </div>
        <button class="claw-space-button" id="claw-space-button" type="button">
          <small>SPACE</small>
          <strong>내리기</strong>
        </button>
      </div>
    </section>
  </main>

  <main class="view sampler-view" id="sampler-view" aria-hidden="true" hidden>
    <section class="sampler-app" aria-label="키보드 샘플러">
      <header class="sampler-heading">
        <span>9 PAD KEYBOARD SAMPLER</span>
        <h1>소리를 누르고, 직접 담아보세요.</h1>
        <p>키를 동시에 눌러도 모든 사운드가 함께 재생됩니다.</p>
      </header>

      <div class="sampler-workspace">
        <div class="sampler-console">
          <div class="sampler-console-top">
            <span><i></i> LIVE AUDIO</span>
            <small>QWE / ASD / ZXC</small>
          </div>

          <div class="sampler-pad-editor" id="sampler-pad-editor" hidden>
            <div class="pad-editor-title">
              <small>EDIT PAD</small>
              <strong><span id="sampler-edit-key">Q</span> 사운드</strong>
            </div>
            <div class="pad-editor-control">
              <span>피치</span>
              <button type="button" data-edit="pitch-down" aria-label="피치 낮추기">−</button>
              <strong id="sampler-pitch-value">0 st</strong>
              <button type="button" data-edit="pitch-up" aria-label="피치 높이기">＋</button>
            </div>
            <div class="pad-editor-control">
              <span>속도</span>
              <button type="button" data-edit="speed-down" aria-label="속도 느리게">−</button>
              <strong id="sampler-speed-value">1.0×</strong>
              <button type="button" data-edit="speed-up" aria-label="속도 빠르게">＋</button>
            </div>
            <button class="pad-editor-close" id="sampler-editor-close" type="button" aria-label="사운드 편집 닫기">×</button>
          </div>

          <div class="sampler-grid" role="group" aria-label="샘플러 키 패드">
            <button class="sampler-pad" type="button" data-sampler-key="q" aria-pressed="false" style="--pad-rgb: 255, 103, 153">
              <small>01</small><strong>Q</strong><span class="sampler-pad-source">LOADING</span>
            </button>
            <button class="sampler-pad" type="button" data-sampler-key="w" aria-pressed="false" style="--pad-rgb: 255, 146, 92">
              <small>02</small><strong>W</strong><span class="sampler-pad-source">LOADING</span>
            </button>
            <button class="sampler-pad" type="button" data-sampler-key="e" aria-pressed="false" style="--pad-rgb: 245, 196, 86">
              <small>03</small><strong>E</strong><span class="sampler-pad-source">LOADING</span>
            </button>
            <button class="sampler-pad" type="button" data-sampler-key="a" aria-pressed="false" style="--pad-rgb: 122, 214, 171">
              <small>04</small><strong>A</strong><span class="sampler-pad-source">LOADING</span>
            </button>
            <button class="sampler-pad" type="button" data-sampler-key="s" aria-pressed="false" style="--pad-rgb: 88, 194, 226">
              <small>05</small><strong>S</strong><span class="sampler-pad-source">LOADING</span>
            </button>
            <button class="sampler-pad" type="button" data-sampler-key="d" aria-pressed="false" style="--pad-rgb: 108, 136, 241">
              <small>06</small><strong>D</strong><span class="sampler-pad-source">LOADING</span>
            </button>
            <button class="sampler-pad" type="button" data-sampler-key="z" aria-pressed="false" style="--pad-rgb: 165, 116, 234">
              <small>07</small><strong>Z</strong><span class="sampler-pad-source">LOADING</span>
            </button>
            <button class="sampler-pad" type="button" data-sampler-key="x" aria-pressed="false" style="--pad-rgb: 219, 105, 220">
              <small>08</small><strong>X</strong><span class="sampler-pad-source">LOADING</span>
            </button>
            <button class="sampler-pad" type="button" data-sampler-key="c" aria-pressed="false" style="--pad-rgb: 238, 111, 173">
              <small>09</small><strong>C</strong><span class="sampler-pad-source">LOADING</span>
            </button>
          </div>
        </div>

        <aside class="sampler-recorder" aria-label="연주 녹음과 반복재생">
          <div class="recorder-title">
            <span class="record-led"></span>
            <div><small>LOOP RECORDER</small><strong>연주를 녹음하고 쌓기</strong></div>
          </div>

          <div class="record-display" aria-live="polite">
            <span><small>SELECTED</small><strong id="sampler-record-target">새 녹음</strong></span>
            <span><small>RECORD TIME</small><strong id="sampler-record-time">0.0s</strong></span>
          </div>

          <button class="sampler-record-button" id="sampler-record-button" type="button">
            <i></i><span class="record-button-label">녹음 시작 · SPACE</span>
          </button>

          <button class="sampler-new-recording" id="sampler-new-recording" type="button">＋ 새 녹음 만들기</button>

          <ol class="record-guide">
            <li><b>1</b> Space를 눌러 연주 녹음을 시작하세요.</li>
            <li><b>2</b> 다시 Space를 누르면 녹음이 저장됩니다.</li>
            <li><b>3</b> 기존 녹음을 선택하면 소리를 겹쳐 쌓아요.</li>
          </ol>

          <div class="sampler-recordings-header">
            <span>RECORDINGS</span><small id="sampler-recording-count">0 TRACKS</small>
          </div>
          <div class="sampler-recordings" id="sampler-recordings">
            <p class="recordings-empty">아직 녹음본이 없어요.</p>
          </div>

          <p class="sample-file-guide">
            기본 파일 위치
            <code>public/sampler/q.wav 또는 q.mp3</code>
          </p>
        </aside>
      </div>

      <div class="sampler-status" role="status" aria-live="polite">
        <small id="sampler-status-label">LOADING</small>
          <span id="sampler-status-text">사운드 파일을 준비하고 있어요. 패드를 길게 누르면 소리를 편집할 수 있어요.</span>
      </div>
    </section>
  </main>
`

const orb = document.querySelector<HTMLDivElement>('#orbi')!
const character = document.querySelector<HTMLDivElement>('.character')!
const face = document.querySelector<HTMLDivElement>('.face-rig')!
const pupils = Array.from(document.querySelectorAll<HTMLElement>('.pupil'))
const speechBubble = document.querySelector<HTMLDivElement>('.speech-bubble')!
const speechText = speechBubble.querySelector<HTMLSpanElement>('span')!
const menuButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.menu-button'))
const views = Array.from(document.querySelectorAll<HTMLElement>('.view'))

try {
  initGlobalCapture()
} catch (error) {
  console.error('전역 촬영 기능 초기화에 실패했습니다.', error)
}

const lemonadeView = document.querySelector<HTMLElement>('#juice-view')!
let lemonade = { setActive: (_active: boolean) => {} }

try {
  lemonade = initLemonade(lemonadeView)
} catch (error) {
  console.error('Lemonade 초기화에 실패했습니다.', error)
  const statusLabel = lemonadeView.querySelector<HTMLElement>('#lemonade-status-label')
  const statusText = lemonadeView.querySelector<HTMLElement>('#lemonade-status-text')
  if (statusLabel) statusLabel.textContent = 'INIT ERROR'
  if (statusText) statusText.textContent = '새로고침한 뒤 다시 시도해 주세요.'
}

const clawView = document.querySelector<HTMLElement>('#claw-view')!
let clawMachine = { setActive: (_active: boolean) => {} }

try {
  clawMachine = initClawMachine(clawView)
} catch (error) {
  console.error('3D 인형뽑기 초기화에 실패했습니다.', error)
  clawView.classList.add('webgl-unavailable')
  const statusLabel = clawView.querySelector<HTMLElement>('#claw-state-label')
  const statusText = clawView.querySelector<HTMLElement>('#claw-status-text')
  if (statusLabel) statusLabel.textContent = 'WEBGL ERROR'
  if (statusText) statusText.textContent = '브라우저의 하드웨어 가속을 켠 뒤 새로고침해 주세요.'
}

const samplerView = document.querySelector<HTMLElement>('#sampler-view')!
let sampler = { setActive: (_active: boolean) => {} }

try {
  sampler = initSampler(samplerView)
} catch (error) {
  console.error('샘플러 초기화에 실패했습니다.', error)
  const statusLabel = samplerView.querySelector<HTMLElement>('#sampler-status-label')
  const statusText = samplerView.querySelector<HTMLElement>('#sampler-status-text')
  if (statusLabel) statusLabel.textContent = 'AUDIO ERROR'
  if (statusText) statusText.textContent = '이 브라우저에서는 오디오 기능을 사용할 수 없어요.'
}

const waterTouchView = document.querySelector<HTMLElement>('#watertouch-view')!
let waterTouch = { setActive: (_active: boolean) => {} }

try {
  waterTouch = initWaterTouch(waterTouchView)
} catch (error) {
  console.error('WaterTouch 초기화에 실패했습니다.', error)
  const statusLabel = waterTouchView.querySelector<HTMLElement>('#watertouch-status-label')
  const statusText = waterTouchView.querySelector<HTMLElement>('#watertouch-status-text')
  if (statusLabel) statusLabel.textContent = 'WEBGL ERROR'
  if (statusText) statusText.textContent = '브라우저의 하드웨어 가속을 켠 뒤 새로고침해 주세요.'
}

const balloonView = document.querySelector<HTMLElement>('#balloon-view')!
let balloon = { setActive: (_active: boolean) => {} }

try {
  balloon = initBalloon(balloonView)
} catch (error) {
  console.error('Balloon 초기화에 실패했습니다.', error)
  const statusLabel = balloonView.querySelector<HTMLElement>('#balloon-status-label')
  const statusText = balloonView.querySelector<HTMLElement>('#balloon-status-text')
  if (statusLabel) statusLabel.textContent = 'INIT ERROR'
  if (statusText) statusText.textContent = '새로고침한 뒤 다시 시도해 주세요.'
}

const guestbook = initGuestbook(document.querySelector<HTMLElement>('#guestbook-view')!)

type ViewName = 'guestbook' | 'orbi' | 'juice' | 'dodge' | 'claw' | 'sampler' | 'watertouch' | 'balloon'
// Temporarily keep the other experiences unavailable to visitors.
const otherExperiencesVisible = false
const isViewAvailable = (view: ViewName) => view === 'guestbook' || otherExperiencesVisible
let activeView: ViewName = 'orbi'

const messages = [
  '기분이 어때?',
  '오늘 하루 어땠어?',
  '피곤하지는 않아?',
  '오늘도 수고했어',
]

const target = { x: 0, y: 0 }
const gaze = { x: 0, y: 0 }
const expressionClasses = ['expression-open', 'expression-ooh', 'expression-grin', 'expression-curious']
const lastPointer = { x: 0, y: 0 }
let winkTimer = 0
let expressionTimer = 0
let nextExpressionAt = 0
let previousExpression = ''
let previousMessage = -1
let speechTimer = 0
let speechHideTimer = 0

const setGazeTarget = (clientX: number, clientY: number) => {
  const bounds = orb.getBoundingClientRect()
  const centerX = bounds.left + bounds.width / 2
  const centerY = bounds.top + bounds.height / 2
  const horizontalRange = Math.max(window.innerWidth * 0.42, 1)
  const verticalRange = Math.max(window.innerHeight * 0.42, 1)

  target.x = Math.max(-1, Math.min(1, (clientX - centerX) / horizontalRange))
  target.y = Math.max(-1, Math.min(1, (clientY - centerY) / verticalRange))
}

const applyGaze = () => {
  gaze.x += (target.x - gaze.x) * 0.105
  gaze.y += (target.y - gaze.y) * 0.105

  face.style.setProperty('--face-x', `${(gaze.x * 11).toFixed(2)}px`)
  face.style.setProperty('--face-y', `${(gaze.y * 8).toFixed(2)}px`)
  face.style.setProperty('--face-rotate', `${(gaze.x * 2.2).toFixed(2)}deg`)
  character.style.setProperty('--character-tilt', `${(gaze.x * 2.5).toFixed(2)}deg`)
  character.style.setProperty('--character-lift', `${(gaze.y * 3).toFixed(2)}px`)

  pupils.forEach((pupil) => {
    pupil.style.setProperty('--pupil-x', `${(gaze.x * 10).toFixed(2)}px`)
    pupil.style.setProperty('--pupil-y', `${(gaze.y * 7).toFixed(2)}px`)
  })

  requestAnimationFrame(applyGaze)
}

const clearExpression = () => {
  window.clearTimeout(expressionTimer)
  orb.classList.remove(...expressionClasses)
}

const showRandomExpression = () => {
  const candidates = expressionClasses.filter((expression) => expression !== previousExpression)
  const expression = candidates[Math.floor(Math.random() * candidates.length)]

  clearExpression()
  previousExpression = expression
  orb.classList.add(expression)
  expressionTimer = window.setTimeout(() => orb.classList.remove(expression), 680 + Math.random() * 420)
}

const scheduleSpeech = (minimumDelay = 3200, delayRange = 4200) => {
  window.clearTimeout(speechTimer)
  speechTimer = window.setTimeout(showRandomSpeech, minimumDelay + Math.random() * delayRange)
}

const showRandomSpeech = () => {
  if (activeView !== 'orbi') {
    scheduleSpeech()
    return
  }

  const choices = messages.map((_, index) => index).filter((index) => index !== previousMessage)
  const messageIndex = choices[Math.floor(Math.random() * choices.length)]

  previousMessage = messageIndex
  speechText.textContent = messages[messageIndex]
  speechBubble.classList.remove('is-visible')
  void speechBubble.offsetWidth
  speechBubble.classList.add('is-visible')

  window.clearTimeout(speechHideTimer)
  speechHideTimer = window.setTimeout(() => {
    speechBubble.classList.remove('is-visible')
    scheduleSpeech()
  }, 3600)
}

window.addEventListener('pointermove', (event) => {
  if (activeView !== 'orbi') return

  setGazeTarget(event.clientX, event.clientY)

  const now = performance.now()
  const distance = Math.hypot(event.clientX - lastPointer.x, event.clientY - lastPointer.y)
  if (distance < 14 || now < nextExpressionAt) return

  lastPointer.x = event.clientX
  lastPointer.y = event.clientY
  nextExpressionAt = now + 420 + Math.random() * 520
  showRandomExpression()
})

window.addEventListener('pointerdown', (event) => {
  if (activeView !== 'orbi') return

  setGazeTarget(event.clientX, event.clientY)
  clearExpression()
  nextExpressionAt = performance.now() + 720

  const bounds = orb.getBoundingClientRect()
  const winkSide = event.clientX < bounds.left + bounds.width / 2 ? 'wink-left' : 'wink-right'

  window.clearTimeout(winkTimer)
  orb.classList.remove('wink-left', 'wink-right')
  void orb.offsetWidth
  orb.classList.add(winkSide)

  winkTimer = window.setTimeout(() => {
    orb.classList.remove('wink-left', 'wink-right')
  }, 620)
})

requestAnimationFrame(applyGaze)
scheduleSpeech(1400, 1200)

type FallingLetter = {
  element: HTMLSpanElement
  x: number
  y: number
  width: number
  height: number
  vx: number
  vy: number
  gravity: number
  rotation: number
  angularVelocity: number
  landed: boolean
  cleanupTimer: number
}

const fallingLayer = document.querySelector<HTMLDivElement>('.falling-letters')!
const runner = document.querySelector<HTMLDivElement>('#runner')!
const scoreElement = document.querySelector<HTMLElement>('#score')!
const gameOverPanel = document.querySelector<HTMLDivElement>('#game-over')!
const finalScoreElement = document.querySelector<HTMLElement>('#final-score')!
const restartButton = document.querySelector<HTMLButtonElement>('#restart-game')!
const challengePanel = document.querySelector<HTMLDivElement>('#typing-challenge')!
const targetWordElement = document.querySelector<HTMLDivElement>('#target-word')!
const typingInput = document.querySelector<HTMLInputElement>('#typing-input')!
const letterColors = ['#d94f83', '#bd416b', '#e26f78', '#c65391', '#a94e79', '#d86b9d', '#a75b94', '#e0788d']
const challengeWords = ['은하수', '우주여행', '별빛산책', '마음챙김', '오늘도행복', '반짝이는별', '용기한스푼', '즐거운코딩']

type RoundStatus = 'waiting' | 'active' | 'cleared' | 'failed'

let fallingLetters: FallingLetter[] = []
let gameRunning = true
let score = 0
let runnerX = window.innerWidth / 2 - 38
let runnerTargetX = runnerX
let dodgeDecisionAt = 0
let gamePreviousTime = performance.now()
let currentChallenge = ''
let typedValue = ''
let previousChallenge = ''
let roundStatus: RoundStatus = 'waiting'
let failureLetter: FallingLetter | null = null
let nextRoundTimer = 0
let isComposing = false
let pendingSubmit = false
let submitTimer = 0
let roundLetterColor = letterColors[0]

const getRunnerBounds = () => {
  const bounds = runner.getBoundingClientRect()
  const width = bounds.width || 76
  const height = bounds.height || 124

  return {
    width,
    height,
    y: window.innerHeight - 16 - height,
  }
}

const updateScore = () => {
  scoreElement.textContent = String(score)
}

const getFallSpeedScale = () => {
  const viewportRatio = Math.min(window.innerWidth / 1280, window.innerHeight / 800)
  return Math.min(1, Math.max(0.35, viewportRatio ** 1.35))
}

const spawnFallingLetter = (value: string, aimedAtRunner = false, verticalOffset = 0) => {
  if (!gameRunning) return

  const fallSpeedScale = getFallSpeedScale()
  const size = 46 + Math.random() * 34
  const width = size * 0.95
  const height = size * 1.05
  const maxX = Math.max(12, window.innerWidth - width - 12)
  const runnerBounds = getRunnerBounds()
  const randomX = Math.random() * maxX
  const focusedX = aimedAtRunner
    ? runnerX + runnerBounds.width / 2 - width / 2 + (-8 + Math.random() * 16)
    : runnerX + (-150 + Math.random() * 300)
  const x = Math.min(Math.max(aimedAtRunner ? focusedX : randomX, 12), maxX)
  const element = document.createElement('span')

  element.className = 'falling-letter'
  element.textContent = value
  element.style.fontSize = `${size.toFixed(1)}px`
  element.style.color = roundLetterColor
  fallingLayer.append(element)

  fallingLetters.push({
    element,
    x,
    y: -height - 18 - verticalOffset,
    width,
    height,
    vx: aimedAtRunner ? -5 + Math.random() * 10 : -72 + Math.random() * 144,
    vy: (12 + Math.random() * 16) * fallSpeedScale,
    gravity: 175 + Math.random() * 100,
    rotation: -24 + Math.random() * 48,
    angularVelocity: (-150 + Math.random() * 300) || 90,
    landed: false,
    cleanupTimer: 0,
  })
}

const renderChallenge = () => {
  const letters = Array.from(currentChallenge)
  const typedLetters = Array.from(typedValue)

  targetWordElement.replaceChildren(
    ...letters.map((letter, index) => {
      const character = document.createElement('span')
      character.textContent = letter

      if (typedLetters[index] === letter) character.classList.add('is-correct')
      else if (typedLetters[index]) character.classList.add('is-wrong')

      return character
    }),
  )

}

const startRound = () => {
  if (!gameRunning || activeView !== 'dodge') return

  window.clearTimeout(nextRoundTimer)
  const candidates = challengeWords.filter((word) => word !== previousChallenge)
  currentChallenge = candidates[Math.floor(Math.random() * candidates.length)]
  previousChallenge = currentChallenge
  const colorCandidates = letterColors.filter((color) => color !== roundLetterColor)
  roundLetterColor = colorCandidates[Math.floor(Math.random() * colorCandidates.length)]
  typedValue = ''
  pendingSubmit = false
  window.clearTimeout(submitTimer)
  roundStatus = 'active'
  failureLetter = null
  challengePanel.classList.remove('is-success', 'is-error')
  typingInput.readOnly = false
  typingInput.value = ''
  typingInput.placeholder = '입력을 시작하세요'
  typingInput.maxLength = Array.from(currentChallenge).length
  renderChallenge()
  requestAnimationFrame(() => typingInput.focus())

  const dangerIndex = Math.floor(Math.random() * currentChallenge.length)
  Array.from(currentChallenge).forEach((letter, index) => {
    spawnFallingLetter(letter, index === dangerIndex, index * (34 + Math.random() * 38))
  })
}

const clearRound = () => {
  if (roundStatus !== 'active') return

  roundStatus = 'cleared'
  challengePanel.classList.add('is-success')
  typingInput.readOnly = true
  typingInput.value = ''
  typingInput.placeholder = '정답! 모두 피해요'

  const runnerCenter = runnerX + getRunnerBounds().width / 2
  fallingLetters.forEach((letter, index) => {
    const letterCenter = letter.x + letter.width / 2
    const direction = letterCenter < runnerCenter ? -1 : letterCenter > runnerCenter ? 1 : index % 2 === 0 ? -1 : 1
    letter.vx = direction * (150 + Math.random() * 70)
  })
}

const failRound = () => {
  if (roundStatus !== 'active') return

  roundStatus = 'failed'
  challengePanel.classList.add('is-error')
  typingInput.readOnly = true
  typingInput.value = ''
  typingInput.placeholder = '입력이 달라요!'
  runnerTargetX = runnerX
  failureLetter = fallingLetters
    .filter((letter) => !letter.landed)
    .sort((a, b) => b.y - a.y)[0] ?? null

  if (!failureLetter) {
    spawnFallingLetter(currentChallenge[0], true)
    failureLetter = fallingLetters[fallingLetters.length - 1] ?? null
  }
}

const submitChallenge = () => {
  if (roundStatus !== 'active') return
  if (typedValue.normalize('NFC') === currentChallenge.normalize('NFC')) clearRound()
  else failRound()
}

const chooseDodgeTarget = (now: number) => {
  if (now < dodgeDecisionAt) return
  dodgeDecisionAt = now + 125 + Math.random() * 85

  const runnerBounds = getRunnerBounds()
  const maxX = Math.max(10, window.innerWidth - runnerBounds.width - 10)
  const threats = fallingLetters
    .filter((letter) => !letter.landed && letter.y < runnerBounds.y + runnerBounds.height)
    .map((letter) => {
      const time = (runnerBounds.y - (letter.y + letter.height)) / Math.max(letter.vy, 1)
      return {
        letter,
        time,
        projectedX: letter.x + letter.vx * Math.max(time, 0),
      }
    })
    .filter((threat) => threat.time > -0.1 && threat.time < 1.35)

  if (threats.length === 0) {
    runnerTargetX = Math.min(Math.max(window.innerWidth / 2 - runnerBounds.width / 2, 10), maxX)
    return
  }

  const candidates = Array.from({ length: 9 }, (_, index) => 10 + (maxX - 10) * (index / 8))
  candidates.push(runnerX)

  let bestPosition = runnerX
  let bestScore = Number.NEGATIVE_INFINITY

  candidates.forEach((candidate) => {
    const candidateCenter = candidate + runnerBounds.width / 2
    let safetyScore = -Math.abs(candidate - runnerX) * 0.018

    threats.forEach(({ letter, time, projectedX }) => {
      const letterCenter = projectedX + letter.width / 2
      const safeDistance = (runnerBounds.width + letter.width) / 2 + 18
      const distance = Math.abs(candidateCenter - letterCenter)
      const urgency = 1 / Math.max(0.12, time + 0.18)

      if (distance < safeDistance) safetyScore -= (safeDistance - distance) * urgency * 3.2
      else safetyScore += Math.min(distance - safeDistance, 90) * 0.035
    })

    if (safetyScore > bestScore) {
      bestScore = safetyScore
      bestPosition = candidate
    }
  })

  runnerTargetX = Math.min(Math.max(bestPosition, 10), maxX)
}

const removeLetter = (letter: FallingLetter) => {
  window.clearTimeout(letter.cleanupTimer)
  letter.element.remove()
  fallingLetters = fallingLetters.filter((item) => item !== letter)

  if (roundStatus === 'cleared' && fallingLetters.length === 0 && gameRunning) {
    roundStatus = 'waiting'
    nextRoundTimer = window.setTimeout(startRound, 850)
  }
}

const finishGame = (collidingLetter: FallingLetter) => {
  if (!gameRunning) return

  gameRunning = false
  roundStatus = 'failed'
  window.clearTimeout(nextRoundTimer)
  collidingLetter.element.classList.add('is-collision')
  runner.classList.remove('is-running')
  runner.classList.add('is-hit')
  finalScoreElement.textContent = String(score)
  gameOverPanel.hidden = false

  requestAnimationFrame(() => {
    gameOverPanel.classList.add('is-visible')
    restartButton.focus()
  })
}

const resetGame = () => {
  window.clearTimeout(nextRoundTimer)
  window.clearTimeout(submitTimer)
  fallingLetters.forEach((letter) => {
    window.clearTimeout(letter.cleanupTimer)
    letter.element.remove()
  })
  fallingLetters = []
  score = 0
  typedValue = ''
  pendingSubmit = false
  isComposing = false
  currentChallenge = ''
  roundStatus = 'waiting'
  failureLetter = null
  updateScore()
  challengePanel.classList.remove('is-success', 'is-error')
  targetWordElement.replaceChildren()
  typingInput.readOnly = true
  typingInput.value = ''
  typingInput.placeholder = '입력을 시작하세요'
  runner.classList.remove('is-hit', 'is-running')
  gameOverPanel.classList.remove('is-visible')
  gameOverPanel.hidden = true
  gameRunning = true
  const runnerBounds = getRunnerBounds()
  runnerX = window.innerWidth / 2 - runnerBounds.width / 2
  runnerTargetX = runnerX
  runner.style.transform = `translate3d(${runnerX.toFixed(1)}px, 0, 0)`
  gamePreviousTime = performance.now()

  if (activeView === 'dodge') {
    nextRoundTimer = window.setTimeout(startRound, 480)
    requestAnimationFrame(() => typingInput.focus())
  }
}

const switchView = (nextView: ViewName) => {
  if (!isViewAvailable(nextView)) nextView = 'guestbook'
  if (activeView === nextView) return

  activeView = nextView
  views.forEach((view) => {
    const selected = view.id === `${nextView}-view`
    view.classList.toggle('is-active', selected)
    view.toggleAttribute('hidden', !selected)
    view.setAttribute('aria-hidden', String(!selected))
  })
  menuButtons.forEach((button) => {
    const selected = button.dataset.view === nextView
    button.classList.toggle('is-active', selected)
    button.setAttribute('aria-selected', String(selected))
  })
  document.body.classList.toggle('dodge-active', nextView === 'dodge')
  document.body.classList.toggle('juice-active', nextView === 'juice')
  document.body.classList.toggle('claw-active', nextView === 'claw')
  document.body.classList.toggle('sampler-active', nextView === 'sampler')
  document.body.classList.toggle('watertouch-active', nextView === 'watertouch')
  document.body.classList.toggle('balloon-active', nextView === 'balloon')
  lemonade.setActive(nextView === 'juice')
  clawMachine.setActive(nextView === 'claw')
  sampler.setActive(nextView === 'sampler')
  waterTouch.setActive(nextView === 'watertouch')
  balloon.setActive(nextView === 'balloon')
  guestbook.setActive(nextView === 'guestbook')
  document.body.classList.toggle('guestbook-active', nextView === 'guestbook')

  if (nextView === 'dodge') resetGame()
  else typingInput.blur()
}

const menuToggle = document.querySelector<HTMLButtonElement>('#menu-toggle')!
const projectMenu = document.querySelector<HTMLElement>('#project-menu')!
menuToggle.hidden = false
menuButtons.forEach(button => { button.hidden = !isViewAvailable(button.dataset.view as ViewName) })
const setMenuOpen = (open: boolean) => {
  projectMenu.hidden = !open
  menuToggle.setAttribute('aria-expanded', String(open))
  menuToggle.setAttribute('aria-label', open ? '다른 메뉴 닫기' : '다른 메뉴 열기')
}
menuToggle.addEventListener('click', () => setMenuOpen(projectMenu.hidden !== false))
document.addEventListener('click', (event) => {
  if (event.target instanceof Node && !projectMenu.contains(event.target) && !menuToggle.contains(event.target)) setMenuOpen(false)
})
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !projectMenu.hidden) { setMenuOpen(false); menuToggle.focus() }
})
menuToggle.addEventListener('keydown', (event) => {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    setMenuOpen(true)
    projectMenu.querySelector<HTMLButtonElement>('button:not([hidden])')?.focus()
  }
})

menuButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const next = button.dataset.view as ViewName
    if (projectMenu.contains(button)) { setMenuOpen(false); menuToggle.focus() }
    if (location.hash === `#${next}`) switchView(next)
    else location.hash = next
  })
})

const syncViewFromHash = () => {
  const next = location.hash.slice(1)
  const valid = menuButtons.some((button) => button.dataset.view === next && isViewAvailable(next as ViewName))
  switchView(valid ? next as ViewName : 'guestbook')
}
window.addEventListener('hashchange', syncViewFromHash)
const normalizeKoreanInput = (value: string) => value.normalize('NFC').replace(/\s/gu, '')

const syncKoreanInput = () => {
  if (roundStatus !== 'active') {
    typingInput.value = ''
    return
  }

  const normalized = Array.from(normalizeKoreanInput(typingInput.value))
    .slice(0, Array.from(currentChallenge).length)
    .join('')

  typedValue = normalized
  if (!isComposing && typingInput.value !== normalized) typingInput.value = normalized
  renderChallenge()
}

const queueChallengeSubmit = () => {
  window.clearTimeout(submitTimer)
  submitTimer = window.setTimeout(() => {
    if (!pendingSubmit || isComposing || roundStatus !== 'active') return

    syncKoreanInput()
    pendingSubmit = false
    submitChallenge()
  }, 0)
}

typingInput.addEventListener('compositionstart', () => {
  isComposing = true
})

typingInput.addEventListener('compositionend', () => {
  isComposing = false
  syncKoreanInput()
  if (pendingSubmit) queueChallengeSubmit()
})

typingInput.addEventListener('input', () => {
  syncKoreanInput()
  if (pendingSubmit && !isComposing) queueChallengeSubmit()
})

typingInput.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter') return
  event.preventDefault()
  pendingSubmit = true
  if (!event.isComposing && !isComposing) queueChallengeSubmit()
})

typingInput.addEventListener('keyup', (event) => {
  if (event.key === 'Enter' && pendingSubmit && !isComposing) queueChallengeSubmit()
})

document.querySelector<HTMLElement>('#dodge-view')!.addEventListener('pointerdown', (event) => {
  if (gameRunning && roundStatus === 'active' && event.target !== restartButton) {
    requestAnimationFrame(() => typingInput.focus())
  }
})

restartButton.addEventListener('click', resetGame)

window.addEventListener('resize', () => {
  const bounds = getRunnerBounds()
  runnerX = Math.min(Math.max(runnerX, 10), window.innerWidth - bounds.width - 10)
  runnerTargetX = Math.min(Math.max(runnerTargetX, 10), window.innerWidth - bounds.width - 10)
})

const animateGame = (now: number) => {
  const delta = Math.min((now - gamePreviousTime) / 1000, 0.04)
  gamePreviousTime = now

  if (gameRunning && activeView === 'dodge') {
    if (roundStatus === 'cleared') chooseDodgeTarget(now)

    const runnerBounds = getRunnerBounds()
    const fallSpeedScale = getFallSpeedScale()
    const runnerSpeed = roundStatus === 'cleared' ? 520 : 285
    if (roundStatus === 'active') {
      const centerX = window.innerWidth / 2 - runnerBounds.width / 2
      const patrolDistance = Math.min(135, Math.max(38, (window.innerWidth - runnerBounds.width) * 0.18))
      const patrolX = centerX + Math.sin(now / 1150) * patrolDistance
      runnerTargetX = Math.min(Math.max(patrolX, 10), window.innerWidth - runnerBounds.width - 10)
    }

    const runnerDifference = runnerTargetX - runnerX
    const runnerStep = Math.sign(runnerDifference) * Math.min(Math.abs(runnerDifference), runnerSpeed * delta)
    runnerX += runnerStep
    runner.style.transform = `translate3d(${runnerX.toFixed(1)}px, 0, 0)`
    runner.style.setProperty('--runner-lean', `${Math.max(-8, Math.min(8, runnerDifference * 0.08)).toFixed(1)}deg`)
    runner.classList.toggle('is-running', Math.abs(runnerStep) > 0.25)
    runner.classList.toggle('faces-left', runnerStep < -0.25)

    const playerHitbox = {
      left: runnerX + 13,
      right: runnerX + runnerBounds.width - 13,
      top: runnerBounds.y + 5,
      bottom: runnerBounds.y + runnerBounds.height,
    }

    fallingLetters.slice().forEach((letter) => {
      if (letter.landed) return

      letter.vy += letter.gravity * fallSpeedScale * delta

      if (roundStatus === 'failed' && letter === failureLetter) {
        const desiredX = runnerX + runnerBounds.width / 2 - letter.width / 2
        letter.vx += (desiredX - letter.x) * 7.5 * delta
        letter.vx *= Math.pow(0.24, delta)
      }

      letter.x += letter.vx * delta
      letter.y += letter.vy * delta
      letter.rotation += letter.angularVelocity * delta

      if (letter.x < 4 || letter.x + letter.width > window.innerWidth - 4) {
        letter.x = Math.min(Math.max(letter.x, 4), window.innerWidth - letter.width - 4)
        letter.vx *= -0.72
      }

      letter.element.style.transform = `translate3d(${letter.x.toFixed(1)}px, ${letter.y.toFixed(1)}px, 0) rotate(${letter.rotation.toFixed(1)}deg)`

      const letterHitbox = {
        left: letter.x + letter.width * 0.12,
        right: letter.x + letter.width * 0.88,
        top: letter.y + letter.height * 0.08,
        bottom: letter.y + letter.height * 0.92,
      }

      const collided =
        letterHitbox.right > playerHitbox.left &&
        letterHitbox.left < playerHitbox.right &&
        letterHitbox.bottom > playerHitbox.top &&
        letterHitbox.top < playerHitbox.bottom

      if (collided && roundStatus !== 'cleared') {
        finishGame(letter)
        return
      }

      if (letter.y + letter.height >= window.innerHeight - 5) {
        letter.landed = true
        letter.y = window.innerHeight - letter.height - 5
        letter.element.style.transform = `translate3d(${letter.x.toFixed(1)}px, ${letter.y.toFixed(1)}px, 0) rotate(${letter.rotation.toFixed(1)}deg)`
        letter.element.classList.add('is-landed')
        score += 1
        updateScore()
        letter.cleanupTimer = window.setTimeout(() => removeLetter(letter), 520)
      }
    })
  }

  requestAnimationFrame(animateGame)
}

requestAnimationFrame(() => {
  resetGame()
  requestAnimationFrame(animateGame)
})

// Resolve the initial URL after all game handlers have initialized.
syncViewFromHash()
