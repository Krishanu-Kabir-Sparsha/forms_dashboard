/** @odoo-module **/

import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";
import { Component, onWillStart, useState, onMounted, useRef, onWillDestroy } from "@odoo/owl";

export class FormsDashboard extends Component {
    setup() {
        this.action = useService("action");
        this.orm = useService("orm");
        this.notification = useService("notification");
        
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
            trendPeriod: 'daily',
            customDateFrom: '',
            customDateTo: '',
            showCustomDate: false,
            // Add date range display
            dateRangeDisplay: 'Last 7 Days'
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

    formatDateForInput(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    validateDateRange(fromDate, toDate) {
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const from = new Date(fromDate);
        const to = new Date(toDate);
        
        // Check if dates are in future
        if (from > today || to > today) {
            this.notification.add("Cannot select future dates. Please select dates up to today.", {
                title: "Invalid Date Range",
                type: "danger",
            });
            return false;
        }
        
        // Check if from date is after to date
        if (from > to) {
            this.notification.add("Start date cannot be after end date.", {
                title: "Invalid Date Range",
                type: "danger",
            });
            return false;
        }
        
        return true;
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

            // Get initial data with date range
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
        
        // Create trend chart - IMPROVED VERSION
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
                                backgroundColor: 'transparent', // Remove background
                                data: trendData.datasets[0].data || [],
                                tension: 0.4,
                                fill: false, // No fill
                                borderWidth: 3,
                                pointRadius: 5,
                                pointHoverRadius: 7,
                                pointBackgroundColor: '#714B67',
                                pointBorderColor: '#fff',
                                pointBorderWidth: 2
                            },
                            {
                                label: 'Donations',
                                borderColor: '#00A09D',
                                backgroundColor: 'transparent', // Remove background
                                data: trendData.datasets[1].data || [],
                                tension: 0.4,
                                fill: false, // No fill
                                borderWidth: 3,
                                pointRadius: 5,
                                pointHoverRadius: 7,
                                pointBackgroundColor: '#00A09D',
                                pointBorderColor: '#fff',
                                pointBorderWidth: 2
                            },
                            {
                                label: 'Collaborations',
                                borderColor: '#F39C12',
                                backgroundColor: 'transparent', // Remove background
                                data: trendData.datasets[2].data || [],
                                tension: 0.4,
                                fill: false, // No fill
                                borderWidth: 3,
                                pointRadius: 5,
                                pointHoverRadius: 7,
                                pointBackgroundColor: '#F39C12',
                                pointBorderColor: '#fff',
                                pointBorderWidth: 2
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
                                    padding: 20,
                                    font: {
                                        size: 12,
                                        weight: '500'
                                    }
                                }
                            },
                            tooltip: {
                                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                                padding: 12,
                                cornerRadius: 8,
                                titleFont: {
                                    size: 14,
                                    weight: 'bold'
                                },
                                bodyFont: {
                                    size: 13
                                },
                                displayColors: true,
                                callbacks: {
                                    label: function(context) {
                                        return context.dataset.label + ': ' + context.parsed.y + ' inquiries';
                                    }
                                }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                ticks: {
                                    stepSize: 1,
                                    font: {
                                        size: 11
                                    }
                                },
                                grid: {
                                    color: 'rgba(0, 0, 0, 0.05)',
                                    drawBorder: false
                                },
                                title: {
                                    display: true,
                                    text: 'Number of Inquiries',
                                    font: {
                                        size: 12,
                                        weight: '500'
                                    }
                                }
                            },
                            x: {
                                grid: {
                                    display: false
                                },
                                ticks: {
                                    font: {
                                        size: 11
                                    }
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
                                    usePointStyle: true,
                                    font: {
                                        size: 12
                                    }
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                        const percentage = ((context.parsed / total) * 100).toFixed(1);
                                        return context.label + ': ' + context.parsed + ' (' + percentage + '%)';
                                    }
                                }
                            }
                        }
                    }
                });
            }
        }
    }

    getDateRangeDomain(days = null) {
        if (this.state.showCustomDate && this.state.customDateFrom && this.state.customDateTo) {
            return this.state.customDateFrom + ' 00:00:00';
        } else if (days !== null) {
            const date = new Date();
            date.setDate(date.getDate() - days);
            return date.toISOString().split('T')[0] + ' 00:00:00';
        }
        return null;
    }

    getDateRangeFilter() {
        if (this.state.showCustomDate && this.state.customDateFrom && this.state.customDateTo) {
            return [
                ['create_date', '>=', this.state.customDateFrom + ' 00:00:00'],
                ['create_date', '<=', this.state.customDateTo + ' 23:59:59']
            ];
        } else if (this.state.dateRange !== 'all') {
            return [['create_date', '>=', this.getDateRangeDomain(this.state.dateRange)]];
        }
        return [];
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
                        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                    });
                    break;
                case 'weekly':
                    days = 28;
                    labels = Array.from({length: 4}, (_, i) => {
                        const d = new Date();
                        d.setDate(d.getDate() - (7 * (3 - i)));
                        return `Week of ${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
                    });
                    break;
                case 'monthly':
                    days = 180;
                    labels = Array.from({length: 6}, (_, i) => {
                        const d = new Date();
                        d.setMonth(d.getMonth() - (5 - i));
                        return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
                    });
                    break;
            }

            // Apply date range filter
            const domain = this.getDateRangeFilter();

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
            // Apply date range filter
            const domain = this.getDateRangeFilter();
            
            const counts = await Promise.all(
                statuses.map(status => 
                    Promise.all([
                        this.orm.searchCount('partnership.inquiry', [...domain, ['state', '=', status]]),
                        this.orm.searchCount('donation.inquiry', [...domain, ['state', '=', status]]),
                        this.orm.searchCount('collaboration.inquiry', [...domain, ['state', '=', status]])
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
        // Apply consistent date range filter
        const domain = this.getDateRangeFilter();

        const [partnerships, donations, collaborations] = await Promise.all([
            this.orm.searchCount("partnership.inquiry", domain),
            this.orm.searchCount("donation.inquiry", domain),
            this.orm.searchCount("collaboration.inquiry", domain)
        ]);

        // New inquiries (last 24 hours)
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

    async loadRecentActivity() {
        try {
            const domain = this.getDateRangeFilter();

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
                    recordId: p.id,
                    name: p.name || '',
                    type: 'Partnership',
                    model: 'partnership.inquiry',
                    state: p.state || 'new',
                    date: this.formatDate(new Date(p.create_date)),
                    create_date: p.create_date,
                })),
                ...donations.map(d => ({
                    id: `donation_${d.id}`,
                    recordId: d.id,
                    name: d.name || '',
                    type: 'Donation',
                    model: 'donation.inquiry',
                    state: d.state || 'new',
                    date: this.formatDate(new Date(d.create_date)),
                    create_date: d.create_date,
                })),
                ...collaborations.map(c => ({
                    id: `collaboration_${c.id}`,
                    recordId: c.id,
                    name: c.name || '',
                    type: 'Collaboration',
                    model: 'collaboration.inquiry',
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
        const value = ev.target.value;
        if (value === 'custom') {
            this.state.showCustomDate = true;
            // Set default dates to last 30 days
            const today = new Date();
            const thirtyDaysAgo = new Date(today);
            thirtyDaysAgo.setDate(today.getDate() - 30);
            
            this.state.customDateTo = this.formatDateForInput(today);
            this.state.customDateFrom = this.formatDateForInput(thirtyDaysAgo);
            this.state.dateRangeDisplay = 'Custom Range';
        } else {
            this.state.showCustomDate = false;
            this.state.dateRange = parseInt(value) || 'all';
            
            // Update display text
            switch(value) {
                case '7':
                    this.state.dateRangeDisplay = 'Last 7 Days';
                    break;
                case '30':
                    this.state.dateRangeDisplay = 'Last 30 Days';
                    break;
                case '90':
                    this.state.dateRangeDisplay = 'Last 90 Days';
                    break;
                case 'all':
                    this.state.dateRangeDisplay = 'All Time';
                    break;
            }
            
            await this.loadData();
        }
    }

    async onCustomDateFromChange(ev) {
        const newDate = ev.target.value;
        const today = this.formatDateForInput(new Date());
        
        // Validate date
        if (newDate > today) {
            this.notification.add("Start date cannot be in the future.", {
                title: "Invalid Date",
                type: "danger",
            });
            ev.target.value = this.state.customDateFrom;
            return;
        }
        
        this.state.customDateFrom = newDate;
        
        if (this.state.customDateFrom && this.state.customDateTo) {
            if (this.validateDateRange(this.state.customDateFrom, this.state.customDateTo)) {
                await this.loadData();
            } else {
                // Reset to previous value if validation fails
                ev.target.value = '';
                this.state.customDateFrom = '';
            }
        }
    }

    async onCustomDateToChange(ev) {
        const newDate = ev.target.value;
        const today = this.formatDateForInput(new Date());
        
        // Validate date
        if (newDate > today) {
            this.notification.add("End date cannot be in the future.", {
                title: "Invalid Date",
                type: "danger",
            });
            ev.target.value = this.state.customDateTo;
            return;
        }
        
        this.state.customDateTo = newDate;
        
        if (this.state.customDateFrom && this.state.customDateTo) {
            if (this.validateDateRange(this.state.customDateFrom, this.state.customDateTo)) {
                await this.loadData();
            } else {
                // Reset to previous value if validation fails
                ev.target.value = '';
                this.state.customDateTo = '';
            }
        }
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

    openInquiryRecord(activity) {
        try {
            this.action.doAction({
                type: 'ir.actions.act_window',
                res_model: activity.model,
                res_id: activity.recordId,
                views: [[false, 'form']],
                view_mode: 'form',
                target: 'current',
            });
        } catch (error) {
            console.error("Error opening inquiry record:", error);
        }
    }
    
    openPartnerships() {
        this.action.doAction('forms_dashboard.action_partnership_inquiry');
    }
    
    openDonations() {
        this.action.doAction('forms_dashboard.action_donation_inquiry');
    }
    
    openCollaborations() {
        this.action.doAction('forms_dashboard.action_collaboration_inquiry');
    }
}

FormsDashboard.template = "forms_dashboard.MainDashboard";
FormsDashboard.components = {};

registry.category("actions").add("forms_dashboard_main", FormsDashboard);