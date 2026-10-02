// "Copy context" controls for the problem views: a button that copies the problem, my code, my last run, and my
// progress as Markdown (built by js/context/), plus an "Include pro solution" toggle once the solution is unlocked.
//
// The shortcut is Alt/Option+Shift+C. Cmd/Ctrl+Shift+C is taken by the browsers: it opens the developer tools'
// element inspector in Chrome, Edge, and Firefox.

import { $ } from './dom.js';
import { buildContext } from '../context/index.js';

const IS_MAC = /Mac|iPhone|iPad/.test(navigator.platform);
export const COPY_SHORTCUT_LABEL = IS_MAC ? '⌥⇧C' : 'Alt+Shift+C';

export function copyControlsHTML() {
  return `
    <span class="copy-context">
      <button class="btn btn-small" id="copy-context-btn" type="button" aria-keyshortcuts="Alt+Shift+C"
              title="Copy this problem, your code, your last run, and your progress as Markdown, ready to paste into a chat (${COPY_SHORTCUT_LABEL})">
        <svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14"><rect x="4" y="2" width="9" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M6 1.5h5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><path d="M2.5 5v8.5A1.5 1.5 0 0 0 4 15h7" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
        <span class="copy-label">Copy context</span>
      </button>
      <label class="copy-solution" id="copy-solution-wrap" hidden>
        <input type="checkbox" id="copy-solution"> Include pro solution
      </label>
      <span class="visually-hidden" id="copy-status" role="status" aria-live="polite"></span>
    </span>`;
}

/** Copy text: the async clipboard API, then a hidden textarea with execCommand. Resolves 'clipboard' | 'fallback' | null. */
export async function copyText(text) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return 'clipboard';
    }
  } catch {
    /* fall through: permission denied, insecure context, document not focused… */
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.cssText = 'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;';
  document.body.append(area);
  area.select();
  let ok = false;
  try {
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  area.remove();
  return ok ? 'fallback' : null;
}

/** Last resort: show the text in a dialog, selected, to copy by hand. */
export function showCopyModal(text) {
  let dialog = $('#copy-modal');
  if (!dialog) {
    document.body.insertAdjacentHTML('beforeend', `
      <dialog class="copy-modal" id="copy-modal" aria-labelledby="copy-modal-title">
        <h2 id="copy-modal-title">Copy your problem context</h2>
        <p>Your browser blocked automatic copying. The text is selected below: press
          <kbd>${IS_MAC ? '⌘' : 'Ctrl'}</kbd>+<kbd>C</kbd> to copy it.</p>
        <textarea id="copy-modal-text" readonly spellcheck="false"></textarea>
        <div class="copy-modal-actions"><button class="btn btn-primary" type="button" id="copy-modal-close">Done</button></div>
      </dialog>`);
    dialog = $('#copy-modal');
    $('#copy-modal-close').addEventListener('click', () => dialog.close());
  }
  const area = $('#copy-modal-text');
  area.value = text;
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
  area.focus();
  area.select();
}

let activeCopy = null; // the current page's copy action, for the keyboard shortcut
let shortcutBound = false;

/**
 * Wire the controls rendered by copyControlsHTML().
 *   getContext({ includeSolution }) → a ProblemContext (see js/context/index.js), built from existing page state.
 *   solutionUnlocked() → whether the learner may see the pro solution.
 * Returns { refresh } to call after state changes (e.g. a solve unlocks the solution).
 */
export function mountCopyContext({ getContext, solutionUnlocked }) {
  const button = $('#copy-context-btn');
  const label = button.querySelector('.copy-label');
  const wrap = $('#copy-solution-wrap');
  const toggle = $('#copy-solution');
  let resetTimer;

  const refresh = () => {
    const unlocked = solutionUnlocked();
    wrap.hidden = !unlocked;
    if (!unlocked) toggle.checked = false;
  };

  const copy = async () => {
    const includeSolution = solutionUnlocked() && toggle.checked;
    const text = buildContext(getContext({ includeSolution }));
    const how = await copyText(text);
    if (!how) {
      showCopyModal(text);
      return;
    }
    label.textContent = 'Copied!';
    button.classList.add('is-copied');
    $('#copy-status').textContent = 'Problem context copied to the clipboard.';
    clearTimeout(resetTimer);
    resetTimer = setTimeout(() => {
      label.textContent = 'Copy context';
      button.classList.remove('is-copied');
      $('#copy-status').textContent = '';
    }, 1600);
  };

  button.addEventListener('click', copy);
  activeCopy = copy;
  if (!shortcutBound) {
    shortcutBound = true;
    // Capture phase, so it works while the editor has focus (and doesn't type "Ç" on a Mac).
    document.addEventListener('keydown', (e) => {
      if (e.altKey && e.shiftKey && !e.metaKey && !e.ctrlKey && e.code === 'KeyC' && activeCopy) {
        e.preventDefault();
        activeCopy();
      }
    }, true);
  }
  refresh();
  return { refresh };
}

