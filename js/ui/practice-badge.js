// The "Practice mode" badge in the top bar, shown on every page while practice mode is on (see js/settings.js).

import { $ } from './dom.js';
import { isPracticeMode, SETTINGS_KEY } from '../settings.js';

export function mountPracticeBadge() {
  const render = () => {
    $('#practice-badge')?.remove();
    if (!isPracticeMode()) return;
    $('.topbar-inner nav')?.insertAdjacentHTML('afterbegin', `
      <a class="practice-badge" id="practice-badge" href="./#practice-mode"
         title="Practice mode is on: every unlock rule is bypassed. Turn it off in the locker room.">Practice mode</a>`);
  };
  render();
  window.addEventListener('storage', (e) => { if (e.key === SETTINGS_KEY) render(); });
  return { refresh: render };
}
