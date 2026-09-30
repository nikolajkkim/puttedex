// The SQL editor (CodeMirror 5, vendored in vendor/codemirror/ and loaded as the global `CodeMirror`)
// and read-only syntax highlighting for SQL shown on the page.

const MODE = 'text/x-sqlite';

/**
 * Replace `host` with an editor. Returns the CodeMirror instance.
 * keys: { run, submit } callbacks for Mod-Enter and Shift-Mod-Enter.
 */
export function createSqlEditor(host, { value = '', placeholder = '', label = 'SQL query', onChange, run, submit }) {
  const CodeMirror = window.CodeMirror;
  const cm = CodeMirror(host, {
    value,
    mode: MODE,
    theme: 'fairway',
    lineNumbers: true,
    indentUnit: 2,
    tabSize: 2,
    indentWithTabs: false,
    smartIndent: true,
    lineWrapping: false,
    viewportMargin: Infinity, // render every line so the editor can grow with its content
    matchBrackets: true,
    autoCloseBrackets: "()''\"\"",
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
      Tab: (ed) => (ed.somethingSelected() ? ed.execCommand('indentMore') : ed.replaceSelection('  ', 'end')),
      'Shift-Tab': 'indentLess',
      // Escape releases focus so keyboard users can Tab out of the editor.
      Esc: (ed) => ed.getInputField().blur(),
    },
  });
  if (onChange) cm.on('changes', () => onChange(cm.getValue()));
  return cm;
}

/** Syntax-highlight SQL text into `el` (a <pre> or <code>) using the given theme class. */
export function highlightSql(el, text = el.textContent, theme = 'fairway') {
  el.classList.add('cm-s-' + theme, 'sql-static');
  window.CodeMirror.runMode(text, MODE, el);
}
