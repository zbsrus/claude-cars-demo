(() => {
  'use strict';
  const { lang, page, id, authenticated } = window.CC;
  const cars = () => window.CC.cars || [];
  const t = window.CCInsightsCopy[lang] || window.CCInsightsCopy.fr;
  const locales = { fr: 'fr-BE', nl: 'nl-BE', de: 'de-BE', en: 'en-GB', es: 'es-ES' };
  const locale = locales[lang];
  const query = new URLSearchParams(location.search);
  const types = ['question', 'viewing', 'sourcing', 'import'];
  const formKey = 'claude-cars.insights.v1.form';
  const dayFormat = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Brussels',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const dateFormat = new Intl.DateTimeFormat(locale, {
    timeZone: 'Europe/Brussels',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
  const tickFormat = new Intl.DateTimeFormat(locale, { timeZone: 'UTC', day: 'numeric', month: 'short' });
  const integer = new Intl.NumberFormat(locale);
  const esc = (s) =>
    String(s ?? '').replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c],
    );
  const uid = () => Array.from(crypto.getRandomValues(new Uint8Array(16)), (n) => n.toString(16).padStart(2, '0')).join('');
  const title = (car) => [car?.make, car?.model].filter(Boolean).join(' ');
  const findCar = (carId) => cars().find((c) => c.id === carId);
  const canViewCar = (car) => car?.status === 'available';
  const carURL = (car) => `${location.origin}/${lang}/cars/${encodeURIComponent(car)}`;
  const waURL = (message) => `https://wa.me/32496807976?text=${encodeURIComponent(message)}`;
  const dateKey = (time) => dayFormat.format(time);
  const dayNumber = (key) => Math.floor(Date.parse(key + 'T00:00:00Z') / 86400000);
  const asDay = (num) => num * 86400000;
  function option(value, label, current) {
    return `<option value="${esc(value)}"${value === current ? ' selected' : ''}>${esc(label)}</option>`;
  }
  function field(key, label, value, attrs = '', multiline = false) {
    const control = multiline
      ? `<textarea id="ins-${key}" name="${key}" maxlength="1800" rows="4" ${attrs}>${esc(value)}</textarea>`
      : `<input id="ins-${key}" name="${key}" value="${esc(value)}" ${key === 'listingUrl' ? '' : 'maxlength="280"'} ${attrs}>`;
    const required = attrs.split(' ').includes('required') ? ' <span aria-hidden="true">*</span>' : '';
    return `<div class="ins-field"><label for="ins-${key}">${esc(label)}${required}</label>${control}<small data-err="${key}" id="ins-err-${key}"></small></div>`;
  }
  function carSelect(value, type) {
    const viewing = type === 'viewing';
    const opts = cars().filter((c) => viewing ? canViewCar(c) : c.status !== 'draft');
    return `<div class="ins-field"><label for="ins-car">${t.car}${viewing ? ' <span aria-hidden="true">*</span>' : ''}</label><select id="ins-car" name="car" ${viewing ? 'required' : ''}>${option('', viewing ? t.chooseCar : t.general, value)}${opts.map((c) => option(c.id, title(c), value)).join('')}</select><small data-err="car" id="ins-err-car"></small></div>`;
  }
  function focusField(elem) {
    if (elem?.tagName === 'SELECT' && window.CCSelect?.focus) window.CCSelect.focus(elem);
    else elem?.focus();
  }
  function showFieldError(form, elem, error) {
    const output = form.querySelector(`[data-err="${elem.name}"]`);
    if (!output) return;
    output.textContent = error || '';
    if (error) {
      elem.setAttribute('aria-invalid', 'true');
      elem.setAttribute('aria-describedby', output.id);
    } else {
      elem.removeAttribute('aria-invalid');
      elem.removeAttribute('aria-describedby');
    }
    if (elem.tagName === 'SELECT') window.CCSelect?.refresh?.(elem);
  }
  function validation(form, fields) {
    let first;
    for (const elem of form.elements) {
      if (!Object.hasOwn(fields, elem.name)) continue;
      const error = fields[elem.name];
      showFieldError(form, elem, error);
      if (error && !first) first = elem;
    }
    focusField(first);
    return !first;
  }
  function clearFixedErrors(form, validate) {
    const check = (event) => {
      const elem = event.target;
      if (elem.getAttribute('aria-invalid') === 'true') showFieldError(form, elem, validate()[elem.name]);
    };
    form.addEventListener('input', check);
    form.addEventListener('change', check);
  }
  function values(form) {
    return Object.fromEntries(Array.from(new FormData(form), ([k, v]) => [k, String(v).trim()]));
  }
  function validContact(value) {
    return (
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ||
      (/^[+\d()\s.\-]+$/.test(value) && value.replace(/\D/g, '').length >= 6)
    );
  }
  function httpURL(value) {
    try {
      const url = new URL(value);
      return /^https?:\/\//i.test(value) && ['http:', 'https:'].includes(url.protocol) && !!url.hostname && !url.username && !url.password;
    } catch {
      return false;
    }
  }
  const detailFields = {
    question: ['message'],
    viewing: ['date', 'message'],
    sourcing: ['model', 'budget', 'mileage', 'options', 'message'],
    import: ['listingUrl', 'message'],
    manual: ['note'],
  };
  const localClock = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Brussels',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  });
  function wallTime() {
    return localClock.format(new Date()).replace(' ', 'T');
  }
  function fieldValue(key, value) {
    if (key === 'date') {
      // A datetime-local field represents wall time at the garage.
      const timestamp = Date.parse(value + 'Z');
      if (Number.isFinite(timestamp)) {
        const date = new Intl.DateTimeFormat(locale, {
          timeZone: 'UTC',
          dateStyle: 'medium',
          timeStyle: 'short',
        }).format(timestamp);
        return `${date} (${t.dateLocal})`;
      }
    }
    if (key === 'budget' || key === 'mileage')
      return integer.format(Number(value)) + (key === 'budget' ? ' €' : ' km');
    return value;
  }
  const detailLabels = {
    date: 'requestedTime',
    message: 'plainMessage',
    options: 'preferredOptions',
    budget: 'budgetLabel',
    mileage: 'mileageLabel',
    note: 'plainNote',
  };
  const requestPhrases = {
    question: 'requestQuestion',
    viewing: 'requestViewing',
    sourcing: 'requestSourcing',
    import: 'requestImport',
  };
  function buildMessage(r) {
    const f = r.fields,
      data = [t.hello, t[requestPhrases[r.type]], r.title, r.car ? carURL(r.car) : ''];
    for (const key of detailFields[r.type] || []) {
      if (f[key]) data.push(`${t[detailLabels[key] || key]}: ${fieldValue(key, f[key])}`);
    }
    data.push([f.name, f.reach].filter(Boolean).join(' · '));
    return data.filter(Boolean).join('\n');
  }

  function contactPage() {
    const root = document.getElementById('main');
    if (!root) return;
    const originCar = findCar(query.get('car'));
    const canView = cars().some(canViewCar);
    const availableTypes = types.filter((type) => type !== 'viewing' || canView);
    const requestedType = types.includes(query.get('type')) ? query.get('type') : 'question';
    function fallbackForViewing(carId) {
      if (carId) {
        const car = findCar(carId);
        if (!canViewCar(car)) return ['soon', 'reserved'].includes(car?.status) ? 'question' : 'sourcing';
      }
      return canView ? '' : 'sourcing';
    }
    let viewingFallback = requestedType === 'viewing' ? fallbackForViewing(query.get('car')) : '';
    const initialType = viewingFallback || requestedType;
    const topic = query.get('topic');
    const presetQuestion = viewingFallback === 'question' || (requestedType === 'question' && originCar && topic === 'availability')
      ? t.askAvailability
      : requestedType === 'question' && originCar && topic === 'documents' ? t.askRecords : '';
    const initial = () => ({
      type: initialType,
      car: originCar?.id || '',
      message: presetQuestion,
    });
    let draft = initial(),
      leadId = uid(),
      submission = { key: uid(), version: 1 },
      attemptedVersion = 0,
      uncertain = false,
      prepared = false;
    const signature = location.search;
    let hasInput = false;
    let receipt = null;
    let returning = false;
    let lastEdited = Date.now();
    try {
      const cache = JSON.parse(sessionStorage.getItem(formKey) || 'null');
      if (cache && Date.now() - cache.updated >= 30 * 60 * 1000) sessionStorage.removeItem(formKey);
      else if (cache?.signature === signature && cache.draft) {
        sessionStorage.removeItem(formKey);
        receipt = cache.receipt || null;
        lastEdited = cache.updated;
        returning = hasInput = !receipt;
        draft = { ...draft, ...cache.draft };
        if (presetQuestion && draft.message === cache.presetQuestion) draft.message = presetQuestion;
        if (cache.submission?.key) {
          leadId = cache.leadId;
          submission = cache.submission;
          attemptedVersion = cache.attemptedVersion;
          uncertain = cache.uncertain;
          if (cache.lang !== lang && attemptedVersion === submission.version) submission.version++;
        }
        prepared = cache.prepared;
      }
    } catch {
      /* A new form can always be opened. */
    }
    const staleViewing = draft.type === 'viewing' ? fallbackForViewing(draft.car) : '';
    if (staleViewing && !receipt) {
      viewingFallback = staleViewing;
      draft.type = staleViewing;
      if (staleViewing === 'question' && !draft.message) draft.message = t.askAvailability;
      prepared = false;
      if (attemptedVersion === submission.version) submission.version++;
    }
    const back = originCar
      ? `<a class="ins-back ins-car-back" href="${esc(carURL(originCar.id))}">← ${t.backCar} · ${esc(title(originCar))}</a>`
      : '';
    const contextual = !!originCar || types.includes(query.get('type'));
    const titleKey = () => contextual ? draft.type : 'contactPage';
    const introKey = () => contextual ? ({ question: 'questionIntro', viewing: 'viewingIntro', sourcing: 'sourcingIntro', import: 'importIntro' })[draft.type] : 'contactIntro';
    root.innerHTML = `<div class="ins-contact"><header class="ins-contact-cover"><div class="cc-wrap ins-contact-intro">${back}<div class="ins-contact-lead"><h1>${t[titleKey()]}</h1><p>${t[introKey()]}</p></div></div></header><div class="cc-wrap ins-contact-grid"><section id="ins-formbox" class="ins-formbox"></section><aside class="ins-address"><h2>${t.contactDetails}</h2><address>Claude C SRL<br>Chaussée de Tirlemont 28/3<br>4520 Wanze · ${t.belgium}</address><a href="https://www.google.com/maps/dir/?api=1&amp;destination=Chauss%C3%A9e+de+Tirlemont+28%2F3%2C+4520+Wanze%2C+Belgium" referrerpolicy="no-referrer">${esc(window.CCPublicWords.directions[lang])}</a><p>${t.byAppointment}</p><div class="ins-actions ins-direct"><a class="ins-primary" data-ins-whats data-cc-event="whatsapp" target="_blank" rel="noopener noreferrer" href="${esc(waURL(t.hello))}">WhatsApp ↗</a><a class="ins-secondary" data-ins-phone data-cc-event="phone" href="tel:+32496807976">+32 496 80 79 76</a></div><a href="mailto:mcsportcars17@gmail.com">mcsportcars17@gmail.com</a><small>${t.vat} BE0681982155</small></aside></div></div>`;
    if (!contextual) root.querySelector('.ins-contact-intro').append(root.querySelector('.ins-direct'));
    const box = document.getElementById('ins-formbox');
    const directWhats = root.querySelector('[data-ins-whats]');
    function associatedCar() {
      return draft.type === 'import' ? null : findCar(draft.car);
    }
    function updateDirectLink() {
      const car = associatedCar();
      const message = [
        t.hello,
        car ? t[draft.type] + ' · ' + title(car) : t[requestPhrases[draft.type]],
        draft.type === 'question' && car === originCar ? presetQuestion : '',
        car ? carURL(car.id) : '',
      ]
        .filter(Boolean)
        .join('\n');
      directWhats.href = waURL(message);
      for (const link of root.querySelectorAll('.ins-direct [data-cc-event]')) link.dataset.ccCar = car?.id || '';
    }
    updateDirectLink();
    function capture() {
      const form = box.querySelector('form');
      if (form) draft = { ...draft, ...values(form) };
    }
    function stash() {
      if ((!hasInput && !prepared && !uncertain) || Date.now() - lastEdited >= 30 * 60 * 1000) return;
      capture();
      try {
        sessionStorage.setItem(
          formKey,
          JSON.stringify({ signature, draft, leadId, submission, attemptedVersion, uncertain, lang,
            prepared, presetQuestion, updated: lastEdited }),
        );
      } catch {}
    }
    window.addEventListener('pagehide', stash);
    document.addEventListener('cc:languagechange', () => {
      if (!receipt) return stash();
      try {
        sessionStorage.setItem(formKey, JSON.stringify({signature, draft: initial(), receipt, updated: Date.now()}));
      } catch {}
    });

    function lead() {
      const car = associatedCar();
      const keys = ['name', 'reach', ...detailFields[draft.type]];
      const fields = Object.fromEntries(keys.filter((key) => draft[key]).map((key) => [key, draft[key]]));
      return {
        id: leadId,
        car: car?.id || '',
        title: title(car),
        type: draft.type,
        lang,
        fields,
      };
    }
    function resetDraft() {
      try { sessionStorage.removeItem(formKey); } catch {}
      receipt = null;
      hasInput = returning = false;
      leadId = uid();
      submission = { key: uid(), version: 1 };
      attemptedVersion = 0;
      uncertain = false;
      draft = initial();
      prepared = false;
    }
    function startAgain() {
      resetDraft();
      if (!availableTypes.includes(draft.type)) draft.type = 'sourcing';
      draw();
      focusField(box.querySelector('select'));
    }
    function showReceipt(request) {
      directWhats.hidden = true;
      receipt = request;
      prepared = hasInput = false;
      box.innerHTML = `<h2 tabindex="-1">${t.received}</h2><p>${t.receivedNote}</p>
        <div class="ins-message" data-confirmed-message>${esc(buildMessage(request))}</div>
        <button type="button" data-new class="ins-secondary">${t.newRequest}</button>`;
      box.querySelector('[data-new]').onclick = startAgain;
      box.querySelector('h2').focus();
    }
    function showPrepared() {
      prepared = true;
      directWhats.hidden = true;
      const request = lead();
      const msg = buildMessage(request);
      const buttonLabel = () => attemptedVersion === submission.version ? t.retrySend :
        uncertain ? t.sendCorrection : t.siteSend;
      const recoveryNote = attemptedVersion === submission.version ? t.deliveryUncertain : t.correctionNote;
      box.innerHTML = `<h2 tabindex="-1">${t.prepared}</h2><div class="ins-message">${esc(msg)}</div>
        <p class="ins-note">${t.handoff} <a href="/${lang}/privacy" target="_blank" rel="noopener">${t.privacy}</a></p>
        <p class="ins-error" role="alert">${uncertain ? recoveryNote : ''}</p>
        <div class="ins-actions"><button type="button" class="ins-primary" data-send>${buttonLabel()}</button>
        <a class="ins-secondary" data-cc-event="whatsapp" data-cc-car="${esc(request.car)}" target="_blank" rel="noopener noreferrer" href="${esc(waURL(msg))}">${t.openWhats} ↗</a>
        <button type="button" data-edit class="ins-text-btn">${t.edit}</button>
        <button type="button" data-refresh-stock class="ins-secondary" hidden>${t.refreshStock}</button></div>`;
      const send = box.querySelector('[data-send]');
      const edit = box.querySelector('[data-edit]');
      const alert = box.querySelector('[role="alert"]');
      const refreshStock = box.querySelector('[data-refresh-stock]');
      refreshStock.onclick = () => {
        prepared = false;
        hasInput = true;
        if (attemptedVersion === submission.version) submission.version++;
        stash();
        location.reload();
      };
      edit.onclick = () => {
        if (attemptedVersion === submission.version) submission.version++;
        lastEdited = Date.now();
        prepared = false;
        draw();
        focusField(box.querySelector('#ins-date') || box.querySelector('select'));
      };
      send.onclick = async () => {
        lastEdited = Date.now();
        send.disabled = true;
        send.textContent = t.sending;
        edit.disabled = true;
        const previouslyUncertain = uncertain;
        uncertain = true;
        attemptedVersion = submission.version;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        try {
          const { id, lang, type, car, fields } = request;
          const response = await fetch('/api/enquiries', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id, lang, type, car, fields, submission }),
            signal: controller.signal,
          });
          const value = await response.json();
          if (!response.ok || value.ok !== true || value.id !== id || value.version !== submission.version) {
            const rejected = [400, 409, 429].includes(response.status);
            if (rejected) uncertain = previouslyUncertain;
            const reason = response.status === 429 ? 'limit' : value.error === 'unavailable' ? 'stockChanged' : value.error === 'superseded' ? 'superseded' :
              rejected ? 'changed' : 'deliveryUncertain';
            throw new Error(reason);
          }
          resetDraft();
          showReceipt(request);
        } catch (error) {
          const stockChanged = error.message === 'stockChanged';
          const reason = ['changed', 'limit', 'superseded', 'stockChanged'].includes(error.message) ? t[error.message] : t.deliveryUncertain;
          alert.textContent = uncertain && reason !== t.deliveryUncertain ? reason + ' ' + t.deliveryUncertain : reason;
          send.disabled = stockChanged;
          edit.disabled = stockChanged;
          refreshStock.hidden = !stockChanged;
          send.textContent = buttonLabel();
          if (stockChanged) refreshStock.focus();
          else if (document.activeElement === document.body) send.focus();
        } finally {
          clearTimeout(timeout);
        }
      };
      box.querySelector('h2').focus();
    }
    function draw() {
      directWhats.hidden = hasInput || uncertain;
      const kind = draft.type;
      root.querySelector('.ins-contact-lead h1').textContent = t[titleKey()];
      root.querySelector('.ins-contact-lead p').textContent = t[introKey()];
      if (kind === 'sourcing' && draft.car && draft.model === undefined)
        draft.model = title(findCar(draft.car));
      const showCar = kind !== 'import' && (kind !== 'sourcing' || !!draft.car || !!originCar);
      const viewingNote = kind === viewingFallback ? (kind === 'question' ? t.availabilityNote : t.stockUnavailable) : '';
      box.innerHTML = `<form novalidate>${returning ? `<p class="ins-draft-note" role="status">${t.resumed}</p>` : ''}${uncertain ? `<p class="ins-note">${t.correctionNote}</p>` : ''}<p class="ins-instruction">${t.requiredFields}</p>${viewingNote ? `<p class="ins-note">${viewingNote}</p>` : ''}<div class="ins-field"><label for="ins-type">${t.type}</label><select id="ins-type" name="type">${availableTypes.map((k) => option(k, t[k], kind)).join('')}</select></div>
      ${showCar ? carSelect(draft.car, kind) : ''}
      ${kind === 'viewing' ? `<p class="ins-note">${t.appointmentNote} ${t.dateLocal}.</p>${field('date', t.date, draft.date, `type="datetime-local" min="${wallTime()}"`)}` : ''}
      ${
        kind === 'sourcing'
          ? `<p class="ins-note">${t.deposit}</p>${field('model', t.model, draft.model, 'required')}
      <div class="ins-pair">${field('budget', t.budget, draft.budget, 'type="number" inputmode="numeric" min="1" required')}${field('mileage', t.mileage, draft.mileage, 'type="number" inputmode="numeric" min="1" required')}</div>${field('options', t.options, draft.options)}`
          : ''
      }
      ${kind === 'import' ? field('listingUrl', t.listingUrl, draft.listingUrl, 'type="url" inputmode="url" spellcheck="false" required') : ''}
      ${field('message', kind === 'question' ? t.message : t.messageOpt, draft.message, kind === 'question' ? 'required' : '', true)}
      <div class="ins-pair">${field('name', t.name, draft.name, 'autocomplete="name" required')}${field('reach', t.reach, draft.reach, 'autocomplete="on" spellcheck="false" required')}</div>
      <p class="ins-note ins-before-review">${t.formHandoff} <a href="/${lang}/privacy" target="_blank" rel="noopener">${t.privacy}</a></p>
      <div class="ins-actions"><button class="ins-primary" type="submit">${t.prepare} <span aria-hidden="true">→</span></button><button type="button" class="ins-text-btn" data-clear ${hasInput && !uncertain ? '' : 'hidden'}>${t.clearDraft}</button></div></form>`;
      const form = box.querySelector('form');
      const clear = form.querySelector('[data-clear]');
      form.addEventListener('input', () => {
        lastEdited = Date.now();
        hasInput = true;
        directWhats.hidden = true;
        clear.hidden = uncertain;
      });
      clear.onclick = () => { if (window.confirm(t.clearPrompt)) startAgain(); };
      if (form.elements.car) draft.car = form.elements.car.value;
      updateDirectLink();
      if (form.elements.car)
        form.elements.car.onchange = () => {
          const previous = title(findCar(draft.car));
          draft.car = form.elements.car.value;
          if (kind === 'sourcing' && (!form.elements.model.value || form.elements.model.value === previous)) {
            form.elements.model.value = title(findCar(draft.car));
          }
          updateDirectLink();
        };
      form.elements.type.onchange = () => {
        capture();
        draw();
        focusField(box.querySelector('#ins-type'));
      };
      function fieldErrors() {
        capture();
        const errors = {
          name: draft.name ? '' : t.required,
          reach: validContact(draft.reach) ? '' : t.reachError,
        };
        if (kind === 'question') errors.message = draft.message ? '' : t.required;
        if (kind === 'viewing') {
          errors.car = draft.car ? '' : t.requiredCar;
          errors.date =
            form.elements.date.validity.badInput || (draft.date && draft.date < wallTime())
              ? t.futureDate
              : '';
        }
        if (kind === 'sourcing') {
          errors.model = draft.model ? '' : t.required;
          for (const k of ['budget', 'mileage']) errors[k] = /^[1-9]\d*$/.test(draft[k]) ? '' : t.numberError;
        }
        if (kind === 'import') {
          errors.listingUrl = draft.listingUrl.length > 2048 ? t.longLink : httpURL(draft.listingUrl) ? '' : t.urlError;
        }
        return errors;
      }
      clearFixedErrors(form, fieldErrors);
      form.onsubmit = (e) => {
        e.preventDefault();
        if (!validation(form, fieldErrors())) return;
        showPrepared();
      };
    }
    if (receipt) showReceipt(receipt);
    else if (prepared) showPrepared();
    else draw();
  }
  const metricKeys = ['visits', 'views', 'whatsapp', 'phone', 'saved', 'bookings'];
  const metricNotes = ['visitsTip', 'viewsTip', 'clicksTip', 'clicksTip', 'savedTip', 'bookedTip'];
  const makeOwnerURL = (tab, params = {}) => {
    const u = new URL(`/${lang}/owner`, location.origin);
    u.searchParams.set('tab', tab);
    for (const [key, value] of Object.entries(params)) if (value) u.searchParams.set(key, value);
    return u.pathname + u.search;
  };
  function report(data, period, carId) {
    const today = dayNumber(dateKey(Date.now()));
    const first = period === 'all' ? -Infinity : today - Number(period) + 1;
    const leads = data.leads.filter((lead) => {
      const day = dayNumber(dateKey(lead.time));
      return (!carId || lead.car === carId) && day >= first && day <= today;
    });
    const counts = {visits: 0, views: 0, whatsapp: 0, phone: 0, saved: 0, bookings: 0};
    const days = {};
    const sources = new Map();
    let earliest = today;
    for (const row of data.metrics) {
      const day = dayNumber(row.day);
      if ((carId && row.car !== carId) || day < first || day > today) continue;
      earliest = Math.min(earliest, day);
      const key = row.kind === 'visit' ? 'visits' : row.kind === 'view' ? 'views' : row.kind;
      if (!Object.hasOwn(counts, key)) continue;
      counts[key] += row.count;
      if (key === 'views') days[day] = (days[day] || 0) + row.count;
      if (key === 'visits' || key === 'views') {
        const from = sources.get(row.source) || {visits: 0, views: 0};
        from[key] += row.count;
        sources.set(row.source, from);
      }
    }
    return {counts, days, sources, start: period === 'all' ? earliest : first, end: today, leads};
  }
  function sourceTable(sources) {
    if (!sources.size) return `<p>${t.noSources}</p>`;
    const labels = {facebook: 'Facebook', whatsapp: 'WhatsApp', direct: t.direct, other: t.other};
    const rows = [...sources].sort((a,b) => b[1].visits - a[1].visits || b[1].views - a[1].views);
    return `<table class="ins-table"><thead><tr><th scope="col">${t.sourceLabel}</th><th scope="col">${t.visits}</th><th scope="col">${t.views}</th></tr></thead><tbody>${rows.map(([key, counts]) => `<tr><th scope="row">${labels[key] || t.other}</th><td data-label="${t.visits}">${integer.format(counts.visits)}</td><td data-label="${t.views}">${integer.format(counts.views)}</td></tr>`).join('')}</tbody></table>`;
  }
  function metrics(r, carId) {
    return `<dl class="ins-metrics">${metricKeys.map((k, i) => `<div><dt>${esc(t[k === 'visits' && carId ? 'carVisits' : k])}</dt><dd>${integer.format(r.counts[k])}<small>${t[metricNotes[i]]}</small></dd></div>`).join('')}</dl>`;
  }
  function chart(r) {
    if (!r.counts.views) return `<div class="ins-chart-empty"><p>${t.noViews}</p></div>`;
    const totalDays = r.end - r.start + 1;
    const step = Math.max(1, Math.ceil(totalDays / 32));
    const buckets = [];
    for (let start = r.start; start <= r.end; start += step) {
      const end = Math.min(r.end, start + step - 1);
      let count = 0;
      for (let d = start; d <= end; d++) count += r.days[d] || 0;
      const from = tickFormat.format(asDay(start)),
        to = tickFormat.format(asDay(end));
      const label = step === 1 ? from : `${from} – ${to}`;
      buckets.push({ label, count });
    }
    const high = Math.max(1, ...buckets.map((b) => b.count));
    return `<figure class="ins-chart"><figcaption>${step === 1 ? t.daily : t.range} <span>${t.total} ${integer.format(r.counts.views)}</span></figcaption><div class="ins-bars" aria-hidden="true">${buckets.map((b) => `<div class="ins-bar-column" title="${esc(b.label)} · ${b.count}"><svg viewBox="0 0 1 100" preserveAspectRatio="none" focusable="false"><rect x="0" y="${100 - (b.count * 100) / high}" width="1" height="${(b.count * 100) / high}"></rect></svg></div>`).join('')}</div><div class="ins-axis"><span>${esc(buckets[0].label)}</span><span>${esc(buckets[buckets.length - 1].label)}</span></div><details><summary>${t.details}</summary><dl class="ins-chart-data">${buckets.map((b) => `<div><dt>${esc(b.label)}</dt><dd>${integer.format(b.count)}</dd></div>`).join('')}</dl></details></figure>`;
  }
  function stats(panel, data) {
    const params = new URLSearchParams(location.search);
    const period = ['7', '30', 'all'].includes(params.get('period')) ? params.get('period') : '7';
    const carId = params.get('vehicle') || '';
    const r = report(data, period, carId),
      car = findCar(carId);
    const ids = Array.from(
      new Set(
        [
          ...cars()
            .filter((c) => c.status !== 'draft')
            .map((c) => c.id),
          ...data.metrics.map((e) => e.car),
          ...data.leads.map((l) => l.car),
        ].filter(Boolean),
      ),
    );
    const carName = (cid) =>
      title(findCar(cid)) || data.leads.find((l) => l.car === cid && l.title)?.title || cid;
    if (carId && !ids.includes(carId)) {
      panel.innerHTML = `<div class="ins-dashboard"><a class="ins-back" href="${esc(makeOwnerURL('stats', { period }))}">← ${t.backStats}</a><h1>${t.stats}</h1><p class="ins-note">${t.reportUnavailable}</p></div>`;
      return;
    }
    const rows = ids
      .map((cid) => ({ id: cid, name: carName(cid), ...report(data, period, cid).counts }))
      .sort((a, b) => b.views - a.views || a.name.localeCompare(b.name, locale));
    const strip = `<div class="ins-period" role="group" aria-label="${t.period}">${[
      ['7', 'seven'],
      ['30', 'thirty'],
      ['all', 'all'],
    ]
      .map(
        ([v, key]) =>
          `<a class="${v === period ? 'is-current' : ''}" ${v === period ? 'aria-current="true"' : ''} href="${esc(makeOwnerURL('stats', { period: v, vehicle: carId }))}">${t[key]}</a>`,
      )
      .join('')}</div>`;
    let list = '';
    if (!carId) {
      const keys = ['views', 'saved', 'bookings'];
      list = `<section class="ins-section"><h2>${t.byCar}</h2>${rows.length ? `<div class="ins-table-wrap"><table class="ins-table"><thead><tr><th scope="col">${t.car}</th>${keys.map((k) => `<th scope="col">${t[k]}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr><th scope="row"><a href="${esc(makeOwnerURL('stats', { period, vehicle: row.id }))}">${esc(row.name)} <span aria-hidden="true">↗</span></a></th>${keys.map((k) => `<td data-label="${esc(t[k])}">${integer.format(row[k])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : `<p>${t.noCars}</p>`}</section>`;
    } else {
      list = `<section class="ins-section"><h2>${t.linked}</h2>${r.leads.length ? `<p>${t.inboxNote}</p><ul class="ins-linked">${r.leads.map((l) => `<li><a href="${esc(makeOwnerURL('enquiries', { lead: l.id, vehicle: carId, period }))}">${esc(l.fields.name || l.title || t[l.type])} · ${esc(t[l.type === 'manual' ? 'ownWhats' : l.type])}</a><span>${dateFormat.format(l.time)}</span></li>`).join('')}</ul>` : `<p>${t.relatedEmpty}</p>`}</section>`;
    }
    panel.innerHTML = `<div class="ins-dashboard">${carId ? `<a class="ins-back" href="${esc(makeOwnerURL('stats', { period }))}">← ${t.backStats}</a>` : ''}<div class="ins-report-head"><div><h1>${esc(carId ? carName(carId) : t.stats)}</h1><p>${t.device}</p></div>${strip}</div>${metrics(r, carId)}<section class="ins-section"><h2>${t.trend}</h2>${chart(r)}</section><section class="ins-section"><h2>${t.sources}</h2>${sourceTable(r.sources)}</section>${list}${car && car.status !== 'draft' ? `<a class="ins-back" href="${esc(carURL(carId))}">${t.openListing} ↗</a>` : ''}</div>`;
  }
  let recentChange = null;
  function inbox(panel, data, api) {
    const params = new URLSearchParams(location.search);
    const selected = params.get('lead');
    const period = ['7', '30', 'all'].includes(params.get('period')) ? params.get('period') : 'all';
    const contextCar = params.get('vehicle');
    const states = ['new', 'replied', 'booked'];
    const filter = states.includes(params.get('status')) ? params.get('status') : '';
    const statusQuery = filter ? {status:filter} : {};
    const rows = selected ? data.leads.filter((lead) => lead.id === selected) :
      data.leads.filter((lead) => !filter || lead.status === filter);
    const filters = !selected && (data.leads.length > 1 || filter) ? `<nav class="ins-period ins-inbox-filters" aria-label="${t.filterStatus}">${['', ...states].map(state => {
      const n = state ? data.leads.filter(lead => lead.status === state).length : data.leads.length;
      const url = makeOwnerURL('enquiries', state ? {status:state} : {});
      return `<a href="${esc(url)}" ${filter === state ? 'class="is-current" aria-current="page"' : ''}>${state ? t[state] : t.allRequests} <span>${integer.format(n)}</span></a>`;
    }).join('')}</nav>` : '';
    const reportLink = contextCar ? makeOwnerURL('stats', { vehicle: contextCar, period }) : '';
    const contextLinks = selected
      ? `<nav class="ins-return"><a class="ins-back" href="${esc(makeOwnerURL('enquiries', statusQuery))}">← ${filter ? t[filter] : t.allRequests}</a>${reportLink ? `<a class="ins-back" href="${esc(reportLink)}">← ${t.backReport}</a>` : ''}</nav>`
      : '';
    function row(lead) {
      const status = ['booked', 'replied'].includes(lead.status) ? lead.status : 'new';
      const leadName = lead.fields.name || lead.title || t[lead.type === 'manual' ? 'ownWhats' : lead.type];
      const detailURL = makeOwnerURL('enquiries', { lead: lead.id, ...statusQuery });
      const carStatsURL = makeOwnerURL('stats', { vehicle: lead.car, period });
      let reach = '';
      if (lead.fields.reach) {
        const contact = lead.fields.reach;
        const destination = validContact(contact)
          ? contact.includes('@')
            ? 'mailto:' + encodeURIComponent(contact)
            : 'tel:' + contact.replace(/[^+0-9]/g, '')
          : '';
        reach = `<div><dt>${t.reach}</dt><dd>${destination ? `<a href="${esc(destination)}">${esc(contact)}</a>` : esc(contact)}</dd></div>`;
      }
      const details = (detailFields[lead.type] || [])
        .filter((key) => lead.fields[key])
        .map((key) => {
          const value = lead.fields[key];
          const display =
            key === 'listingUrl' && httpURL(value)
              ? `<a href="${esc(value)}" target="_blank" rel="noopener noreferrer">${esc(value)} ↗</a>`
              : esc(fieldValue(key, value));
          return `<div><dt>${esc(t[detailLabels[key] || key])}</dt><dd>${display}</dd></div>`;
        })
        .join('');
      const undo =
        recentChange?.id === lead.id && recentChange.revision === lead.revision && status === recentChange.next
          ? `<button class="ins-text-btn" type="button" data-undo="${esc(lead.id)}">${t.undo}</button>`
          : '';
      const reopen = selected && status !== 'new' && !undo
        ? `<button class="ins-text-btn" type="button" data-state="new" data-lead="${esc(lead.id)}">${t.reopen}</button>` : '';
      return `<article class="ins-lead${selected === lead.id ? ' is-selected' : ''}" id="ins-lead-${esc(lead.id)}" tabindex="-1"><div class="ins-lead-heading"><h2>${esc(leadName)}</h2><span aria-live="polite">${t[status]}</span></div><p class="ins-lead-meta">${esc([t[lead.type === 'manual' ? 'ownWhats' : lead.type], lead.lang?.toUpperCase(), dateFormat.format(lead.time), lead.buyerUpdatedAt ? t.buyerUpdated : ''].filter(Boolean).join(' · '))}</p>${lead.title ? `<p class="ins-lead-car">${findCar(lead.car) ? `<a class="ins-back" href="${esc(carURL(lead.car))}">${esc(lead.title)}</a>` : esc(lead.title)}</p>` : ''}${selected ? `<dl class="ins-lead-data">${reach}${details}</dl>` : ''}<div class="ins-actions">${selected ? '' : `<a class="ins-text-btn" href="${esc(detailURL)}">${t.openRequest}</a>`}${status === 'new' ? `<button type="button" class="ins-secondary" data-state="replied" data-lead="${esc(lead.id)}">${t.markReply}</button>` : ''}${status !== 'booked' ? `<button type="button" class="ins-secondary" data-state="booked" data-lead="${esc(lead.id)}">${t.markBooked}</button>` : ''}${undo}${reopen}</div>${selected && lead.car ? `<a class="ins-back" href="${esc(carStatsURL)}">${t.viewStats}</a>` : ''}</article>`;
    }
    const manualForm = selected
      ? ''
      : `<details class="ins-manual"><summary>${t.manual}</summary><form data-manual novalidate><p class="ins-instruction">${t.requiredFields}</p><div class="ins-pair">${field('name', t.ownerName, '', 'required')}${field('reach', t.reach, '', 'required')}</div>${carSelect('', 'question')}${field('note', t.note, '', '', true)}<button class="ins-primary" type="submit">${t.add}</button></form></details>`;
    panel.innerHTML = `<div class="ins-dashboard">${contextLinks}<div class="ins-report-head"><div><h1>${selected ? t.enquiryDetail : t.enquiries}</h1><p>${t.inboxNote}</p></div></div>${manualForm}${filters}<p class="ins-error" role="status"></p><div class="ins-leads">${rows.length ? rows.map(row).join('') : `<p>${selected ? t.missingLead : filter ? t.noMatching : t.noRequests}</p>`}</div></div>`;
    const output = panel.querySelector('[role="status"]');
    const manual = panel.querySelector('[data-manual]');
    const manualErrors = () => {
      const f = values(manual);
      return { name: f.name ? '' : t.required, reach: validContact(f.reach) ? '' : t.reachError };
    };
    if (manual) clearFixedErrors(manual, manualErrors);
    async function refresh(focusId) {
      await renderOwner(panel, 'enquiries', api);
      const next = document.getElementById('ins-lead-' + focusId) || panel.querySelector('.ins-inbox-filters [aria-current]') || panel.querySelector('h1');
      if (next?.tagName === 'H1') next.tabIndex = -1;
      next?.focus();
    }
    let submitting = false;
    const manualId = uid();
    if (manual) manual.onsubmit = async (e) => {
      e.preventDefault();
      if (submitting || !validation(manual, manualErrors())) return;
      const {name, reach, car, note} = values(manual);
      submitting = true;
      const button = manual.querySelector('button[type=submit]');
      button.disabled = true;
      try {
        await api('/api/owner/enquiries', 'POST', {
          id: manualId, type: 'manual', lang, car, fields: {name, reach, note},
        });
        if (filter && filter !== 'new') {
          location.assign(makeOwnerURL('enquiries', {lead:manualId}));
        } else await refresh(manualId);
      } catch (error) {
        output.textContent = error.message === 'session' ? window.CCOwnerLocales.t('session',lang) : t.sendError;
      } finally {
        submitting = false;
        button.disabled = false;
      }
    };
    panel.querySelectorAll('[data-state],[data-undo]').forEach((button) => {
      button.onclick = async () => {
        if (submitting) return;
        const undo = !!button.dataset.undo;
        const lead = data.leads.find((item) => item.id === (button.dataset.lead || button.dataset.undo));
        if (!lead || (undo && recentChange?.id !== lead.id)) return;
        const status = undo ? recentChange.previous : button.dataset.state;
        submitting = true;
        button.disabled = true;
        try {
          await api('/api/owner/enquiries/' + encodeURIComponent(lead.id), 'PUT', {status, revision: lead.revision});
          recentChange = undo ? null : {id:lead.id, previous:lead.status, next:status, revision:lead.revision + 1};
          await refresh(lead.id);
        } catch (error) {
          output.textContent = error.message === 'conflict' ? t.reloadRequest :
            error.message === 'session' ? window.CCOwnerLocales.t('session',lang) : t.sendError;
        } finally {
          submitting = false;
          button.disabled = false;
        }
      };
    });
  }
  async function renderOwner(panel, tab, api) {
    if (!authenticated || !panel) return;
    const data = await api('/api/owner/enquiries');
    if (!panel.isConnected) return;
    if (tab === 'stats') stats(panel, data);
    else if (tab === 'enquiries') inbox(panel, data, api);
  }
  window.CCInsights = { renderOwner };
  if (page === 'contact') contactPage();
})();
