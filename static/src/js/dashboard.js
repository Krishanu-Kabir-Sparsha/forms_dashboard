/** @odoo-module **/

import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { Component, onWillStart, useState, onMounted, useRef, onWillDestroy } from "@odoo/owl";
import { session } from "@web/session";

export class FormsDashboard extends Component {
    setup() {
        this.action = useService("action");
        this.orm = useService("orm");
        
        this.trendChartRef = useRef("trendChart");
        this.statusChartRef = useRef("statusChart");

        // Store refresh interval ID
        this.refreshInterval = null;
        
        // Initialize with static values
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
            charts: {},
            trendPeriod: 'daily',
            currentUser: 'Krishanu-Kabir-Sparsha',
            currentDateTime: this.formatUTCDateTime(new Date())
        });
        
        // Add these at the top of setup
        let timeInterval;
        
        onWillStart(async () => {
            await this.loadData();
            // Update time every second
            timeInterval = setInterval(() => {
                this.state.currentDateTime = this.formatUTCDateTime(new Date());
            }, 1000);
        });

        onMounted(async () => {
            await new Promise(resolve => setTimeout(resolve, 300));
            await this.setupCharts();
            
            // Auto refresh every 5 minutes
            this.refreshInterval = setInterval(() => this.refresh(), 300000);
        });

        // Use onWillDestroy for cleanup
        onWillDestroy(() => {
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
                this.refreshInterval = null;
            }
            if (timeInterval) {
                clearInterval(timeInterval);
            }
            // Cleanup charts
            if (this.state.charts.trend) {
                this.state.charts.trend.destroy();
                this.state.charts.trend = null;
            }
            if (this.state.charts.status) {
                this.state.charts.status.destroy();
                this.state.charts.status = null;
            }
        });
    }

    formatUTCDateTime(date) {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        const seconds = String(date.getUTCSeconds()).padStart(2, '0');
        return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
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

    async setupCharts() {
        try {
            // Wait longer for DOM to be fully ready
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Ensure trendPeriod is set to daily initially
            this.state.trendPeriod = 'daily';
            
            // Get initial data before creating charts
            const [trendData, statusData] = await Promise.all([
                this.getTrendData(),
                this.getStatusDistribution()
            ]);
            
            // Initialize charts
            await this.initCharts(trendData, statusData);
        } catch (error) {
            console.error('Error setting up charts:', error);
        }
    }

    async initCharts(trendData, statusData) {
        try {
            if (typeof Chart === 'undefined') {
                throw new Error('Chart.js not loaded');
            }

            const trendCanvas = this.trendChartRef.el;
            const statusCanvas = this.statusChartRef.el;

            if (!trendCanvas || !statusCanvas) {
                throw new Error('Canvas elements not found');
            }

            // Clean up existing charts
            if (this.state.charts.trend) {
                this.state.charts.trend.destroy();
                this.state.charts.trend = null;
            }
            if (this.state.charts.status) {
                this.state.charts.status.destroy();
                this.state.charts.status = null;
            }

            // Wait for a frame to ensure canvas is ready
            await new Promise(resolve => requestAnimationFrame(resolve));

            const createTrendChart = () => {
                const ctx = trendCanvas.getContext('2d');
                if (!ctx) return null;
                
                return new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: trendData.labels,
                        datasets: [
                            {
                                label: 'Partnerships',
                                borderColor: '#714B67',
                                backgroundColor: '#714B67',
                                data: trendData.datasets[0].data,
                                tension: 0.4,
                                fill: false
                            },
                            {
                                label: 'Donations',
                                borderColor: '#00A09D',
                                backgroundColor: '#00A09D',
                                data: trendData.datasets[1].data,
                                tension: 0.4,
                                fill: false
                            },
                            {
                                label: 'Collaborations',
                                borderColor: '#28a745',
                                backgroundColor: '#28a745',
                                data: trendData.datasets[2].data,
                                tension: 0.4,
                                fill: false
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        animation: false,
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
                            },
                            tooltip: {
                                mode: 'index',
                                intersect: false
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
            };

            const createStatusChart = () => {
                const ctx = statusCanvas.getContext('2d');
                if (!ctx) return null;

                return new Chart(ctx, {
                    type: 'doughnut',
                    data: {
                        labels: ['New', 'In Progress', 'Qualified', 'Done', 'Cancelled', 'Declined', 'Converted'],
                        datasets: [{
                            data: statusData,
                            backgroundColor: [
                                '#714B67',
                                '#00A09D',
                                '#8B5CF6',
                                '#28a745',
                                '#dc3545',
                                '#fd7e14',
                                '#20c997'
                            ]
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        animation: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    padding: 20
                                }
                            }
                        }
                    }
                });
            };

            this.state.charts.trend = createTrendChart();
            this.state.charts.status = createStatusChart();

        } catch (error) {
            console.error('Error initializing charts:', error);
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
                default:
                    days = 7;
                    labels = Array.from({length: 7}, (_, i) => {
                        const d = new Date();
                        d.setDate(d.getDate() - (6 - i));
                        return d.toLocaleDateString('en-US', { weekday: 'short' });
                    });
            }

            const domain = [['create_date', '>=', this.getDateRangeDomain(days)]];

            const [partnerships, donations, collaborations] = await Promise.all([
                this.orm.searchRead('partnership.inquiry', domain, ['create_date']),
                this.orm.searchRead('donation.inquiry', domain, ['create_date']),
                this.orm.searchRead('collaboration.inquiry', domain, ['create_date'])
            ]);

            const partnershipData = this.groupDataByPeriod(partnerships, period, labels.length);
            const donationData = this.groupDataByPeriod(donations, period, labels.length);
            const collaborationData = this.groupDataByPeriod(collaborations, period, labels.length);

            return {
                labels,
                datasets: [
                    { data: partnershipData },
                    { data: donationData },
                    { data: collaborationData }
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
        
        records.forEach(record => {
            const date = new Date(record.create_date);
            let index = 0;

            switch(period) {
                case 'daily':
                    const dayDiff = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24));
                    if (dayDiff < 7) index = 6 - dayDiff;
                    break;
                    
                case 'weekly':
                    const weekDiff = Math.floor((new Date() - date) / (1000 * 60 * 60 * 24 * 7));
                    if (weekDiff < 4) index = 3 - weekDiff;
                    break;
                    
                case 'monthly':
                    const monthDiff = new Date().getMonth() - date.getMonth() + 
                        (new Date().getFullYear() - date.getFullYear()) * 12;
                    if (monthDiff < 6) index = 5 - monthDiff;
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
            const trendData = await this.getTrendData();
            
            // Safely destroy the old chart
            if (this.state.charts.trend) {
                this.state.charts.trend.destroy();
                this.state.charts.trend = null;
            }

            // Get canvas and verify it exists
            const trendCanvas = this.trendChartRef.el;
            if (!trendCanvas) {
                console.error('Trend chart canvas not found');
                return;
            }

            // Wait a moment for the DOM to update
            await new Promise(resolve => setTimeout(resolve, 50));

            // Create new chart
            const trendCtx = trendCanvas.getContext('2d');
            if (!trendCtx) {
                console.error('Could not get 2d context from canvas');
                return;
            }

            this.state.charts.trend = new Chart(trendCtx, {
                type: 'line',
                data: {
                    labels: trendData.labels,
                    datasets: [
                        {
                            label: 'Partnerships',
                            borderColor: '#714B67',
                            backgroundColor: '#714B67',
                            data: trendData.datasets[0].data,
                            tension: 0.4,
                            fill: false
                        },
                        {
                            label: 'Donations',
                            borderColor: '#00A09D',
                            backgroundColor: '#00A09D',
                            data: trendData.datasets[1].data,
                            tension: 0.4,
                            fill: false
                        },
                        {
                            label: 'Collaborations',
                            borderColor: '#28a745',
                            backgroundColor: '#28a745',
                            data: trendData.datasets[2].data,
                            tension: 0.4,
                            fill: false
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: {
                        duration: 0 // Disable animations for smoother updates
                    },
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
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false
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
        } catch (error) {
            console.error('Error updating trend chart:', error);
        }
    }

    async loadData() {
        this.state.loading = true;
        try {
            await Promise.all([
                this.loadCounts(),
                this.loadRecentActivity()
            ]);
            if (this.state.charts.trend && this.state.charts.status) {
                await this.updateCharts();
            }
            this.state.lastUpdate = this.formatDate(new Date());
            // Update current date time in UTC format
            this.state.currentDateTime = this.formatUTCDateTime(new Date());
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

            if (this.state.charts.trend) {
                try {
                    this.state.charts.trend.data.labels = trendData.labels;
                    this.state.charts.trend.data.datasets.forEach((dataset, index) => {
                        dataset.data = trendData.datasets[index].data;
                    });
                    await this.state.charts.trend.update('none');
                } catch (error) {
                    console.error('Error updating trend chart:', error);
                    // Reinitialize chart if update fails
                    await this.initCharts(trendData, statusData);
                }
            }

            if (this.state.charts.status) {
                try {
                    this.state.charts.status.data.datasets[0].data = statusData;
                    await this.state.charts.status.update('none');
                } catch (error) {
                    console.error('Error updating status chart:', error);
                    // Reinitialize chart if update fails
                    await this.initCharts(trendData, statusData);
                }
            }
        } catch (error) {
            console.error('Error in updateCharts:', error);
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

        // Get new counts (created in last 24 hours)
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
                    id: p.id,
                    name: p.name || '',
                    type: 'Partnership',
                    state: p.state || 'new',
                    date: this.formatDate(new Date(p.create_date)),
                    create_date: p.create_date,
                })),
                ...donations.map(d => ({
                    id: d.id,
                    name: d.name || '',
                    type: 'Donation',
                    state: d.state || 'new',
                    date: this.formatDate(new Date(d.create_date)),
                    create_date: d.create_date,
                })),
                ...collaborations.map(c => ({
                    id: c.id,
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
        // Update UTC time after refresh
        this.state.currentDateTime = this.formatUTCDateTime(new Date());
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
            // Use UTC time for file name
            const timestamp = this.formatUTCDateTime(new Date()).replace(/[: ]/g, '-');
            
            link.href = url;
            link.setAttribute('download', `forms-dashboard-export-${timestamp}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
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
            ...rows.map(row => row.join(','))
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

// Add static properties
FormsDashboard.template = "forms_dashboard.MainDashboard";
FormsDashboard.components = {};

// Register the component
registry.category("actions").add("forms_dashboard_main", FormsDashboard);