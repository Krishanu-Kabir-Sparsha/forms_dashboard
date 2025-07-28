from odoo import models, fields, api

class CollaborationInquiry(models.Model):
    _name = 'collaboration.inquiry'
    _description = 'Collaboration Inquiry'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _rec_name = 'name'
    _order = 'create_date desc'

    name = fields.Char(string='Reference', required=True, copy=False, 
                      readonly=True, default='New', tracking=True)
    institution_name = fields.Char(string='Institution Name', required=True, tracking=True)
    contact_name = fields.Char(string='Contact Person', required=True, tracking=True)
    email = fields.Char(string='Email', required=True, tracking=True)
    phone = fields.Char(string='Phone')
    collaboration_type = fields.Selection([
        ('joint_prog', 'Joint Program'),
        ('faculty_ex', 'Faculty Exchange'),
        ('capacity', 'Capacity Building'),
        ('policy_res', 'Policy Research'),
        ('student_ex', 'Student Exchange'),
        ('multi', 'Multiple')
    ], string='Collaboration Type', required=True, tracking=True)
    institution_type = fields.Selection([
        ('uni', 'University'),
        ('research_inst', 'Research Institute'),
        ('gov', 'Govt. Agency'),
        ('ngo', 'NGO/Non-Profit'),
        ('intl_org', 'Intl. Organization')
    ], string='Institution Type')
    country = fields.Char(string='Country/Region')
    scope = fields.Text(string='Collaboration Scope')
    state = fields.Selection([
        ('new', 'New'),
        ('in_progress', 'In Progress'),
        ('approved', 'Approved'),
        ('done', 'Done'),
        ('cancelled', 'Cancelled'),
        ('declined', 'Declined'),
        ('active', 'Active')
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
                vals['name'] = self.env['ir.sequence'].next_by_code('collaboration.inquiry') or 'New'
        return super(CollaborationInquiry, self).create(vals_list)