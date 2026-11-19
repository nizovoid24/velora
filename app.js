(() => {
  'use strict';

  const projects = [
    {
      title: 'Кухня и гостиная',
      description: 'Круглый стол связывает кухню и диванную зону. За ним можно собраться вместе, а у кухонной стойки — ненадолго присесть, пока готовится ужин',
      frames: [
        ['velora-02-living-kitchen-overview', 'От дивана видны круглый обеденный стол и кухонная стойка с двумя табуретами'],
        ['velora-03-living-kitchen-reverse', 'От кухонной стойки видны стол у окон, спинка дивана и стена с телевизором'],
      ],
    },
    {
      title: 'Компактная квартира',
      description: 'Шкафы, место для сидения и ниша с телевизором собраны вдоль одной стены. Середина комнаты остаётся свободной для прохода между столом и диваном',
      frames: [
        ['velora-04-compact-apartment-overview', 'Вдоль стены тянутся светлые шкафы с оливковой нишей и скамьёй. У окна стоит диван'],
        ['velora-05-compact-apartment-storage', 'Со стороны дивана видны входная дверь, скамья с подсветкой и встроенная ниша с телевизором'],
      ],
    },
    {
      title: 'Спальня и рабочая зона',
      description: 'Письменный стол стоит у окна. Деревянные рейки отделяют его от кровати, а свет проходит между ними в спальную часть комнаты',
      frames: [
        ['velora-06-bedroom-workspace-overview', 'От двери видны кровать с синим изголовьем, реечная перегородка и письменный стол у окна'],
        ['velora-07-bedroom-workspace-reverse', 'У края письменного стола стоит лампа. За деревянными рейками видна кровать, слева открыт проход к двери'],
      ],
    },
  ];
  const projectButtons = [...document.querySelectorAll('[data-project]')];
  const angleButtons = [...document.querySelectorAll('[data-angle]')];
  const image = document.querySelector('#gallery-image');
  const source = document.querySelector('#gallery-source');
  let projectIndex = 0;
  let angleIndex = 0;

  function renderGallery() {
    const project = projects[projectIndex];
    const [file, alt] = project.frames[angleIndex];
    source.srcset = `assets/images/${file}-648.webp 648w, assets/images/${file}-1536.webp 1536w`;
    image.src = `assets/images/${file}-1536.jpg`;
    image.alt = alt;
    document.querySelector('#project-title').textContent = project.title;
    document.querySelector('#project-description').textContent = project.description;
    const count = `Ракурс ${angleIndex + 1} из 2`;
    document.querySelector('#gallery-count').textContent = count;
    projectButtons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === projectIndex)));
    angleButtons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === angleIndex)));
    document.querySelector('#gallery-status').textContent = `${project.title}. ${count}`;
  }
  projectButtons.forEach((button, index) => {
    button.disabled = false;
    button.addEventListener('click', () => {
      if (index === projectIndex) return;
      projectIndex = index;
      angleIndex = 0;
      renderGallery();
    });
  });
  angleButtons.forEach((button, index) => {
    button.disabled = false;
    button.addEventListener('click', () => {
      if (index === angleIndex) return;
      angleIndex = index;
      renderGallery();
    });
  });

  const email = document.querySelector('#email');
  const task = document.querySelector('#task');
  const status = document.querySelector('#form-status');
  const checkButton = document.querySelector('#check-form');

  function errorFor(field) {
    const value = field.value.trim();
    if (field === email) {
      if (!value) return 'Укажите электронную почту';
      if (!/^[^\s@]+@[^\s@.]+(?:\.[^\s@.]+)+$/u.test(value)) return 'Проверьте адрес почты, например dom@example.com';
    } else {
      if (!value) return 'Опишите задачу хотя бы в нескольких словах';
      if (Array.from(value).length > 1000) return 'Сократите описание до 1000 знаков';
    }
    return '';
  }
  function showError(field, message) {
    const error = document.querySelector(`#${field.id}-error`);
    error.textContent = message;
    error.hidden = !message;
    field.setAttribute('aria-invalid', String(Boolean(message)));
  }
  [email, task].forEach((field) => {
    field.addEventListener('input', () => {
      status.textContent = '';
      if (field.getAttribute('aria-invalid') === 'true') showError(field, errorFor(field));
    });
  });
  checkButton.disabled = false;
  checkButton.addEventListener('click', () => {
    let firstInvalid;
    [email, task].forEach((field) => {
      const error = errorFor(field);
      showError(field, error);
      if (error && !firstInvalid) firstInvalid = field;
    });
    if (firstInvalid) {
      status.textContent = '';
      firstInvalid.focus();
    } else {
      const message = 'Форма заполнена верно. Это демонстрация, данные не отправлены';
      if (status.textContent !== message) status.textContent = message;
    }
  });
})();
