# ∑ Mathmark

**A math-first markdown editor with a custom DSL — no LaTeX required.**

Mathmark lets you write mathematical notes naturally. Wrap expressions in `${ }` blocks and they get evaluated, rendered beautifully, and plotted — all in the browser.

![License: MIT](https://img.shields.io/badge/license-MIT-green)
![Built with React](https://img.shields.io/badge/built%20with-React-61DAFB)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)

---

## Features

- **Custom DSL** — write math naturally, never touch LaTeX
- **Live evaluation** — variables, expressions, and assignments evaluated left-to-right
- **Beautiful rendering** — expressions rendered with KaTeX
- **Plotting** — interactive charts via Plotly.js
- **Numerical integration** — `int(a,b) expr dx`
- **Limits** — `lim(x->c) expr`
- **Split / Editor / Preview** modes
- **Fully client-side** — no backend, no accounts, no tracking

---

## DSL Syntax

All math blocks use the `${ ... }` syntax. Statements inside a block are separated by commas and executed left to right.

### Variables & Expressions

```
${ a = 2, b = 3, a * b + 1 }
```

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

### Limits

```
${ lim(x->0) sin(x)/x }
```

Evaluated numerically via two-sided approximation.

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