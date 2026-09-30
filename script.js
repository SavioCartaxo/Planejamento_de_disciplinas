"use strict";

/* ========== DADOS INICIAIS (edite aqui) ==========
   Usados apenas na primeira abertura, ou se o localStorage estiver vazio. */
const INITIAL_DATA = {
  title: "Grade Curricular 2023",
  periods: [
    ["1º Período", ["Direito e Cidadania", "Fund. de Matemática p/ C. da Computação", "Introdução à Computação", "Laboratório de Programação I", "Programação I"]],
    ["2º Período", ["Cálculo Diferencial e Integral I", "Economia", "Fund. de Matemática p/ C. da Computação II", "Laboratório de Programação II", "Programação II"]],
    ["3º Período", ["Álgebra Linear I", "Cálculo Diferencial e Integral II", "Estruturas de Dados e Algoritmos", "Lab. de Estruturas de Dados e Algoritmos", "Lógica para Computação"]],
    ["4º Período", ["Banco de Dados I", "Introdução à Probabilidade", "Organização e Arquit. de Computadores", "Paradigmas de Linguagem de Programação", "Teoria da Computação", "Teoria dos Grafos"]],
    ["5º Período", ["Engenharia de Software", "Estatística Aplicada", "Inteligência Artificial", "Projeto de Software", "Redes de Computadores", "Sistemas Operacionais"]],
    ["6º Período", ["Análise de Sistemas", "Análise e Técnica de Algoritmos", "Programação Concorrente", "Optativa 1", "Optativa 2"]],
    ["7º Período", ["Compiladores", "Metodologia Científica", "Optativa 3", "Optativa 4", "Optativa 5"]],
    ["8º Período", ["Língua Portuguesa", "Projeto em Computação I", "Atividades Complementares de Extensão", "Optativa 6", "Optativa 7", "Optativa 8"]],
    ["9º Período", ["Projeto em Computação II", "Trabalho de Conclusão de Curso", "Atividades Complementares Flexíveis", "Optativa 9", "Optativa 10", "Optativa 11"]],
  ],
};

const STORAGE_KEY = "planejamento-disciplinas-v1";
const STATUSES = ["Não pago", "Pagando", "Pago"]; // índices 0, 1, 2

/* ========== ESTADO E PERSISTÊNCIA ========== */
const uid = () => Math.random().toString(36).slice(2, 10);
const newCourse = (name) => ({ id: uid(), name, status: 0 });
const newPeriod = (name, courses = []) => ({ id: uid(), name, courses });

function buildInitial() {
  return {
    title: INITIAL_DATA.title,
    periods: INITIAL_DATA.periods.map(([name, courses]) => newPeriod(name, courses.map(newCourse))),
  };
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && Array.isArray(saved.periods)) return saved;
  } catch (e) { /* dados corrompidos: recomeça do inicial */ }
  return buildInitial();
}

function save() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (e) { /* armazenamento indisponível */ }
}

let state = load();

/* ========== BUSCAS ========== */
const findPeriod = (id) => state.periods.find((p) => p.id === id);
function findCourse(id) {
  for (const p of state.periods) {
    const i = p.courses.findIndex((c) => c.id === id);
    if (i >= 0) return { period: p, index: i, course: p.courses[i] };
  }
  return null;
}

/* ========== AÇÕES ========== */
function commit() { save(); render(); }

function addCourse(periodId, name) {
  name = name.trim();
  const p = findPeriod(periodId);
  if (!name || !p) return;
  p.courses.push(newCourse(name));
  commit();
}

function addPeriod() {
  state.periods.push(newPeriod(`${state.periods.length + 1}º Período`));
  commit();
}

function deletePeriod(id) {
  const p = findPeriod(id);
  const extra = p.courses.length ? ` e suas ${p.courses.length} disciplina(s)` : "";
  if (!confirm(`Excluir "${p.name}"${extra}?`)) return;
  state.periods = state.periods.filter((x) => x.id !== id);
  commit();
}

function deleteCourse(id) {
  const f = findCourse(id);
  if (!f || !confirm(`Excluir a disciplina "${f.course.name}"?`)) return;
  f.period.courses.splice(f.index, 1);
  commit();
}

function cycleStatus(id) {
  const f = findCourse(id);
  if (!f) return;
  f.course.status = (f.course.status + 1) % STATUSES.length;
  commit();
}

