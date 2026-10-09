# ∑ Mathmark

**A math-first markdown editor with a custom DSL - no LaTeX required.**

Mathmark lets you write mathematical notes naturally. Wrap expressions in `${ }` blocks and they get evaluated, rendered beautifully, and plotted.

[![GitHub Pages](https://img.shields.io/badge/demo-online-blue)](https://ekllerr.github.io/mathmark/)
![License: MIT](https://img.shields.io/badge/license-MIT-green)
![Built with React](https://img.shields.io/badge/built%20with-React-61DAFB)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)

---

## Features

- **Custom DSL**  write math naturally, never touch LaTeX
- **Live evaluation** - variables, expressions, and assignments evaluated left-to-right
- **Beautiful rendering** - expressions rendered with KaTeX
- **Plotting** - interactive charts via Plotly.js
- **Functions** - `f(x) = expr`, reusable in expressions, plots, integrals and derivatives
- **Derivatives** - symbolic `diff(x) expr`, higher-order and partial, or at a point with `diff(x, a) expr`
- **Numerical integration** - `int(a,b) expr dx`
- **Limits** - `lim(x->c) expr`, one-sided with `lim(x->c+)` and `lim(x->c-)`
- **Equation solving** - `solve(x^2 - x - 1 = 0)`
- **Exact results** - fractions, roots and multiples of π where they can be found, alongside the decimal
- **Inline math** - a `${ ... }` inside a sentence stays in the sentence
- **Combinatorics** - `n!`, `C(n,k)`, `P(n,k)`
- **Split / Editor / Preview** modes
- **Step display** - results show the values substituted in, `a·b = 2·3 = 6`
- **Editor help** - highlighting, autocomplete and underlined errors inside `${ }`
- **Multiple documents** - a list of notes, each saved in the browser
- **Six themes** - four dark, two light
- **Autosave** - your notes are kept in the browser and are there when you come back
- **Share by link** - the document is compressed into the URL, no server involved
- **Fully client-side**

---

## DSL Syntax

All math blocks use the `${ ... }` syntax. Statements inside a block are separated by commas and executed left to right.

A `${ ... }` on a line of its own is set as a display block with a **Show results** switch. A `${ ... }` inside a line of text is set inline, as part of the sentence; click it to show its result. A `${ ... }` inside markdown code (backticks or a fenced block) is shown as written, not evaluated.

### Variables & Expressions

```
${ a = 2, b = 3, a * b + 1 }
```

### Functions

```
${ f(x) = x^2 + 1, f(3) }
${ g(x, y) = x * y, g(2, 5) }
${ f(x) = sin(x) / x, plot(f(x)), int(1, 2) f(x) dx }
```

Variables and functions carry on through the document: once defined, they are available to every later statement and every later block.

### Plotting

```
${ plot(x^2) }
${ plot(sin(x), cos(x)) }
```

Default domain: `x ∈ [-10, 10]`; give another as `a..b`, for example `plot(sin(x), -pi..pi)`. Multiple functions share the same plot, and a plot can be dragged sideways. Curves with vertical asymptotes, such as `tan(x)`, are drawn in separate branches.

### Integrals

```
${ int(0,1) x^2 dx }
```

Rendered as a proper integral sign and evaluated numerically.

### Derivatives

```
${ diff(x) x^2 * sin(x) }
${ diff(x, 2) x^3 }
${ f(x) = ln(x) * x, diff(x) f(x) }
```

`diff(x) expr` differentiates symbolically. Add a point, `diff(x, a) expr`, to get the value of the derivative at `x = a`.

```
${ diff(x^2) x^4 }
${ diff(x) diff(y) x^2 * y^3 }
${ diff(y) x^2 * y }
```

`diff(x^n)` is the n-th derivative. Derivatives nest, `diff(x) diff(y) expr`, for mixed partials, and an expression with more than one unknown is written with ∂.

### Limits

```
${ lim(x->0) sin(x)/x }
```

Evaluated numerically via two-sided approximation. `lim(x->0+)` and `lim(x->0-)` take the limit from one side only.

### Sums & Products

```
${ sum(i, 1, 10) i^2 }
${ prod(i, 1, 5) i }
```

### Solving Equations

```
${ solve(x^2 - x - 1 = 0) }
${ solve(sin(x) = 1/2, 0, 2*pi) }
${ solve(a*t^2 = 8, t) }
```

Linear and quadratic equations are solved exactly; other polynomials have all their real roots found numerically. Any other equation is searched for roots between -100 and 100, or in the range you give as `solve(equation, from, to)`. Name the unknown as a second argument when the equation has more than one letter in it.

### Exact Results

With **Exact** on (the default), a result is also shown in exact form when one is found: `1/3 + 1/6` gives 1/2, `sqrt(8)` gives 2√2, `atan(1)` gives π/4. Arithmetic on fractions is carried out exactly. Other values, including integrals and limits, are matched against simple fractions and multiples of square roots, π, e and a few logarithms; a value that matches none of these is shown as a decimal only. Turn **Exact** off in the header for decimals everywhere.

### Degrees

Trigonometric functions work in radians. Write `deg` for degrees: `sin(30 deg)`.

A single letter is always a variable, never a unit, so `m * g` stays a formula until `m` and `g` have values.

### Combinatorics

```
${ 5! }
${ C(5, 2) }
${ P(5, 2), P(4) }
```

| Syntax | Meaning |
|---|---|
| `n!` | Factorial |
| `C(n, k)` | Combinations, rendered as a binomial coefficient |
| `P(n, k)` | Permutations of `k` items out of `n` |
| `P(n)` | Permutations of all `n` items (same as `n!`) |
| `catalan(n)` | Catalan number |
| `bellNumbers(n)` | Number of partitions of a set of `n` items |
| `stirlingS2(n, k)` | Stirling number of the second kind |

`C` and `P` need non-negative integers with `k ≤ n`.

### Steps

With **Steps** on (the default), a result shows its working: variables are replaced by their values and your own functions are written out.

```
${ m = 2, v = 3, 1/2 * m * v^2 }
${ f(x) = x^2 + 1, f(3) }
```

These read ½·m·v² = ½·2·3² = 9 and f(3) = 3² + 1 = 10. Turn **Steps** off in the header for the result alone.

## The Editor

The bar above the editor inserts the common pieces with one click: a math block (also **Ctrl+M**), fractions, roots, integrals, derivatives, limits, sums, `solve`, `plot`, and headings, bold and list items. Each insert selects the part you will want to change, and a math insert adds its own `${ }` unless the cursor is already in one. Select text first to wrap it.

Inside a `${ }` the editor colours keywords, functions and numbers, and suggests names as you type: the built-in forms (`int`, `diff`, `lim`, `sum`, `prod`, `solve`, `plot`), common functions, and the variables and functions your own document defines. A statement that fails is underlined where the problem is; hover over it for the message.

## Documents, Saving & Sharing

**Notes** in the header opens the list of your documents, with a search box. Each is named after its first line. They are saved in the browser (`localStorage`) on every change, so you can close the tab and resume later on the same browser and device.

A deleted note goes to the **Trash** at the bottom of the list, where it can be restored for 30 days.

Notes saved in a browser are lost if its site data is cleared, so the list also has:

- **Open a .md file** - adds a Markdown file as a new note
- **Back up all notes** - downloads every note as one `.json` file
- **Restore a backup** - adds the notes from a backup that are not already there

**Export → Save as Markdown** downloads the current note as a `.md` file.

**Share** copies a link with the current document compressed into the part of the URL after `#`, which is never sent to a server. Opening a link adds it as a new document; your own notes are left as they were. Very long documents make long links, which some chat and email apps cut short.

## Offline & Installing

After the first visit Mathmark works without a connection: the app is stored by the browser, and plotting and PDF export are stored the first time each is used. It can also be installed from the browser's menu ("Install" or "Add to Home Screen") and then opens in its own window.

When a new version has been published, a notice offers to reload; nothing changes under you while you are writing.

## Themes & Printing

The theme button in the header offers six themes: Midnight, Graphite, Nord and Dusk (dark), Paper and Sepia (light). The choice is remembered. Printing and PDF export always use Paper.

**Export → Save as PDF** produces A4 pages named after the note. Pages end between paragraphs and blocks, so a formula or plot is not cut in half. **Export → Print** uses the browser's print dialog with the same page rules; choosing "Save as PDF" there gives a PDF whose text can be selected and searched.

A theme is a block of colour variables in `src/index.css` plus one line in `src/themes.ts`, so adding one takes a few lines.

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or pnpm

### Installation

```bash
git clone https://github.com/yourusername/mathmark.git
cd mathmark
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

### Tests

```bash
npm test
```

The parser, evaluator, numeric methods and share links are covered by a Vitest suite in `src/**/*.test.ts`. Pull requests run lint, tests and a build on GitHub Actions.

---

## Tech Stack

| Concern | Library |
|---|---|
| UI | React + TypeScript + Vite |
| Math engine | mathjs |
| Formula rendering | KaTeX |
| Graphing | Plotly.js |

---

## Contributing

Contributions are welcome! Here's how to get started:

1. Fork the repo
2. Create a feature branch: `git checkout -b my-feature`
3. Make your changes and commit: `git commit -m 'add my feature'`
4. Push and open a pull request

Please open an issue first for larger changes so we can discuss the direction.

---

## License

MIT © [Ekler](https://github.com/ekllerr)
