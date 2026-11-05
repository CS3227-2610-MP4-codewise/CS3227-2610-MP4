# UI-01/UI-07 measured token contrast

Calculated from the implemented `src/web/styles.css` using sRGB relative luminance. These are declared opaque token pairs, not a full rendered accessibility audit. Focus uses the accent on the page; subtle rules are decorative dividers, not input boundaries.

| Foreground / background | Light   | Dark    | 4.5:1 normal-text target |
| ----------------------- | ------- | ------- | ------------------------ |
| ink / page              | 13.22:1 | 11.64:1 | pass                     |
| secondary / page        | 5.95:1  | 7.56:1  | pass                     |
| secondary / canvas      | 5.14:1  | 8.38:1  | pass                     |
| accent / page           | 6.62:1  | 7.97:1  | pass                     |
| accent / canvas         | 5.72:1  | 8.83:1  | pass                     |
| accent / annotation     | 5.48:1  | 6.47:1  | pass                     |
| success / page          | 6.81:1  | 8.68:1  | pass                     |
| on-ink / ink            | 13.22:1 | 12.89:1 | pass                     |
