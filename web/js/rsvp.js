const token = new URLSearchParams(window.location.search).get('token');
const content = document.getElementById('rsvp-content');
const actions = document.getElementById('rsvp-actions');

async function rsvpRequest(method = 'GET', body) {
  const response = await fetch(`/api/rsvp/${encodeURIComponent(token)}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Não foi possível processar a confirmação.');
  return data;
}

function renderRecorded(status, name) {
  actions.hidden = true;
  content.className = 'rsvp-result';
  const label = status === 'confirmed' ? '✅ presença confirmada' : '❌ ausência informada';
  content.textContent = `${name ? `${name}, sua` : 'Sua'} ${label}. Obrigado pela resposta!`;
}

async function submit(response) {
  document.querySelectorAll('#rsvp-actions button').forEach(button => button.disabled = true);
  content.textContent = 'Registrando sua resposta…';
  try {
    const data = await rsvpRequest('POST', { response });
    renderRecorded(data.status);
  } catch (error) {
    content.textContent = error.message;
  }
}

async function initialize() {
  if (!token) {
    content.textContent = 'Este link de confirmação é inválido.';
    return;
  }
  try {
    const data = await rsvpRequest();
    if (data.status !== 'pending') {
      renderRecorded(data.status, data.guest_name);
      return;
    }
    content.textContent = `${data.guest_name}, você poderá comparecer ao nosso casamento?`;
    actions.hidden = false;
  } catch (error) {
    content.textContent = error.message;
  }
}

document.getElementById('confirm-btn').addEventListener('click', () => submit('confirmed'));
document.getElementById('decline-btn').addEventListener('click', () => submit('declined'));
initialize();
