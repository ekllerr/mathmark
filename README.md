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
- **Derivatives** - symbolic `diff(x) expr`, or at a point with `diff(x, a) expr`
- **Numerical integration** - `int(a,b) expr dx`
- **Limits** - `lim(x->c) expr`
- **Combinatorics** - `n!`, `C(n,k)`, `P(n,k)`
- **Split / Editor / Preview** modes
- **Autosave** - your notes are kept in the browser and are there when you come back
- **Share by link** - the document is compressed into the URL, no server involved
- **Fully client-side**

---

## DSL Syntax

All math blocks use the `${ ... }` syntax. Statements inside a block are separated by commas and executed left to right. A `${ ... }` inside markdown code (backticks or a fenced block) is shown as written, not evaluated.

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

Default domain: `x ∈ [-10, 10]`. Multiple functions share the same plot.

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

### Limits

```
${ lim(x->0) sin(x)/x }
```

Evaluated numerically via two-sided approximation.

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

## Saving & Sharing

Your document is saved in the browser (`localStorage`) on every change, so you can close the tab and resume later on the same browser and device.

**Share** copies a link with the whole document compressed into the part of the URL after `#`, which is never sent to a server. Opening a link when you already have different notes saved asks before replacing them. Very long documents make long links, which some chat and email apps cut short.

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
