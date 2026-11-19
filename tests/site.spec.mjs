import { test, expect } from '@playwright/test';
import { fileURLToPath } from 'node:url';

const evidence = name => fileURLToPath(new URL(`../evidence/${name}`, import.meta.url));

const titles = ['Кухня и гостиная', 'Компактная квартира', 'Спальня и рабочая зона'];
const success = 'Форма заполнена верно. Это демонстрация, данные не отправлены';
const project = (page, index) => page.getByRole('group', { name: 'Проект', exact: true }).getByRole('button', { name: titles[index], exact: true });
const angle = (page, index) => page.getByRole('group', { name: 'Ракурс', exact: true }).getByRole('button', { name: `Ракурс ${index + 1}`, exact: true });

async function ready(page) {
  await page.goto('/');
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator('#check-form')).toBeEnabled();
}

for (const width of [320, 360, 768, 1440]) {
  test(`layout, anchors, full images and 200% text: ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await ready(page);
    await expect(page.locator('main > section')).toHaveCount(6);
    for (const anchor of ['projects', 'services', 'process', 'about']) {
      await page.locator(`nav a[href="#${anchor}"]`).click();
      const top = await page.locator(`#${anchor}`).evaluate(el => el.getBoundingClientRect().top);
      expect(top).toBeGreaterThanOrEqual(0);
      expect(top).toBeLessThan(300);
    }
    for (const anchor of ['projects', 'contact']) {
      await page.locator(`.hero-actions a[href="#${anchor}"]`).click();
      await expect(page.locator(`#${anchor}`)).toBeInViewport();
    }
    for (const index of [1, 2]) {
      await project(page, index).click();
      await expect.poll(() => page.locator('#gallery-image').evaluate(el => el.complete && el.naturalWidth > 0)).toBe(true);
      const box = await page.locator('.gallery-frame').boundingBox();
      expect(Math.abs(box.width / box.height - 1.5)).toBeLessThan(.01);
      expect(await page.locator('#gallery-image').evaluate(el => getComputedStyle(el).objectFit)).toBe('contain');
    }
    for (const scale of [1, 2]) {
      await page.evaluate(scale => document.documentElement.style.fontSize = `${scale * 100}%`, scale);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const controls = await page.locator('nav a, button, .hero-actions a').evaluateAll(els => els.map(el => {
        const r = el.getBoundingClientRect();
        return { width: r.width, height: r.height, left: r.left, right: r.right, scroll: el.scrollWidth, client: el.clientWidth };
      }));
      for (const box of controls) {
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.left).toBeGreaterThanOrEqual(0);
        expect(box.right).toBeLessThanOrEqual(width + 1);
        expect(box.scroll).toBeLessThanOrEqual(box.client + 1);
      }
      if (scale === 2) await page.screenshot({ path: evidence(`chromium-${width}-text200.png`), fullPage: true });
    }
    await page.evaluate(() => document.documentElement.style.fontSize = '100%');
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: evidence(`chromium-${width}.png`), fullPage: true });
    expect(errors).toEqual([]);
  });
}

