// The code editor (CodeMirror 5, vendored in vendor/codemirror/ and loaded as the global `CodeMirror`) and read-only
// syntax highlighting for code shown on the page. One editor for every language; LANGUAGES holds the differences.

export const LANGUAGES = {
  sql: { mode: 'text/x-sqlite', indent: 2, closeBrackets: "()''\"\"" },
  python: { mode: 'python', indent: 4, closeBrackets: "()[]{}''\"\"" },
};

/**
 * Replace `host` with an editor. Returns the CodeMirror instance.
 * language: a key of LANGUAGES. run/submit: callbacks for Mod-Enter and Shift-Mod-Enter.
 */
export function createEditor(host, { language = 'sql', value = '', placeholder = '', label = 'Code editor', onChange, run, submit }) {
  const lang = LANGUAGES[language];
  const spaces = ' '.repeat(lang.indent);
  const CodeMirror = window.CodeMirror;
  const cm = CodeMirror(host, {
    value,
    mode: lang.mode,
    theme: 'fairway',
    lineNumbers: true,
    indentUnit: lang.indent,
    tabSize: lang.indent,
    indentWithTabs: false,
    smartIndent: true,
    lineWrapping: false,
    viewportMargin: Infinity, // render every line so the editor can grow with its content
    matchBrackets: true,
    autoCloseBrackets: lang.closeBrackets,
    placeholder,
    screenReaderLabel: label,
    extraKeys: {
      'Cmd-Enter': () => run(),
      'Ctrl-Enter': () => run(),
      'Shift-Cmd-Enter': () => submit(),
      'Shift-Ctrl-Enter': () => submit(),
      'Cmd-/': 'toggleComment',
      'Ctrl-/': 'toggleComment',
      // Tab indents with spaces; with a selection it indents every selected line.
      Tab: (ed) => (ed.somethingSelected() ? ed.execCommand('indentMore') : ed.replaceSelection(spaces, 'end')),
      'Shift-Tab': 'indentLess',
      // Backspace in leading whitespace removes one indent level, so 4-space Python indents undo in one press.
      Backspace: (ed) => {
        if (ed.somethingSelected() || ed.listSelections().length > 1) return CodeMirror.Pass;
        const { line, ch } = ed.getCursor();
        const before = ed.getLine(line).slice(0, ch);
        if (ch === 0 || /\S/.test(before) || lang.indent < 2) return CodeMirror.Pass;
        const remove = ((ch - 1) % lang.indent) + 1;
        ed.replaceRange('', { line, ch: ch - remove }, { line, ch });
        return undefined;
      },
      // Escape releases focus so keyboard users can Tab out of the editor.
      Esc: (ed) => ed.getInputField().blur(),
    },
  });
  if (onChange) cm.on('changes', () => onChange(cm.getValue()));
  return cm;
}

/** Syntax-highlight code into `el` (a <pre> or <code>) using the given theme class. */
export function highlightCode(el, text = el.textContent, { language = 'sql', theme = 'fairway' } = {}) {
  el.classList.add('cm-s-' + theme, 'code-static');
  window.CodeMirror.runMode(text, LANGUAGES[language].mode, el);
}
