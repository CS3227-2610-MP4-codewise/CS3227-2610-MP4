# Isolated synthetic coordination exercises

Both exercises evaluate the same acceptance rule: a one-based inclusive line range must have integer endpoints, start at least one, end at least start and at most the number of lines, and the cited excerpt must exactly equal the joined selected lines. No submitted code is executed. These are disposable exercises; actual release review is unchanged. No human instructor has yet reviewed the scoring criteria.

## Main-agent-only condition A

```js
function matches(range, sourceLines) {
  return range.first >= 1 && range.last <= sourceLines.length &&
    sourceLines.slice(range.first - 1, range.last).join('\n') === range.quote;
}
```

Main-agent finding: the check omits integer and `last >= first` constraints. For two lines, `first=2,last=1,quote=''` passes even though the range is reversed; fractional indices are coerced by `slice`. Require finite safe integer endpoints and explicitly check `1 <= first <= last <= sourceLines.length` before comparing the excerpt. This is an analysis result, not an executed test or human-reviewed grade.

## Coordinated condition B

```js
function valid(n, lines) {
  return n.start >= 1 && n.end <= lines.length &&
    lines.slice(n.start - 1, n.end).join('\n') === n.excerpt;
}
```

The worker and independent reviewer assess B without editing product files. These parallel examples deliberately have the same defect class and are not independent evidence of broad effectiveness; exposure, task order and reviewer participation are confounders. Record actual identities, results and unavailable timing/token attribution in the evidence, without extrapolating to project-wide cost or defect reduction.