function movePeriodBy(id, delta) {
  const i = state.periods.findIndex((p) => p.id === id);
  const j = i + delta;
  if (j < 0 || j >= state.periods.length) return;
  state.periods.splice(j, 0, state.periods.splice(i, 1)[0]);
  commit();
}

/* ========== EDIÇÃO DE TEXTO (duplo clique) ========== */
function editText(el, current, onSave) {
  const draggable = el.closest("[draggable]");
  if (draggable) draggable.draggable = false;
  const input = document.createElement("input");
  input.type = "text";
  input.value = current;
  el.replaceWith(input);
  input.focus();
  input.select();
  let done = false;
  const finish = (ok) => {
    if (done) return;
    done = true;
    const v = input.value.trim();
    if (ok && v) onSave(v); // nome vazio nunca sobrescreve o antigo
    commit();
  };
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") finish(true);
    if (e.key === "Escape") finish(false);
  });
  input.addEventListener("blur", () => finish(true));
  input.addEventListener("click", (e) => e.stopPropagation());
}

/* ========== RENDERIZAÇÃO ========== */
const board = document.getElementById("board");
const titleEl = document.getElementById("title");
const periodSelect = document.getElementById("newCoursePeriod");

function el(tag, props = {}, ...children) {
  const { dataset, ...rest } = props; // dataset é somente leitura, então é copiado à parte
  const node = Object.assign(document.createElement(tag), rest);
  if (dataset) Object.assign(node.dataset, dataset);
  children.forEach((c) => node.append(c));
  return node;
}

function courseCard(c) {
  const card = el("div", { className: `card s${c.status}`, draggable: true, tabIndex: 0 },
    el("span", { className: "name", textContent: c.name }),
    el("span", { className: "status", textContent: STATUSES[c.status] }),
    el("button", { className: "icon danger del", title: "Excluir disciplina", textContent: "✕" }));
  card.dataset.course = c.id;
  card.querySelector(".del").setAttribute("aria-label", "Excluir disciplina");
  return card;
}

function periodColumn(p, i) {
  const cards = el("div", { className: "cards" });
  cards.dataset.period = p.id;
  p.courses.forEach((c) => cards.append(courseCard(c)));

  const head = el("div", { className: "period-head" },
    el("span", { className: "grip", title: "Arraste para reordenar", textContent: "⠿" }),
    el("span", { className: "period-name", textContent: p.name, title: "Duplo clique para renomear" }),
    el("button", { className: "icon", dataset: { act: "left" }, title: "Mover para trás", textContent: "◀", disabled: i === 0 }),
    el("button", { className: "icon", dataset: { act: "right" }, title: "Mover para frente", textContent: "▶", disabled: i === state.periods.length - 1 }),
    el("button", { className: "icon danger", dataset: { act: "delPeriod" }, title: "Excluir período", textContent: "✕" }));

  const col = el("section", { className: "period", draggable: true }, head, cards,
    el("button", { className: "add-inline", dataset: { act: "addInline" }, textContent: "+ Disciplina" }));
  col.dataset.id = p.id;
  return col;
}

function render() {
  titleEl.textContent = state.title;
  board.replaceChildren(...state.periods.map(periodColumn));
  periodSelect.replaceChildren(...state.periods.map((p) => el("option", { value: p.id, textContent: p.name })));
  if (!state.periods.length) board.append(el("p", { className: "empty", textContent: "Nenhum período. Clique em “Adicionar período”." }));
}

/* ========== EVENTOS: CLIQUES ========== */
let clickTimer = null;

board.addEventListener("click", (e) => {
  const t = e.target;
  const col = t.closest(".period");
  if (!col || t.tagName === "INPUT") return;
  const act = t.dataset.act;
  if (act === "left") return movePeriodBy(col.dataset.id, -1);
  if (act === "right") return movePeriodBy(col.dataset.id, 1);
  if (act === "delPeriod") return deletePeriod(col.dataset.id);
  if (act === "addInline") return startInlineAdd(t, col.dataset.id);
  const card = t.closest(".card");
  if (!card) return;
  if (t.classList.contains("del")) return deleteCourse(card.dataset.course);
  // Atraso curto para não contar o clique quando for um duplo clique
  clearTimeout(clickTimer);
  clickTimer = setTimeout(() => cycleStatus(card.dataset.course), 220);
});

