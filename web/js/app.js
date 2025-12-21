// ===== State Management =====
let currentPage = 1;
let totalPages = 1;
let perPage = 20;
let searchQuery = '';
let statusFilter = '';
let groupFilter = '';
let guests = [];
let groups = [];
let templates = [];
let currentEditingId = null;
let currentEditingTemplateId = null;
let currentTheme = localStorage.getItem('theme') || 'dark';

// ===== Initialize App =====
document.addEventListener('DOMContentLoaded', async () => {
    applyTheme(currentTheme);
    initializeTabs();
    await loadInitialData();
    setupEventListeners();
});

// ===== Theme Management =====
function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    currentTheme = theme;
    localStorage.setItem('theme', theme);
    
    //  Update toggle button icon
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
        themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    }
}

function toggleTheme() {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
    showToast(`Tema ${newTheme === 'dark' ? 'escuro' : 'claro'} ativado`, 'success');
}

// ===== Data Loading =====
async function loadInitialData() {
    showLoading(true);
    try {
        await Promise.all([
            loadGuests(),
            loadGroups(),
            loadTemplates(),
            loadSettings(),
            updateDashboard()
        ]);
    } catch (error) {
        showToast('Erro ao carregar dados: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function loadGuests() {
    try {
        const params = {
            page: currentPage,
            per_page: perPage,
            search: searchQuery,
            status: statusFilter,
            group_id: groupFilter
        };
        
        const data =await api.getGuests(params);
        guests = data.guests;
        totalPages = data.pages;
        
        renderGuestsTable();
        renderPagination();
    } catch (error) {
        showToast('Erro ao carregar convidados: ' + error.message, 'error');
    }
}

async function loadGroups() {
    try {
        groups = await api.getGroups();
        renderGroupsSelect();
        renderGroupsList();
    } catch (error) {
        console.error('Error loading groups:', error);
    }
}

async function loadTemplates() {
    try {
        templates = await api.getTemplates();
        renderTemplatesSelect();
        renderTemplatesList();
    } catch (error) {
        console.error('Error loading templates:', error);
    }
}

async function updateDashboard() {
    try {
        const stats = await api.getStats();
        
        document.getElementById('total-guests').textContent = stats.total_guests;
        document.getElementById('sent-invitations').textContent = stats.sent;
        document.getElementById('pending-invitations').textContent = stats.pending;
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// ===== Tab Navigation =====
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.getAttribute('data-tab');
            switchTab(tabName);
        });
    });
}

function switchTab(tabName) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-tab') === tabName) {
            btn.classList.add('active');
        }
    });
    
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
}

