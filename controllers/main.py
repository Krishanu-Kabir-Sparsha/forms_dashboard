from odoo import http
from odoo.http import request
import logging

_logger = logging.getLogger(__name__)

class FormsDashboard(http.Controller):
    
    @http.route('/website_form/partnership.inquiry', type='http', auth="public", methods=['POST'], website=True, csrf=False)
    def create_partnership_inquiry(self, **kwargs):
        _logger.info("Partnership form submitted with data: %s", kwargs)
        
        try:
            vals = {
                'company_name': kwargs.get('company_name', ''),
                'contact_person': kwargs.get('contact_person', ''),
                'email': kwargs.get('email', ''),
                'phone': kwargs.get('phone', ''),
                'partnership_type': kwargs.get('partnership_type', ''),
                'company_size': kwargs.get('company_size', ''),
                'industry': kwargs.get('industry', ''),
                'goals': kwargs.get('partnership_goals', ''),
                'source': 'website'
            }
            
            # Remove empty values
            vals = {k: v for k, v in vals.items() if v}
            
            # Create the record
            inquiry = request.env['partnership.inquiry'].sudo().create(vals)
            _logger.info("Partnership inquiry created with ID: %s", inquiry.id)
            
            # Return success response
            return request.render('forms_dashboard.form_success', {
                'form_type': 'Partnership',
                'inquiry_id': inquiry.name,
                'inquiry_details': vals
            })
            
        except Exception as e:
            _logger.error("Error creating partnership inquiry: %s", str(e))
            return request.render('forms_dashboard.form_error', {
                'error_message': str(e),
                'form_type': 'Partnership'
            })

    @http.route('/website_form/donation.inquiry', type='http', auth="public", methods=['POST'], website=True, csrf=False)
    def create_donation_inquiry(self, **kwargs):
        _logger.info("Donation form submitted with data: %s", kwargs)
        
        try:
            vals = {
                'donor_name': kwargs.get('donor_name', ''),
                'email': kwargs.get('email', ''),
                'phone': kwargs.get('phone', ''),
                'donation_type': kwargs.get('donation_type', ''),
                'amount_range': kwargs.get('amount_range', ''),
                'recognition': kwargs.get('recognition', ''),
                'interest_areas': kwargs.get('interest_areas', ''),
                'source': 'website'
            }
            
            # Remove empty values
            vals = {k: v for k, v in vals.items() if v}
            
            inquiry = request.env['donation.inquiry'].sudo().create(vals)
            _logger.info("Donation inquiry created with ID: %s", inquiry.id)
            
            return request.render('forms_dashboard.form_success', {
                'form_type': 'Donation',
                'inquiry_id': inquiry.name,
                'inquiry_details': vals
            })
            
        except Exception as e:
            _logger.error("Error creating donation inquiry: %s", str(e))
            return request.render('forms_dashboard.form_error', {
                'error_message': str(e),
                'form_type': 'Donation'
            })

    @http.route('/website_form/collaboration.inquiry', type='http', auth="public", methods=['POST'], website=True, csrf=False)
    def create_collaboration_inquiry(self, **kwargs):
        _logger.info("Collaboration form submitted with data: %s", kwargs)
        
        try:
            vals = {
                'institution_name': kwargs.get('institution_name', ''),
                'contact_name': kwargs.get('contact_name', ''),
                'email': kwargs.get('email', ''),
                'phone': kwargs.get('phone', ''),
                'collaboration_type': kwargs.get('collaboration_type', ''),
                'institution_type': kwargs.get('institution_type', ''),
                'country': kwargs.get('country', ''),
                'scope': kwargs.get('scope', ''),
                'source': 'website'
            }
            
            # Remove empty values
            vals = {k: v for k, v in vals.items() if v}
            
            inquiry = request.env['collaboration.inquiry'].sudo().create(vals)
            _logger.info("Collaboration inquiry created with ID: %s", inquiry.id)
            
            return request.render('forms_dashboard.form_success', {
                'form_type': 'Collaboration',
                'inquiry_id': inquiry.name,
                'inquiry_details': vals
            })
            
        except Exception as e:
            _logger.error("Error creating collaboration inquiry: %s", str(e))
            return request.render('forms_dashboard.form_error', {
                'error_message': str(e),
                'form_type': 'Collaboration'
            })