for (const input of ['mouse', 'keyboard', 'touch']) {
  test(`gallery route and synchronized states: ${input}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: input === 'mouse' ? 1440 : 360, height: 900 }, hasTouch: input === 'touch' });
    const page = await context.newPage();
    await ready(page);
    const activate = async locator => {
      if (input === 'keyboard') { await locator.focus(); await page.keyboard.press('Enter'); }
      else if (input === 'touch') await locator.tap();
      else await locator.click();
    };
    const check = async (frame, p, a) => {
      await expect(page.locator('#gallery-image')).toHaveAttribute('src', new RegExp(`velora-${frame}-`));
      await expect(page.locator('#gallery-source')).toHaveAttribute('srcset', new RegExp(`velora-${frame}-`));
      await expect(page.locator('#gallery-count')).toHaveText(`Ракурс ${a + 1} из 2`);
      await expect(page.locator('#project-title')).toHaveText(titles[p]);
      await expect(project(page, p)).toHaveAttribute('aria-pressed', 'true');
      await expect(angle(page, a)).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('[data-project][aria-pressed="true"]')).toHaveCount(1);
      await expect(page.locator('[data-angle][aria-pressed="true"]')).toHaveCount(1);
      expect(await page.locator('#gallery-image').getAttribute('alt')).toBeTruthy();
    };
    await check('02', 0, 0);
    for (const [control, frame, p, a] of [
      [angle(page, 1), '03', 0, 1], [project(page, 1), '04', 1, 0],
      [angle(page, 1), '05', 1, 1], [project(page, 1), '05', 1, 1],
      [project(page, 2), '06', 2, 0], [angle(page, 1), '07', 2, 1],
    ]) {
      await activate(control);
      await check(frame, p, a);
      if (input === 'keyboard') await expect(control).toBeFocused();
    }
    if (input === 'keyboard') {
      await project(page, 0).focus();
      for (const control of [project(page, 1), project(page, 2), angle(page, 0), angle(page, 1)]) {
        await page.keyboard.press('Tab');
        await expect(control).toBeFocused();
        expect(await control.evaluate(el => getComputedStyle(el).outlineStyle)).toBe('solid');
      }
      await page.keyboard.press('Shift+Tab');
      await expect(angle(page, 0)).toBeFocused();
      await page.keyboard.press('Space');
      await check('06', 2, 0);
    }
    await context.close();
  });
}

test('demo validation, focus, preservation and no data egress', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  const requests = [], logs = [];
  page.on('request', request => requests.push({ url: request.url(), body: request.postData(), method: request.method() }));
  page.on('console', message => logs.push(message.text()));
  await ready(page);
  const email = page.locator('#email'), task = page.locator('#task'), button = page.locator('#check-form');
  const initialURL = page.url();
  await expect(page.locator('.field-error:visible')).toHaveCount(0);
  await button.click();
  await expect(email).toBeFocused();
  await expect(page.locator('#email-error')).toHaveText('Укажите электронную почту');
  await expect(page.locator('#task-error')).toHaveText('Опишите задачу хотя бы в нескольких словах');
  await email.fill('   '); await task.fill('   '); await button.click();
  await expect(page.locator('#email-error')).toHaveText('Укажите электронную почту');
  await email.fill('velora-check'); await task.fill('Тестовая задача'); await button.click();
  await expect(page.locator('#email-error')).toHaveText('Проверьте адрес почты, например dom@example.com');
  await expect(task).toHaveValue('Тестовая задача');
  await email.fill('demo-velora-only@example.com');
  await expect(page.locator('#email-error')).toBeHidden();
  await task.fill('я'.repeat(1001)); await button.click();
  await expect(task).toBeFocused();
  await expect(page.locator('#task-error')).toHaveText('Сократите описание до 1000 знаков');
  await expect(task).toHaveValue('я'.repeat(1001));
  await task.fill('я'.repeat(1000));
  await expect(page.locator('#task-error')).toBeHidden();
  await button.click(); await expect(page.locator('#form-status')).toHaveText(success);
  await button.click(); await expect(page.locator('#form-status')).toHaveText(success);
  await task.fill('Тестовая задача после проверки');
  await expect(page.locator('#form-status')).toBeEmpty();
  await email.fill(' demo-velora-only@example.com '); await button.click();
  await expect(page.locator('#form-status')).toHaveText(success);
  await email.fill('demo-velora-only@example..com'); await button.click();
  await expect(email).toBeFocused();
  await expect(page.locator('#email-error')).toBeVisible();
  await email.fill('demo-velora-only@example.com'); await button.click();
  await expect(page.locator('#form-status')).toHaveText(success);
  expect(page.url()).toBe(initialURL);
  expect(await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length, cookies: document.cookie }))).toEqual({ local: 0, session: 0, cookies: '' });
  expect(await page.context().cookies()).toEqual([]);
  expect(requests.every(r => r.method === 'GET' && r.body === null && new URL(r.url).origin === new URL(initialURL).origin && !r.url.includes('demo-velora-only'))).toBe(true);
  expect(logs.every(message => !message.includes('demo-velora-only') && !message.includes('Тестовая задача'))).toBe(true);
  await page.screenshot({ path: evidence('chromium-form-success.png'), fullPage: true });
});

test('without JS: editable fields cannot submit or store values', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 320, height: 900 } });
  const page = await context.newPage();
  const requests = [];
  page.on('request', request => requests.push(request.url()));
  await page.goto('/');
  const initialURL = page.url();
  await page.locator('#email').fill('nojs-velora@example.com');
  await page.locator('#task').fill('Без сценариев');
  const before = requests.length;
  await page.locator('#email').press('Enter');
  await expect(page.locator('#check-form')).toBeDisabled();
  await expect(page.locator('#email')).toHaveValue('nojs-velora@example.com');
  await expect(page.locator('#task')).toHaveValue('Без сценариев');
  await expect(page.locator('form')).toHaveCount(0);
  expect(page.url()).toBe(initialURL);
  expect(requests.slice(before)).toEqual([]);
  expect(await context.cookies()).toEqual([]);
  await context.close();
});
