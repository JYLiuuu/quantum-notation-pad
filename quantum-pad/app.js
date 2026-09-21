const gateMatrices = {
  I: [
    ["1", "0"],
    ["0", "1"],
  ],
  X: [
    ["0", "1"],
    ["1", "0"],
  ],
  Y: [
    ["0", "-i"],
    ["i", "0"],
  ],
  Z: [
    ["1", "0"],
    ["0", "-1"],
  ],
  H: [
    ["1/sqrt(2)", "1/sqrt(2)"],
    ["1/sqrt(2)", "-1/sqrt(2)"],
  ],
  S: [
    ["1", "0"],
    ["0", "i"],
  ],
  T: [
    ["1", "0"],
    ["0", "exp(i*pi/4)"],
  ],
};

const taskLabels = {
  complete: "Complete this quantum expression",
  prob: "Compute amplitudes and measurement probabilities",
  amp: "Compute the state and name the amplitudes",
  matrix: "Show the gate or matrix representation",
  latex: "Return pasteable LaTeX source",
};

const quickInput = document.getElementById("quick-input");
const mathField = document.getElementById("math-field");
const taskSelect = document.getElementById("task-select");
const preview = document.getElementById("preview");
const promptOutput = document.getElementById("codex-prompt");
const status = document.getElementById("status");
const matrixGrid = document.getElementById("matrix-grid");
const matrixRows = document.getElementById("matrix-rows");
const matrixCols = document.getElementById("matrix-cols");

let activeTarget = "quick";
let syncingMathField = false;

function setStatus(message) {
  status.textContent = message;
  window.clearTimeout(setStatus.timer);
  setStatus.timer = window.setTimeout(() => {
    status.textContent = "Ready";
  }, 1800);
}

function cellToLatex(value) {
  let out = String(value || "0").trim();
  if (!out) return "0";
  out = out.replace(/\s+/g, "");
  out = out.replace(/^sqrt\((.+)\)$/i, "\\sqrt{$1}");
  out = out.replace(/sqrt\(([^)]+)\)/gi, "\\sqrt{$1}");
  out = out.replace(/exp\(i\*?pi\/(\d+)\)/gi, "e^{i\\pi/$1}");
  out = out.replace(/exp\(i\*?pi\)/gi, "e^{i\\pi}");
  out = out.replace(/\bpi\b/gi, "\\pi");
  out = out.replace(/\*/g, "\\cdot ");
  return out;
}

function matrixToLatex(rows) {
  return `\\begin{pmatrix}\n${rows
    .map((row) => row.map(cellToLatex).join(" & "))
    .join(" \\\\\n")}\n\\end{pmatrix}`;
}

function parseAsciiMatrix(source) {
  const trimmed = source.trim();
  if (!trimmed.startsWith("[[") || !trimmed.endsWith("]]")) return null;
  const inner = trimmed.slice(2, -2);
  return inner.split(/\]\s*,\s*\[/).map((row) => row.split(",").map((cell) => cell.trim()));
}

function normalizeKetLabel(label) {
  const value = label.trim();
  if (value === "+") return "+";
  if (value === "-") return "-";
  return value.replace(/\s+/g, "");
}

