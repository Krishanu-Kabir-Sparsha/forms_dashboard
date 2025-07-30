from odoo import models, fields

class InquiryStateHistory(models.Model):
    _name = 'inquiry.state.history'
    _description = 'Inquiry State History'
    _order = 'date desc'

    date = fields.Datetime(string='Date', required=True)
    user_id = fields.Many2one('res.users', string='User', required=True)
    old_state = fields.Char(string='From State')
    new_state = fields.Char(string='To State')
    note = fields.Text(string='Note')
    
    # Relations to different inquiry types
    partnership_inquiry_id = fields.Many2one('partnership.inquiry', string='Partnership Inquiry', ondelete='cascade')
    donation_inquiry_id = fields.Many2one('donation.inquiry', string='Donation Inquiry', ondelete='cascade')
    collaboration_inquiry_id = fields.Many2one('collaboration.inquiry', string='Collaboration Inquiry', ondelete='cascade')