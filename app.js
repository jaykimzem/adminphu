import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

class AdminApp {
    constructor() {
        this.session = null;
        this.currentView = 'overview';
        this.registrations = [];
        this.filteredRegistrations = [];
        this.currentPage = 1;
        this.pageSize = 25;
        this.currentRunner = null;
        
        this.init();
    }

    async init() {
        // Auth check
        const { data: { session } } = await supabase.auth.getSession();
        const isLocalAuth = localStorage.getItem('admin_logged_in') === 'true';

        if (!session && !isLocalAuth) {
            window.location.href = 'index.html';
            return;
        }

        this.session = session;
        document.getElementById('admin-email').textContent = session ? session.user.email : 'admin';

        // Initialize Lucide icons
        lucide.createIcons();

        // Event Listeners
        this.setupEventListeners();

        // Initial Data Fetch
        await this.fetchData();
        
        // Initial Render
        this.render();

        // Hide Loader
        const loader = document.getElementById('loader');
        if (loader) loader.style.display = 'none';

        // Make app instance global for inline onclick handlers
        window.app = this;
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link[data-view]').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = e.currentTarget.getAttribute('data-view');
                this.switchView(view);
            });
        });

        // Logout
        document.getElementById('logout-btn').addEventListener('click', async (e) => {
            e.preventDefault();
            await supabase.auth.signOut();
            window.location.href = 'index.html';
        });

        // Search & Filters
        document.getElementById('reg-search').addEventListener('input', () => this.filterData());
        document.getElementById('reg-filter-category').addEventListener('change', () => this.filterData());
        document.getElementById('reg-filter-status').addEventListener('change', () => this.filterData());

        // Pagination
        document.getElementById('prev-page').addEventListener('click', () => {
            if (this.currentPage > 1) {
                this.currentPage--;
                this.renderAllRegistrations();
            }
        });
        document.getElementById('next-page').addEventListener('click', () => {
            if (this.currentPage * this.pageSize < this.filteredRegistrations.length) {
                this.currentPage++;
                this.renderAllRegistrations();
            }
        });

        // Export
        document.getElementById('export-csv').addEventListener('click', () => this.exportToCSV());
    }

    async fetchData() {
        try {
            // Fetch registrations
            const { data, error } = await supabase
                .from('registrations')
                .select('*')
                .order('submitted_at', { ascending: false });

            if (error) throw error;
            this.registrations = data || [];
            this.filteredRegistrations = [...this.registrations];
        } catch (err) {
            console.error('Error fetching data:', err);
        }
    }

    switchView(view) {
        this.currentView = view;
        
        // Update Nav UI
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-view') === view) link.classList.add('active');
        });

        // Show/Hide Panels
        document.querySelectorAll('.view-panel').forEach(panel => {
            panel.style.display = 'none';
        });

        const viewTitle = document.getElementById('view-title');
        
        if (view === 'overview') {
            document.getElementById('overview-content').style.display = 'block';
            viewTitle.textContent = 'Dashboard Overview';
            this.renderOverview();
        } else if (view === 'registrations') {
            document.getElementById('registrations-content').style.display = 'block';
            viewTitle.textContent = 'Runner Registrations';
            this.renderAllRegistrations();
        } else {
            // Generic view for other tables
            document.getElementById('generic-content').style.display = 'block';
            viewTitle.textContent = view.charAt(0).toUpperCase() + view.slice(1);
            this.renderGenericView(view);
        }
    }

    render() {
        if (this.currentView === 'overview') {
            this.renderOverview();
        } else if (this.currentView === 'registrations') {
            this.renderAllRegistrations();
        }
    }

    renderOverview() {
        // Stats
        const total = this.registrations.length;
        const today = this.registrations.filter(r => new Date(r.submitted_at).toDateString() === new Date().toDateString()).length;
        const confirmed = this.registrations.filter(r => r.payment_status === 'Confirmed').length;
        const pending = this.registrations.filter(r => r.payment_status === 'Pending').length;
        
        // Assuming registration fee is 2500 (placeholder logic)
        const revenue = confirmed * 2500;

        document.getElementById('stat-total-reg').textContent = total;
        document.getElementById('stat-today-reg').textContent = today;
        document.getElementById('stat-revenue').textContent = revenue.toLocaleString();
        document.getElementById('stat-confirmed-bibs').textContent = confirmed;
        document.getElementById('stat-pending-bibs').textContent = pending;

        // Recent Table
        const recentTable = document.getElementById('recent-registrations-table');
        recentTable.innerHTML = this.registrations.slice(0, 10).map(r => `
            <tr>
                <td><span style="font-weight: 700;">#${r.bib_number || '---'}</span></td>
                <td>${r.first_name} ${r.last_name}</td>
                <td>${r.race_category}</td>
                <td>${r.shirt_size} (${r.shirt_color})</td>
                <td><span class="badge badge-${(r.payment_status || 'pending').toLowerCase()}">${r.payment_status || 'Pending'}</span></td>
                <td>${new Date(r.submitted_at).toLocaleDateString()}</td>
            </tr>
        `).join('');

        this.initCharts();
    }

    initCharts() {
        // Destroy existing charts if any
        if (this.regChart) this.regChart.destroy();
        if (this.catChart) this.catChart.destroy();

        // Trend Chart (Last 14 Days)
        const last14Days = [...Array(14)].map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            return d.toDateString();
        }).reverse();

        const trendData = last14Days.map(dateStr => 
            this.registrations.filter(r => new Date(r.submitted_at).toDateString() === dateStr).length
        );

        const ctx1 = document.getElementById('registrationChart').getContext('2d');
        this.regChart = new Chart(ctx1, {
            type: 'line',
            data: {
                labels: last14Days.map(d => d.split(' ').slice(1, 3).join(' ')),
                datasets: [{
                    label: 'Registrations',
                    data: trendData,
                    borderColor: '#FF8C00',
                    backgroundColor: 'rgba(255, 140, 0, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                    x: { grid: { display: false } }
                }
            }
        });

        // Category Chart
        const categories = ['5KM', '10KM', '21KM', '42KM'];
        const catData = categories.map(cat => this.registrations.filter(r => r.race_category === cat).length);

        const ctx2 = document.getElementById('categoryChart').getContext('2d');
        this.catChart = new Chart(ctx2, {
            type: 'doughnut',
            data: {
                labels: categories,
                datasets: [{
                    data: catData,
                    backgroundColor: ['#FF8C00', '#FFD700', '#FFFFFF', '#A0A0A0'],
                    borderWidth: 0
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#fff' } }
                }
            }
        });
    }

    filterData() {
        const query = document.getElementById('reg-search').value.toLowerCase();
        const category = document.getElementById('reg-filter-category').value;
        const status = document.getElementById('reg-filter-status').value;

        this.filteredRegistrations = this.registrations.filter(r => {
            const matchesQuery = !query || 
                `${r.first_name} ${r.last_name}`.toLowerCase().includes(query) ||
                (r.bib_number && r.bib_number.toString().includes(query)) ||
                r.email.toLowerCase().includes(query) ||
                (r.id_number && r.id_number.toLowerCase().includes(query));
            
            const matchesCategory = !category || r.race_category === category;
            const matchesStatus = !status || r.payment_status === status;

            return matchesQuery && matchesCategory && matchesStatus;
        });

        this.currentPage = 1;
        this.renderAllRegistrations();
    }

    renderAllRegistrations() {
        const start = (this.currentPage - 1) * this.pageSize;
        const end = start + this.pageSize;
        const pageData = this.filteredRegistrations.slice(start, end);

        const tableBody = document.getElementById('all-registrations-table');
        tableBody.innerHTML = pageData.map(r => `
            <tr>
                <td><span style="font-weight: 700;">#${r.bib_number || '---'}</span></td>
                <td>
                    <div style="font-weight: 500;">${r.first_name} ${r.last_name}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${r.email}</div>
                </td>
                <td>${r.gender}</td>
                <td>${r.age}</td>
                <td><span style="color: var(--primary); font-weight: 600;">${r.race_category}</span></td>
                <td>${r.shirt_size} (${r.shirt_color})</td>
                <td><span class="badge badge-${(r.payment_status || 'pending').toLowerCase()}">${r.payment_status || 'Pending'}</span></td>
                <td>${new Date(r.submitted_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-outline btn-sm" onclick="window.app.openProfile('${r.id}')">View</button>
                </td>
            </tr>
        `).join('');

        document.getElementById('table-stats').textContent = `Showing ${start + 1} to ${Math.min(end, this.filteredRegistrations.length)} of ${this.filteredRegistrations.length} registrations`;
    }

    async openProfile(id) {
        const runner = this.registrations.find(r => r.id === id);
        if (!runner) return;
        this.currentRunner = runner;

        document.getElementById('modal-name').textContent = `${runner.first_name} ${runner.last_name}`;
        document.getElementById('modal-subtext').textContent = `${runner.race_category} | ${runner.gender} | ${runner.age} Years Old`;
        document.getElementById('modal-email').textContent = runner.email;
        document.getElementById('modal-phone').textContent = runner.phone;
        document.getElementById('modal-id').textContent = runner.id_number;
        document.getElementById('modal-emergency').textContent = `${runner.emergency_contact_name} (${runner.emergency_contact_phone})`;
        document.getElementById('modal-shirt').textContent = `${runner.shirt_size} / ${runner.shirt_color}`;
        document.getElementById('modal-bib').textContent = runner.bib_number || 'PENDING';
        document.getElementById('modal-bib-name').textContent = `${runner.first_name} ${runner.last_name}`.toUpperCase();
        document.getElementById('modal-bib-category').textContent = runner.race_category;
        
        const badge = document.getElementById('modal-status-badge');
        badge.textContent = runner.payment_status || 'Pending';
        badge.className = `badge badge-${(runner.payment_status || 'pending').toLowerCase()}`;
        
        document.getElementById('update-status-select').value = runner.payment_status || 'Pending';

        document.getElementById('profile-modal').style.display = 'flex';
    }

    closeModal() {
        document.getElementById('profile-modal').style.display = 'none';
        this.currentRunner = null;
    }

    async updatePaymentStatus() {
        if (!this.currentRunner) return;
        const newStatus = document.getElementById('update-status-select').value;
        
        try {
            const { error } = await supabase
                .from('registrations')
                .update({ payment_status: newStatus })
                .eq('id', this.currentRunner.id);

            if (error) throw error;
            
            // Update local state
            this.currentRunner.payment_status = newStatus;
            const idx = this.registrations.findIndex(r => r.id === this.currentRunner.id);
            if (idx !== -1) this.registrations[idx].payment_status = newStatus;
            
            this.openProfile(this.currentRunner.id); // Refresh modal
            this.render(); // Refresh background
            alert('Status updated successfully!');
        } catch (err) {
            console.error('Update failed:', err);
            alert('Failed to update status.');
        }
    }

    async renderGenericView(tableName) {
        const container = document.getElementById('generic-content');
        container.innerHTML = `<p style="text-align: center; padding: 5rem;">Loading ${tableName}...</p>`;
        
        try {
            const { data, error } = await supabase
                .from(tableName)
                .select('*')
                .limit(100);

            if (error) throw error;

            if (!data || data.length === 0) {
                container.innerHTML = `<p style="text-align: center; padding: 5rem; color: var(--text-muted);">No data found in table: ${tableName}</p>`;
                return;
            }

            const keys = Object.keys(data[0]);
            
            container.innerHTML = `
                <div class="table-container glass">
                    <table>
                        <thead>
                            <tr>
                                ${keys.map(k => `<th>${k.replace('_', ' ').toUpperCase()}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
                            ${data.map(row => `
                                <tr>
                                    ${keys.map(k => `<td>${row[k] !== null ? row[k] : '---'}</td>`).join('')}
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (err) {
            container.innerHTML = `<p style="text-align: center; padding: 5rem; color: var(--error);">Error loading table: ${err.message}</p>`;
        }
    }

    exportToCSV() {
        const rows = this.filteredRegistrations.map(r => ({
            'BIB #': r.bib_number,
            'First Name': r.first_name,
            'Last Name': r.last_name,
            'Email': r.email,
            'Phone': r.phone,
            'Gender': r.gender,
            'Age': r.age,
            'ID Number': r.id_number,
            'Category': r.race_category,
            'Shirt Size': r.shirt_size,
            'Shirt Color': r.shirt_color,
            'Payment Status': r.payment_status,
            'Registered At': r.submitted_at
        }));

        if (rows.length === 0) return;

        const headers = Object.keys(rows[0]);
        const csvContent = [
            headers.join(','),
            ...rows.map(row => headers.map(h => `"${row[h] || ''}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `phumolo_registrations_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}

// Start the app
new AdminApp();