function shorthandToLatex(source) {
  const raw = source.trim();
  if (!raw) return "";
  const withoutCommand = raw.replace(/^(prob|amp|latex)\s+/i, "");
  const matrixCommand = withoutCommand.match(/^mat\s+([IXYZHST])$/i);
  if (matrixCommand) {
    return `${matrixCommand[1].toUpperCase()} = ${matrixToLatex(
      gateMatrices[matrixCommand[1].toUpperCase()],
    )}`;
  }

  const parsedMatrix = parseAsciiMatrix(withoutCommand);
  if (parsedMatrix) return matrixToLatex(parsedMatrix);

  const gatePower = withoutCommand.match(/^([STXYZH])\s*\^\s*(\d+)\s*=?$/i);
  if (gatePower) {
    const equals = withoutCommand.endsWith("=") ? " =" : "";
    return `${gatePower[1].toUpperCase()}^{${gatePower[2]}}${equals}`;
  }

  const action = withoutCommand.match(/^([A-Z]+(?:\s*[*.]\s*[A-Z]+)*)\s*\|([^>]+)>\s*=?$/i);
  if (action) {
    const gates = action[1]
      .replace(/\s*[*.]\s*/g, "")
      .split("")
      .map((gate) => gate.toUpperCase())
      .join("");
    const ket = normalizeKetLabel(action[2]);
    const equals = withoutCommand.endsWith("=") ? " =" : "";
    return `${gates}\\lvert ${ket}\\rangle${equals}`;
  }

  return withoutCommand
    .replace(/\|([^>]+)>/g, (_, ket) => `\\lvert ${normalizeKetLabel(ket)}\\rangle`)
    .replace(/sqrt\(([^)]+)\)/gi, "\\sqrt{$1}")
    .replace(/exp\(i\*?pi\/(\d+)\)/gi, "e^{i\\pi/$1}")
    .replace(/exp\(i\*?pi\)/gi, "e^{i\\pi}")
    .replace(/\btensor\b/gi, "\\otimes")
    .replace(/\bpi\b/gi, "\\pi")
    .replace(/\*/g, "\\cdot ");
}

function getMathLatex() {
  if (mathField && typeof mathField.value === "string") return mathField.value.trim();
  return "";
}

function renderPreview(latex) {
  preview.innerHTML = "";
  if (!latex) {
    preview.textContent = "";
    return;
  }

  if (!window.katex) {
    preview.textContent = latex;
    return;
  }

  try {
    window.katex.render(latex, preview, {
      displayMode: true,
      throwOnError: false,
      strict: false,
      trust: false,
    });
  } catch (error) {
    const errorNode = document.createElement("div");
    errorNode.className = "preview-error";
    errorNode.textContent = error.message;
    preview.appendChild(errorNode);
  }
}

function buildCodexPrompt() {
  const task = taskSelect.value;
  const quick = quickInput.value.trim();
  const latex = getMathLatex() || shorthandToLatex(quick);
  const sourceBlock = quick
    ? `Shorthand:\n${quick}\n\nRendered LaTeX:\n${latex}`
    : `Rendered LaTeX:\n${latex}`;

  return `$quantum-notation
${taskLabels[task]}:

${sourceBlock}

Use exact symbolic notation. Show Dirac notation and matrix/vector form when relevant.`;
}

function updateFromQuick() {
  const latex = shorthandToLatex(quickInput.value);
  if (mathField && "value" in mathField) {
    syncingMathField = true;
    mathField.value = latex;
    syncingMathField = false;
  }
  renderPreview(latex);
  promptOutput.value = buildCodexPrompt();
}

function updateFromMathField() {
  if (syncingMathField) return;
  renderPreview(getMathLatex());
  promptOutput.value = buildCodexPrompt();
}

function insertAtTextarea(textarea, value) {
  const start = textarea.selectionStart ?? textarea.value.length;
  const end = textarea.selectionEnd ?? textarea.value.length;
  textarea.value = `${textarea.value.slice(0, start)}${value}${textarea.value.slice(end)}`;
  const caret = start + value.length;
  textarea.setSelectionRange(caret, caret);
  textarea.focus();
  updateFromQuick();
}

function insertLatex(latex) {
  if (mathField && typeof mathField.executeCommand === "function") {
    mathField.focus();
    mathField.executeCommand(["insert", latex, { selectionMode: "after" }]);
    updateFromMathField();
    return;
  }
  insertAtTextarea(quickInput, latex);
}

function handleShortcut(event) {
  const button = event.target.closest("button");
  if (!button) return;

  if (button.dataset.template) {
    quickInput.value = button.dataset.template;
    updateFromQuick();
    quickInput.focus();
    return;
  }

  if (activeTarget === "math") {
    insertLatex(button.dataset.latex || button.dataset.ascii || "");
    return;
  }

  insertAtTextarea(quickInput, button.dataset.ascii || "");
}

