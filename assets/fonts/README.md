# Fonts

Supplied and wired up:

| File | Family | Weight |
| --- | --- | --- |
| `Neue-Regular.woff2` | `Neue` | 400 |
| `Neue-Medium.woff2` | `Neue` | 500–800 |
| `Supply-Regular.woff2` | `Supply` | 400 |

`Neue` carries the headings and body copy; `Supply` is the uppercase monospace
used for eyebrows, captions and the wayfinding labels. The `@font-face` rules
live at the top of `shared/base.css` — if these filenames ever change, that is
the one place to update.

Fallbacks remain `Helvetica/Arial` and the system monospace, so a missing file
degrades rather than breaking the layout.
