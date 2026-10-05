// The Python half of the Python runner: runs learner code and checks it, inside Pyodide.
//
// js/lib/python-engine.js loads this source into its own namespace (never the learner's) and calls `run_code`. Every call takes and returns JSON text, so the JS side needs no Pyodide
// proxies. It's a JS module (not a .py file) so the browser worker and the Node tests import the same text with no
// build step. String.raw keeps Python's backslashes intact; don't use backticks or "${" in the Python below.

export const HARNESS_PY = String.raw`
import ast
import builtins
import copy
import io
import json
import math
import reprlib
import sys
import traceback

USER_FILE = "<your code>"
SETUP_FILE = "<example input>"
LIMITS = {"output": 20000, "repr": 400, "frames": 8}
RICH_MODULES = []


def _no_input(*args, **kwargs):
    raise RuntimeError(
        "input() isn't available here. Your code gets its data from the variables or "
        "function arguments described in the task.")


builtins.input = _no_input
_BASE_BUILTINS = dict(builtins.__dict__)
_BASE_RECURSION = sys.getrecursionlimit()


def configure(options_json):
    options = json.loads(options_json)
    LIMITS.update(options.get("limits", {}))
    RICH_MODULES[:] = options.get("rich_modules", [])


def _restore():
    """Undo anything learner code changed in the shared interpreter: builtins, streams, recursion limit."""
    extra = [name for name in builtins.__dict__ if name not in _BASE_BUILTINS]
    for name in extra:
        del builtins.__dict__[name]
    builtins.__dict__.update(_BASE_BUILTINS)
    sys.stdout, sys.stderr = sys.__stdout__, sys.__stderr__
    sys.setrecursionlimit(_BASE_RECURSION)


class _Capped(io.TextIOBase):
    """A text stream that keeps at most LIMITS["output"] characters and remembers whether it dropped any."""

    def __init__(self):
        self.parts = []
        self.size = 0
        self.truncated = False

    def writable(self):
        return True

    def write(self, text):
        if not isinstance(text, str):
            raise TypeError("write() argument must be str, not " + type(text).__name__)
        room = LIMITS["output"] - self.size
        if len(text) > room:
            self.truncated = True
            text = text[:max(room, 0)]
        self.parts.append(text)
        self.size += len(text)
        return len(text)

    def getvalue(self):
        return "".join(self.parts)


_REPR = reprlib.Repr()
_REPR.maxlevel = 6
_REPR.maxlist = _REPR.maxtuple = _REPR.maxset = _REPR.maxfrozenset = _REPR.maxdeque = 40
_REPR.maxdict = 30
_REPR.maxstring = 160
_REPR.maxother = 160
_REPR.maxlong = 80


def short_repr(value):
    try:
        text = _REPR.repr(value)
    except Exception as exc:
        text = "<unprintable " + type(value).__name__ + ": " + str(exc) + ">"
    if len(text) > LIMITS["repr"]:
        text = text[:LIMITS["repr"] - 1] + "…"
    return text


def _rich_html(value):
    """HTML for values from allow-listed libraries (pandas DataFrames, later), else None."""
    module = type(value).__module__ or ""
    if not any(module == m or module.startswith(m + ".") for m in RICH_MODULES):
        return None
    method = getattr(value, "_repr_html_", None)
    if method is None:
        return None
    try:
        html = method()
    except Exception:
        return None
    return html if isinstance(html, str) else None


# ---------- Compiling and errors ----------

def _compile(code, filename=USER_FILE, split_last=False):
    """Compile code. With split_last, a final expression statement is compiled separately (Jupyter-style)."""
    tree = ast.parse(code, filename, "exec")
    last = None
    if split_last and tree.body and isinstance(tree.body[-1], ast.Expr):
        last = ast.Expression(tree.body.pop().value)
    body = compile(tree, filename, "exec")
    return body, (compile(last, filename, "eval") if last is not None else None)


def _source_line(lines, number):
    if number and 1 <= number <= len(lines):
        return lines[number - 1].strip()
    return ""


def error_info(exc, code):
    """A trimmed, readable error: the learner's own lines only, never the runner's or Pyodide's frames."""
    lines = code.splitlines()
    name = type(exc).__name__
    if isinstance(exc, SyntaxError) and exc.filename in (USER_FILE, SETUP_FILE):
        number = exc.lineno
        source = (exc.text or _source_line(lines, number)).rstrip("\n")
        detail = ["  Line " + str(number) + ":", "    " + source.strip()]
        if exc.offset and source:
            indent = len(source) - len(source.lstrip())
            detail.append("    " + " " * max(exc.offset - 1 - indent, 0) + "^")
        message = exc.msg
        return {
            "type": name,
            "message": message,
            "line": number,
            "summary": ("Line " + str(number) + ": " if number else "") + name + ": " + message,
            "traceback": "\n".join(detail + [name + ": " + message]),
        }
    frames = [f for f in traceback.extract_tb(exc.__traceback__) if f.filename == USER_FILE]
    message = str(exc)
    if isinstance(exc, KeyError) and len(exc.args) == 1:
        message = repr(exc.args[0])
    out = ["Traceback (most recent call last):"]
    hidden = len(frames) - LIMITS["frames"]
    if hidden > 0:
        out.append("  ... " + str(hidden) + " more calls ...")
    shown, repeats = [], 0
    for f in frames[-LIMITS["frames"]:]:
        if shown and (shown[-1].lineno, shown[-1].name) == (f.lineno, f.name):
            repeats += 1
            if repeats >= 2:
                continue
        else:
            if repeats >= 2:
                out.append("  [Previous line repeated " + str(repeats - 1) + " more times]")
            repeats = 0
        shown.append(f)
        where = "your code" if f.name == "<module>" else f.name + "()"
        out.append("  Line " + str(f.lineno) + ", in " + where)
        text = _source_line(lines, f.lineno)
        if text:
            out.append("    " + text)
    if repeats >= 2:
        out.append("  [Previous line repeated " + str(repeats - 1) + " more times]")
    out.append(name + (": " + message if message else ""))
    number = frames[-1].lineno if frames else None
    return {
        "type": name,
        "message": message,
        "line": number,
        "summary": ("Line " + str(number) + ": " if number else "") + name + (": " + message if message else ""),
        "traceback": "\n".join(out),
    }


class _Captured:
    """Redirect stdout and stderr for one execution."""

    def __enter__(self):
        self.out, self.err = _Capped(), _Capped()
        sys.stdout, sys.stderr = self.out, self.err
        return self

    def __exit__(self, *exc):
        _restore()
        return False


def _fresh_namespace():
    return {"__name__": "__main__", "__builtins__": builtins}


def _exec_setup(setup, ns):
    if setup:
        exec(compile(setup, SETUP_FILE, "exec"), ns)


# ---------- Run (practice swing) ----------

def run_code(code, setup):
    """Run code in a fresh namespace. Returns stdout, stderr, the last expression's value, and any error."""
    result = {"stdout": "", "stderr": "", "truncated": False, "value": None, "error": None}
    ns = _fresh_namespace()
    with _Captured() as cap:
        try:
            _exec_setup(setup, ns)
            body, last = _compile(code, split_last=True)
            exec(body, ns)
            if last is not None:
                value = eval(last, ns)
                if value is not None:
                    result["value"] = {"repr": short_repr(value), "html": _rich_html(value), "type": type(value).__name__}
        except SystemExit:
            pass
        except BaseException as exc:
            result["error"] = error_info(exc, code)
    result["stdout"] = cap.out.getvalue()
    result["stderr"] = cap.err.getvalue()
    result["truncated"] = cap.out.truncated or cap.err.truncated
    return json.dumps(result)
`;
