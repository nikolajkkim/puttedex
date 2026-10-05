// The pandas half of the Python runner: DataFrame datasets, Run against them, the data panel's descriptions, and
// table display. js/lib/python-engine.js runs this source in the harness namespace (after js/lib/python-harness.js,
// whose helpers it uses) the first time pandas is loaded, so a page without pandas problems never imports pandas.
// The DataFrame checker (js/lib/pandas-checker.js) builds on it. Same rules as python-harness.js: JSON in and out,
// and no backticks or "${" in the Python below.
//
// Datasets: register_frames(dataset, variant, {table: csv text}) reads each CSV once with plain pd.read_csv and keeps
// the result as a pristine copy. Every run, check case, and description works on fresh deep copies, so learner code
// can never change the data seen by the next run, the next case, or the next hole.

export const PANDAS_HARNESS_PY = String.raw`
import difflib
import warnings

import numpy as np
import pandas as pd

_FRAMES = {}  # (dataset, variant) -> {table: pristine DataFrame}
TABLE_ROWS = {"display": 20, "sample": 5}


def configure_frames(options_json):
    TABLE_ROWS.update(json.loads(options_json))


def register_frames(dataset, variant, tables_json):
    tables = json.loads(tables_json)
    _FRAMES[(dataset, variant)] = {name: pd.read_csv(io.StringIO(text)) for name, text in tables.items()}
    return json.dumps(sorted(tables))


def has_frames(dataset, variant):
    return (dataset, variant) in _FRAMES


def fresh_frames(dataset, variant, names):
    """Deep copies of the pristine tables."""
    pristine = _FRAMES.get((dataset, variant))
    if pristine is None:
        raise RuntimeError("The " + dataset + " data (" + variant + ") isn't loaded.")
    missing = [n for n in names if n not in pristine]
    if missing:
        raise RuntimeError("The " + dataset + " data has no table named " + ", ".join(missing) + ".")
    return {n: pristine[n].copy(deep=True) for n in names}


def frame_namespace(dataset, variant, names, setup=""):
    """A fresh namespace with pd, np, and fresh copies of the named tables, after running the case's setup (which
    may replace or edit them, e.g. to add a tie or empty a group)."""
    ns = _fresh_namespace()
    ns["pd"], ns["np"] = pd, np
    ns.update(fresh_frames(dataset, variant, names))
    if setup:
        exec(compile(setup, SETUP_FILE, "exec"), ns)
    return ns


# ---------- Display: DataFrames and Series as JSON tables ----------

def _float_text(v):
    if v == int(v) and abs(v) < 1e15:
        return str(int(v)) + ".0"
    text = ("%.6f" % v).rstrip("0")
    if text.endswith("."):
        text += "0"
    if text in ("0.0", "-0.0") and v != 0:
        text = "%.3g" % v
    return text


def cell(v):
    """A display cell: text, or {"na": "NaN"} (or None, NaT, <NA>) for a missing value."""
    if v is None:
        return {"na": "None"}
    if v is pd.NA:
        return {"na": "<NA>"}
    if v is pd.NaT:
        return {"na": "NaT"}
    if isinstance(v, (bool, np.bool_)):
        return str(bool(v))
    if isinstance(v, (int, np.integer)):
        return str(int(v))
    if isinstance(v, (float, np.floating)):
        return {"na": "NaN"} if math.isnan(v) else _float_text(float(v))
    if isinstance(v, pd.Timestamp):
        return v.strftime("%Y-%m-%d") if v.tz is None and v == v.normalize() else str(v)
    if isinstance(v, str):
        return v
    return short_repr(v)


def label_text(label):
    if isinstance(label, tuple):
        return " / ".join(str(x) for x in label)
    return str(label)


def _is_default_index(index):
    return isinstance(index, pd.RangeIndex) and index.start == 0 and index.step == 1


def frame_table(value, max_rows=None):
    """A DataFrame or Series as a JSON-friendly table: the first max_rows rows, with the index."""
    max_rows = TABLE_ROWS["display"] if max_rows is None else max_rows
    is_series = isinstance(value, pd.Series)
    frame = value.to_frame(name=value.name if value.name is not None else "(values)") if is_series else value
    shown = frame.head(max_rows)
    names = [n for n in frame.index.names]
    rows = []
    for label, values in zip(shown.index, shown.itertuples(index=False, name=None)):
        index_cells = [cell(x) for x in label] if isinstance(label, tuple) else [cell(label)]
        rows.append({"index": index_cells, "cells": [cell(x) for x in values]})
    return {
        "kind": "Series" if is_series else "DataFrame",
        "shape": [int(frame.shape[0]), int(frame.shape[1])] if not is_series else [int(len(value))],
        "columns": [label_text(c) for c in frame.columns],
        "dtypes": [str(t) for t in frame.dtypes],
        "indexNames": [None if n is None else label_text(n) for n in names],
        "defaultIndex": _is_default_index(frame.index),
        "rows": rows,
        "rowCount": int(frame.shape[0]),
    }


def display_value(value):
    """{ repr, type, table? } for Run's 'value of your last line' and the checker's expected/got."""
    kind = type(value).__name__
    if isinstance(value, (pd.DataFrame, pd.Series)):
        return {"repr": kind + " " + " x ".join(str(n) for n in value.shape), "type": kind, "html": None,
                "table": frame_table(value)}
    if isinstance(value, pd.Index):
        return {"repr": short_repr(value.tolist()), "type": kind, "html": None}
    if isinstance(value, np.generic):
        value = value.item()
    return {"repr": short_repr(value), "type": kind, "html": None}


def describe_frames(dataset, variant, names_json):
    """The data panel: each table's shape, columns with dtype and missing count, and the first rows."""
    out = []
    for name, df in fresh_frames(dataset, variant, json.loads(names_json)).items():
        out.append({
            "name": name,
            "shape": [int(df.shape[0]), int(df.shape[1])],
            "columns": [{"name": label_text(c), "dtype": str(t), "missing": int(df[c].isna().sum())}
                        for c, t in zip(df.columns, df.dtypes)],
            "sample": frame_table(df, TABLE_ROWS["sample"]),
        })
    return json.dumps(out)


# ---------- Friendlier pandas errors ----------

def _columns_of(ns):
    cols = []
    for v in list(ns.values()):
        if isinstance(v, pd.DataFrame):
            cols.extend(str(c) for c in v.columns)
    return sorted(set(cols))


_HINTS = [
    ("truth value of a Series is ambiguous",
     "Combine conditions with & (and), | (or), and ~ (not), with each condition in parentheses. Python's and/or/if "
     "can't test a whole column at once."),
    ("truth value of a DataFrame is ambiguous",
     "A whole DataFrame can't be True or False. Pick a column, or use .any() / .all() / .empty."),
    ("Cannot perform 'rand_'", "Wrap each condition in parentheses: (a > 1) & (b < 2). & binds tighter than > or ==."),
    ("Cannot perform 'ror_'", "Wrap each condition in parentheses: (a > 1) | (b < 2). | binds tighter than > or ==."),
    ("unsupported operand type(s) for &", "Wrap each condition in parentheses: (a > 1) & (b < 2)."),
    ("unsupported operand type(s) for |", "Wrap each condition in parentheses: (a > 1) | (b < 2)."),
    ("duplicate entries, cannot reshape",
     "pivot() needs each row/column pair once. Use pivot_table() with an aggfunc to combine duplicates."),
    ("You are trying to merge on",
     "The join keys have different types. Convert one side with astype() so both match."),
    ("Can only use .str accessor", "The .str methods only work on text columns. Check the dtype (or convert first)."),
    ("Can only use .dt accessor", "Convert the column with pd.to_datetime() before using .dt."),
    ("No objects to concatenate", "pd.concat() needs a list of DataFrames, e.g. pd.concat([a, b])."),
    ("Must produce aggregated value", "The function you pass to agg() must return one value per group."),
]


def pandas_hint(exc, ns):
    """A short hint for common pandas mistakes, or None."""
    message = str(exc)
    columns = _columns_of(ns)
    if isinstance(exc, KeyError) and len(exc.args) == 1:
        key = exc.args[0]
        if isinstance(key, str):
            close = difflib.get_close_matches(key, columns, n=1, cutoff=0.6)
            if close:
                return "There's no column '" + key + "'. Did you mean '" + close[0] + "'?"
            if columns:
                return "There's no column '" + key + "'. The columns are listed in the data panel."
    if isinstance(exc, AttributeError) and "object has no attribute" in message:
        name = message.rsplit("'", 2)[-2] if message.count("'") >= 4 else ""
        close = difflib.get_close_matches(name, columns, n=1, cutoff=0.8)
        if close:
            return "To get the column '" + close[0] + "', use df['" + close[0] + "']."
    for needle, hint in _HINTS:
        if needle in message:
            return hint
    return None


def frame_error_info(exc, code, ns):
    """error_info (only the learner's own lines, never pandas internals), with a long pandas message cut to its
    first lines and a hint for common mistakes."""
    info = error_info(exc, code)
    message = info["message"]
    lines = message.splitlines()
    if len(lines) > 3 or len(message) > 300:
        short = "\n".join(lines[:3])
        short = short[:300] + ("…" if len(short) > 300 or len(lines) > 3 else "")
        info["traceback"] = info["traceback"].replace(message, short)
        info["summary"] = info["summary"].replace(message, short)
        info["message"] = short
    hint = pandas_hint(exc, ns)
    if hint:
        info["hint"] = hint
        info["traceback"] += "\nHint: " + hint
    return info


# ---------- Run (practice swing) with DataFrames ----------

def _call_args(source):
    return _args(source) if source else ([], {})


def run_frames(code, options_json):
    """Run learner code with the visible tables defined (plus pd and np). Shows printed output and the last line's
    value; when the last line has no value and the code defines the task's function, calls it on fresh copies of the
    tables and shows what it returned."""
    opts = json.loads(options_json)
    names = opts.get("frames", [])
    result = {"stdout": "", "stderr": "", "truncated": False, "value": None, "error": None, "called": None,
              "returnedNone": False}
    ns = {}
    with _Captured() as cap:
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("always")
                ns = frame_namespace(opts["dataset"], opts["variant"], names, opts.get("setup", ""))
                body, last = _compile(code, split_last=True)
                exec(body, ns)
                value = eval(last, ns) if last is not None else None
                call = opts.get("call")
                if value is None and last is None and call and callable(ns.get(call["function"])):
                    fresh = frame_namespace(opts["dataset"], opts["variant"], names, opts.get("setup", ""))
                    args, kwargs = _call_args(call.get("args", ""))
                    shown = ", ".join(names + ([call["args"]] if call.get("args") else []))
                    result["called"] = call["function"] + "(" + shown + ")"
                    value = ns[call["function"]](*[fresh[n] for n in names], *args, **kwargs)
                    result["returnedNone"] = value is None
                if value is not None:
                    result["value"] = display_value(value)
        except SystemExit:
            pass
        except BaseException as exc:
            result["error"] = frame_error_info(exc, code, ns)
    result["stdout"] = cap.out.getvalue()
    result["stderr"] = cap.err.getvalue()
    result["truncated"] = cap.out.truncated or cap.err.truncated
    return json.dumps(result)
`;
