from odoo import models, fields, api
from datetime import datetime, timedelta

class FormsDashboard(models.Model):
    _name = 'forms.dashboard'
    _description = 'Forms Dashboard'

    @api.model
    def get_recent_activity(self):
        """ Get recent activity across all inquiry types """
        seven_days_ago = fields.Datetime.now() - timedelta(days=7)
        
        # Get recent partnerships
        partnerships = self.env['partnership.inquiry'].search_read(
            domain=[('create_date', '>=', seven_days_ago)],
            fields=['name', 'state', 'create_date'],
            limit=10,
            order='create_date desc'
        )

        # Get recent donations
        donations = self.env['donation.inquiry'].search_read(
            domain=[('create_date', '>=', seven_days_ago)],
            fields=['name', 'state', 'create_date'],
            limit=10,
            order='create_date desc'
        )

        # Get recent collaborations
        collaborations = self.env['collaboration.inquiry'].search_read(
            domain=[('create_date', '>=', seven_days_ago)],
            fields=['name', 'state', 'create_date'],
            limit=10,
            order='create_date desc'
        )

        # Combine and sort all activities
        all_activities = []
        for p in partnerships:
            all_activities.append({
                'id': f"p_{p['id']}",
                'name': p['name'],
                'type': 'Partnership',
                'state': p['state'],
                'date': fields.Datetime.to_string(p['create_date']),
            })
        
        for d in donations:
            all_activities.append({
                'id': f"d_{d['id']}",
                'name': d['name'],
                'type': 'Donation',
                'state': d['state'],
                'date': fields.Datetime.to_string(d['create_date']),
            })
            
        for c in collaborations:
            all_activities.append({
                'id': f"c_{c['id']}",
                'name': c['name'],
                'type': 'Collaboration',
                'state': c['state'],
                'date': fields.Datetime.to_string(c['create_date']),
            })

        return sorted(all_activities, key=lambda x: x['date'], reverse=True)[:10]

class PartnershipInquiry(models.Model):
    _inherit = 'partnership.inquiry'

    @api.model
    def get_dashboard_data(self):
        return {
            'total': self.search_count([]),
            'new': self.search_count([('state', '=', 'new')]),
        }

class DonationInquiry(models.Model):
    _inherit = 'donation.inquiry'

    @api.model
    def get_dashboard_data(self):
        return {
            'total': self.search_count([]),
            'new': self.search_count([('state', '=', 'new')]),
        }

class CollaborationInquiry(models.Model):
    _inherit = 'collaboration.inquiry'

    @api.model
    def get_dashboard_data(self):
        return {
            'total': self.search_count([]),
            'new': self.search_count([('state', '=', 'new')]),
        }