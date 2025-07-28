from odoo import models, fields, api

class DonationInquiry(models.Model):
    _name = 'donation.inquiry'
    _description = 'Donation Inquiry'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _rec_name = 'name'
    _order = 'create_date desc'

    name = fields.Char(string='Reference', required=True, copy=False, 
                      readonly=True, default='New', tracking=True)
    donor_name = fields.Char(string='Donor Name', required=True, tracking=True)
    email = fields.Char(string='Email', required=True, tracking=True)
    phone = fields.Char(string='Phone')
    donation_type = fields.Selection([
        ('scholarship', 'Scholarship'),
        ('research', 'Research Grant'),
        ('infra', 'Infrastructure'),
        ('endow', 'Endowment'),
        ('general', 'General Support')
    ], string='Donation Type', required=True, tracking=True)
    amount_range = fields.Selection([
        ('1k-5k', '$1k - $5k'),
        ('5k-10k', '$5k - $10k'),
        ('10k-25k', '$10k - $25k'),
        ('25k+', '$25k+')
    ], string='Amount Range')
    recognition = fields.Selection([
        ('public', 'Public'),
        ('anon', 'Anonymous'),
        ('discuss', 'Discuss Later')
    ], string='Recognition')
    interest_areas = fields.Text(string='Interest Areas')
    state = fields.Selection([
        ('new', 'New'),
        ('in_progress', 'In Progress'),
        ('committed', 'Committed'),
        ('done', 'Done'),
        ('cancelled', 'Cancelled'),
        ('declined', 'Declined'),
        ('received', 'Received')
    ], string='Status', default='new', tracking=True, required=True)

    date_submitted = fields.Datetime(
        string='Submission Date',
        default=fields.Datetime.now,
        readonly=True
    )
    
    source = fields.Selection([
        ('website', 'Website Form'),
        ('direct', 'Direct Entry'),
        ('import', 'Imported')
    ], string='Source', default='website', readonly=True)

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get('name', 'New') == 'New':
                vals['name'] = self.env['ir.sequence'].next_by_code('donation.inquiry') or 'New'
        return super(DonationInquiry, self).create(vals_list)