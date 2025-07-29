/** @odoo-module **/

import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { Component, onWillStart, useState, onMounted, useRef, onWillDestroy } from "@odoo/owl";

export class FormsDashboard extends Component {
    setup() {
        this.action = useService("action");
        this.orm = useService("orm");
        
        this.trendChartRef = useRef("trendChart");
        this.statusChartRef = useRef("statusChart");

        // Store intervals
        this.refreshInterval = null;
        
        // Chart instances
        this.charts = {
            trend: null,
            status: null
        };
        
        // Initialize state
        this.state = useState({
            partnerships: 0,
            partnerships_new: 0,
            donations: 0,
            donations_new: 0,
            collaborations: 0,
            collaborations_new: 0,
            recentActivity: [],
            loading: false,
            lastUpdate: this.formatDate(new Date()),
            dateRange: 7,
            statusFilter: 'all',
            trendPeriod: 'daily'
        });
        
        onWillStart(async () => {
            await this.loadData();
        });

        onMounted(async () => {
            // Ensure Chart.js is loaded
            await this.waitForChartJs();
            
            // Use requestAnimationFrame to ensure DOM is ready
            requestAnimationFrame(() => {
                setTimeout(() => {
                    this.initializeCharts();
                }, 100);
            });
            
            // Auto refresh every 5 minutes
            this.refreshInterval = setInterval(() => this.refresh(), 300000);
        });

        onWillDestroy(() => {
            // Clear interval
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
                this.refreshInterval = null;
            }
            
            // Destroy charts
            this.destroyCharts();
        });
    }

    async waitForChartJs() {
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds max
        
        while (typeof window.Chart === 'undefined' && attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        
        if (typeof window.Chart === 'undefined') {
            console.error('Chart.js not available');
            throw new Error('Chart.js failed to load');
        }
    }

    destroyCharts() {
        if (this.charts.trend) {
            try {
                this.charts.trend.destroy();
            } catch (e) {
                // Ignore errors
            }
            this.charts.trend = null;
        }
        
        if (this.charts.status) {
            try {
                this.charts.status.destroy();
            } catch (e) {
                // Ignore errors
            }
            this.charts.status = null;
        }
    }

    formatDate(date) {
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    }

    async initializeCharts() {
        try {
            // Check if refs are available
            if (!this.trendChartRef.el || !this.statusChartRef.el) {
                console.error('Chart containers not available');
                // Retry once more after delay
                setTimeout(() => this.initializeCharts(), 500);
                return;
            }

            // Get initial data
            const [trendData, statusData] = await Promise.all([
                this.getTrendData(),
                this.getStatusDistribution()
            ]);
            
            // Create charts
            this.createCharts(trendData, statusData);
            
        } catch (error) {
            console.error('Error initializing charts:', error);
        }
    }

    createCharts(trendData, statusData) {
        // Destroy existing charts
        this.destroyCharts();
        
        // Create trend chart
        const trendCanvas = this.trendChartRef.el;
        if (trendCanvas) {
            const trendCtx = trendCanvas.getContext('2d');
            if (trendCtx) {
                this.charts.trend = new window.Chart(trendCtx, {
                    type: 'line',
                    data: {
                        labels: trendData.labels || [],
                        datasets: [
                            {
                                label: 'Partnerships',
                                borderColor: '#714B67',
                                backgroundColor: 'rgba(113, 75, 103, 0.1)',
                                data: trendData.datasets[0].data || [],
                                tension: 0.4,
                                fill: true
                            },
                            {
                                label: 'Donations',
                                borderColor: '#00A09D',
                                backgroundColor: 'rgba(0, 160, 157, 0.1)',
                                data: trendData.datasets[1].data || [],
                                tension: 0.4,
                                fill: true
                            },
                            {
                                label: 'Collaborations',
                                borderColor: '#28a745',
                                backgroundColor: 'rgba(40, 167, 69, 0.1)',
                                data: trendData.datasets[2].data || [],
                                tension: 0.4,
                                fill: true
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        interaction: {
                            intersect: false,
                            mode: 'index'
                        },
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    usePointStyle: true,
                                    padding: 20
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    stepSize: 1
                                }
                            }
                        }
                    }
                });
            }
        }
        
        // Create status chart
        const statusCanvas = this.statusChartRef.el;
        if (statusCanvas) {
            const statusCtx = statusCanvas.getContext('2d');
            if (statusCtx) {
                this.charts.status = new window.Chart(statusCtx, {
                    type: 'doughnut',
                    data: {
                        labels: ['New', 'In Progress', 'Qualified', 'Done', 'Cancelled', 'Declined', 'Converted'],
                        datasets: [{
                            data: statusData || [],
                            backgroundColor: [
                                '#714B67',
                                '#00A09D',
                                '#8B5CF6',
                                '#28a745',
                                '#dc3545',
                                '#fd7e14',
                                '#20c997'
                            ],
                            borderWidth: 2,
                            borderColor: '#fff'
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    padding: 20,
                                    usePointStyle: true
                                }
                            }
                        }
                    }
                });
            }
        }
    }

    async getTrendData() {
        try {
            const period = this.state.trendPeriod;
            let days, labels;

            switch(period) {
                case 'daily':
                    days = 7;
                    labels = Array.from({length: 7}, (_, i) => {
                        const d = new Date();
                        d.setDate(d.getDate() - (6 - i));
                        return d.toLocaleDateString('en-US', { weekday: 'short' });
                    });
                    break;
                case 'weekly':
                    days = 28;
                    labels = Array.from({length: 4}, (_, i) => `Week ${i + 1}`);
                    break;
                case 'monthly':
                    days = 180;
                    labels = Array.from({length: 6}, (_, i) => {
                        const d = new Date();
                        d.setMonth(d.getMonth() - (5 - i));
                        return d.toLocaleDateString('en-US', { month: 'short' });
                    });
                    break;
            }

            const domain = [['create_date', '>=', this.getDateRangeDomain(days)]];

            const [partnerships, donations, collaborations] = await Promise.all([
                this.orm.searchRead('partnership.inquiry', domain, ['create_date']),
                this.orm.searchRead('donation.inquiry', domain, ['create_date']),
                this.orm.searchRead('collaboration.inquiry', domain, ['create_date'])
            ]);

            return {
                labels,
                datasets: [
                    { data: this.groupDataByPeriod(partnerships, period, labels.length) },
                    { data: this.groupDataByPeriod(donations, period, labels.length) },
                    { data: this.groupDataByPeriod(collaborations, period, labels.length) }
                ]
            };
        } catch (error) {
            console.error('Error fetching trend data:', error);
            return {
                labels: [],
                datasets: [{ data: [] }, { data: [] }, { data: [] }]
            };
        }
    }

    groupDataByPeriod(records, period, length) {
        const data = new Array(length).fill(0);
        const now = new Date();
        
        records.forEach(record => {
            const date = new Date(record.create_date);
            let index = -1;

            switch(period) {
                case 'daily':
                    const dayDiff = Math.floor((now - date) / (1000 * 60 * 60 * 24));
                    if (dayDiff >= 0 && dayDiff < 7) {
                        index = 6 - dayDiff;
                    }
                    break;
                    
                case 'weekly':
                    const weekDiff = Math.floor((now - date) / (1000 * 60 * 60 * 24 * 7));
                    if (weekDiff >= 0 && weekDiff < 4) {
                        index = 3 - weekDiff;
                    }
                    break;
                    
                case 'monthly':
                    const monthDiff = (now.getFullYear() - date.getFullYear()) * 12 + 
                        (now.getMonth() - date.getMonth());
                    if (monthDiff >= 0 && monthDiff < 6) {
                        index = 5 - monthDiff;
                    }
                    break;
            }
            
            if (index >= 0 && index < length) {
                data[index]++;
            }
        });
        
        return data;
    }

    async getStatusDistribution() {
        const statuses = ['new', 'in_progress', 'qualified', 'done', 'cancelled', 'declined', 'converted'];
        
        try {
            const counts = await Promise.all(
                statuses.map(status => 
                    Promise.all([
                        this.orm.searchCount('partnership.inquiry', [['state', '=', status]]),
                        this.orm.searchCount('donation.inquiry', [['state', '=', status]]),
                        this.orm.searchCount('collaboration.inquiry', [['state', '=', status]])
                    ]).then(results => results.reduce((a, b) => a + b, 0))
                )
            );

            return counts;
        } catch (error) {
            console.error('Error fetching status distribution:', error);
            return new Array(7).fill(0);
        }
    }

    async onTrendPeriodChange(ev) {
        try {
            this.state.trendPeriod = ev.target.value;
            
            const [trendData, statusData] = await Promise.all([
                this.getTrendData(),
                this.getStatusDistribution()
            ]);
            
            this.createCharts(trendData, statusData);
            
        } catch (error) {
            console.error('Error updating trend period:', error);
        }
    }

    async loadData() {
        this.state.loading = true;
        try {
            await Promise.all([
                this.loadCounts(),
                this.loadRecentActivity()
            ]);
            
            // Update charts if they exist
            if (this.charts.trend && this.charts.status) {
                await this.updateCharts();
            }
            
            this.state.lastUpdate = this.formatDate(new Date());
        } catch (error) {
            console.error("Error loading dashboard data:", error);
        } finally {
            this.state.loading = false;
        }
    }

    async updateCharts() {
        try {
            const [trendData, statusData] = await Promise.all([
                this.getTrendData(),
                this.getStatusDistribution()
            ]);

            if (this.charts.trend) {
                this.charts.trend.data.labels = trendData.labels;
                this.charts.trend.data.datasets.forEach((dataset, index) => {
                    dataset.data = trendData.datasets[index].data;
                });
                this.charts.trend.update('none');
            }

            if (this.charts.status) {
                this.charts.status.data.datasets[0].data = statusData;
                this.charts.status.update('none');
            }
        } catch (error) {
            console.error('Error updating charts:', error);
        }
    }

    async loadCounts() {
        const dateRange = this.state.dateRange;
        const domain = dateRange === 'all' ? [] : [
            ['create_date', '>=', this.getDateRangeDomain(dateRange)]
        ];

        const [partnerships, donations, collaborations] = await Promise.all([
            this.orm.searchCount("partnership.inquiry", domain),
            this.orm.searchCount("donation.inquiry", domain),
            this.orm.searchCount("collaboration.inquiry", domain)
        ]);

        const newDomain = [['create_date', '>=', this.getDateRangeDomain(1)]];
        const [partnerships_new, donations_new, collaborations_new] = await Promise.all([
            this.orm.searchCount("partnership.inquiry", newDomain),
            this.orm.searchCount("donation.inquiry", newDomain),
            this.orm.searchCount("collaboration.inquiry", newDomain)
        ]);

        this.state.partnerships = partnerships;
        this.state.partnerships_new = partnerships_new;
        this.state.donations = donations;
        this.state.donations_new = donations_new;
        this.state.collaborations = collaborations;
        this.state.collaborations_new = collaborations_new;
    }

    getDateRangeDomain(days) {
        const date = new Date();
        date.setDate(date.getDate() - days);
        return date.toISOString().split('T')[0] + ' 00:00:00';
    }

    async loadRecentActivity() {
        try {
            const dateRange = this.state.dateRange;
            let domain = [];
            
            if (dateRange !== 'all') {
                domain.push(['create_date', '>=', this.getDateRangeDomain(dateRange)]);
            }

            if (this.state.statusFilter !== 'all') {
                domain.push(['state', '=', this.state.statusFilter]);
            }

            const fields = ['id', 'name', 'create_date', 'state'];

            const [partnerships, donations, collaborations] = await Promise.all([
                this.orm.searchRead(
                    'partnership.inquiry',
                    domain,
                    fields,
                    { limit: 50, order: 'create_date desc' }
                ),
                this.orm.searchRead(
                    'donation.inquiry',
                    domain,
                    fields,
                    { limit: 50, order: 'create_date desc' }
                ),
                this.orm.searchRead(
                    'collaboration.inquiry',
                    domain,
                    fields,
                    { limit: 50, order: 'create_date desc' }
                )
            ]);

            const allActivities = [
                ...partnerships.map(p => ({
                    id: `partnership_${p.id}`,
                    name: p.name || '',
                    type: 'Partnership',
                    state: p.state || 'new',
                    date: this.formatDate(new Date(p.create_date)),
                    create_date: p.create_date,
                })),
                ...donations.map(d => ({
                    id: `donation_${d.id}`,
                    name: d.name || '',
                    type: 'Donation',
                    state: d.state || 'new',
                    date: this.formatDate(new Date(d.create_date)),
                    create_date: d.create_date,
                })),
                ...collaborations.map(c => ({
                    id: `collaboration_${c.id}`,
                    name: c.name || '',
                    type: 'Collaboration',
                    state: c.state || 'new',
                    date: this.formatDate(new Date(c.create_date)),
                    create_date: c.create_date,
                }))
            ];

            this.state.recentActivity = allActivities
                .sort((a, b) => new Date(b.create_date) - new Date(a.create_date))
                .slice(0, 50);

        } catch (error) {
            console.error("Error loading recent activity:", error);
            this.state.recentActivity = [];
        }
    }

    async refresh() {
        await this.loadData();
    }

    async onDateRangeChange(ev) {
        this.state.dateRange = parseInt(ev.target.value) || 'all';
        await this.loadData();
    }

    async onStatusChange(ev) {
        this.state.statusFilter = ev.target.value;
        await this.loadData();
    }

    async exportData() {
        try {
            const data = this.state.recentActivity;
            const csvContent = this.convertToCSV(data);
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            
            link.href = url;
            link.setAttribute('download', `forms-dashboard-export-${timestamp}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error exporting data:", error);
        }
    }

    convertToCSV(data) {
        const headers = ['Reference', 'Type', 'Status', 'Submission Date'];
        const rows = data.map(item => [
            item.name,
            item.type,
            item.state,
            item.date
        ]);
        
        return [
            headers.join(','),
            ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');
    }
    
    openPartnerships() {
        this.action.doAction({
            name: "Partnership Inquiries",
            type: "ir.actions.act_window",
            res_model: "partnership.inquiry",
            view_mode: "list,form",
            views: [[false, "list"], [false, "form"]],
        });
    }
    
    openDonations() {
        this.action.doAction({
            name: "Donation Inquiries",
            type: "ir.actions.act_window",
            res_model: "donation.inquiry",
            view_mode: "list,form",
            views: [[false, "list"], [false, "form"]],
        });
    }
    
    openCollaborations() {
        this.action.doAction({
            name: "Collaboration Inquiries",
            type: "ir.actions.act_window",
            res_model: "collaboration.inquiry",
            view_mode: "list,form",
            views: [[false, "list"], [false, "form"]],
        });
    }
}

FormsDashboard.template = "forms_dashboard.MainDashboard";
FormsDashboard.components = {};

registry.category("actions").add("forms_dashboard_main", FormsDashboard);