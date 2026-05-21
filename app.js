// Data storage
let registros = [];
const dbName = 'HorarioDB';
const storeName = 'registros';

// DOM elements
const screens = document.querySelectorAll('.screen');
const navBtns = document.querySelectorAll('.nav-btn');
const modal = document.getElementById('modal');
const closeModal = document.querySelector('.close');
const form = document.getElementById('registro-form');
const toast = document.getElementById('toast');
const registrosList = document.getElementById('registros-list');
const searchInput = document.getElementById('search-input');
const filterBtns = document.querySelectorAll('.filter-btn');
const dateRange = document.getElementById('date-range');
const todayLabel = document.getElementById('today-label');
const summaryTotal = document.getElementById('summary-total');
const summaryToday = document.getElementById('summary-today');
const inicioAdd = document.getElementById('inicio-add');
const nomeList = document.getElementById('nome-list');

// Navigation
navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        const screen = btn.dataset.screen;
        showScreen(screen);
        navBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    });
});

function showScreen(screenId) {
    screens.forEach(screen => screen.classList.remove('active'));
    document.getElementById(screenId).classList.add('active');
    if (screenId === 'inicio') renderInicio();
    if (screenId === 'registros') renderRegistros();
}

// Modal
inicioAdd.addEventListener('click', () => openModal());
closeModal.addEventListener('click', () => closeModalFunc());
window.addEventListener('click', (e) => {
    if (e.target === modal) closeModalFunc();
});

function openModal(registro = null) {
    modal.style.display = 'block';
    if (registro) {
        document.getElementById('modal-title').textContent = 'Editar Registro';
        document.getElementById('data').value = registro.date;
        document.getElementById('nome').value = registro.name;
        document.getElementById('hora').value = registro.time;
        form.dataset.editId = registro.id;
    } else {
        document.getElementById('modal-title').textContent = 'Adicionar Registro';
        form.reset();
        delete form.dataset.editId;
    }
}

function closeModalFunc() {
    modal.style.display = 'none';
}

// Form submit
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
        id: form.dataset.editId || Date.now().toString(),
        date: document.getElementById('data').value,
        name: document.getElementById('nome').value,
        time: document.getElementById('hora').value
    };
    if (form.dataset.editId) {
        const index = registros.findIndex(r => r.id === form.dataset.editId);
        registros[index] = data;
    } else {
        registros.push(data);
    }
    await saveRegistros();
    closeModalFunc();
    updateNameSuggestions();
    renderInicio();
    showToast('Registro salvo com sucesso!');
    renderRegistros();
});

async function openDatabase() {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            reject(new Error('IndexedDB não suportado'));
            return;
        }

        const request = indexedDB.open(dbName, 1);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName, { keyPath: 'id' });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function loadRegistros() {
    try {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        // Fallback para localStorage
        return JSON.parse(localStorage.getItem('registros')) || [];
    }
}

async function saveRegistros() {
    try {
        const db = await openDatabase();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            store.clear();
            registros.forEach(reg => store.put(reg));
            tx.oncomplete = () => {
                // Salvar também em localStorage como backup
                localStorage.setItem('registros', JSON.stringify(registros));
                resolve();
            };
            tx.onerror = () => reject(tx.error);
        });
    } catch (error) {
        // Fallback para localStorage
        localStorage.setItem('registros', JSON.stringify(registros));
    }
}

function renderInicio() {
    updateNameSuggestions();
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    summaryTotal.textContent = registros.length;
    summaryToday.textContent = registros.filter(r => r.date === today).length;
}

