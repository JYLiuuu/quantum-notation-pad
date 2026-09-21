# Quantum Notation Pad

A Codex skill and real-time equation editor for quantum states, matrices, gates, amplitudes, and Dirac notation.

## Features

- Convert compact input such as `T|+>=` into readable quantum notation.
- Edit equations with a MathLive equation editor.
- Insert common states, gates, phases, and tensor products.
- Build matrices with adjustable rows and columns.
- Use identity and phase-gate presets.
- Preview expressions in rendered LaTeX.
- Copy LaTeX, shorthand notation, or a ready-to-use Codex prompt.
- Format quantum derivations using the `quantum-notation` Codex skill.

## Repository Structure

```text
quantum-notation-pad/
├── quantum-notation/
│   ├── SKILL.md
│   └── agents/
│       └── openai.yaml
└── quantum-pad/
    ├── index.html
    ├── styles.css
    └── app.js
```

## Quantum Notation Skill

The `quantum-notation` skill helps Codex interpret shorthand quantum expressions and produce clear mathematical explanations.

Example input:

```text
T|+>=
```

The skill can produce a derivation such as:
The skill can produce a derivation such as:

```math
T\lvert +\rangle
=
\frac{1}{\sqrt{2}}
\begin{pmatrix}
1 \\
e^{i\pi/4}
\end{pmatrix}
=
\frac{1}{\sqrt{2}}\lvert 0\rangle
+
\frac{e^{i\pi/4}}{\sqrt{2}}\lvert 1\rangle.
```
Supported shorthand includes:

```text
T|+>=
prob T|+>
amp T|+>
mat S
latex T|+>
[[1,0],[0,i]]
```

## Running Quantum Pad

The editor is a static HTML application. To run it locally with Python:

```bash
cd quantum-pad
python -m http.server 8787 --bind 127.0.0.1
```

Then open:

```text
http://127.0.0.1:8787/
```

The application uses MathLive and KaTeX from their public CDNs, so an internet connection is required when loading the editor.

## Example Workflow

1. Enter a shorthand expression such as `T|+>=`.
2. Choose a task:
   - Complete derivation
   - Probabilities
   - Amplitudes
   - Gate or matrix
   - LaTeX source
3. Review the rendered expression.
4. Copy the generated Codex prompt.
5. Paste the prompt into Codex.

## Technologies

- HTML
- CSS
- JavaScript
- MathLive
- KaTeX
- Codex skills

## Project Status

This project is a lightweight personal tool for quantum-computing study, notation, and interaction with Codex.