function getMatrixValues() {
  const rows = Number(matrixRows.value);
  const cols = Number(matrixCols.value);
  const values = [];
  for (let row = 0; row < rows; row += 1) {
    const current = [];
    for (let col = 0; col < cols; col += 1) {
      const input = matrixGrid.querySelector(`[data-row="${row}"][data-col="${col}"]`);
      current.push(input?.value || "0");
    }
    values.push(current);
  }
  return values;
}

function setMatrixValues(values) {
  matrixRows.value = String(values.length);
  matrixCols.value = String(values[0]?.length || 1);
  renderMatrixGrid(values);
}

function renderMatrixGrid(values) {
  const rows = Number(matrixRows.value);
  const cols = Number(matrixCols.value);
  matrixGrid.innerHTML = "";
  matrixGrid.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const input = document.createElement("input");
      input.value = values?.[row]?.[col] ?? (row === col ? "1" : "0");
      input.inputMode = "text";
      input.setAttribute("aria-label", `Row ${row + 1}, column ${col + 1}`);
      input.dataset.row = String(row);
      input.dataset.col = String(col);
      matrixGrid.appendChild(input);
    }
  }
}

function matrixValuesToAscii(values) {
  return `[${values.map((row) => `[${row.map((cell) => cell.trim() || "0").join(",")}]`).join(",")}]`;
}

function insertMatrix() {
  const values = getMatrixValues();
  const ascii = matrixValuesToAscii(values);
  const latex = matrixToLatex(values);
  if (activeTarget === "math") {
    insertLatex(latex);
  } else {
    insertAtTextarea(quickInput, ascii);
  }
}

async function copyText(value, label) {
  try {
    await navigator.clipboard.writeText(value);
    setStatus(`${label} copied`);
  } catch {
    const temp = document.createElement("textarea");
    temp.value = value;
    temp.setAttribute("readonly", "");
    temp.style.position = "fixed";
    temp.style.opacity = "0";
    document.body.appendChild(temp);
    temp.select();
    document.execCommand("copy");
    document.body.removeChild(temp);
    setStatus(`${label} copied`);
  }
}

document.querySelector(".toolbar").addEventListener("click", handleShortcut);
quickInput.addEventListener("focus", () => {
  activeTarget = "quick";
});
quickInput.addEventListener("input", updateFromQuick);

mathField.addEventListener("focusin", () => {
  activeTarget = "math";
});
mathField.addEventListener("input", updateFromMathField);

taskSelect.addEventListener("change", () => {
  promptOutput.value = buildCodexPrompt();
});

matrixRows.addEventListener("change", () => renderMatrixGrid(getMatrixValues()));
matrixCols.addEventListener("change", () => renderMatrixGrid(getMatrixValues()));
matrixGrid.addEventListener("input", () => {
  const latex = matrixToLatex(getMatrixValues());
  renderPreview(latex);
});

document.getElementById("identity-button").addEventListener("click", () => {
  const size = Math.min(Number(matrixRows.value), Number(matrixCols.value));
  const values = Array.from({ length: Number(matrixRows.value) }, (_, row) =>
    Array.from({ length: Number(matrixCols.value) }, (_, col) => (row === col && row < size ? "1" : "0")),
  );
  renderMatrixGrid(values);
  renderPreview(matrixToLatex(values));
});

document.getElementById("phase-button").addEventListener("click", () => {
  setMatrixValues(gateMatrices.T);
  renderPreview(matrixToLatex(gateMatrices.T));
});

document.getElementById("insert-matrix-button").addEventListener("click", insertMatrix);

document.getElementById("copy-prompt-button").addEventListener("click", () => {
  promptOutput.value = buildCodexPrompt();
  copyText(promptOutput.value, "Prompt");
});

document.getElementById("copy-latex-button").addEventListener("click", () => {
  copyText(getMathLatex() || shorthandToLatex(quickInput.value), "LaTeX");
});

document.getElementById("copy-ascii-button").addEventListener("click", () => {
  copyText(quickInput.value, "Shorthand");
});

window.addEventListener("DOMContentLoaded", () => {
  renderMatrixGrid(gateMatrices.I);
  updateFromQuick();
});
