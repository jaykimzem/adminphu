const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class AdminApp {
    constructor() {
        this.session = null;
        this.currentView = 'overview';
        this.activeTable = null;
        this.tableData = [];
        this.filteredData = [];
        this.discoveredTables = ['registrations', 'volunteers', 'payments']; // Default starting list
        
        this.init();
    }

    async init() {
        const { data } = await supabaseClient.auth.getSession();
        const isLocalAuth = localStorage.getItem('admin_logged_in') === 'true';

        if (!data.session && !isLocalAuth) {
            window.location.href = 'index.html';
            return;
        }

        this.session = data.session;
        document.getElementById('admin-display-name').textContent = this.session ? this.session.user.email : 'Admin';

        lucide.createIcons();
        this.setupEventListeners();
        
        // Initial scan to find what's actually there
        await this.scanForTables();
        
        this.switchView('overview');

        const loader = document.getElementById('loader');
        if (loader) loader.style.display = 'none';

        window.app = this;
    }

    setupEventListeners() {
        // Use event delegation for dynamic nav links
        document.addEventListener('click', (e) => {
            const link = e.target.closest('.nav-link[data-view]');
            if (link) {
                e.preventDefault();
                const view = link.getAttribute('data-view');
                this.switchView(view);
            }
        });

        document.getElementById('logout-btn').addEventListener('click', async (e) => {
            e.preventDefault();
            localStorage.removeItem('admin_logged_in');
            localStorage.removeItem('admin_user');
            try { await supabaseClient.auth.signOut(); } catch (e) {}
            window.location.href = 'index.html';
        });

        document.getElementById('data-search').addEventListener('input', () => this.filterData());
        document.getElementById('data-refresh').addEventListener('click', () => this.fetchTableData(this.activeTable));
        document.getElementById('data-export-csv').addEventListener('click', () => this.exportToCSV());
    }

    async scanForTables() {
        const commonNames = [
            'registrations', 'volunteers', 'sponsorships', 'sponsors', 'karura', 
            'karura_run', 'karura_runners', 'runners', 'participants', 'payments', 
            'activities', 'logs', 'registration', 'marathon', 'registration_data'
        ];
        
        const found = [];
        // Try all names in parallel to be fast
        const probes = commonNames.map(async (name) => {
            try {
                const { data, error } = await supabaseClient.from(name).select('*').limit(1);
                if (!error) return name;
            } catch (e) {}
            return null;
        });

        const results = await Promise.all(probes);
        this.discoveredTables = [...new Set([...this.discoveredTables, ...results.filter(n => n !== null)])];
        
        this.renderSidebar();
    }

    renderSidebar() {
        const container = document.getElementById('dynamic-nav-links');
        container.innerHTML = this.discoveredTables.map(table => `
            <div class="nav-item">
                <a href="#" class="nav-link ${this.activeTable === table ? 'active' : ''}" data-view="${table}">
                    <i data-lucide="table"></i>
                    <span>${table}</span>
                </a>
            </div>
        `).join('');
        lucide.createIcons();
    }

    switchView(view) {
        this.currentView = view;
        
        document.querySelectorAll('.view-panel').forEach(p => p.style.display = 'none');
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));

        const title = document.getElementById('view-title');

        if (view === 'overview') {
            document.getElementById('overview-content').style.display = 'block';
            title.textContent = 'System Overview';
            this.activeTable = null;
            this.renderOverview();
        } else {
            document.getElementById('data-view-content').style.display = 'block';
            title.textContent = `Table: ${view}`;
            this.activeTable = view;
            this.fetchTableData(view);
        }
        
        this.renderSidebar();
    }

    async fetchTableData(tableName) {
        const container = document.getElementById('data-table-container');
        container.innerHTML = `<div style="text-align: center; padding: 5rem;"><span class="loader"></span><p style="margin-top: 1rem;">Fetching ${tableName}...</p></div>`;

        try {
            const { data, error } = await supabaseClient.from(tableName).select('*').order('id', { ascending: false }).limit(500);
            
            if (error) {
                // If it fails with ID sort, try without sort (maybe no ID column)
                const { data: dataAlt, error: errorAlt } = await supabaseClient.from(tableName).select('*').limit(500);
                if (errorAlt) throw errorAlt;
                this.tableData = dataAlt || [];
            } else {
                this.tableData = data || [];
            }

            this.filteredData = [...this.tableData];
            this.renderTable();
        } catch (err) {
            container.innerHTML = `
                <div class="glass" style="padding: 3rem; text-align: center; border-color: var(--error);">
                    <i data-lucide="alert-circle" style="color: var(--error); width: 48px; height: 48px; margin-bottom: 1rem;"></i>
                    <h3 style="color: var(--error);">Error Loading Table</h3>
                    <p style="color: var(--text-muted); margin-top: 0.5rem;">${err.message}</p>
                    <button class="btn btn-primary" style="margin-top: 1.5rem;" onclick="window.app.scanForTables()">Scan Again</button>
                </div>
            `;
            lucide.createIcons();
        }
    }

    filterData() {
        const query = document.getElementById('data-search').value.toLowerCase();
        if (!query) {
            this.filteredData = [...this.tableData];
        } else {
            this.filteredData = this.tableData.filter(row => 
                Object.values(row).some(val => String(val).toLowerCase().includes(query))
            );
        }
        this.renderTable();
    }

    renderTable() {
        const container = document.getElementById('data-table-container');
        if (this.filteredData.length === 0) {
            container.innerHTML = `<p style="text-align: center; padding: 5rem; color: var(--text-muted);">No records found matching your criteria.</p>`;
            return;
        }

        const keys = Object.keys(this.tableData[0]);
        
        container.innerHTML = `
            <div class="table-container glass">
                <table>
                    <thead>
                        <tr>
                            ${keys.map(k => `<th>${k.toUpperCase().replace(/_/g, ' ')}</th>`).join('')}
                            ${this.activeTable === 'registrations' ? '<th>ACTIONS</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
                        ${this.filteredData.map(row => `
                            <tr>
                                ${keys.map(k => {
                                    let val = row[k];
                                    if (val === null) return '<td><span style="color: var(--text-muted);">---</span></td>';
                                    if (typeof val === 'boolean') return `<td><span class="badge ${val ? 'badge-confirmed' : 'badge-cancelled'}">${val}</span></td>`;
                                    if (k.toLowerCase().includes('status')) return `<td><span class="badge badge-${String(val).toLowerCase()}">${val}</span></td>`;
                                    if (k.toLowerCase().includes('at')) return `<td>${new Date(val).toLocaleDateString()}</td>`;
                                    return `<td>${val}</td>`;
                                }).join('')}
                                ${this.activeTable === 'registrations' ? `<td><button class="btn btn-outline btn-sm" onclick="window.app.openProfile('${row.id}')">View</button></td>` : ''}
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    async renderOverview() {
        const probes = this.discoveredTables.map(async (table) => {
            const { count } = await supabaseClient.from(table).select('*', { count: 'exact', head: true });
            return { name: table, count: count || 0 };
        });

        const stats = await Promise.all(probes);
        
        const statsGrid = document.querySelector('.stats-grid');
        statsGrid.innerHTML = stats.map(s => `
            <div class="stat-card glass" onclick="window.app.switchView('${s.name}')" style="cursor: pointer;">
                <p class="stat-title">${s.name.toUpperCase()}</p>
                <p class="stat-value">${s.count}</p>
                <p class="stat-change" style="color: var(--primary);">View Data <i data-lucide="chevron-right" style="width: 14px; height: 14px; vertical-align: middle;"></i></p>
            </div>
        `).join('');
        lucide.createIcons();

        // Trend logic (placeholder for overview trend)
        const ctx = document.getElementById('registrationChart').getContext('2d');
        if (this.trendChart) this.trendChart.destroy();
        this.trendChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                datasets: [{
                    label: 'Activity',
                    data: [12, 19, 3, 5, 2, 3, 9],
                    borderColor: '#FF8C00',
                    tension: 0.4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false }
        });
    }

    showCustomTablePrompt() {
        const name = prompt("Enter the Supabase table name you want to view:");
        if (name) {
            if (!this.discoveredTables.includes(name)) {
                this.discoveredTables.push(name);
                this.renderSidebar();
            }
            this.switchView(name);
        }
    }

    async openProfile(id) {
        // Specifically for registrations
        const { data } = await supabaseClient.from('registrations').select('*').eq('id', id).single();
        if (!data) return;
        
        document.getElementById('modal-name').textContent = `${data.first_name} ${data.last_name}`;
        document.getElementById('modal-bib').textContent = data.bib_number || '---';
        document.getElementById('modal-bib-name').textContent = `${data.first_name} ${data.last_name}`.toUpperCase();
        document.getElementById('modal-bib-category').textContent = data.race_category || '---';
        document.getElementById('modal-email').textContent = data.email;
        document.getElementById('modal-phone').textContent = data.phone;
        
        const badge = document.getElementById('modal-status-badge');
        badge.textContent = data.payment_status || 'Pending';
        badge.className = `badge badge-${String(data.payment_status).toLowerCase()}`;

        document.getElementById('profile-modal').style.display = 'flex';
    }

    closeModal() {
        document.getElementById('profile-modal').style.display = 'none';
    }

    exportToCSV() {
        if (this.filteredData.length === 0) return;
        const keys = Object.keys(this.tableData[0]);
        const csv = [
            keys.join(','),
            ...this.filteredData.map(row => keys.map(k => `"${row[k] || ''}"`).join(','))
        ].join('\n');

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.activeTable}_export.csv`;
        a.click();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new AdminApp();
});
