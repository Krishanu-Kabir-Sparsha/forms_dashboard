from odoo import models, fields, api
from odoo.exceptions import UserError

class PartnershipInquiry(models.Model):
    _name = 'partnership.inquiry'
    _description = 'Partnership Inquiry'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _rec_name = 'name'
    _order = 'create_date desc'

    name = fields.Char(string='Reference', required=True, copy=False, 
                      readonly=True, default='New', tracking=True)
    company_name = fields.Char(string='Company Name', required=True, tracking=True, readonly=True, states={'draft': [('readonly', False)]})
    contact_person = fields.Char(string='Contact Person', required=True, tracking=True, readonly=True, states={'draft': [('readonly', False)]})
    email = fields.Char(string='Email', required=True, tracking=True, readonly=True, states={'draft': [('readonly', False)]})
    phone = fields.Char(string='Phone', readonly=True, states={'draft': [('readonly', False)]})
    partnership_type = fields.Selection([
        ('research', 'Research Collaboration'),
        ('talent', 'Talent Pipeline'),
        ('infra', 'Infrastructure'),
        ('tech', 'Tech Transfer'),
        ('multi', 'Multiple Areas')
    ], string='Partnership Type', required=True, tracking=True, readonly=True, states={'draft': [('readonly', False)]})
    company_size = fields.Selection([
        ('startup', 'Startup (1-50)'),
        ('medium', 'Medium (51-500)'),
        ('large', 'Large (500+)')
    ], string='Company Size', readonly=True, states={'draft': [('readonly', False)]})
    industry = fields.Char(string='Industry/Sector', readonly=True, states={'draft': [('readonly', False)]})
    goals = fields.Text(string='Partnership Goals', readonly=True, states={'draft': [('readonly', False)]})
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
    
    # Additional fields
    color = fields.Integer(string='Color Index')
    activity_count = fields.Integer(compute='_compute_activity_count')

    # Change internal_notes from Text to Html for rich text editor
    internal_notes = fields.Html(
        string='Internal Notes',
        sanitize=True,
        sanitize_attributes=False,
        sanitize_form=False
    )

    # Add computed field to check if record is from website
    is_website_submission = fields.Boolean(
        compute='_compute_is_website_submission',
        store=True
    )

    @api.depends('source')
    def _compute_is_website_submission(self):
        for record in self:
            record.is_website_submission = record.source == 'website'
    
    # Track state changes
    state_history = fields.One2many('inquiry.state.history', 'partnership_inquiry_id', string='State History')

    @api.depends('activity_ids')
    def _compute_activity_count(self):
        for record in self:
            record.activity_count = len(record.activity_ids)

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get('name', 'New') == 'New':
                vals['name'] = self.env['ir.sequence'].next_by_code('partnership.inquiry') or 'New'
        return super(PartnershipInquiry, self).create(vals_list)
    
    # Add method to schedule activity programmatically
    def schedule_activity(self, activity_type_id, summary, date_deadline, user_id=None):
        """Helper method to schedule activities"""
        self.ensure_one()
        activity_vals = {
            'activity_type_id': activity_type_id,
            'summary': summary,
            'date_deadline': date_deadline,
            'res_model_id': self.env['ir.model']._get(self._name).id,
            'res_id': self.id,
            'user_id': user_id or self.env.user.id,
        }
        return self.env['mail.activity'].create(activity_vals)
    
    def action_schedule_activity(self):
        """Open activity scheduling popup"""
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': 'Schedule Activity',
            'res_model': 'mail.activity',
            'view_mode': 'form',
            'target': 'new',  # Opens as popup
            'context': {
                'default_res_id': self.id,
                'default_res_model': self._name,
                'default_res_model_id': self.env['ir.model']._get(self._name).id,
                'default_user_id': self.env.user.id,
            }
        }

    def action_view_activities(self):
        self.ensure_one()
        return {
            'type': 'ir.actions.act_window',
            'name': f'Activities - {self.name}',
            'res_model': 'mail.activity',
            'view_mode': 'list,form',
            'domain': [('res_id', '=', self.id), ('res_model', '=', self._name)],
            'context': {
                'default_res_id': self.id,
                'default_res_model': self._name,
                'default_res_model_id': self.env['ir.model']._get(self._name).id,
                'default_user_id': self.env.user.id,
            },
            'target': 'current',
        }

    def _track_state_change(self, old_state, new_state, note=''):
        self.ensure_one()
        self.env['inquiry.state.history'].create({
            'partnership_inquiry_id': self.id,
            'date': fields.Datetime.now(),
            'user_id': self.env.user.id,
            'old_state': old_state,
            'new_state': new_state,
            'note': note
        })

    def action_set_in_progress(self):
        for record in self:
            if record.state != 'new':
                raise UserError('Only new inquiries can be set to in progress.')
            old_state = record.state
            record.state = 'in_progress'
            record._track_state_change(old_state, 'in_progress', 'Started review process')
            record.message_post(body='Status changed to In Progress')

    def action_qualify(self):
        for record in self:
            if record.state != 'in_progress':
                raise UserError('Only inquiries in progress can be qualified.')
            old_state = record.state
            record.state = 'qualified'
            record._track_state_change(old_state, 'qualified', 'Inquiry qualified')
            record.message_post(body='Partnership inquiry has been qualified')

    def action_convert(self):
        for record in self:
            if record.state != 'qualified':
                raise UserError('Only qualified inquiries can be converted.')
            old_state = record.state
            record.state = 'converted'
            record._track_state_change(old_state, 'converted', 'Converted to partner')
            record.message_post(body='Successfully converted to partner')

    def action_done(self):
        for record in self:
            if record.state not in ['qualified', 'converted']:
                raise UserError('Invalid state transition.')
            old_state = record.state
            record.state = 'done'
            record._track_state_change(old_state, 'done', 'Process completed')
            record.message_post(body='Inquiry process completed')

    def action_cancel(self):
        for record in self:
            if record.state in ['done', 'cancelled', 'declined']:
                raise UserError('Cannot cancel from current state.')
            old_state = record.state
            record.state = 'cancelled'
            record._track_state_change(old_state, 'cancelled', 'Inquiry cancelled')
            record.message_post(body='Inquiry has been cancelled')

    def action_decline(self):
        for record in self:
            if record.state in ['done', 'cancelled', 'declined']:
                raise UserError('Cannot decline from current state.')
            old_state = record.state
            record.state = 'declined'
            record._track_state_change(old_state, 'declined', 'Inquiry declined')
            record.message_post(body='Inquiry has been declined')

    def action_reset_draft(self):
        for record in self:
            if record.state not in ['cancelled', 'declined']:
                raise UserError('Can only reset cancelled or declined inquiries.')
            old_state = record.state
            record.state = 'new'
            record._track_state_change(old_state, 'new', 'Reset to new')
            record.message_post(body='Inquiry reset to New status')