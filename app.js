import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBKBfZ6ieEAOiCXTZ1vw5AtM68b9-1I9UI",
  authDomain: "manger-388f0.firebaseapp.com",
  projectId: "manger-388f0",
  storageBucket: "manger-388f0.firebasestorage.app",
  messagingSenderId: "1066012262715",
  appId: "1:1066012262715:web:3e48e3b0885ea81503b71e"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
        // Currency symbols
        const currencySymbols = {
            DZD: { symbol: 'د.ج', name: 'دينار جزائري', position: 'after' },
            USD: { symbol: '$', name: 'US Dollar', position: 'before' },
            EUR: { symbol: '€', name: 'Euro', position: 'after' },
            GBP: { symbol: '£', name: 'British Pound', position: 'before' },
            CNY: { symbol: '¥', name: '人民币', position: 'before' },
            SAR: { symbol: 'ر.س', name: 'ريال سعودي', position: 'after' }
        };
        
        // Data
        let debts = [];
        let clients = [];
        let settings = { darkMode: false, currency: 'DZD' };
        let currentDebtId = null;
        
        // Load data from localStorage
        function loadData() {
            const savedDebts = localStorage.getItem('debts');
            const savedClients = localStorage.getItem('clients');
            const savedSettings = localStorage.getItem('settings');
            
            if (savedDebts) debts = JSON.parse(savedDebts);
            if (savedClients) clients = JSON.parse(savedClients);
            if (savedSettings) {
                settings = {...settings, ...JSON.parse(savedSettings)};
            }
        }
        
        // Format currency
        function formatCurrency(amount) {
            const currency = currencySymbols[settings.currency || 'DZD'];
            const formatted = parseFloat(amount).toLocaleString();
            
            if (currency.position === 'before') {
                return `${currency.symbol}${formatted}`;
            } else {
                return `${formatted} ${currency.symbol}`;
            }
        }
        
        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
            loadData();
            loadSettings();
            updateDashboard();
            renderDebts();
            renderClients();
            
            document.getElementById('debt-form').addEventListener('submit', saveDebt);
            document.getElementById('edit-debt-form').addEventListener('submit', saveDebtEdit);
            document.getElementById('client-form').addEventListener('submit', saveClient);
            document.getElementById('payment-form').addEventListener('submit', processPartialPayment);
            document.getElementById('import-input').addEventListener('change', handleImport);
            
            document.addEventListener('click', function(e) {
                if (!e.target.closest('.global-search-box')) {
                    document.getElementById('search-results').classList.remove('show');
                }
                if (!e.target.closest('.client-search-container')) {
                    document.getElementById('client-search-dropdown').classList.remove('show');
                }
            });
        });
        
        // محسن: البحث العام مع عرض معلومات الدين
        function performGlobalSearch() {
            const query = document.getElementById('global-search').value.toLowerCase();
            const resultsContainer = document.getElementById('search-results');
            
            if (query.length < 2) {
                resultsContainer.classList.remove('show');
                return;
            }
            
            let results = [];
            
            // البحث في العملاء
            clients.forEach(client => {
                if (client.name.toLowerCase().includes(query)) {
                    const clientDebts = debts.filter(d => d.clientId === client.id);
                    const totalDebt = clientDebts.reduce((sum, d) => sum + d.amount, 0);
                    const totalPaid = clientDebts.reduce((sum, d) => sum + (d.paidAmount || 0), 0);
                    const remaining = totalDebt - totalPaid;
                    
                    results.push({
                        type: 'client',
                        icon: 'person',
                        title: client.name,
                        subtitle: `عدد الديون: ${clientDebts.length}`,
                        details: {
                            totalDebt: formatCurrency(totalDebt),
                            paid: formatCurrency(totalPaid),
                            remaining: formatCurrency(remaining)
                        },
                        action: () => { openClientProfile(client.id); }
                    });
                }
            });
            
            // البحث في الديون
            debts.forEach(debt => {
                if (debt.name.toLowerCase().includes(query)) {
                    const remaining = debt.amount - (debt.paidAmount || 0);
                    results.push({
                        type: 'debt',
                        icon: 'account_balance_wallet',
                        title: debt.name,
                        subtitle: formatCurrency(debt.amount),
                        details: {
                            totalDebt: formatCurrency(debt.amount),
                            paid: formatCurrency(debt.paidAmount || 0),
                            remaining: formatCurrency(remaining)
                        },
                        action: () => { 
                            navigateTo('debts'); 
                            document.getElementById('debts-search').value = debt.name;
                            filterDebts(); 
                        }
                    });
                }
            });
            
            if (results.length === 0) {
                resultsContainer.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-tertiary);">لا توجد نتائج</div>';
            } else {
                resultsContainer.innerHTML = results.slice(0, 10).map((result, index) => `
                    <div class="search-result-item" onclick="searchResultsClick(${index})">
                        <div class="search-result-header">
                            <div class="search-result-icon"><i class="material-icons">${result.icon}</i></div>
                            <div class="search-result-title">${result.title}</div>
                            <span class="search-result-type">${result.type === 'client' ? 'عميل' : 'دين'}</span>
                        </div>
                        <div style="color: var(--text-secondary); font-size: 13px;">${result.subtitle}</div>
                        ${result.details ? `
                        <div class="search-result-details">
                            <div class="search-result-detail">
                                <div class="search-result-detail-label">إجمالي الديون</div>
                                <div class="search-result-detail-value">${result.details.totalDebt}</div>
                            </div>
                            <div class="search-result-detail">
                                <div class="search-result-detail-label">المدفوع</div>
                                <div class="search-result-detail-value" style="color: var(--success-color);">${result.details.paid}</div>
                            </div>
                            <div class="search-result-detail">
                                <div class="search-result-detail-label">المتبقي</div>
                                <div class="search-result-detail-value" style="color: var(--danger-color);">${result.details.remaining}</div>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                `).join('');
                window.searchResults = results;
            }
            
            resultsContainer.classList.add('show');
        }
        
        function searchResultsClick(index) {
            document.getElementById('search-results').classList.remove('show');
            document.getElementById('global-search').value = '';
            if (window.searchResults && window.searchResults[index]) {
                window.searchResults[index].action();
            }
        }
        
        // محسن: البحث عن العميل عند إضافة دين
        function searchClientForDebt() {
            const query = document.getElementById('client-search-input').value.toLowerCase();
            const dropdown = document.getElementById('client-search-dropdown');
            
            if (query.length === 0) {
                dropdown.classList.remove('show');
                return;
            }
            
            const filtered = clients.filter(c => c.name.toLowerCase().includes(query));
            
            if (filtered.length === 0) {
                dropdown.innerHTML = '<div style="padding: 14px; text-align: center; color: var(--text-tertiary);">لا يوجد عملاء</div>';
            } else {
                dropdown.innerHTML = filtered.map(client => {
                    const clientDebts = debts.filter(d => d.clientId === client.id);
                    const totalDebt = clientDebts.reduce((sum, d) => sum + d.amount, 0);
                    const totalPaid = clientDebts.reduce((sum, d) => sum + (d.paidAmount || 0), 0);
                    const remaining = totalDebt - totalPaid;
                    
                    return `
                        <div class="client-option" onclick="selectClientForDebt(${client.id}, '${client.name}')">
                            <div class="client-option-name">${client.name}</div>
                            <div class="client-option-info">
                                <span class="client-option-debts">الديون: ${formatCurrency(totalDebt)}</span>
                                <span class="client-option-paid">المدفوع: ${formatCurrency(totalPaid)}</span>
                                <span>المتبقي: ${formatCurrency(remaining)}</span>
                            </div>
                        </div>
                    `;
                }).join('');
            }
            
            dropdown.classList.add('show');
        }
        
        function selectClientForDebt(clientId, clientName) {
            document.getElementById('debt-client-id').value = clientId;
            document.getElementById('client-search-input').value = clientName;
            document.getElementById('client-search-dropdown').classList.remove('show');
        }
        
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', function() {
                navigateTo(this.dataset.section);
            });
        });
        
        function navigateTo(section) {
            document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
            document.querySelector(`[data-section="${section}"]`)?.classList.add('active');
            
            document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
            document.getElementById(section + '-section')?.classList.add('active');
            
            const titles = { 
                dashboard: 'لوحة التحكم', 
                debts: 'ديون المحل', 
                clients: 'إدارة العملاء', 
                'client-profile': 'ملف العميل', 
                settings: 'الإعدادات' 
            };
            document.getElementById('page-title').textContent = titles[section] || section;
            
            document.getElementById('sidebar').classList.remove('active');
        }
        
        function toggleSidebar() {
            document.getElementById('sidebar').classList.toggle('active');
        }
        
        // Settings
        function loadSettings() {
            if (settings.darkMode) {
                document.documentElement.setAttribute('data-mode', 'dark');
                document.getElementById('dark-mode-toggle').checked = true;
                document.getElementById('theme-icon').textContent = 'light_mode';
            }
            
            if (!settings.currency) {
                settings.currency = 'DZD';
            }
            updateCurrencyButtons();
        }
        
        function toggleDarkMode() {
            settings.darkMode = !settings.darkMode;
            
            document.documentElement.removeAttribute('data-mode');
            if (settings.darkMode) {
                document.documentElement.setAttribute('data-mode', 'dark');
            }
            
            document.getElementById('dark-mode-toggle').checked = settings.darkMode;
            document.getElementById('theme-icon').textContent = settings.darkMode ? 'light_mode' : 'dark_mode';
            saveSettings();
        }
        
        function selectCurrency(currency) {
            settings.currency = currency;
            saveSettings();
            updateCurrencyButtons();
            renderDebts();
            updateDashboard();
            renderClients();
            
            const currencyData = currencySymbols[currency];
            showToast(`${currencyData.name} (${currencyData.symbol})`);
        }
        
        function updateCurrencyButtons() {
            document.querySelectorAll('.currency-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.currency === settings.currency) {
                    btn.classList.add('active');
                }
            });
        }
        
        function saveSettings() {
            localStorage.setItem('settings', JSON.stringify(settings));
        }
        
        // Debts
        function openDebtModal() {
            if (clients.length === 0) {
                showToast('يجب إضافة عميل أولاً من قسم العملاء 👤');
                navigateTo('clients');
                return;
            }
            document.getElementById('client-search-input').value = '';
            document.getElementById('debt-client-id').value = '';
            document.getElementById('debt-modal').classList.add('active');
        }
        
        function saveDebt(e) {
            e.preventDefault();
            
            const clientId = document.getElementById('debt-client-id').value;
            if (!clientId) {
                showToast('يجب اختيار عميل أولاً');
                return;
            }
            
            const client = clients.find(c => c.id == clientId);
            if (!client) {
                showToast('العميل غير موجود!');
                return;
            }
            
            debts.push({
                id: Date.now(),
                clientId: parseInt(clientId),
                name: client.name,
                amount: parseFloat(document.getElementById('debt-amount').value),
                paidAmount: 0,
                notes: document.getElementById('debt-notes').value,
                date: new Date().toISOString(),
                paid: false,
                payments: []
            });
            saveDebts();
            closeModal('debt-modal');
            document.getElementById('debt-form').reset();
            renderDebts();
            updateDashboard();
            showToast('تم إضافة الدين 💰');
        }
        
        function saveDebts() {
            localStorage.setItem('debts', JSON.stringify(debts));
            document.getElementById('debts-count').textContent = debts.length;
        }
        
        function renderDebts() {
            const tbody = document.getElementById('debts-tbody');
            const emptyState = document.getElementById('debts-empty');
            
            const unpaidDebtsArr = debts.filter(d => !d.paid);
            const paidDebtsArr = debts.filter(d => d.paid);
            
            const unpaidTotal = unpaidDebtsArr.reduce((sum, d) => sum + (d.amount - (d.paidAmount || 0)), 0);
            const paidTotal = paidDebtsArr.reduce((sum, d) => sum + d.amount, 0) + unpaidDebtsArr.reduce((sum, d) => sum + (d.paidAmount || 0), 0);
            
            document.getElementById('unpaid-debts').textContent = formatCurrency(unpaidTotal);
            document.getElementById('paid-debts').textContent = formatCurrency(paidTotal);
            
            if (debts.length === 0) {
                tbody.innerHTML = '';
                emptyState.style.display = 'block';
                document.getElementById('debts-table').style.display = 'none';
                return;
            }
            
            emptyState.style.display = 'none';
            document.getElementById('debts-table').style.display = 'table';
            
            tbody.innerHTML = debts.map(debt => {
                const remaining = debt.amount - (debt.paidAmount || 0);
                return `
                <tr>
                    <td><strong>${debt.name}</strong></td>
                    <td style="font-weight: 700;">${formatCurrency(debt.amount)}</td>
                    <td style="color: var(--success-color); font-weight: 600;">${formatCurrency(debt.paidAmount || 0)}</td>
                    <td style="color: ${remaining > 0 ? 'var(--danger-color)' : 'var(--success-color)'}; font-weight: 700;">${formatCurrency(remaining)}</td>
                    <td>${formatDate(debt.date)}</td>
                    <td><span class="badge ${debt.paid ? 'badge-success' : 'badge-warning'}">${debt.paid ? 'مدفوع' : 'غير مدفوع'}</span></td>
                    <td>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                            ${!debt.paid ? `
                            <button class="btn btn-warning btn-sm" onclick="openPaymentModal(${debt.id})"><i class="material-icons">payment</i></button>
                            <button class="btn btn-success btn-sm" onclick="markPaid(${debt.id})"><i class="material-icons">check</i></button>
                            ` : ''}
                            <button class="btn btn-secondary btn-sm" onclick="openEditDebtModal(${debt.id})"><i class="material-icons">edit</i></button>
                            <button class="btn btn-danger btn-sm" onclick="deleteDebt(${debt.id})"><i class="material-icons">delete</i></button>
                        </div>
                    </td>
                </tr>
            `}).join('');
            
            document.getElementById('debts-count').textContent = debts.length;
        }
        
        // محسن: تعديل الدين
        function openEditDebtModal(debtId) {
            currentDebtId = debtId;
            const debt = debts.find(d => d.id === debtId);
            if (!debt) return;
            
            document.getElementById('edit-debt-id').value = debtId;
            document.getElementById('edit-debt-amount').value = debt.amount;
            document.getElementById('edit-debt-paid').value = debt.paidAmount || 0;
            document.getElementById('edit-debt-notes').value = debt.notes || '';
            
            document.getElementById('edit-debt-modal').classList.add('active');
        }
        
        function saveDebtEdit(e) {
            e.preventDefault();
            
            const debtId = parseInt(document.getElementById('edit-debt-id').value);
            const debtIndex = debts.findIndex(d => d.id === debtId);
            
            if (debtIndex === -1) return;
            
            const newAmount = parseFloat(document.getElementById('edit-debt-amount').value);
            const newPaid = parseFloat(document.getElementById('edit-debt-paid').value);
            
            debts[debtIndex].amount = newAmount;
            debts[debtIndex].paidAmount = newPaid;
            debts[debtIndex].notes = document.getElementById('edit-debt-notes').value;
            debts[debtIndex].paid = newPaid >= newAmount;
            
            saveDebts();
            closeModal('edit-debt-modal');
            renderDebts();
            updateDashboard();
            
            const clientProfile = document.getElementById('client-profile-section');
            if (clientProfile.classList.contains('active')) {
                const clientId = clientProfile.dataset.clientId;
                if (clientId) openClientProfile(parseInt(clientId));
            }
            
            showToast('تم تحديث الدين ✓');
        }
        
        function openPaymentModal(debtId) {
            currentDebtId = debtId;
            const debt = debts.find(d => d.id === debtId);
            if (!debt) return;
            
            const remaining = debt.amount - (debt.paidAmount || 0);
            document.getElementById('payment-original').textContent = formatCurrency(debt.amount);
            document.getElementById('payment-paid').textContent = formatCurrency(debt.paidAmount || 0);
            document.getElementById('payment-remaining').textContent = formatCurrency(remaining);
            document.getElementById('payment-debt-id').value = debtId;
            document.getElementById('payment-amount').value = '';
            document.getElementById('payment-amount').max = remaining;
            
            document.getElementById('payment-modal').classList.add('active');
        }
        
        function processPartialPayment(e) {
            e.preventDefault();
            
            const amount = parseFloat(document.getElementById('payment-amount').value);
            const debtIndex = debts.findIndex(d => d.id === currentDebtId);
            if (debtIndex === -1) return;
            
            const debt = debts[debtIndex];
            const remaining = debt.amount - (debt.paidAmount || 0);
            
            if (amount > remaining) {
                showToast('المبلغ أكبر من المتبقي!');
                return;
            }
            
            debt.paidAmount = (debt.paidAmount || 0) + amount;
            debt.paid = debt.paidAmount >= debt.amount;
            
            if (!debt.payments) debt.payments = [];
            debt.payments.push({ amount: amount, date: new Date().toISOString() });
            
            saveDebts();
            closeModal('payment-modal');
            renderDebts();
            updateDashboard();
            
            const clientProfile = document.getElementById('client-profile-section');
            if (clientProfile.classList.contains('active')) {
                const clientId = clientProfile.dataset.clientId;
                if (clientId) openClientProfile(parseInt(clientId));
            }
            
            showToast(`تم دفع ${formatCurrency(amount)} 💵`);
        }
        
        function payFullAmount() {
            const debt = debts.find(d => d.id === currentDebtId);
            if (!debt) return;
            document.getElementById('payment-amount').value = debt.amount - (debt.paidAmount || 0);
        }
        
        function markPaid(id) {
            const index = debts.findIndex(d => d.id === id);
            if (index !== -1) {
                const debt = debts[index];
                const remaining = debt.amount - (debt.paidAmount || 0);
                debt.paidAmount = debt.amount;
                debt.paid = true;
                if (!debt.payments) debt.payments = [];
                debt.payments.push({ amount: remaining, date: new Date().toISOString() });
                saveDebts();
                renderDebts();
                updateDashboard();
                showToast('تم تحديد الدين كمدفوع ✅');
            }
        }
        
        function deleteDebt(id) {
            if (confirm('هل أنت متأكد من حذف هذا الدين؟')) {
                debts = debts.filter(d => d.id !== id);
                saveDebts();
                renderDebts();
                updateDashboard();
                showToast('تم حذف الدين');
            }
        }
        
        function filterDebts(searchQuery = null) {
            const search = searchQuery || document.getElementById('debts-search').value.toLowerCase();
            const filtered = debts.filter(debt => debt.name.toLowerCase().includes(search));
            renderFilteredDebts(filtered);
        }
        
        function filterDebtsByStatus(status) {
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            event.target.closest('.filter-btn').classList.add('active');
            const filtered = status === 'all' ? debts : status === 'paid' ? debts.filter(d => d.paid) : debts.filter(d => !d.paid);
            renderFilteredDebts(filtered);
        }
        
        function renderFilteredDebts(filtered) {
            const tbody = document.getElementById('debts-tbody');
            
            tbody.innerHTML = filtered.map(debt => {
                const remaining = debt.amount - (debt.paidAmount || 0);
                return `
                <tr>
                    <td><strong>${debt.name}</strong></td>
                    <td style="font-weight: 700;">${formatCurrency(debt.amount)}</td>
                    <td style="color: var(--success-color); font-weight: 600;">${formatCurrency(debt.paidAmount || 0)}</td>
                    <td style="color: ${remaining > 0 ? 'var(--danger-color)' : 'var(--success-color)'}; font-weight: 700;">${formatCurrency(remaining)}</td>
                    <td>${formatDate(debt.date)}</td>
                    <td><span class="badge ${debt.paid ? 'badge-success' : 'badge-warning'}">${debt.paid ? 'مدفوع' : 'غير مدفوع'}</span></td>
                    <td>
                        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                            ${!debt.paid ? `
                            <button class="btn btn-warning btn-sm" onclick="openPaymentModal(${debt.id})"><i class="material-icons">payment</i></button>
                            <button class="btn btn-success btn-sm" onclick="markPaid(${debt.id})"><i class="material-icons">check</i></button>
                            ` : ''}
                            <button class="btn btn-secondary btn-sm" onclick="openEditDebtModal(${debt.id})"><i class="material-icons">edit</i></button>
                            <button class="btn btn-danger btn-sm" onclick="deleteDebt(${debt.id})"><i class="material-icons">delete</i></button>
                        </div>
                    </td>
                </tr>
            `}).join('');
        }
        
        // Clients
        function openClientModal() {
            document.getElementById('client-modal').classList.add('active');
        }
        
        function saveClient(e) {
            e.preventDefault();
            clients.push({
                id: Date.now(),
                name: document.getElementById('client-name').value,
                notes: document.getElementById('client-notes').value,
                createdAt: new Date().toISOString()
            });
            saveClients();
            closeModal('client-modal');
            document.getElementById('client-form').reset();
            renderClients();
            updateDashboard();
            showToast('تم إضافة العميل 👤');
        }
        
        function saveClients() {
            localStorage.setItem('clients', JSON.stringify(clients));
            document.getElementById('clients-count').textContent = clients.length;
        }
        
        function renderClients() {
            const container = document.getElementById('clients-container');
            
            if (clients.length === 0) {
                container.innerHTML = '<div class="empty-state"><i class="material-icons">person_add</i><h3>لا يوجد عملاء</h3></div>';
                return;
            }
            
            container.innerHTML = clients.map(client => {
                const clientDebts = debts.filter(d => d.clientId === client.id);
                const totalDebt = clientDebts.reduce((sum, d) => sum + d.amount, 0);
                const totalPaid = clientDebts.reduce((sum, d) => sum + (d.paidAmount || 0), 0);
                const remaining = totalDebt - totalPaid;
                
                return `
                <div class="client-card">
                    <div class="client-header">
                        <div class="client-avatar">${client.name.charAt(0)}</div>
                        <div class="client-info">
                            <div class="client-name">${client.name}</div>
                        </div>
                    </div>
                    
                    <div class="client-stats">
                        <div class="client-stat">
                            <div class="client-stat-value">${clientDebts.length}</div>
                            <div class="client-stat-label">ديون</div>
                        </div>
                        <div class="client-stat">
                            <div class="client-stat-value" style="color: var(--warning-color);">${formatCurrency(remaining)}</div>
                            <div class="client-stat-label">متبقي</div>
                        </div>
                        <div class="client-stat">
                            <div class="client-stat-value" style="color: var(--success-color);">${formatCurrency(totalPaid)}</div>
                            <div class="client-stat-label">مدفوع</div>
                        </div>
                    </div>
                    
                    <div class="client-actions">
                        <button class="btn btn-primary" onclick="openClientProfile(${client.id})">
                            <i class="material-icons">visibility</i>عرض الملف
                        </button>
                        <button class="btn btn-danger" onclick="deleteClient(${client.id})">
                            <i class="material-icons">delete</i>حذف
                        </button>
                    </div>
                </div>
            `}).join('');
            
            document.getElementById('clients-count').textContent = clients.length;
        }
        
        function openClientProfile(clientId) {
            const client = clients.find(c => c.id === clientId);
            if (!client) return;
            
            const clientDebts = debts.filter(d => d.clientId === clientId);
            const totalDebt = clientDebts.reduce((sum, d) => sum + d.amount, 0);
            const totalPaid = clientDebts.reduce((sum, d) => sum + (d.paidAmount || 0), 0);
            const remaining = totalDebt - totalPaid;
            
            const allPayments = [];
            clientDebts.forEach(debt => {
                if (debt.payments) {
                    debt.payments.forEach(payment => {
                        allPayments.push({ ...payment, debtId: debt.id, debtNotes: debt.notes });
                    });
                }
            });
            allPayments.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            document.getElementById('client-profile-content').innerHTML = `
                <button class="btn btn-secondary" onclick="navigateTo('clients')" style="margin-bottom: 20px;">
                    <i class="material-icons">arrow_back</i>العودة للعملاء
                </button>
                
                <div class="client-book">
                    <div class="book-header">
                        <div class="book-header-content">
                            <div class="book-avatar">${client.name.charAt(0)}</div>
                            <div>
                                <h2 class="book-client-name">${client.name}</h2>
                            </div>
                        </div>
                        
                        <div class="book-stats-grid">
                            <div class="book-stat-card">
                                <div class="book-stat-value">${clientDebts.length}</div>
                                <div class="book-stat-label">عدد الديون</div>
                            </div>
                            <div class="book-stat-card">
                                <div class="book-stat-value">${formatCurrency(totalDebt)}</div>
                                <div class="book-stat-label">إجمالي الديون</div>
                            </div>
                            <div class="book-stat-card">
                                <div class="book-stat-value">${formatCurrency(totalPaid)}</div>
                                <div class="book-stat-label">إجمالي المدفوع</div>
                            </div>
                            <div class="book-stat-card">
                                <div class="book-stat-value">${formatCurrency(remaining)}</div>
                                <div class="book-stat-label">المتبقي</div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="book-content">
                        <div class="book-section">
                            <h3 class="book-section-title"><i class="material-icons">account_balance_wallet</i>دفتر الديون (${clientDebts.length})</h3>
                            ${clientDebts.length === 0 ? '<div class="empty-state" style="padding: 40px;"><i class="material-icons">check_circle</i><h3>لا توجد ديون مسجلة</h3></div>' : clientDebts.map(debt => {
                                const debtRemaining = debt.amount - (debt.paidAmount || 0);
                                return `
                                <div class="debt-book-item ${debt.paid ? 'paid' : ''}">
                                    <div class="debt-book-header">
                                        <div>
                                            <div class="debt-book-amount">${formatCurrency(debt.amount)}</div>
                                            <div class="debt-book-date">${formatDate(debt.date)}</div>
                                        </div>
                                        <span class="badge ${debt.paid ? 'badge-success' : 'badge-warning'}">${debt.paid ? 'مدفوع' : 'غير مدفوع'}</span>
                                    </div>
                                    ${debt.notes ? `<p style="color: var(--text-secondary); font-size: 13px; margin-top: 8px;">${debt.notes}</p>` : ''}
                                    <div class="debt-book-details">
                                        <div class="debt-book-detail">
                                            <div class="debt-book-detail-label">الأصلي</div>
                                            <div class="debt-book-detail-value">${formatCurrency(debt.amount)}</div>
                                        </div>
                                        <div class="debt-book-detail">
                                            <div class="debt-book-detail-label">المدفوع</div>
                                            <div class="debt-book-detail-value" style="color: var(--success-color);">${formatCurrency(debt.paidAmount || 0)}</div>
                                        </div>
                                        <div class="debt-book-detail">
                                            <div class="debt-book-detail-label">المتبقي</div>
                                            <div class="debt-book-detail-value" style="color: var(--danger-color);">${formatCurrency(debtRemaining)}</div>
                                        </div>
                                    </div>
                                    <div class="debt-book-actions">
                                        ${!debt.paid ? `
                                        <button class="btn btn-warning btn-sm" onclick="openPaymentModal(${debt.id})"><i class="material-icons">payment</i>دفع</button>
                                        <button class="btn btn-success btn-sm" onclick="markPaid(${debt.id})"><i class="material-icons">check</i>إكمال</button>
                                        ` : ''}
                                        <button class="btn btn-secondary btn-sm" onclick="openEditDebtModal(${debt.id})"><i class="material-icons">edit</i>تعديل</button>
                                        <button class="btn btn-danger btn-sm" onclick="deleteDebt(${debt.id})"><i class="material-icons">delete</i>حذف</button>
                                    </div>
                                </div>
                            `}).join('')}
                        </div>
                        
                        ${allPayments.length > 0 ? `
                        <div class="book-section">
                            <h3 class="book-section-title"><i class="material-icons">history</i>سجل المدفوعات (${allPayments.length})</h3>
                            ${allPayments.map(payment => `
                                <div class="payment-book-item">
                                    <div>
                                        <div class="payment-book-amount">+${formatCurrency(payment.amount)}</div>
                                        <div class="payment-book-date">${formatDateTime(payment.date)}</div>
                                    </div>
                                    <i class="material-icons" style="color: var(--success-color); font-size: 32px;">check_circle</i>
                                </div>
                            `).join('')}
                        </div>
                        ` : ''}
                        
                        ${client.notes ? `
                        <div class="book-section">
                            <h3 class="book-section-title"><i class="material-icons">note</i>ملاحظات</h3>
                            <p style="color: var(--text-secondary); line-height: 1.8; padding: 16px; background: var(--bg-tertiary); border-radius: var(--radius-md);">${client.notes}</p>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
            
            document.getElementById('client-profile-section').dataset.clientId = clientId;
            navigateTo('client-profile');
        }
        
        function deleteClient(id) {
            if (confirm('هل أنت متأكد من حذف هذا العميل؟ سيتم حذف جميع ديونه.')) {
                debts = debts.filter(d => d.clientId !== id);
                saveDebts();
                clients = clients.filter(c => c.id !== id);
                saveClients();
                renderClients();
                updateDashboard();
                showToast('تم حذف العميل');
            }
        }
        
        function filterClients() {
            const search = document.getElementById('clients-search').value.toLowerCase();
            const filtered = clients.filter(client => client.name.toLowerCase().includes(search));
            
            const container = document.getElementById('clients-container');
            if (filtered.length === 0) {
                container.innerHTML = '<div class="empty-state"><i class="material-icons">search</i><h3>لا توجد نتائج</h3></div>';
                return;
            }
            
            container.innerHTML = filtered.map(client => {
                const clientDebts = debts.filter(d => d.clientId === client.id);
                const totalDebt = clientDebts.reduce((sum, d) => sum + d.amount, 0);
                const totalPaid = clientDebts.reduce((sum, d) => sum + (d.paidAmount || 0), 0);
                const remaining = totalDebt - totalPaid;
                
                return `
                <div class="client-card">
                    <div class="client-header">
                        <div class="client-avatar">${client.name.charAt(0)}</div>
                        <div class="client-info">
                            <div class="client-name">${client.name}</div>
                        </div>
                    </div>
                    
                    <div class="client-stats">
                        <div class="client-stat">
                            <div class="client-stat-value">${clientDebts.length}</div>
                            <div class="client-stat-label">ديون</div>
                        </div>
                        <div class="client-stat">
                            <div class="client-stat-value" style="color: var(--warning-color);">${formatCurrency(remaining)}</div>
                            <div class="client-stat-label">متبقي</div>
                        </div>
                        <div class="client-stat">
                            <div class="client-stat-value" style="color: var(--success-color);">${formatCurrency(totalPaid)}</div>
                            <div class="client-stat-label">مدفوع</div>
                        </div>
                    </div>
                    
                    <div class="client-actions">
                        <button class="btn btn-primary" onclick="openClientProfile(${client.id})">
                            <i class="material-icons">visibility</i>عرض الملف
                        </button>
                        <button class="btn btn-danger" onclick="deleteClient(${client.id})">
                            <i class="material-icons">delete</i>حذف
                        </button>
                    </div>
                </div>
            `}).join('');
        }
        
        // Dashboard
        function updateDashboard() {
            document.getElementById('total-clients').textContent = clients.length;
            
            const totalDebtsAmount = debts.filter(d => !d.paid).reduce((sum, d) => sum + (d.amount - (d.paidAmount || 0)), 0);
            document.getElementById('total-debts').textContent = formatCurrency(totalDebtsAmount);
            
            const unpaidDebtsAmount = debts.filter(d => !d.paid).reduce((sum, d) => sum + (d.amount - (d.paidAmount || 0)), 0);
            document.getElementById('unpaid-debts-dashboard').textContent = formatCurrency(unpaidDebtsAmount);
            
            const paidDebtsAmount = debts.filter(d => d.paid).reduce((sum, d) => sum + d.amount, 0) + debts.filter(d => !d.paid).reduce((sum, d) => sum + (d.paidAmount || 0), 0);
            document.getElementById('paid-debts-dashboard').textContent = formatCurrency(paidDebtsAmount);
            
            const recent = debts.slice(-5).reverse();
            document.getElementById('recent-debts').innerHTML = recent.length === 0 ? '<div class="empty-state"><i class="material-icons">payments</i><h3>لا توجد ديون مسجلة</h3></div>' : `
                <div class="table-container">
                    <table class="table">
                        <thead><tr><th>الاسم</th><th>المبلغ</th><th>الحالة</th></tr></thead>
                        <tbody>
                            ${recent.map(debt => `
                                <tr>
                                    <td><strong>${debt.name}</strong></td>
                                    <td>${formatCurrency(debt.amount)}</td>
                                    <td><span class="badge ${debt.paid ? 'badge-success' : 'badge-warning'}">${debt.paid ? 'مدفوع' : 'غير مدفوع'}</span></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        }
        
        // Export/Import
        function exportData() {
            const data = { debts, clients, settings, exportDate: new Date().toISOString() };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `client_ledger_${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showToast('تم تصدير البيانات 📥');
        }
        
        function importData() {
            document.getElementById('import-input').click();
        }
        
        function handleImport(e) {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = function(event) {
                try {
                    const data = JSON.parse(event.target.result);
                    if (confirm('سيتم استبدال جميع البيانات. هل تريد المتابعة؟')) {
                        if (data.debts) { debts = data.debts; saveDebts(); }
                        if (data.clients) { clients = data.clients; saveClients(); }
                        if (data.settings) { settings = {...settings, ...data.settings}; saveSettings(); loadSettings(); }
                        
                        renderDebts();
                        renderClients();
                        updateDashboard();
                        showToast('تم استيراد البيانات 📤');
                    }
                } catch (error) {
                    showToast('خطأ في قراءة الملف ❌');
                }
            };
            reader.readAsText(file);
            e.target.value = '';
        }
        
        function clearAllData() {
            if (confirm('هل أنت متأكد من حذف جميع البيانات؟')) {
                debts = [];
                clients = [];
                localStorage.removeItem('debts');
                localStorage.removeItem('clients');
                renderDebts();
                renderClients();
                updateDashboard();
                showToast('تم حذف جميع البيانات');
            }
        }
        
        // Utilities
        function closeModal(id) {
            document.getElementById(id).classList.remove('active');
        }
        
        function formatDate(dateString) {
            return new Date(dateString).toLocaleDateString('ar-DZ', { year: 'numeric', month: 'short', day: 'numeric' });
        }
        
        function formatDateTime(dateString) {
            return new Date(dateString).toLocaleDateString('ar-DZ', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        }
        
        function showToast(message) {
            const toast = document.getElementById('toast');
            document.getElementById('toast-message').textContent = message;
            toast.classList.add('show');
            setTimeout(() => { toast.classList.remove('show'); }, 3000);
        }
        
        document.querySelectorAll('.modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', function(e) {
                if (e.target === this) this.classList.remove('active');
            });
        });
