from odoo import models, fields, api
from odoo.exceptions import UserError

class CollaborationInquiry(models.Model):
    _name = 'collaboration.inquiry'
    _description = 'Collaboration Inquiry'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _rec_name = 'name'
    _order = 'create_date desc'

    name = fields.Char(string='Reference', required=True, copy=False, 
                      readonly=True, default='New', tracking=True)
    institution_name = fields.Char(string='Institution Name', required=True, tracking=True, readonly=True, states={'draft': [('readonly', False)]})
    contact_name = fields.Char(string='Contact Person', required=True, tracking=True, readonly=True, states={'draft': [('readonly', False)]})
    email = fields.Char(string='Email', required=True, tracking=True, readonly=True, states={'draft': [('readonly', False)]})
    phone = fields.Char(string='Phone', readonly=True, states={'draft': [('readonly', False)]})
    collaboration_type = fields.Selection([
        ('joint_prog', 'Joint Program'),
        ('faculty_ex', 'Faculty Exchange'),
        ('capacity', 'Capacity Building'),
        ('policy_res', 'Policy Research'),
        ('student_ex', 'Student Exchange'),
        ('multi', 'Multiple')
    ], string='Collaboration Type', required=True, tracking=True, readonly=True, states={'draft': [('readonly', False)]})
    institution_type = fields.Selection([
        ('uni', 'University'),
        ('research_inst', 'Research Institute'),
        ('gov', 'Govt. Agency'),
        ('ngo', 'NGO/Non-Profit'),
        ('intl_org', 'Intl. Organization')
    ], string='Institution Type', readonly=True, states={'draft': [('readonly', False)]})
    country = fields.Char(string='Country/Region', readonly=True, states={'draft': [('readonly', False)]})
    scope = fields.Text(string='Collaboration Scope', readonly=True, states={'draft': [('readonly', False)]})
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
    
    # Agreement fields
    agreement_signed = fields.Boolean(string='Agreement Signed')
    agreement_date = fields.Date(string='Agreement Date')
    agreement_reference = fields.Char(string='Agreement Reference')
    
    # Collaboration period
    start_date = fields.Date(string='Start Date')
    end_date = fields.Date(string='End Date')
    is_active = fields.Boolean(string='Is Active', compute='_compute_is_active')
    
    # Key contacts
    key_contacts = fields.One2many('collaboration.contact', 'collaboration_id', string='Key Contacts')
    
    # Track state changes
    state_history = fields.One2many('inquiry.state.history', 'collaboration_inquiry_id', string='State History')

    @api.depends('source')
    def _compute_is_website_submission(self):
        for record in self:
            record.is_website_submission = record.source == 'website'

    @api.depends('activity_ids')
    def _compute_activity_count(self):
        for record in self:
            record.activity_count = len(record.activity_ids)

    @api.depends('start_date', 'end_date', 'state')
    def _compute_is_active(self):
        today = fields.Date.today()
        for record in self:
            if record.state == 'active' and record.start_date and record.end_date:
                record.is_active = record.start_date <= today <= record.end_date
            else:
                record.is_active = False

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get('name', 'New') == 'New':
                vals['name'] = self.env['ir.sequence'].next_by_code('collaboration.inquiry') or 'New'
        return super(CollaborationInquiry, self).create(vals_list)
    
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
            'collaboration_inquiry_id': self.id,
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

    def action_approve(self):
        for record in self:
            if record.state != 'in_progress':
                raise UserError('Only inquiries in progress can be approved.')
            old_state = record.state
            record.state = 'approved'
            record._track_state_change(old_state, 'approved', 'Collaboration approved')
            record.message_post(body='Collaboration has been approved')

    def action_activate(self):
        for record in self:
            if record.state != 'approved':
                raise UserError('Only approved collaborations can be activated.')
            old_state = record.state
            record.state = 'active'
            record._track_state_change(old_state, 'active', 'Collaboration activated')
            record.message_post(body='Collaboration is now active')

    def action_done(self):
        for record in self:
            if record.state != 'active':
                raise UserError('Only active collaborations can be completed.')
            old_state = record.state
            record.state = 'done'
            record._track_state_change(old_state, 'done', 'Collaboration completed')
            record.message_post(body='Collaboration completed')

    def action_cancel(self):
        for record in self:
            if record.state in ['done', 'cancelled', 'declined']:
                raise UserError('Cannot cancel from current state.')
            old_state = record.state
            record.state = 'cancelled'
            record._track_state_change(old_state, 'cancelled', 'Collaboration cancelled')
            record.message_post(body='Collaboration has been cancelled')

    def action_decline(self):
        for record in self:
            if record.state in ['done', 'cancelled', 'declined']:
                raise UserError('Cannot decline from current state.')
            old_state = record.state
            record.state = 'declined'
            record._track_state_change(old_state, 'declined', 'Collaboration declined')
            record.message_post(body='Collaboration has been declined')

    def action_reset_draft(self):
        for record in self:
            if record.state not in ['cancelled', 'declined']:
                raise UserError('Can only reset cancelled or declined inquiries.')
            old_state = record.state
            record.state = 'new'
            record._track_state_change(old_state, 'new', 'Reset to new')
            record.message_post(body='Inquiry reset to New status')