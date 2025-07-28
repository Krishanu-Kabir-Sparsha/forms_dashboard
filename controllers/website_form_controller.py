from odoo import http
from odoo.http import request
import logging

_logger = logging.getLogger(__name__)

class FormsDashboardWebsite(http.Controller):
    @http.route('/website_form/partnership.inquiry', type='http', auth="public", methods=['POST'], website=True, csrf=False)
    def submit_partnership(self, **kw):
        try:
            vals = {
                'company_name': kw.get('company_name'),
                'contact_person': kw.get('contact_person'),
                'email': kw.get('email'),
                'phone': kw.get('phone'),
                'partnership_type': kw.get('partnership_type'),
                'company_size': kw.get('company_size'),
                'industry': kw.get('industry'),
                'goals': kw.get('partnership_goals'),
                'source': 'website',
                'state': 'new'
            }
            
            inquiry = request.env['partnership.inquiry'].sudo().create(vals)
            return request.render('forms_dashboard.form_success', {
                'inquiry': inquiry
            })
        except Exception as e:
            _logger.error("Partnership form error: %s", str(e))
            return request.render('forms_dashboard.form_error', {
                'error': str(e)
            })

    @http.route('/website_form/donation.inquiry', type='http', auth="public", methods=['POST'], website=True, csrf=False)
    def submit_donation(self, **kw):
        try:
            vals = {
                'donor_name': kw.get('donor_name'),
                'email': kw.get('email'),
                'phone': kw.get('phone'),
                'donation_type': kw.get('donation_type'),
                'amount_range': kw.get('donation_amount'),
                'recognition': kw.get('recognition'),
                'interest_areas': kw.get('interest_areas'),
                'source': 'website',
                'state': 'new'
            }
            
            inquiry = request.env['donation.inquiry'].sudo().create(vals)
            return request.render('forms_dashboard.form_success', {
                'inquiry': inquiry
            })
        except Exception as e:
            _logger.error("Donation form error: %s", str(e))
            return request.render('forms_dashboard.form_error', {
                'error': str(e)
            })

    @http.route('/website_form/collaboration.inquiry', type='http', auth="public", methods=['POST'], website=True, csrf=False)
    def submit_collaboration(self, **kw):
        try:
            vals = {
                'institution_name': kw.get('institution_name'),
                'contact_name': kw.get('contact_name'),
                'email': kw.get('email'),
                'phone': kw.get('phone'),
                'collaboration_type': kw.get('collaboration_type'),
                'institution_type': kw.get('institution_type'),
                'country': kw.get('country'),
                'scope': kw.get('collaboration_scope'),
                'source': 'website',
                'state': 'new'
            }
            
            inquiry = request.env['collaboration.inquiry'].sudo().create(vals)
            return request.render('forms_dashboard.form_success', {
                'inquiry': inquiry
            })
        except Exception as e:
            _logger.error("Collaboration form error: %s", str(e))
            return request.render('forms_dashboard.form_error', {
                'error': str(e)
            })