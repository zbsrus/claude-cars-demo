/* Native forms remain the source of truth. The same listbox serves editable suggestions and single selects. */
(() => {
  "use strict";
  const widgets = new WeakMap();
  const desktop = matchMedia("(hover: hover) and (pointer: fine)");
  let current = null;
  let serial = 0;
  let search = "";
  let typedAt = 0;
  const normalized = (text) =>
    text
      .toLocaleLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  const element = (name, css) => Object.assign(document.createElement(name), { className: css });
  const menu = element("div", "cc-select-menu");
  menu.id = "cc-open-options";
  menu.hidden = true;
  menu.setAttribute("role", "listbox");
  document.body.append(menu);

  function accessibleName(record) {
    const input = record.field;
    if (input.getAttribute("aria-label")) return input.getAttribute("aria-label");
    if (input.getAttribute("aria-labelledby")) {
      return input
        .getAttribute("aria-labelledby")
        .split(/\s+/)
        .map((id) => document.getElementById(id)?.textContent || "")
        .join(" ")
        .trim();
    }
    const label = input.labels?.[0];
    if (!label) return input.name;
    const duplicate = label.cloneNode(true);
    duplicate
      .querySelectorAll("select,input,textarea,button,.cc-select-control,.ow-example,.ow-field-error,small")
      .forEach((node) => node.remove());
    return duplicate.textContent.trim();
  }
  function update(record) {
    if (!record || record.suggest) return;
    const { field, trigger } = record;
    trigger.textContent = field.selectedOptions[0]?.textContent.trim() || "";
    trigger.setAttribute("aria-label", accessibleName(record));
    trigger.setAttribute("aria-disabled", String(field.disabled));
    trigger.tabIndex = desktop.matches && !field.disabled ? 0 : -1;
    if (desktop.matches) {
      field.tabIndex = -1;
      field.setAttribute("aria-hidden", "true");
    } else {
      field.tabIndex = record.tabIndex;
      field.removeAttribute("aria-hidden");
    }
    for (const name of ["aria-invalid", "aria-describedby", "aria-required"]) {
      if (field.hasAttribute(name)) trigger.setAttribute(name, field.getAttribute(name));
      else trigger.removeAttribute(name);
    }
    if (field.required) trigger.setAttribute("aria-required", "true");
    if (field.disabled && current === record) close();
  }
  function close() {
    if (!current) return;
    const record = current;
    current = null;
    record.trigger.setAttribute("aria-expanded", "false");
    record.trigger.removeAttribute("aria-activedescendant");
    record.wrap.classList.remove("cc-expanded");
    menu.hidden = true;
    menu.replaceChildren();
    search = "";
  }
  function position() {
    if (!current) return;
    if (!current.wrap.isConnected) {
      close();
      return;
    }
    const rect = current.wrap.getBoundingClientRect();
    const view = window.visualViewport;
    const top = view?.offsetTop || 0,
      left = view?.offsetLeft || 0;
    const height = view?.height || innerHeight,
      width = view?.width || innerWidth;
    if (rect.bottom < top || rect.top > top + height) {
      close();
      return;
    }
    const below = top + height - rect.bottom - 12;
    const above = rect.top - top - 12;
    const up = below < Math.min(184, menu.scrollHeight) && above > below;
    menu.style.width = Math.min(Math.max(0, width - 16), rect.width) + "px";
    menu.style.left = Math.max(left + 8, Math.min(rect.left, left + width - menu.offsetWidth - 8)) + "px";
    menu.style.maxHeight = Math.max(36, Math.min(304, up ? above : below)) + "px";
    menu.style.top = (up ? rect.top - menu.offsetHeight - 5 : rect.bottom + 5) + "px";
  }
  function highlight(index) {
    const { options, trigger } = current;
    const prior = menu.querySelector(".cc-highlight");
    prior?.classList.remove("cc-highlight");
    current.index = index;
    const row = menu.children[index];
    if (!row || !options[index]) {
      trigger.removeAttribute("aria-activedescendant");
      return;
    }
    row.classList.add("cc-highlight");
    trigger.setAttribute("aria-activedescendant", row.id);
    if (row.offsetTop < menu.scrollTop) menu.scrollTop = row.offsetTop;
    if (row.offsetTop + row.offsetHeight > menu.scrollTop + menu.clientHeight)
      menu.scrollTop = row.offsetTop + row.offsetHeight - menu.clientHeight;
  }
  function open(record, all = false) {
    if (record.field.disabled) return;
    if (current !== record) {
      close();
      current = record;
    }
    const { field, trigger } = record;
    let opts;
    if (record.suggest) {
      const q = all ? "" : normalized(field.value);
      opts = record
        .suggest()
        .filter((item) => !q || normalized(item).includes(q))
        .map((value) => ({ value, label: value }));
    } else {
      opts = [...field.options]
        .filter((o) => !o.disabled && !o.hidden && !o.closest("optgroup:disabled"))
        .map((o) => ({ value: o.value, label: o.label }));
    }
    record.options = opts;
    menu.replaceChildren();
    for (const [i, opt] of opts.entries()) {
      const row = element("div", "cc-select-option");
      row.id = "cc-option-" + record.id + "-" + i;
      row.dataset.index = String(i);
      row.setAttribute("role", "option");
      row.setAttribute("aria-selected", String(opt.value === field.value));
      row.textContent = opt.label;
      menu.append(row);
    }
    if (!opts.length) {
      if (!record.emptyHint) {
        close();
        return;
      }
      const empty = element("div", "cc-select-empty");
      empty.textContent = typeof record.emptyHint === "function" ? record.emptyHint() : record.emptyHint;
      empty.setAttribute("role", "presentation");
      menu.append(empty);
    }
    menu.setAttribute("aria-label", accessibleName(record));
    menu.hidden = false;
    trigger.setAttribute("aria-expanded", "true");
    record.wrap.classList.add("cc-expanded");
    position();
    if (current !== record) return;
    const match = opts.findIndex((item) => item.value === field.value);
    highlight(match >= 0 ? match : record.suggest ? -1 : 0);
  }
  function choose(index) {
    const record = current;
    const item = record?.options[index];
    if (!item) return;
    close();
    record.field.value = item.value;
    if (!record.suggest) update(record);
    record.trigger.focus({ preventScroll: true });
    record.field.dispatchEvent(new Event("input", { bubbles: true }));
    record.field.dispatchEvent(new Event("change", { bubbles: true }));
    if (current === record) close();
  }
  function keydown(record, event) {
    if (event.isComposing || event.metaKey || event.ctrlKey || (event.shiftKey && event.key.length !== 1))
      return;
    const key = event.key,
      isOpen = current === record;
    if (isOpen && key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
      return;
    }
    if (key === "Tab") {
      close();
      return;
    }
    if (key === "Enter" || (!record.suggest && key === " ")) {
      if (!isOpen && record.suggest) return;
      event.preventDefault();
      if (!isOpen) open(record, true);
      else if (record.index >= 0) choose(record.index);
      else close();
      return;
    }
    if (["ArrowDown", "ArrowUp", "Home", "End", "PageDown", "PageUp"].includes(key)) {
      if (record.suggest && !isOpen && !key.startsWith("Arrow")) return;
      if (record.suggest && ["Home", "End"].includes(key) && record.index < 0) return;
      event.preventDefault();
      if (!isOpen) {
        open(record, true);
        if (!current || record.index >= 0) return;
      }
      if (current !== record) return;
      const last = record.options.length - 1;
      if (last < 0) return;
      let index =
        record.index + (key === "ArrowUp" ? -1 : key === "PageUp" ? -5 : key === "PageDown" ? 5 : 1);
      if (key === "Home") index = 0;
      if (key === "End") index = last;
      highlight(Math.min(last, Math.max(0, index)));
      return;
    }
    if (!record.suggest && key.length === 1 && !event.altKey) {
      event.preventDefault();
      if (!isOpen) open(record, true);
      if (current !== record) return;
      const now = performance.now();
      search = (now - typedAt > 750 ? "" : search) + normalized(key);
      typedAt = now;
      let i = record.options.findIndex((o) => normalized(o.label).startsWith(search));
      if (i < 0) {
        search = normalized(key);
        i = record.options.findIndex((o) => normalized(o.label).startsWith(search));
      }
      if (i >= 0) highlight(i);
    }
  }
  function mount(field, suggest = null, emptyHint = "") {
    if (!field || widgets.has(field)) return widgets.get(field);
    if (!suggest && (field.multiple || field.size > 1)) return;
    const wrap = element("span", "cc-select-control" + (suggest ? " cc-select-editable" : ""));
    field.before(wrap);
    wrap.append(field);
    const trigger = suggest ? field : element("span", "cc-select-trigger");
    const record = { field, wrap, trigger, suggest, emptyHint, tabIndex: field.tabIndex, id: ++serial };
    widgets.set(field, record);
    trigger.setAttribute("role", "combobox");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", menu.id);
    trigger.setAttribute("aria-haspopup", "listbox");
    const arrow = element(suggest ? "button" : "i", "cc-select-arrow");
    if (suggest) {
      field.setAttribute("aria-autocomplete", "list");
      arrow.type = "button";
      arrow.tabIndex = -1;
      arrow.setAttribute("aria-label", accessibleName(record));
      arrow.setAttribute("aria-controls", menu.id);
      arrow.addEventListener("pointerdown", (e) => {
        if (e.pointerType === "mouse") e.preventDefault();
      });
      arrow.addEventListener("click", (e) => {
        e.preventDefault();
        field.focus({ preventScroll: true });
        current === record ? close() : open(record, true);
      });
      field.addEventListener("input", (e) => {
        if (e.isTrusted) open(record);
      });
    } else {
      arrow.setAttribute("aria-hidden", "true");
      wrap.append(trigger);
      const env = () => update(record);
      field.addEventListener("input", env);
      field.addEventListener("change", env);
      field.addEventListener("focus", () => {
        if (desktop.matches) trigger.focus({ preventScroll: true });
      });
      field.addEventListener("click", (event) => {
        if (!desktop.matches || field.disabled) return;
        event.preventDefault();
        trigger.focus({ preventScroll: true });
        current === record ? close() : open(record, true);
      });
      update(record);
    }
    wrap.append(arrow);
    trigger.addEventListener("click", (e) => {
      if (!suggest) {
        e.preventDefault();
        trigger.focus({ preventScroll: true });
        current === record ? close() : open(record, true);
      } else if (current !== record) open(record);
    });
    trigger.addEventListener("keydown", (e) => keydown(record, e));
    return record;
  }
  function enhance(root) {
    if (!root || root.nodeType !== 1) return;
    if (root.matches("select")) mount(root);
    for (const select of root.querySelectorAll("select")) mount(select);
  }
  menu.addEventListener("mousedown", (e) => e.preventDefault());
  menu.addEventListener("click", (e) => {
    const option = e.target.closest("[data-index]");
    if (option) choose(Number(option.dataset.index));
  });
  document.addEventListener(
    "pointerdown",
    (e) => {
      if (current && !current.wrap.contains(e.target) && !menu.contains(e.target)) close();
    },
    true,
  );
  document.addEventListener("focusin", (e) => {
    if (current && !current.wrap.contains(e.target) && !menu.contains(e.target)) close();
  });
  window.addEventListener(
    "scroll",
    (e) => {
      if (!menu.contains(e.target instanceof Node ? e.target : null)) position();
    },
    true,
  );
  window.addEventListener("resize", position);
  window.visualViewport?.addEventListener("resize", position);
  desktop.addEventListener("change", () => {
    close();
    document.querySelectorAll("select").forEach((s) => update(widgets.get(s) || mount(s)));
  });
  document.addEventListener("reset", () =>
    requestAnimationFrame(() =>
      document.querySelectorAll("select").forEach((s) => {
        const r = widgets.get(s);
        if (r) update(r);
      }),
    ),
  );
  new MutationObserver((mutations) => {
    for (const change of mutations) {
      if (change.type === "attributes") {
        const record = widgets.get(change.target);
        if (record && !record.suggest) update(record);
        continue;
      }
      for (const added of change.addedNodes) enhance(added);
      if (change.target instanceof HTMLSelectElement) {
        const record = widgets.get(change.target);
        if (record) update(record);
      }
    }
    if (current && !current.wrap.isConnected) close();
  }).observe(document.getElementById("main") || document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["disabled", "aria-invalid", "aria-describedby", "required"],
  });
  window.CCSelect = {
    refresh(select) {
      const record = widgets.get(select) || mount(select);
      if (record) update(record);
    },
    focus(select) {
      const record = widgets.get(select) || mount(select);
      (record && desktop.matches ? record.trigger : select)?.focus();
    },
    suggest(input, values, empty) {
      return mount(input, values, empty);
    },
    close,
  };
  enhance(document.getElementById("main"));
})();