board.addEventListener("dblclick", (e) => {
  clearTimeout(clickTimer);
  const t = e.target;
  if (t.classList.contains("name")) {
    const f = findCourse(t.closest(".card").dataset.course);
    editText(t, f.course.name, (v) => (f.course.name = v));
  } else if (t.classList.contains("period-name")) {
    const p = findPeriod(t.closest(".period").dataset.id);
    editText(t, p.name, (v) => (p.name = v));
  }
});

titleEl.addEventListener("dblclick", () => editText(titleEl, state.title, (v) => (state.title = v)));

function startInlineAdd(btn, periodId) {
  const input = el("input", { type: "text", placeholder: "Nome da disciplina" });
  btn.replaceWith(input);
  input.focus();
  let done = false;
  const finish = (ok) => {
    if (done) return;
    done = true;
    if (ok && input.value.trim()) addCourse(periodId, input.value);
    else render();
  };
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") finish(true);
    if (e.key === "Escape") finish(false);
  });
  input.addEventListener("blur", () => finish(true));
}

document.getElementById("addCourseForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const input = document.getElementById("newCourseName");
  if (!state.periods.length) return alert("Crie um período primeiro.");
  addCourse(periodSelect.value, input.value);
  input.value = "";
  input.focus();
});
document.getElementById("addPeriodBtn").addEventListener("click", addPeriod);

/* ========== DRAG AND DROP ========== */
let drag = null;        // { type: "course" | "period", id }
let dropIndex = 0;      // posição de destino dentro do período
let periodDrop = null;  // { id, after }

const dropLine = el("div", { className: "drop-line" });

function clearDropUI() {
  dropLine.remove();
  board.querySelectorAll(".over,.drop-before,.drop-after").forEach((n) => n.classList.remove("over", "drop-before", "drop-after"));
}

board.addEventListener("dragstart", (e) => {
  const card = e.target.closest?.(".card");
  const col = e.target.closest?.(".period");
  if (card) drag = { type: "course", id: card.dataset.course };
  else if (col && e.target === col) drag = { type: "period", id: col.dataset.id };
  else return;
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", drag.id); // necessário no Firefox
  (card || col).classList.add("dragging");
});

board.addEventListener("dragover", (e) => {
  if (!drag) return;
  if (drag.type === "course") {
    const zone = e.target.closest(".period")?.querySelector(".cards");
    if (!zone) return;
    e.preventDefault();
    clearDropUI();
    zone.classList.add("over");
    const others = [...zone.querySelectorAll(".card:not(.dragging)")];
    const next = others.find((c) => {
      const r = c.getBoundingClientRect();
      return e.clientY < r.top + r.height / 2;
    });
    dropIndex = next ? others.indexOf(next) : others.length;
    zone.insertBefore(dropLine, next || null);
    zone.dataset.target = zone.dataset.period;
  } else {
    const col = e.target.closest(".period");
    if (!col || col.dataset.id === drag.id) return;
    e.preventDefault();
    clearDropUI();
    const r = col.getBoundingClientRect();
    const stacked = window.innerWidth <= 520; // uma coluna: compara na vertical
    const after = stacked ? e.clientY > r.top + r.height / 2 : e.clientX > r.left + r.width / 2;
    col.classList.add(after ? "drop-after" : "drop-before");
    periodDrop = { id: col.dataset.id, after };
  }
});

board.addEventListener("drop", (e) => {
  if (!drag) return;
  e.preventDefault();
  if (drag.type === "course") {
    const zone = e.target.closest(".period")?.querySelector(".cards");
    const from = findCourse(drag.id);
    const to = zone && findPeriod(zone.dataset.period);
    if (from && to) {
      from.period.courses.splice(from.index, 1);
      to.courses.splice(dropIndex, 0, from.course);
    }
  } else if (periodDrop) {
    const moved = state.periods.splice(state.periods.findIndex((p) => p.id === drag.id), 1)[0];
    const idx = state.periods.findIndex((p) => p.id === periodDrop.id);
    state.periods.splice(periodDrop.after ? idx + 1 : idx, 0, moved);
  }
  endDrag();
});

board.addEventListener("dragend", endDrag);
board.addEventListener("dragleave", (e) => {
  if (!board.contains(e.relatedTarget)) clearDropUI();
});

function endDrag() {
  drag = null;
  periodDrop = null;
  clearDropUI();
  commit();
}

/* ========== INÍCIO ========== */
render();
save(); // grava a estrutura inicial na primeira abertura