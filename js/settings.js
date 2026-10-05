// Per-browser settings, kept apart from progress: they aren't part of export/import, and resetting progress keeps
// them. Storage: localStorage['puttedex.settings'] = { practiceMode: boolean }.
//
// Practice mode bypasses every unlock rule (today: the Driving Range's RANGE_UNLOCK), so any tournament or range
// set that exists can be opened without finishing the ones before it. Tournaments still marked "coming soon" stay
// closed: there's nothing to play yet. Off by default.

export const SETTINGS_KEY = 'puttedex.settings';
const DEFAULTS = { practiceMode: false };

export function getSettings() {
  try {
    return { ...DEFAULTS, ...JSON.parse(globalThis.localStorage?.getItem(SETTINGS_KEY) ?? '{}') };
  } catch {
    return { ...DEFAULTS };
  }
}

function save(settings) {
  try {
    globalThis.localStorage?.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    /* storage full or blocked: the setting just won't persist */
  }
}

export const isPracticeMode = () => getSettings().practiceMode === true;

export function setPracticeMode(on) {
  save({ ...getSettings(), practiceMode: Boolean(on) });
}