// ===== Guest Management =====
function renderGuestsTable() {
    const tbody = document.getElementById('guests-table-body');
    const emptyState = document.getElementById('empty-state');
    
    if (guests.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    tbody.innerHTML = guests.map(guest => `
        <tr>
            <td>${guest.name}</td>
            <td>${guest.phone}</td>
            <td>${guest.group_name || '-'}</td>
            <td>
                <span class="status-badge ${guest.status === 'sent' ? 'status-sent' : guest.status === 'failed' ? 'status-failed' : 'status-pending'}">
                    ${guest.status === 'sent' ? '✅ Enviado' : guest.status === 'failed' ? '❌ Falhou' : '⏳ Pendente'}
                </span>
            </td>
            <td class="table-actions">
                <button class="btn btn-sm btn-secondary" onclick="editGuest(${guest.id})">
                    ✏️
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteGuest(${guest.id})">
                    🗑️
                </button>
            </td>
        </tr>
    `).join('');
}

async function openAddGuestModal() {
    currentEditingId = null;
    document.getElementById('modal-title').textContent = 'Adicionar Convidado';
    document.getElementById('guest-name').value = '';
    document.getElementById('guest-phone').value = '';
    document.getElementById('guest-group').value = '';
    document.getElementById('guest-modal').classList.add('active');
}

async function editGuest(id) {
    currentEditingId = id;
    const guest = guests.find(g => g.id === id);
    
    if (!guest) return;
    
    document.getElementById('modal-title').textContent = 'Editar Convidado';
    document.getElementById('guest-name').value = guest.name;
    document.getElementById('guest-phone').value = guest.phone;
    document.getElementById('guest-group').value = guest.group_id || '';
    document.getElementById('guest-modal').classList.add('active');
}

function closeGuestModal() {
    document.getElementById('guest-modal').classList.remove('active');
    currentEditingId = null;
}

async function saveGuest() {
    const name = document.getElementById('guest-name').value.trim();
    const phone = document.getElementById('guest-phone').value.trim();
    const group_id = document.getElementById('guest-group').value || null;
    
    if (!name || !phone) {
        showToast('Por favor, preencha todos os campos obrigatórios', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        const data = {name, phone, group_id: group_id ? parseInt(group_id) : null};
        
        if (currentEditingId) {
            await api.updateGuest(currentEditingId, data);
            showToast('Convidado atualizado com sucesso!', 'success');
        } else {
            await api.createGuest(data);
            showToast('Convidado adicionado com sucesso!', 'success');
        }
        
        await loadGuests();
        await updateDashboard();
        closeGuestModal();
    } catch (error) {
        showToast('Erro ao salvar convidado: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function deleteGuest(id) {
    if (!confirm('Tem certeza que deseja excluir este convidado?')) return;
    
    showLoading(true);
    
    try {
        await api.deleteGuest(id);
        showToast('Convidado excluído com sucesso!', 'success');
        await loadGuests();
        await updateDashboard();
    } catch (error) {
        showToast('Erro ao excluir convidado: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// ===== Search & Filters =====
function setupEventListeners() {
    const searchInput = document.getElementById('search-input');
    const statusSelect = document.getElementById('status-filter');
    const groupSelect = document.getElementById('group-filter');
    
    if (searchInput) {
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                searchQuery = e.target.value;
                currentPage = 1;
                loadGuests();
            }, 500);
        });
    }
    
    if (statusSelect) {
        statusSelect.addEventListener('change', (e) => {
            statusFilter = e.target.value;
            currentPage = 1;
            loadGuests();
        });
    }
    
    if (groupSelect) {
        groupSelect.addEventListener('change', (e) => {
            groupFilter = e.target.value;
            currentPage = 1;
            loadGuests();
        });
    }
}

// ===== Pagination =====
function renderPagination() {
    const container = document.getElementById('pagination');
    if (!container) return;
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let html = '<div class="pagination-controls">';
    
    // Previous button
    html += `<button class="btn btn-sm btn-secondary" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">❮ Anterior</button>`;
    
    // Page numbers
    html += '<span class="page-info">Página ' + currentPage + ' de ' + totalPages + '</span>';
    
    // Next button
    html += `<button class="btn btn-sm btn-secondary" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">Próxima ❯</button>`;
    
    html += '</div>';
    container.innerHTML = html;
}

async function changePage(page) {
    if (page < 1 || page > totalPages) return;
    currentPage = page;
    await loadGuests();
}

// ===== Excel Import/Export =====
async function importFromExcel(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    showLoading(true);
    
    try {
        const result = await api.importGuests(file);
        showToast(result.message, 'success');
        await loadGuests();
        await updateDashboard();
    } catch (error) {
        showToast('Erro ao importar: ' + error.message, 'error');
    } finally {
        showLoading(false);
        event.target.value = '';
    }
}

async function exportToExcel() {
    try {
        showLoading(true);
        const blob = await api.exportGuests();
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `convidados-${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        showToast('Lista exportada com sucesso!', 'success');
    } catch (error) {
        showToast('Erro ao exportar: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// ===== Groups Management =====
function renderGroupsSelect() {
    const select = document.getElementById('guest-group');
    const filter = document.getElementById('group-filter');
    
    const options = '<option value="">Nenhum grupo</option>' + 
        groups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
    
    if (select) select.innerHTML = options;
    if (filter) filter.innerHTML = '<option value="">Todos os grupos</option>' + 
        groups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
}

function renderGroupsList() {
    const container = document.getElementById('groups-list');
    if (!container) return;
    
    if (groups.length === 0) {
        container.innerHTML = '<p class="empty-message">Nenhum grupo criado</p>';
        return;
    }
    
    container.innerHTML = groups.map(group => `
        <div class="group-card">
            <h3>${group.name}</h3>
            <p>${group.description || 'Sem descrição'}</p>
            <p class="group-count">${group.guest_count} convidado(s)</p>
            <div class="group-actions">
                <button class="btn btn-sm btn-secondary" onclick="editGroup(${group.id})">Editar</button>
                <button class="btn btn-sm btn-danger" onclick="deleteGroup(${group.id})">Excluir</button>
            </div>
        </div>
    `).join('');
}

async function createGroup() {
    const name = prompt('Nome do grupo:');
    if (!name) return;
    
    const description = prompt('Descrição (opcional):');
    
    showLoading(true);
    
    try {
        await api.createGroup({name, description: description || ''});
        showToast('Grupo criado com sucesso!', 'success');
        await loadGroups();
    } catch (error) {
        showToast('Erro ao criar grupo: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function deleteGroup(id) {
    if (!confirm('Excluir este grupo? Os convidados não serão excluídos.')) return;
    
    showLoading(true);
    
    try {
        await api.deleteGroup(id);
        showToast('Grupo excluído!', 'success');
        await loadGroups();
        await loadGuests();
    } catch (error) {
        showToast('Erro ao excluir grupo: '+ error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// ===== Templates Management =====
function renderTemplatesSelect() {
    const select = document.getElementById('template-select');
    if (!select) return;
    
    select.innerHTML = templates.map(t => 
        `<option value="${t.id}" ${t.is_default ? 'selected' : ''}>${t.name}</option>`
    ).join('');
}

function renderTemplatesList() {
    const container = document.getElementById('templates-list');
    if (!container) return;
    
    if (templates.length === 0) {
        container.innerHTML = '<p class="empty-message">Nenhum template criado. Clique em "Criar Template" para adicionar um.</p>';
        return;
    }
    
    container.innerHTML = templates.map(t => `
        <div class="template-card ${t.is_default ? 'default-template' : ''}">
            <h3>${t.name} ${t.is_default ? '⭐' : ''}</h3>
            <div class="template-actions">
                <button class="btn btn-sm btn-secondary" onclick="loadTemplate(${t.id})">Usar</button>
                <button class="btn btn-sm btn-secondary" onclick="editTemplate(${t.id})">Editar</button>
                <button class="btn btn-sm btn-danger" onclick="deleteTemplate(${t.id})" ${t.is_default ? 'disabled' : ''}>Excluir</button>
            </div>
        </div>
    `).join('');
}

async function loadTemplate(id) {
    const template = templates.find(t => t.id === parseInt(id));
    if (!template) return;
    
    document.getElementById('message-template').value = template.content;
    updateMessagePreview();
    showToast(`Template "${template.name}" carregado`, 'success');
}

// Template Modal Management
function openAddTemplateModal() {
    currentEditingTemplateId = null;
    document.getElementById('template-modal-title').textContent = 'Criar Template';
    document.getElementById('template-name-input').value = '';
    document.getElementById('template-content-input').value = '';
    document.getElementById('template-default-checkbox').checked = false;
    document.getElementById('template-modal').classList.add('active');
}

function closeTemplateModal() {
    document.getElementById('template-modal').classList.remove('active');
    currentEditingTemplateId = null;
}

async function editTemplate(id) {
    const template = templates.find(t => t.id === id);
    if (!template) return;
    
    currentEditingTemplateId = id;
    document.getElementById('template-modal-title').textContent = 'Editar Template';
    document.getElementById('template-name-input').value = template.name;
    document.getElementById('template-content-input').value = template.content;
    document.getElementById('template-default-checkbox').checked = template.is_default;
    document.getElementById('template-modal').classList.add('active');
}

async function saveTemplate() {
    const name = document.getElementById('template-name-input').value.trim();
    const content = document.getElementById('template-content-input').value.trim();
    const isDefault = document.getElementById('template-default-checkbox').checked;
    
    if (!name || !content) {
        showToast('Por favor, preencha nome e conteúdo do template', 'error');
        return;
    }
    
    showLoading(true);
    
    try {
        if (currentEditingTemplateId) {
            await api.updateTemplate(currentEditingTemplateId, {name, content, is_default: isDefault});
            showToast('Template atualizado!', 'success');
        } else {
            await api.createTemplate({name, content, is_default: isDefault});
            showToast('Template criado!', 'success');
        }
        
        await loadTemplates();
        closeTemplateModal();
    } catch (error) {
        showToast('Erro ao salvar template: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

async function saveAsTemplate() {
    const content = document.getElementById('message-template').value;
    
    document.getElementById('template-name-input').value = '';
    document.getElementById('template-content-input').value = content;
    document.getElementById('template-default-checkbox').checked = false;
    
    openAddTemplateModal();
}

async function deleteTemplate(id) {
    if (!confirm('Excluir este template?')) return;
    
    showLoading(true);
    
    try {
        await api.deleteTemplate(id);
        showToast('Template excluído!', 'success');
        await loadTemplates();
    } catch (error) {
        showToast('Erro: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// ===== Message Preview =====
function updateMessagePreview() {
    const template = document.getElementById('message-template').value;
    const preview = document.getElementById('message-preview');
    
    const sampleName = 'Maria';
    const previewMessage = template.replace(/{nome}/g, sampleName);
    
    if (preview) preview.textContent = previewMessage;
}

// ===== Direct Sending =====
// ===== Direct Sending =====
// ===== Scheduling =====
async function openScheduleModal() {
    const totalGuests = guests.length;
    
    if (totalGuests === 0) {
        showToast('Nenhum convidado encontrado para agendar', 'error');
        return;
    }
    
    // Populate template select
    const select = document.getElementById('schedule-template-select');
    select.innerHTML = templates.map(t => 
        `<option value="${t.id}" ${t.is_default ? 'selected' : ''}>${t.name}</option>`
    ).join('');
    
    // Set default time to tomorrow 10am
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(10, 0, 0, 0);
    
    // Helper to format for datetime-local (YYYY-MM-DDTHH:mm)
    const toLocalISOString = (date) => {
        const pad = (n) => n.toString().padStart(2, '0');
        return date.getFullYear() +
            '-' + pad(date.getMonth() + 1) +
            '-' + pad(date.getDate()) +
            'T' + pad(date.getHours()) +
            ':' + pad(date.getMinutes());
    };
    
    document.getElementById('schedule-datetime').value = toLocalISOString(tomorrow);
    
    document.getElementById('schedule-modal').classList.add('active');
}

function closeScheduleModal() {
    document.getElementById('schedule-modal').classList.remove('active');
}

async function confirmSchedule() {
    const datetimeStr = document.getElementById('schedule-datetime').value;
    const templateId = document.getElementById('schedule-template-select').value;
    
    if (!datetimeStr) {
        showToast('Selecione data e hora', 'error');
        return;
    }
    
    // Convert to ISO string with timezone (browser local time)
    const scheduledTime = new Date(datetimeStr).toISOString();
    
    showLoading(true);
    
    try {
        const filters = {
            search: searchQuery,
            status: statusFilter,
            group_id: groupFilter
        };
        
        await api.scheduleSend({
            scheduled_time: scheduledTime,
            template_id: parseInt(templateId),
            filters: filters, 
            group_id: groupFilter // Keep group_id optimize if only filter
        });
        
        showToast('Envio agendado com sucesso!', 'success');
        closeScheduleModal();
    } catch (error) {
        showToast('Erro ao agendar: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// ===== Direct Sending =====
async function sendNow() {
    const totalGuests = guests.length; // Approximate count on current page, but applicable if filtering
    
    if (totalGuests === 0) {
        showToast('Nenhum convidado encontrado para enviar', 'error');
        return;
    }
    
    let confirmMsg = 'Confirmar envio IMEDIATO para todos os convidados listados?';
    if (searchQuery || statusFilter || groupFilter) {
        confirmMsg = 'Atenção: enviando para TODOS os convidados do filtro atual (visíveis e não visíveis). Continuar?';
    }
    
    if (!confirm(confirmMsg)) return;
    
    const templateId = document.getElementById('template-select')?.value || templates.find(t => t.is_default)?.id;
    
    showLoading(true);
    
    try {
        const filters = {
            search: searchQuery,
            status: statusFilter,
            group_id: groupFilter
        };
        
        const result = await api.sendDirect({filters: filters, template_id: parseInt(templateId)});
        showToast(result.message, 'success');
        await loadGuests();
        await updateDashboard();
    } catch (error) {
        showToast('Erro ao enviar: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// ===== Image Upload =====
// ===== Image Upload =====
async function uploadImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    // Show local preview immediately
    const reader = new FileReader();
    reader.onload = function(e) {
        const preview = document.getElementById('image-preview');
        const container = document.getElementById('image-preview-container');
        if (preview && container) {
            preview.src = e.target.result;
            container.style.display = 'block';
        }
    };
    reader.readAsDataURL(file);
    
    showLoading(true);
    
    try {
        const result = await api.uploadImage(file);
        showToast('Imagem enviada com sucesso!', 'success');
        
        // Update settings path
        document.getElementById('image-path').value = result.path;
    } catch (error) {
        showToast('Erro ao enviar imagem: ' + error.message, 'error');
    } finally {
        showLoading(false);
        event.target.value = '';
    }
}

// ===== Settings =====
async function loadSettings() {
    try {
        const settings = await api.getSettings();
        console.log('DEBUG: Loaded Settings:', settings);
        
        document.getElementById('server-url').value = settings.evolution_api_url || '';
        document.getElementById('session-id').value = settings.evolution_session_id || '';
        document.getElementById('api-key').value = settings.evolution_api_key || '';
        document.getElementById('image-path').value = settings.image_path || '';
    } catch (error) {
        console.error('Error loading settings:', error);
    }
}

async function saveSettings() {
    const settings = {
        evolution_api_url: document.getElementById('server-url').value,
        evolution_session_id: document.getElementById('session-id').value,
        evolution_api_key: document.getElementById('api-key').value,
        image_path: document.getElementById('image-path').value
    };
    
    showLoading(true);
    
    try {
        await api.updateSettings(settings);
        showToast('Configurações salvas!', 'success');
    } catch (error) {
        showToast('Erro ao salvar: ' + error.message, 'error');
    } finally {
        showLoading(false);
    }
}

// ===== Utility Functions =====
function showLoading(show) {
    const loader = document.getElementById('loading-overlay');
    if (loader) {
        loader.style.display = show ? 'flex' : 'none';
    }
}

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type}`;
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ===== Keyboard Shortcuts =====
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeGuestModal();
    }
    
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        const activeTab = document.querySelector('.tab-content.active');
        if (activeTab && activeTab.id === 'message-tab') {
            e.preventDefault();
            saveAsTemplate();
        }
    }
});
