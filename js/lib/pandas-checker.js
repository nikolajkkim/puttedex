// The DataFrame checker: grades a function that returns a DataFrame, Series, or scalar, by running it and the pro
// solution on fresh copies of the dataset (the visible variant and hidden ones, each optionally edited by a case's
// `setup`) and comparing the results. Python source run in the harness namespace after js/lib/pandas-harness.js.
// The checker format is documented at the top of js/lib/python-engine.js; CLAUDE.md has the authoring rules.
//
// Feedback is meant to read like a good teacher's: the first thing that's wrong (type, columns, shape, index, dtypes,
// row order, values), with specifics for visible cases (names, counts, the first mismatching rows side by side) and
// only the kind of mismatch for hidden ones.

export const PANDAS_CHECKER_PY = String.raw`
DEFAULTS = {"returns": "DataFrame", "rowOrder": "require", "sortBy": None, "index": "ignore",
            "columnOrder": "require", "dtypes": "values", "rtol": 1e-6, "atol": 1e-9}

KIND_TEXT = {
    "type": "Returned the wrong type of value.",
    "columns": "The columns don't match.",
    "shape": "The number of rows doesn't match.",
    "index": "The index doesn't match.",
    "dtype": "A column has the wrong data type.",
    "order": "The rows are right but in the wrong order.",
    "values": "Some values don't match.",
}
MAX_DIFF_ROWS = 3


def _options(checker):
    opts = dict(DEFAULTS)
    opts.update({k: checker[k] for k in DEFAULTS if k in checker})
    return opts


class Mismatch(Exception):
    def __init__(self, kind, detail, diff=None):
        Exception.__init__(self, detail)
        self.kind, self.detail, self.diff = kind, detail, diff


def _show(v):
    """short_repr, with numpy scalars shown as plain Python values (0, not np.int64(0))."""
    return short_repr(v.item() if isinstance(v, np.generic) else v)


def _names(labels):
    return ", ".join("'" + str(x) + "'" if isinstance(x, str) else str(x) for x in labels)


def _rows_text(n):
    return str(n) + " row" + ("" if n == 1 else "s")


def _family(dtype):
    if pd.api.types.is_bool_dtype(dtype):
        return "booleans"
    if pd.api.types.is_integer_dtype(dtype):
        return "integers"
    if pd.api.types.is_float_dtype(dtype):
        return "decimals"
    if pd.api.types.is_datetime64_any_dtype(dtype):
        return "dates"
    if isinstance(dtype, pd.CategoricalDtype):
        return "categories"
    if pd.api.types.is_string_dtype(dtype) or dtype == object:
        return "text"
    return str(dtype)


def _is_na(v):
    try:
        return bool(pd.isna(v))
    except (TypeError, ValueError):
        return False


def _number(v):
    return isinstance(v, (int, float, np.integer, np.floating)) and not isinstance(v, (bool, np.bool_))


def same_value(a, b, opts):
    if _is_na(a) and _is_na(b):
        return True
    if _is_na(a) or _is_na(b):
        return False
    if isinstance(a, (bool, np.bool_)) or isinstance(b, (bool, np.bool_)):
        return isinstance(a, (bool, np.bool_)) and isinstance(b, (bool, np.bool_)) and bool(a) == bool(b)
    if _number(a) and _number(b):
        return math.isclose(float(a), float(b), rel_tol=opts["rtol"], abs_tol=opts["atol"])
    if isinstance(a, pd.Timestamp) or isinstance(b, pd.Timestamp):
        try:
            return pd.Timestamp(a) == pd.Timestamp(b)
        except (TypeError, ValueError):
            return False
    try:
        return bool(a == b)
    except Exception:
        return False


def _column_equal(e, g, opts):
    """Elementwise equality of two aligned columns (as object arrays), NaN equal to NaN."""
    ev, gv = list(e), list(g)
    return [same_value(a, b, opts) for a, b in zip(ev, gv)]


def _sort_key_frame(df, keys):
    try:
        return df.sort_values(keys, kind="mergesort", na_position="last")
    except TypeError:
        return df.assign(**{"__k" + str(i): df[k].astype(str) for i, k in enumerate(keys)}).sort_values(
            ["__k" + str(i) for i in range(len(keys))], kind="mergesort").drop(
            columns=["__k" + str(i) for i in range(len(keys))])


def _diff_rows(expected, got, bad_positions, columns, opts, labels=None):
    rows = []
    for pos in bad_positions[:MAX_DIFF_ROWS]:
        e = [expected[c].iloc[pos] for c in columns]
        g = [got[c].iloc[pos] for c in columns]
        rows.append({
            "row": int(pos),
            "label": None if labels is None else label_text(labels[pos]),
            "expected": [cell(x) for x in e],
            "got": [cell(x) for x in g],
            "bad": [i for i, (a, b) in enumerate(zip(e, g)) if not same_value(a, b, opts)],
        })
    return {"columns": [label_text(c) for c in columns], "rows": rows, "more": max(len(bad_positions) - MAX_DIFF_ROWS, 0)}


def _check_type(expected, got, returns):
    if isinstance(expected, pd.DataFrame):
        if isinstance(got, pd.DataFrame):
            return
        if isinstance(got, pd.Series):
            raise Mismatch("type", "Expected a DataFrame, but your function returned a Series. Selecting one column "
                           "with df['col'] gives a Series; df[['col']] (double brackets), .to_frame(), or "
                           ".reset_index() give a DataFrame.")
    elif isinstance(expected, pd.Series):
        if isinstance(got, pd.Series):
            return
        if isinstance(got, pd.DataFrame):
            raise Mismatch("type", "Expected a Series, but your function returned a DataFrame" + (
                " with one column. Select it with df['" + str(got.columns[0]) + "'] (single brackets)."
                if got.shape[1] == 1 else "."))
    else:
        if isinstance(got, (pd.DataFrame, pd.Series)):
            size = got.size
            raise Mismatch("type", "Expected a single value, but your function returned a " + type(got).__name__ +
                           (" holding one value. Take it out with .item() or .iloc[0]." if size == 1 else "."))
        return
    if got is None:
        raise Mismatch("type", "Your function returned None. Did you forget the return statement, or return the "
                       "result of an inplace=True call (which is always None)?")
    raise Mismatch("type", "Expected a " + returns + ", but your function returned " + type(got).__name__ + ".")


def _check_scalar(expected, got, opts):
    if isinstance(expected, np.generic):
        expected = expected.item()
    if isinstance(got, np.generic):
        got = got.item()
    if _number(expected) and isinstance(got, str):
        raise Mismatch("type", "Expected a number, but got the text " + short_repr(got) + ".")
    if not same_value(expected, got, opts):
        raise Mismatch("values", "Expected " + short_repr(expected) + ", got " + short_repr(got) + ".")


def _index_hint(expected, got):
    """When the expected result has default 0..n-1 index and yours doesn't, or the other way round."""
    if _is_default_index(expected.index) and not _is_default_index(got.index):
        names = [n for n in got.index.names if n is not None]
        repeated = got.index[got.index.duplicated()]
        if len(repeated) and not names:
            return ("Your index has repeated labels (" + _show(repeated[0]) + " appears more than once), which "
                    "happens when pieces keep their own index. Pass ignore_index=True to pd.concat(), or add "
                    ".reset_index(drop=True).")
        if names:
            return ("Your index is " + _names(names) + " (left over from a groupby or set_index). The expected "
                    "result has a plain 0, 1, 2, … index: add .reset_index().")
        head = ", ".join(str(x) for x in list(got.index[:4]))
        return ("Your index isn't reset (it goes " + head + ", …). Add .reset_index(drop=True), or pass "
                "ignore_index=True.")
    if not _is_default_index(expected.index) and _is_default_index(got.index):
        names = [n for n in expected.index.names if n is not None]
        return ("The expected result is indexed by " + (_names(names) if names else "labels") +
                ", but yours has a plain 0, 1, 2, … index. Did you reset_index() (or use as_index=False) when you "
                "shouldn't have?")
    return None


def _check_columns(expected, got, opts):
    ecols, gcols = list(expected.columns), list(got.columns)
    if ecols == gcols:
        return got
    missing = [c for c in ecols if c not in gcols]
    extra = [c for c in gcols if c not in ecols]
    if (missing and set(map(str, gcols)) == set(map(str, expected.index)) and
            set(map(str, got.index)) == set(map(str, ecols))):
        raise Mismatch("columns", "Your result looks transposed: its columns are the expected rows and its rows "
                       "the expected columns. Swap index and columns (or add .T).")
    if missing or extra:
        parts = []
        if missing:
            parts.append("Missing column" + ("s" if len(missing) > 1 else "") + ": " + _names(missing) + ".")
        if extra:
            parts.append("Extra column" + ("s" if len(extra) > 1 else "") + ": " + _names(extra) + ".")
        in_index = [c for c in missing if c in [n for n in got.index.names if n is not None]]
        if in_index:
            parts.append(_names(in_index) + (" is" if len(in_index) == 1 else " are") +
                         " in your index, not a column: add .reset_index().")
        elif missing and extra:
            as_text = [c for c in extra if str(c) in [str(m) for m in missing]]
            if as_text:
                parts.append("Some column labels are text where numbers were expected (or the other way "
                             "round), e.g. " + _names(as_text[:1]) + ".")
            elif len(ecols) == len(gcols):
                parts.append("Rename them with .rename(columns={...}) or name them in agg()/assign().")
        raise Mismatch("columns", " ".join(parts) + " Expected columns: " + _names(ecols) + ".")
    if opts["columnOrder"] == "require":
        raise Mismatch("columns", "The columns are in the wrong order. Expected " + _names(ecols) + ", got " +
                       _names(gcols) + ". Select them in order with df[[...]].")
    return got[ecols]


def _check_dtypes(expected, got, opts):
    for c in expected.columns:
        ef, gf = _family(expected[c].dtype), _family(got[c].dtype)
        if ef == gf:
            continue
        if opts["dtypes"] == "match":
            note = ""
            if ef == "integers" and gf == "decimals":
                note = " A missing value (NaN) turns integers into floats: fill it, or convert with astype(int)."
            elif ef == "dates" and gf == "text":
                note = " Convert it with pd.to_datetime()."
            elif gf == "text" and ef in ("integers", "decimals"):
                note = " Convert the text to numbers with astype() or pd.to_numeric()."
            raise Mismatch("dtype", "Column '" + str(c) + "' should hold " + ef + " (" + str(expected[c].dtype) +
                           "), but yours holds " + gf + " (" + str(got[c].dtype) + ")." + note)
        if gf == "text" and ef in ("integers", "decimals", "booleans"):
            raise Mismatch("dtype", "Column '" + str(c) + "' holds text, but it should hold " + ef +
                           ". Convert it with astype() or pd.to_numeric().")


def _row_order_hint(expected, got, opts, sort_keys):
    """Same rows in another order? Then say so instead of listing value differences."""
    try:
        a = _sort_key_frame(expected.reset_index(drop=True), sort_keys).reset_index(drop=True)
        b = _sort_key_frame(got.reset_index(drop=True), sort_keys).reset_index(drop=True)
    except Exception:
        return False
    return all(all(_column_equal(a[c], b[c], opts)) for c in a.columns)


def _compare_frames(expected, got, opts):
    is_series = isinstance(expected, pd.Series)
    if is_series:
        ename = expected.name if expected.name is not None else "value"
        expected = expected.to_frame(name=ename)
        got = got.to_frame(name=ename)
    else:
        got = _check_columns(expected, got, opts)

    if len(expected) != len(got):
        if is_series:
            detail = "Expected " + str(len(expected)) + " values, got " + str(len(got)) + "."
        else:
            detail = ("Expected " + _rows_text(len(expected)) + " x " + str(expected.shape[1]) + " columns, got " +
                      str(len(got)) + " x " + str(got.shape[1]) + ".")
        extra_dups = int(got.duplicated().sum()) - int(expected.duplicated().sum())
        if len(got) > len(expected) and extra_dups > 0:
            detail += " Your result has " + str(extra_dups) + " more duplicate row" + ("s" if extra_dups > 1 else "") + \
                " than expected: a merge on non-unique keys, or duplicates you didn't drop?"
        elif len(got) > len(expected) and got.isna().any(axis=1).sum() > expected.isna().any(axis=1).sum():
            detail += " Some of your extra rows have missing values: did a merge or filter keep rows it should drop?"
        elif len(got) < len(expected):
            detail += " Check your filter conditions, how missing values are handled, and the merge type (inner drops unmatched rows)."
        raise Mismatch("shape", detail)

    if opts["index"] == "require":
        hint = _index_hint(expected, got)
        if hint:
            raise Mismatch("index", hint)

    _check_dtypes(expected, got, opts)

    columns = list(expected.columns)
    if opts["rowOrder"] == "ignore":
        keys = opts["sortBy"] or columns
        if opts["index"] == "require" and not is_series:
            e = _sort_key_frame(expected.reset_index(), keys)
            g = _sort_key_frame(got.reset_index(), keys)
            expected, got = e.set_index(list(e.columns[:expected.index.nlevels])), g.set_index(list(g.columns[:got.index.nlevels]))
        elif is_series:
            if opts["index"] == "require":
                expected, got = expected.sort_index(kind="mergesort"), got.sort_index(kind="mergesort")
            else:
                expected, got = _sort_key_frame(expected, columns), _sort_key_frame(got, columns)
        else:
            expected, got = _sort_key_frame(expected, keys), _sort_key_frame(got, keys)

    if opts["index"] == "require":
        eidx, gidx = list(expected.index), list(got.index)
        if not all(same_value(a, b, opts) if not isinstance(a, tuple) else
                   (isinstance(b, tuple) and len(a) == len(b) and all(same_value(x, y, opts) for x, y in zip(a, b)))
                   for a, b in zip(eidx, gidx)):
            same_set = sorted(map(str, eidx)) == sorted(map(str, gidx))
            if same_set and opts["rowOrder"] == "require":
                raise Mismatch("order", "Your rows are in a different order. Check the sort (the column(s), "
                               "ascending or descending, and the tie-breaker) and the order you combined pieces in.")
            bad = [i for i, (a, b) in enumerate(zip(eidx, gidx)) if str(a) != str(b)]
            first = bad[0] if bad else 0
            raise Mismatch("index", "The index labels don't match: row " + str(first + 1) + " should be labeled " +
                           _show(eidx[first]) + ", but yours is " + _show(gidx[first]) + ".")

    labels = list(expected.index) if (is_series or opts["index"] == "require") else None
    e_flat, g_flat = expected.reset_index(drop=True), got.reset_index(drop=True)
    flags = [_column_equal(e_flat[c], g_flat[c], opts) for c in columns]
    bad_positions = [i for i in range(len(e_flat)) if not all(f[i] for f in flags)]
    if not bad_positions:
        return
    if opts["rowOrder"] == "require" and _row_order_hint(e_flat, g_flat, opts, columns):
        raise Mismatch("order", "You have the right rows, but in a different order. Check the sort (the "
                       "column(s), ascending or descending, and the tie-breaker) and the order you combined pieces in.")
    bad_columns = [label_text(c) for c, f in zip(columns, flags) if not all(f)]
    if is_series:
        where = ", ".join(_show(labels[i]) for i in bad_positions[:3]) + (", …" if len(bad_positions) > 3 else "")
        detail = (str(len(bad_positions)) + " of " + str(len(e_flat)) + " values differ" +
                  ("s" if len(bad_positions) == 1 else "") + " (at " + where + ").")
    else:
        detail = (str(len(bad_positions)) + " of " + _rows_text(len(e_flat)) + " differ" +
                  ("s" if len(bad_positions) == 1 else "") + ", in column" + ("s " if len(bad_columns) > 1 else " ") +
                  ", ".join("'" + c + "'" for c in bad_columns) + ".")
    rounding = [c for c, f in zip(columns, flags) if not all(f) and pd.api.types.is_float_dtype(e_flat[c].dtype)
                and pd.api.types.is_numeric_dtype(g_flat[c].dtype)
                and np.allclose(e_flat[c].astype(float), g_flat[c].astype(float), rtol=0, atol=0.051, equal_nan=True)]
    if rounding:
        detail += " The values are close: check the rounding the task asks for."
    raise Mismatch("values", detail, _diff_rows(e_flat, g_flat, bad_positions, columns, opts, labels))


def compare_results(expected, got, opts):
    """Raise Mismatch(kind, detail, diff) for the first difference that matters, or return None."""
    _check_type(expected, got, opts["returns"])
    if isinstance(expected, (pd.DataFrame, pd.Series)):
        _compare_frames(expected, got, opts)
    else:
        _check_scalar(expected, got, opts)


# ---------- Mutation ----------

def _frame_change(before, after):
    """How after differs from the snapshot before, in words, or None if it's unchanged."""
    if not isinstance(after, pd.DataFrame):
        return "was replaced"
    added = [c for c in after.columns if c not in before.columns]
    dropped = [c for c in before.columns if c not in after.columns]
    if added:
        return "gained column" + ("s " if len(added) > 1 else " ") + _names(added)
    if dropped:
        return "lost column" + ("s " if len(dropped) > 1 else " ") + _names(dropped)
    if list(after.columns) != list(before.columns):
        return "had its columns renamed or reordered"
    if len(after) != len(before):
        return "went from " + _rows_text(len(before)) + " to " + _rows_text(len(after))
    if not after.index.equals(before.index):
        return "had its rows reordered or its index changed"
    if not after.dtypes.equals(before.dtypes):
        return "had a column's type changed"
    if not after.equals(before):
        return "had values changed"
    return None


# ---------- Running a case ----------

def _case_frames(checker, case):
    return checker.get("frames", [])


def _case_input(checker, case):
    names = _case_frames(checker, case)
    args = case.get("args", "")
    return checker["function"] + "(" + ", ".join(names + ([args] if args else [])) + ")"


def _evaluate_frames(code, checker, case, compiled=None):
    """Run code's function on one case. Returns (("ok", value) | ("error", info) | ("missing", msg) |
    ("mutated", msg)), stdout, truncated."""
    names = _case_frames(checker, case)
    ns, frames = {}, []
    with _Captured() as cap:
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("ignore")
                data = frame_namespace(checker["dataset"], case.get("data", "main"), names, case.get("setup", ""))
                frames = [data[n] for n in names]
                ns = _fresh_namespace()
                ns["pd"], ns["np"] = pd, np
                body = compiled if compiled is not None else _compile(code)[0]
                exec(body, ns)
                fn = ns.get(checker["function"])
                if fn is None:
                    outcome = ("missing", "Your code doesn't define a function named " + checker["function"] + ".")
                elif not callable(fn):
                    outcome = ("missing", checker["function"] + " is not a function.")
                else:
                    snapshots = [f.copy(deep=True) for f in frames]
                    args, kwargs = _call_args(case.get("args", ""))
                    value = fn(*frames, *args, **kwargs)
                    changes = [(n, _frame_change(b, a)) for n, b, a in zip(names, snapshots, frames)]
                    changes = [(n, c) for n, c in changes if c]
                    if changes:
                        n, c = changes[0]
                        outcome = ("mutated", "Your function changed its input: " + n + " " + c + ". Work on a copy "
                                   "(or use methods that return a new DataFrame, like assign()) instead of modifying "
                                   "the argument.")
                    else:
                        outcome = ("ok", value)
        except SystemExit:
            outcome = ("missing", "Your code called exit() before returning.")
        except BaseException as exc:
            context = dict(ns)
            context.update(zip(names, frames))
            outcome = ("error", frame_error_info(exc, code, context))
    return outcome, cap.out.getvalue(), cap.out.truncated


def frames_prepare(key, solution, checker_json):
    """Run the reference solution on every case and keep its results for checking. Returns their display form."""
    checker = json.loads(checker_json)
    results = []
    for case in checker["cases"]:
        outcome, _, _ = _evaluate_frames(solution, checker, case)
        if outcome[0] != "ok":
            detail = outcome[1]["traceback"] if outcome[0] == "error" else outcome[1]
            raise RuntimeError("The reference solution fails on " + _case_input(checker, case) +
                               (" (" + case["label"] + ")" if case.get("label") else "") + ":\n" + detail)
        results.append(outcome[1])
    _EXPECTED[key] = results
    return json.dumps([display_value(v) for v in results])


def frames_check(key, code, checker_json):
    """Check learner code on every case. Hidden cases report only pass/fail and the kind of mismatch."""
    checker = json.loads(checker_json)
    opts = _options(checker)
    expected = _EXPECTED[key]
    report = {"cases": [], "error": None, "stdout": "", "truncated": False}
    try:
        compiled = _compile(code)[0]
    except BaseException as exc:
        report["error"] = error_info(exc, code)
        compiled = None
    for i, case in enumerate(checker["cases"]):
        visible = not case.get("hidden", False)
        entry = {"visible": visible, "label": case.get("label", ""), "input": _case_input(checker, case),
                 "ok": False, "reason": None, "kind": None, "message": "", "expected": None, "got": None, "diff": None}
        if visible:
            entry["expected"] = display_value(expected[i])
        if compiled is None:
            entry["reason"] = "error"
            entry["message"] = report["error"]["summary"]
            report["cases"].append(entry)
            continue
        outcome, out, truncated = _evaluate_frames(code, checker, case, compiled)
        if i == 0:
            report["stdout"], report["truncated"] = out, truncated
        if outcome[0] == "ok":
            got = outcome[1]
            try:
                compare_results(expected[i], got, opts)
                entry["ok"] = True
            except Mismatch as m:
                entry["reason"], entry["kind"] = "wrong", m.kind
                entry["message"] = m.detail if visible else KIND_TEXT[m.kind]
                if visible:
                    entry["diff"] = m.diff
            except Exception as exc:
                entry["reason"], entry["kind"] = "wrong", "values"
                entry["message"] = "Your result couldn't be compared with the expected one (" + type(exc).__name__ + \
                    ")." if visible else KIND_TEXT["values"]
            if visible:
                entry["got"] = display_value(got)
        elif outcome[0] == "error":
            entry["reason"] = "error"
            entry["message"] = outcome[1]["summary"] + (" " + outcome[1]["hint"] if visible and outcome[1].get("hint") else "")
            if visible:
                entry["traceback"] = outcome[1]["traceback"]
        else:
            entry["reason"] = outcome[0]
            entry["kind"] = outcome[0]
            entry["message"] = outcome[1]
        report["cases"].append(entry)
    return json.dumps(report)
`;
