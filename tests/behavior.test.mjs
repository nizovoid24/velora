import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';

const code = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
const brief = readFileSync(new URL('../VELORA_BRIEF.md', import.meta.url), 'utf8');

// A small DOM boundary double exercises actual app event handlers, not copied validation logic.
function setup() {
  const elements = new Map();
  let focused;
  const make = id => {
    const attrs = new Map(), handlers = {};
    const el = { id, value: '', textContent: '', hidden: true, disabled: true,
      addEventListener(type, fn) { handlers[type] = fn; },
      setAttribute(name, value) { attrs.set(name, value); },
      getAttribute(name) { return attrs.get(name) ?? null; },
      focus() { focused = el; },
      click() { handlers.click?.(); },
      fill(value) { el.value = value; handlers.input?.(); },
    };
    elements.set(`#${id}`, el);
    return el;
  };
  const project = [0, 1, 2].map(i => make(`project-${i}`));
  const angle = [0, 1].map(i => make(`angle-${i}`));
  for (const id of ['gallery-image', 'gallery-source', 'project-title', 'project-description', 'gallery-count', 'gallery-status', 'email', 'task', 'email-error', 'task-error', 'form-status', 'check-form']) make(id);
  const forbidden = () => { throw Error('Unexpected network or storage side effect'); };
  const context = {
    document: {
      querySelector: selector => { assert.ok(elements.has(selector), selector); return elements.get(selector); },
      querySelectorAll: selector => selector === '[data-project]' ? project : angle,
    },
    fetch: forbidden, XMLHttpRequest: forbidden, localStorage: new Proxy({}, { get: forbidden }),
    sessionStorage: new Proxy({}, { get: forbidden }), console: { log: forbidden, error: forbidden },
    navigator: { sendBeacon: forbidden }, location: new Proxy({}, { set: forbidden }),
  };
  vm.runInNewContext(code, context);
  return { el: id => elements.get(`#${id}`), project, angle, focused: () => focused };
}

test('gallery follows 02 → 03 → 04 → 05 → 05 → 06 → 07 with exact brief copy', () => {
  const s = setup();
  const verify = (frame, p, a) => {
    assert.match(s.el('gallery-image').src, new RegExp(`velora-${frame}-`));
    assert.match(s.el('gallery-source').srcset, new RegExp(`velora-${frame}-`));
    assert.ok(brief.includes(`«${s.el('gallery-image').alt}»`));
    assert.ok(brief.includes(`«${s.el('project-description').textContent}»`));
    assert.ok(brief.includes(s.el('project-title').textContent));
    assert.equal(s.el('gallery-count').textContent, `Ракурс ${a + 1} из 2`);
    assert.equal(s.project[p].getAttribute('aria-pressed'), 'true');
    assert.equal(s.angle[a].getAttribute('aria-pressed'), 'true');
    assert.equal(s.project.filter(el => el.getAttribute('aria-pressed') === 'true').length, 1);
    assert.equal(s.angle.filter(el => el.getAttribute('aria-pressed') === 'true').length, 1);
    const path = s.el('gallery-image').src;
    assert.ok(existsSync(new URL(`../${path}`, import.meta.url)));
  };
  s.angle[1].click(); verify('03', 0, 1);
  s.project[1].click(); verify('04', 1, 0);
  s.angle[1].click(); verify('05', 1, 1);
  const announcement = s.el('gallery-status').textContent;
  s.project[1].click(); verify('05', 1, 1);
  assert.equal(s.el('gallery-status').textContent, announcement);
  s.project[2].click(); verify('06', 2, 0);
  s.angle[1].click(); verify('07', 2, 1);
  s.project[0].click(); verify('02', 0, 0);
});

test('form errors, focus and preservation; whitespace, length boundaries, repeat success and editing', () => {
  const s = setup(), email = s.el('email'), task = s.el('task'), button = s.el('check-form');
  assert.equal(button.disabled, false);
  assert.equal(email.getAttribute('aria-invalid'), null);
  button.click();
  assert.equal(s.focused(), email);
  assert.equal(s.el('email-error').textContent, 'Укажите электронную почту');
  assert.equal(s.el('task-error').textContent, 'Опишите задачу хотя бы в нескольких словах');
  email.fill('   '); task.fill('\n  '); button.click();
  assert.equal(s.el('email-error').textContent, 'Укажите электронную почту');
  email.fill('test'); task.fill('Сохранить эту задачу'); button.click();
  assert.equal(task.value, 'Сохранить эту задачу');
  assert.equal(s.el('email-error').textContent, 'Проверьте адрес почты, например dom@example.com');
  email.fill('dom@example.com');
  assert.equal(s.el('email-error').hidden, true);
  task.fill('я'.repeat(1001)); button.click();
  assert.equal(s.focused(), task);
  assert.equal(task.value.length, 1001);
  assert.equal(s.el('task-error').textContent, 'Сократите описание до 1000 знаков');
  task.fill('я'.repeat(1000));
  assert.equal(s.el('task-error').hidden, true);
  button.click(); button.click();
  assert.equal(s.el('form-status').textContent, 'Форма заполнена верно. Это демонстрация, данные не отправлены');
  task.fill('Короткая задача');
  assert.equal(s.el('form-status').textContent, '');
  email.fill(' dom@example.com '); button.click();
  assert.equal(email.value, ' dom@example.com ');
  assert.ok(s.el('form-status').textContent);
  email.fill('dom@example.com');
  assert.equal(s.el('form-status').textContent, '');
});

test('email requires exactly one @ and nonempty dot-separated domain parts', () => {
  const s = setup();
  s.el('task').fill('Стол');
  for (const invalid of ['a@@b.com', '@b.com', 'a@b', 'a@.com', 'a@b.', 'a@b..com', 'a b@c.com', 'a@b. com']) {
    s.el('email').fill(invalid); s.el('check-form').click();
    assert.equal(s.el('email').getAttribute('aria-invalid'), 'true', invalid);
  }
  for (const valid of ['a@b.c', 'dom+test@example.com', ' dom@example.co.uk ']) {
    s.el('email').fill(valid); s.el('check-form').click();
    assert.equal(s.el('email').getAttribute('aria-invalid'), 'false', valid);
  }
});

test('native no-JS submission is structurally absent and CSP disallows form/network writes', () => {
  const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  assert.doesNotMatch(html, /<form\b/i);
  assert.match(html, /form-action 'none'/);
  assert.match(html, /connect-src 'none'/);
  assert.match(html, /id="check-form" type="button" disabled/);
  for (const field of ['email', 'task']) {
    const tag = html.match(new RegExp(`<[^>]+id="${field}"[^>]*>`))[0];
    assert.doesNotMatch(tag, /\bname=|\bform=/);
    assert.match(tag, /autocomplete="off"/);
  }
});
