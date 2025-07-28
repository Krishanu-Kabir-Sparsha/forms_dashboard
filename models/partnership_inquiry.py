from odoo import models, fields, api

class PartnershipInquiry(models.Model):
    _name = 'partnership.inquiry'
    _description = 'Partnership Inquiry'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _rec_name = 'name'
    _order = 'create_date desc'

    name = fields.Char(string='Reference', required=True, copy=False, 
                      readonly=True, default='New', tracking=True)
    company_name = fields.Char(string='Company Name', required=True, tracking=True)
    contact_person = fields.Char(string='Contact Person', required=True, tracking=True)
    email = fields.Char(string='Email', required=True, tracking=True)
    phone = fields.Char(string='Phone')
    partnership_type = fields.Selection([
        ('research', 'Research Collaboration'),
        ('talent', 'Talent Pipeline'),
        ('infra', 'Infrastructure'),
        ('tech', 'Tech Transfer'),
        ('multi', 'Multiple Areas')
    ], string='Partnership Type', required=True, tracking=True)
    company_size = fields.Selection([
        ('startup', 'Startup (1-50)'),
        ('medium', 'Medium (51-500)'),
        ('large', 'Large (500+)')
    ], string='Company Size')
    industry = fields.Char(string='Industry/Sector')
    goals = fields.Text(string='Partnership Goals')
    state = fields.Selection([
        ('new', 'New'),
        ('in_progress', 'In Progress'),
        ('qualified', 'Qualified'),
        ('done', 'Done'),
        ('cancelled', 'Cancelled'),
        ('declined', 'Declined'),
        ('converted', 'Converted')
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
                vals['name'] = self.env['ir.sequence'].next_by_code('partnership.inquiry') or 'New'
        return super(PartnershipInquiry, self).create(vals_list)