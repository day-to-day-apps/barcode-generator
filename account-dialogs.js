let dialogSequence = 0;

function createDialog({ title, message = '', confirmLabel, cancelLabel, danger = false, value = null }) {
  const id = `account-dialog-title-${++dialogSequence}`;
  const dialog = document.createElement('dialog');
  dialog.className = 'account-delete-dialog';
  dialog.setAttribute('aria-labelledby', id);

  const form = document.createElement('form');
  form.method = 'dialog';
  const heading = document.createElement('h3');
  heading.id = id;
  heading.textContent = title;
  form.appendChild(heading);

  if (message) {
    const paragraph = document.createElement('p');
    paragraph.textContent = message;
    form.appendChild(paragraph);
  }

  if (value !== null) {
    const input = document.createElement('input');
    input.type = 'text';
    input.readOnly = true;
    input.value = value;
    input.setAttribute('aria-label', title);
    form.appendChild(input);
    dialog._valueInput = input;
  }

  const actions = document.createElement('div');
  actions.className = 'dialog-actions';
  if (cancelLabel) {
    const cancel = document.createElement('button');
    cancel.type = 'submit';
    cancel.value = 'cancel';
    cancel.className = 'btn-action';
    cancel.textContent = cancelLabel;
    actions.appendChild(cancel);
  }
  const confirm = document.createElement('button');
  confirm.type = 'submit';
  confirm.value = 'confirm';
  confirm.className = `btn-action${danger ? ' btn-danger' : ''}`;
  confirm.textContent = confirmLabel;
  actions.appendChild(confirm);
  form.appendChild(actions);
  dialog.appendChild(form);
  document.body.appendChild(dialog);
  return dialog;
}

function openDialog(dialog) {
  return new Promise((resolve) => {
    dialog.addEventListener('close', () => {
      const confirmed = dialog.returnValue === 'confirm';
      dialog.remove();
      resolve(confirmed);
    }, { once: true });
    dialog.showModal();
    if (dialog._valueInput) {
      dialog._valueInput.focus();
      dialog._valueInput.select();
    }
  });
}

export function confirmAction(options) {
  return openDialog(createDialog({ ...options, danger: options.danger !== false }));
}

export function showTextValue({ title, message, value, closeLabel }) {
  return openDialog(createDialog({
    title,
    message,
    value,
    confirmLabel: closeLabel,
    cancelLabel: '',
    danger: false,
  }));
}
