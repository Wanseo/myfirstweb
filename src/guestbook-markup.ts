export const guestbookMarkup = `
  <main class="view guestbook-view" id="guestbook-view" aria-hidden="true" hidden>
    <button class="guestbook-night-toggle" id="guestbook-night" type="button" aria-pressed="false">day ☀</button>
    <button class="guestbook-music-toggle" id="guestbook-music" type="button" aria-pressed="false" aria-label="8비트 배경 음악 켜기">
      <svg class="guestbook-music-icon" viewBox="0 0 24 24" aria-hidden="true" shape-rendering="crispEdges">
        <path fill="#000" d="M18 2H21V19H20V20H19V21H16V20H15V19H14V16H15V15H17V14H18V7H17V8H15V9H13V10H11V11H10V21H9V22H8V23H5V22H4V21H3V18H4V17H6V16H7V8H8V7H10V6H12V5H14V4H16V3H18Z"/>
        <path fill="#000" d="M18 3H20V6H18V7H16V8H14V9H12V10H9V9H8V8H10V7H12V6H14V5H16V4H18ZM8 10H9V20H8V21H5V20H4V18H6V17H8ZM19 7H20V18H19V19H16V18H15V16H17V15H19Z"/>
        <path fill="#000" d="M8 11H9V20H8ZM19 8H20V18H19ZM5 20H8V21H5ZM16 18H19V19H16Z"/>
        <path fill="#fff" d="M18 3H20V4H18V5H16V6H14V7H12V8H10V9H8V8H10V7H12V6H14V5H16V4H18ZM4 18H6V19H4ZM15 16H17V17H15Z"/>
        <path fill="#fff" d="M18 3H20V4H18ZM14 5H16V6H14ZM10 7H12V8H10ZM8 11H9V14H8ZM4 18H6V19H4ZM15 16H17V17H15Z"/>
        <path fill="#000" d="M3 2H4V4H6V5H4V7H3V5H1V4H3Z"/>
        <path fill="#fff" d="M3 3H4V4H5V5H4V6H3V5H2V4H3Z"/>
        <path fill="#fff" d="M12 20H13V21H12Z"/>
        <g class="guestbook-music-slash" transform="translate(24 0) scale(-1 1)">
          <path fill="#bceee2" d="M0 1H4V3H6V5H8V7H10V9H12V11H14V13H16V15H18V17H20V19H22V21H24V24H20V22H18V20H16V18H14V16H12V14H10V12H8V10H6V8H4V6H2V4H0Z"/>
          <path fill="#000" d="M1 2H3V4H5V6H7V8H9V10H11V12H13V14H15V16H17V18H19V20H21V22H23V24H21V22H19V20H17V18H15V16H13V14H11V12H9V10H7V8H5V6H3V4H1Z"/>
        </g>
      </svg>
    </button>
    <button class="guestbook-camera-toggle" id="guestbook-camera" type="button" aria-label="화면 캡처해서 PNG 다운로드">
      <svg viewBox="0 0 24 24" aria-hidden="true" shape-rendering="crispEdges">
        <path fill="#666" d="M3 8H22V20H21V21H3V20H2V9H3Z"/>
        <path fill="#000" d="M3 6H21V7H22V19H21V20H3V19H2V7H3Z"/>
        <path fill="#929292" d="M3 7H21V19H3Z"/>
        <path fill="#b9b9b9" d="M16 7H21V8H16Z"/>
        <path fill="#666" d="M3 17H7V18H17V19H3Z"/>
        <path fill="#000" d="M9 9H15V10H17V12H18V16H17V18H15V19H9V18H7V16H6V12H7V10H9Z"/>
        <path fill="#d5dada" d="M9 10H15V11H16V12H17V16H16V17H15V18H9V17H8V16H7V12H8V11H9Z"/>
        <path fill="#fff" d="M14 10H15V11H16V13H15V12H14Z"/>
        <path fill="#000" d="M10 11H14V12H15V16H14V17H10V16H9V12H10Z"/>
        <path fill="#303030" d="M10 12H14V16H10Z"/>
        <path fill="#707070" d="M12 12H14V14H12ZM11 15H12V16H11Z"/>
        <g transform="translate(5.125 .625) scale(.75)">
          <path fill="#000" d="M20 0H21V2H23V3H21V5H20V3H18V2H20Z"/>
          <path fill="#fff" d="M20 1H21V2H22V3H21V4H20V3H19V2H20Z"/>
        </g>
        <path fill="#fff" d="M1 4H2V5H1Z"/>
      </svg>
    </button>
    <span id="guestbook-camera-status" class="guestbook-camera-status" role="status" data-html2canvas-ignore="true"></span>
    <div class="guestbook-night-sky" aria-hidden="true"><div class="guestbook-pixel-stars"></div><div class="guestbook-pixel-moon"></div></div>
    <div class="guestbook-shell">
      <div class="guestbook-workspace">
        <form class="guestbook-form">
          <div class="guestbook-window-title">
            <span class="guestbook-window-icon" aria-hidden="true">▣</span>
            <span role="heading" aria-level="1">Guestbook</span>
            <div class="guestbook-window-controls" aria-hidden="true"><span>_</span><span>□</span><span>×</span></div>
          </div>
          <div class="guestbook-composer-fields">
          <label for="guestbook-name">name</label><input id="guestbook-name" name="name" maxlength="30" placeholder="어떤 이름으로 남길까요?" required autocomplete="nickname">
          <label for="guestbook-message">message</label><textarea id="guestbook-message" name="message" maxlength="500" rows="6" placeholder="오늘의 기분, 인사, 짧은 이야기…" required></textarea>
          <div class="guestbook-form-footer"><span id="guestbook-length">0 / 500</span><button type="submit">commit</button><button id="guestbook-edit-cancel" type="button" hidden>취소</button></div>
          <p class="guestbook-status" id="guestbook-status" role="status" aria-live="polite"></p>
          </div>
        </form>
        <section class="guestbook-board" aria-label="방문자들의 말풍선">
          <div class="guestbook-board-heading"><span id="guestbook-count" hidden>0</span><button id="guestbook-layout" type="button" aria-pressed="false">list ☰</button><button id="guestbook-refresh" type="button">reload ↻</button></div>
          <p id="guestbook-connection" hidden></p>
          <p id="guestbook-empty">아직 이야기가 없어요. 첫 번째 인사를 남겨 주세요!</p>
          <div class="guestbook-notes" id="guestbook-notes"></div>
          <button id="guestbook-more" type="button" hidden>이전 방명록 더 보기</button>
        </section>
      </div>
    </div>
  </main>`