function updateNameSuggestions() {
    const names = [...new Set(registros.map(r => r.name).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    nomeList.innerHTML = names.map(name => `<option value="${name}"></option>`).join('');
}

// Render registros
function renderRegistros() {
    registrosList.innerHTML = '';
    updateTodayLabel();

    const query = searchInput.value.toLowerCase();
    let filtered = registros.filter(r => r.name.toLowerCase().includes(query));
    const filter = document.querySelector('.filter-btn.active').dataset.filter;
    const now = new Date();

    if (filter === 'hoje') {
        const today = now.toISOString().split('T')[0];
        filtered = filtered.filter(r => r.date === today);
    } else if (filter === 'intervalo') {
        const start = document.getElementById('start-date').value;
        const end = document.getElementById('end-date').value;
        if (start && end) {
            filtered = filtered.filter(r => r.date >= start && r.date <= end);
        }
    }

    if (filtered.length === 0) {
        registrosList.innerHTML = `<div class="empty-state">Nenhum registro encontrado. Ajuste a pesquisa ou o filtro para ver resultados.</div>`;
        return;
    }

    // Function to get start of week (Monday)
    function getWeekStart(dateStr) {
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const weekStart = new Date(date.setDate(diff));
        return weekStart.toISOString().split('T')[0];
    }

    // Group by week
    const groupedByWeek = {};
    filtered.forEach(reg => {
        const weekStart = getWeekStart(reg.date);
        if (!groupedByWeek[weekStart]) {
            groupedByWeek[weekStart] = {};
        }
        if (!groupedByWeek[weekStart][reg.date]) {
            groupedByWeek[weekStart][reg.date] = [];
        }
        groupedByWeek[weekStart][reg.date].push(reg);
    });

    // Render by week
    const weeks = Object.keys(groupedByWeek).sort();
    
    weeks.forEach(weekStart => {
        const [wYear, wMonth, wDay] = weekStart.split('-').map(Number);
        const weekStartDate = new Date(wYear, wMonth - 1, wDay);
        const weekEndDate = new Date(weekStartDate);
        weekEndDate.setDate(weekEndDate.getDate() + 6);
        
        const weekStartFormatted = weekStartDate.toLocaleDateString('pt-BR');
        const weekEndFormatted = weekEndDate.toLocaleDateString('pt-BR');
        
        // Create week header
        const weekDiv = document.createElement('div');
        weekDiv.style.marginBottom = '15px';
        weekDiv.innerHTML = `<h2 style="background-color: #f0f0f0; padding: 8px; border-radius: 4px; font-size: 14px;">Semana: ${weekStartFormatted} até ${weekEndFormatted}</h2>`;
        registrosList.appendChild(weekDiv);
        
        // Render dates in week
        Object.keys(groupedByWeek[weekStart]).sort().forEach(date => {
            const dateDiv = document.createElement('div');
            dateDiv.innerHTML = `<h3>${formatDateWithWeekday(date)}</h3>`;
            groupedByWeek[weekStart][date].forEach(reg => {
                const card = document.createElement('div');
                card.className = 'card';
                card.innerHTML = `
                    <div>
                        <h4>${reg.name}</h4>
                        <p>${formatDateWithWeekday(reg.date)} · ${reg.time}</p>
                    </div>
                    <div class="actions">
                        <button onclick="editRegistro('${reg.id}')"><span class="material-icons icon-edit">edit</span></button>
                        <button onclick="deleteRegistro('${reg.id}')"><span class="material-icons icon-delete">delete</span></button>
                    </div>
                `;
                dateDiv.appendChild(card);
            });
            registrosList.appendChild(dateDiv);
        });
    });
}

function groupByDate(arr) {
    return arr.reduce((acc, reg) => {
        if (!acc[reg.date]) acc[reg.date] = [];
        acc[reg.date].push(reg);
        return acc;
    }, {});
}

function formatDate(dateStr) {
    const [year, month, day] = dateStr.split('-');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('pt-BR');
}

function updateTodayLabel() {
    const now = new Date();
    const dateString = now.toLocaleDateString('pt-BR');
    const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    todayLabel.textContent = `${dayNames[now.getDay()]} · ${dateString}`;
}

function formatDateWithWeekday(dateStr) {
    const [year, month, day] = dateStr.split('-');
    const date = new Date(year, month - 1, day);
    const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const weekday = dayNames[date.getDay()];
    const formattedDate = date.toLocaleDateString('pt-BR');
    return `${weekday} · ${formattedDate}`;
}

function editRegistro(id) {
    const reg = registros.find(r => r.id === id);
    openModal(reg);
}

function deleteRegistro(id) {
    if (confirm('Tem certeza que deseja excluir este registro?')) {
        registros = registros.filter(r => r.id !== id);
        saveRegistros();
        showToast('Registro excluído!');
        renderRegistros();
    }
}

// Busca integrada na tela de registros
searchInput.addEventListener('input', renderRegistros);
filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (btn.dataset.filter === 'intervalo') {
            dateRange.style.display = 'block';
        } else {
            dateRange.style.display = 'none';
        }
        renderRegistros();
    });
});

document.getElementById('start-date').addEventListener('change', renderRegistros);
document.getElementById('end-date').addEventListener('change', renderRegistros);

