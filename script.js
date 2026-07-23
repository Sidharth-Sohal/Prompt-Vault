/* =========================================================
   PromptVault — vanilla JS, no build step, no framework.
   Loads prompts.json, then handles search, filters, sort,
   favorites, dark mode, modal and copy-to-clipboard.
   ========================================================= */

(function () {
  "use strict";

  const STORAGE_THEME = "promptvault:theme";
  const STORAGE_FAVORITES = "promptvault:favorites";

  const state = {
    prompts: [],
    query: "",
    category: "All",
    tag: null,
    favoritesOnly: false,
    sort: "newest",
    favorites: new Set(loadFavorites()),
  };

  const els = {
    grid: document.getElementById("promptGrid"),
    empty: document.getElementById("emptyState"),
    resultsCount: document.getElementById("resultsCount"),
    search: document.getElementById("searchInput"),
    sort: document.getElementById("sortSelect"),
    categoryList: document.getElementById("categoryList"),
    tagList: document.getElementById("tagList"),
    favToggle: document.getElementById("favoritesToggle"),
    clearFilters: document.getElementById("clearFilters"),
    statTotal: document.getElementById("statTotal"),
    statCategories: document.getElementById("statCategories"),
    statFavorites: document.getElementById("statFavorites"),
    cardTemplate: document.getElementById("cardTemplate"),
    themeToggle: document.getElementById("themeToggle"),
    toast: document.getElementById("toast"),
    toastText: document.getElementById("toastText"),
    modalOverlay: document.getElementById("modalOverlay"),
    modalClose: document.getElementById("modalClose"),
    modalTitle: document.getElementById("modalTitle"),
    modalCategory: document.getElementById("modalCategory"),
    modalDescription: document.getElementById("modalDescription"),
    modalTags: document.getElementById("modalTags"),
    modalPrompt: document.getElementById("modalPrompt"),
    modalModel: document.getElementById("modalModel"),
    modalCopy: document.getElementById("modalCopy"),
    modalFav: document.getElementById("modalFav"),
  };

  let activePromptId = null;
  let toastTimer = null;

  init();

  async function init() {
    initTheme();
    bindGlobalEvents();

    try {
      const res = await fetch("prompts.json");
      if (!res.ok) throw new Error("Failed to load prompts.json (" + res.status + ")");
      state.prompts = await res.json();
    } catch (err) {
      els.grid.innerHTML =
        '<p style="color:var(--danger)">Could not load prompts.json. If you are opening this file directly from disk, ' +
        "some browsers block local fetch() calls — serve the folder with a simple local server " +
        "(e.g. <code>python3 -m http.server</code>) or deploy it to GitHub Pages.</p>";
      console.error(err);
      return;
    }

    buildCategoryChips();
    buildTagChips();
    render();
  }

  /* ---------------- Theme ---------------- */

  function initTheme() {
    const saved = localStorage.getItem(STORAGE_THEME);
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const theme = saved || (prefersDark ? "dark" : "light");
    applyTheme(theme);
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    els.themeToggle.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");
    els.themeToggle.setAttribute("aria-label", theme === "dark" ? "Switch to light mode" : "Switch to dark mode");
    localStorage.setItem(STORAGE_THEME, theme);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    applyTheme(current === "dark" ? "light" : "dark");
  }

  /* ---------------- Favorites ---------------- */

  function loadFavorites() {
    try {
      const raw = localStorage.getItem(STORAGE_FAVORITES);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveFavorites() {
    localStorage.setItem(STORAGE_FAVORITES, JSON.stringify([...state.favorites]));
  }

  function toggleFavorite(id) {
    if (state.favorites.has(id)) state.favorites.delete(id);
    else state.favorites.add(id);
    saveFavorites();
    render();
    if (activePromptId === id) syncModalFavoriteButton();
  }

  /* ---------------- Filters UI ---------------- */

  function buildCategoryChips() {
    const categories = ["All", ...uniqueSorted(state.prompts.map((p) => p.category))];
    els.categoryList.innerHTML = "";
    categories.forEach((cat) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip" + (cat === state.category ? " active" : "");
      btn.textContent = cat;
      btn.addEventListener("click", () => {
        state.category = cat;
        refreshChipStates();
        render();
      });
      els.categoryList.appendChild(btn);
    });
  }

  function buildTagChips() {
    const tags = uniqueSorted(state.prompts.flatMap((p) => p.tags || []));
    els.tagList.innerHTML = "";
    tags.forEach((tag) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "chip" + (tag === state.tag ? " active" : "");
      btn.textContent = tag;
      btn.addEventListener("click", () => {
        state.tag = state.tag === tag ? null : tag;
        refreshChipStates();
        render();
      });
      els.tagList.appendChild(btn);
    });
  }

  function refreshChipStates() {
    [...els.categoryList.children].forEach((btn) => {
      btn.classList.toggle("active", btn.textContent === state.category);
    });
    [...els.tagList.children].forEach((btn) => {
      btn.classList.toggle("active", btn.textContent === state.tag);
    });
  }

  function uniqueSorted(arr) {
    return [...new Set(arr)].sort((a, b) => a.localeCompare(b));
  }

  /* ---------------- Global events ---------------- */

  function bindGlobalEvents() {
    els.search.addEventListener("input", (e) => {
      state.query = e.target.value.trim().toLowerCase();
      render();
    });

    els.sort.addEventListener("change", (e) => {
      state.sort = e.target.value;
      render();
    });

    els.favToggle.addEventListener("click", () => {
      state.favoritesOnly = !state.favoritesOnly;
      els.favToggle.setAttribute("aria-pressed", String(state.favoritesOnly));
      render();
    });

    els.clearFilters.addEventListener("click", () => {
      state.query = "";
      state.category = "All";
      state.tag = null;
      state.favoritesOnly = false;
      state.sort = "newest";
      els.search.value = "";
      els.sort.value = "newest";
      els.favToggle.setAttribute("aria-pressed", "false");
      refreshChipStates();
      render();
    });

    els.themeToggle.addEventListener("click", toggleTheme);

    els.modalClose.addEventListener("click", closeModal);
    els.modalOverlay.addEventListener("click", (e) => {
      if (e.target === els.modalOverlay) closeModal();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !els.modalOverlay.hidden) closeModal();
    });

    els.modalCopy.addEventListener("click", () => {
      const prompt = state.prompts.find((p) => p.id === activePromptId);
      if (prompt) copyPrompt(prompt.prompt, els.modalCopy);
    });

    els.modalFav.addEventListener("click", () => {
      if (activePromptId != null) toggleFavorite(activePromptId);
    });
  }

  /* ---------------- Rendering ---------------- */

  function getFiltered() {
    let list = state.prompts.slice();

    if (state.category !== "All") {
      list = list.filter((p) => p.category === state.category);
    }
    if (state.tag) {
      list = list.filter((p) => (p.tags || []).includes(state.tag));
    }
    if (state.favoritesOnly) {
      list = list.filter((p) => state.favorites.has(p.id));
    }
    if (state.query) {
      const q = state.query;
      list = list.filter((p) => {
        const haystack = [p.title, p.category, p.description, ...(p.tags || [])].join(" ").toLowerCase();
        return haystack.includes(q);
      });
    }

    list.sort((a, b) => {
      if (state.sort === "az") return a.title.localeCompare(b.title);
      if (state.sort === "category") return a.category.localeCompare(b.category) || a.title.localeCompare(b.title);
      // newest
      return (b.date || "").localeCompare(a.date || "");
    });

    return list;
  }

  function render() {
    const filtered = getFiltered();

    els.grid.innerHTML = "";
    filtered.forEach((prompt) => els.grid.appendChild(buildCard(prompt)));

    els.empty.hidden = filtered.length !== 0;
    els.resultsCount.textContent =
      filtered.length === state.prompts.length
        ? filtered.length + " prompt" + (filtered.length === 1 ? "" : "s") + " in the vault"
        : "Showing " + filtered.length + " of " + state.prompts.length + " prompts";

    renderStats();
  }

  function renderStats() {
    els.statTotal.textContent = state.prompts.length;
    els.statCategories.textContent = uniqueSorted(state.prompts.map((p) => p.category)).length;
    els.statFavorites.textContent = state.favorites.size;
  }

  function buildCard(prompt) {
    const node = els.cardTemplate.content.firstElementChild.cloneNode(true);

    node.querySelector(".card-category").textContent = prompt.category;
    node.querySelector(".card-title").textContent = prompt.title;
    node.querySelector(".card-description").textContent = prompt.description;
    node.querySelector(".card-model").textContent = prompt.model;

    const tagsWrap = node.querySelector(".card-tags");
    (prompt.tags || []).forEach((tag) => {
      const pill = document.createElement("button");
      pill.type = "button";
      pill.className = "tag-pill";
      pill.textContent = tag;
      pill.addEventListener("click", (e) => {
        e.stopPropagation();
        state.tag = state.tag === tag ? null : tag;
        refreshChipStates();
        render();
      });
      tagsWrap.appendChild(pill);
    });

    const favBtn = node.querySelector(".card-fav");
    const isFav = state.favorites.has(prompt.id);
    favBtn.setAttribute("aria-pressed", String(isFav));
    favBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFavorite(prompt.id);
    });

    node.querySelector(".card-open").addEventListener("click", () => openModal(prompt.id));

    const copyBtn = node.querySelector(".card-copy");
    copyBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      copyPrompt(prompt.prompt, copyBtn);
    });

    return node;
  }

  /* ---------------- Modal ---------------- */

  function openModal(id) {
    const prompt = state.prompts.find((p) => p.id === id);
    if (!prompt) return;
    activePromptId = id;

    els.modalCategory.textContent = prompt.category;
    els.modalTitle.textContent = prompt.title;
    els.modalDescription.textContent = prompt.description;
    els.modalModel.textContent = prompt.model;
    els.modalPrompt.textContent = prompt.prompt;

    els.modalTags.innerHTML = "";
    (prompt.tags || []).forEach((tag) => {
      const pill = document.createElement("span");
      pill.className = "tag-pill";
      pill.textContent = tag;
      els.modalTags.appendChild(pill);
    });

    syncModalFavoriteButton();

    els.modalOverlay.hidden = false;
    document.body.style.overflow = "hidden";
    els.modalClose.focus();
  }

  function syncModalFavoriteButton() {
    const isFav = activePromptId != null && state.favorites.has(activePromptId);
    els.modalFav.setAttribute("aria-pressed", String(isFav));
  }

  function closeModal() {
    els.modalOverlay.hidden = true;
    document.body.style.overflow = "";
    activePromptId = null;
  }

  /* ---------------- Copy to clipboard ---------------- */

  function copyPrompt(text, buttonEl) {
    const done = () => {
      showToast("Prompt copied");
      if (buttonEl) {
        buttonEl.classList.add("copied");
        setTimeout(() => buttonEl.classList.remove("copied"), 1200);
      }
    };

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      done();
    } catch (err) {
      showToast("Copy failed — select and copy manually");
      console.error(err);
    }
    document.body.removeChild(textarea);
  }

  function showToast(message) {
    els.toastText.textContent = message;
    els.toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove("show"), 2200);
  }
})();