// PDF Download function
function downloadPDF() {
    const start = document.getElementById('start-date').value;
    const end = document.getElementById('end-date').value;
    
    if (!start || !end) {
        showToast('Por favor, selecione um intervalo de datas');
        return;
    }

    // Filter records for the selected date range
    const filtered = registros.filter(r => r.date >= start && r.date <= end);
    
    if (filtered.length === 0) {
        showToast('Nenhum registro encontrado neste período');
        return;
    }

    // Sort by date and then by name
    const sorted = filtered.sort((a, b) => {
        const [aYear, aMonth, aDay] = a.date.split('-').map(Number);
        const [bYear, bMonth, bDay] = b.date.split('-').map(Number);
        const dateA = new Date(aYear, aMonth - 1, aDay);
        const dateB = new Date(bYear, bMonth - 1, bDay);
        const dateCompare = dateA - dateB;
        if (dateCompare !== 0) return dateCompare;
        return a.name.localeCompare(b.name, 'pt-BR');
    });

    // Create HTML table for PDF - otimizado para mobile
    const dayNames = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    
    // Function to get start of week (Monday)
    function getWeekStart(dateStr) {
        const [year, month, day] = dateStr.split('-').map(Number);
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        const diff = date.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust when day is Sunday
        const weekStart = new Date(date.setDate(diff));
        return weekStart.toISOString().split('T')[0];
    }
    
    // Group records by week (Monday to Sunday)
    const groupedByWeek = {};
    sorted.forEach(reg => {
        const weekStart = getWeekStart(reg.date);
        if (!groupedByWeek[weekStart]) {
            groupedByWeek[weekStart] = {};
        }
        if (!groupedByWeek[weekStart][reg.date]) {
            groupedByWeek[weekStart][reg.date] = [];
        }
        groupedByWeek[weekStart][reg.date].push(reg);
    });
    
    let html = `
        <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 10px; }
            .week-section { margin-bottom: 20px; page-break-inside: avoid; }
            .week-header {
                background-color: #f0f0f0;
                padding: 8px;
                margin-bottom: 10px;
                border-radius: 4px;
                font-size: 11px;
                color: #666;
            }
            .date-section { margin-bottom: 12px; }
            .date-header { 
                text-align: center; 
                margin-bottom: 8px; 
                padding-bottom: 8px; 
                border-bottom: 2px solid #1565c0;
            }
            .date-header h1 { 
                margin: 0; 
                color: #1565c0; 
                font-size: 18px; 
                font-weight: bold; 
            }
            .records-container { display: flex; flex-direction: column; gap: 5px; }
            .record-item {
                padding: 6px 8px;
                border: 1px solid #ddd;
                border-radius: 4px;
                background-color: #f9f9f9;
                display: flex;
                gap: 15px;
                align-items: center;
            }
            .record-name { 
                font-size: 12px; 
                font-weight: bold; 
                min-width: 120px;
            }
            .record-time { 
                font-size: 12px; 
                color: #666;
            }
            .footer { 
                margin-top: 15px; 
                padding-top: 10px; 
                border-top: 1px solid #ddd; 
                text-align: center; 
                font-size: 9px; 
                color: #999;
            }
        </style>
    `;
    
    // Generate HTML for each week
    Object.keys(groupedByWeek).sort().forEach(weekStart => {
        const [wYear, wMonth, wDay] = weekStart.split('-').map(Number);
        const weekStartDate = new Date(wYear, wMonth - 1, wDay);
        const weekEndDate = new Date(weekStartDate);
        weekEndDate.setDate(weekEndDate.getDate() + 6);
        
        const weekStartFormatted = weekStartDate.toLocaleDateString('pt-BR');
        const weekEndFormatted = weekEndDate.toLocaleDateString('pt-BR');
        
        html += `
            <div class="week-section">
                <div class="week-header">
                    Semana: ${weekStartFormatted} até ${weekEndFormatted}
                </div>
        `;
        
        // Generate HTML for each date in the week
        Object.keys(groupedByWeek[weekStart]).sort().forEach(date => {
            const [year, month, day] = date.split('-');
            const dateObj = new Date(year, month - 1, day);
            const weekday = dayNames[dateObj.getDay()];
            const formattedDate = dateObj.toLocaleDateString('pt-BR');
            
            html += `
                <div class="date-section">
                    <div class="date-header">
                        <h1><strong>${weekday}</strong> · <strong>${formattedDate}</strong></h1>
                    </div>
                    <div class="records-container">
            `;
            
            groupedByWeek[weekStart][date].forEach(reg => {
                html += `
                    <div class="record-item">
                        <span class="record-name">${reg.name}</span>
                        <span class="record-time">${reg.time}</span>
                    </div>
                `;
            });
            
            html += `
                    </div>
                </div>
            `;
        });
        
        html += `
            </div>
        `;
    });
    
    html += `
        <div class="footer">
            <p>Gerado em: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
        </div>
    `;

    // Generate PDF
    const element = document.createElement('div');
    element.innerHTML = html;
    
    const options = {
        margin: 10,
        filename: `registros_${start}_${end}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };

    html2pdf().set(options).from(element).save();
    showToast('PDF baixado com sucesso!');
}

// Add event listener for PDF download button
const downloadPdfBtn = document.getElementById('download-pdf');
if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener('click', downloadPDF);
}

// Toast
function showToast(message) {
    toast.textContent = message;
    toast.style.display = 'block';
    setTimeout(() => toast.style.display = 'none', 3000);
}

async function initializeApp() {
    registros = await loadRegistros();
    renderInicio();
    renderRegistros();
    updateNameSuggestions();
}

initializeApp();