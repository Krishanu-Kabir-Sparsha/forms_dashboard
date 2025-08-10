from odoo import models, fields, api
from odoo.exceptions import UserError

class DonationInquiry(models.Model):
    _name = 'donation.inquiry'
    _description = 'Donation Inquiry'
    _inherit = ['mail.thread', 'mail.activity.mixin']
    _rec_name = 'name'
    _order = 'create_date desc'

    name = fields.Char(string='Reference', required=True, copy=False, 
                      readonly=True, default='New', tracking=True)
    donor_name = fields.Char(string='Donor Name', required=True, tracking=True, readonly=True, states={'draft': [('readonly', False)]})
    email = fields.Char(string='Email', required=True, tracking=True, readonly=True, states={'draft': [('readonly', False)]})
    phone = fields.Char(string='Phone', readonly=True, states={'draft': [('readonly', False)]})
    donation_type = fields.Selection([
        ('scholarship', 'Scholarship'),
        ('research', 'Research Grant'),
        ('infra', 'Infrastructure'),
        ('endow', 'Endowment'),
        ('general', 'General Support')
    ], string='Donation Type', required=True, tracking=True, readonly=True, states={'draft': [('readonly', False)]})
    amount_range = fields.Selection([
        ('1k-5k', '$1k - $5k'),
        ('5k-10k', '$5k - $10k'),
        ('10k-25k', '$10k - $25k'),
        ('25k+', '$25k+')
    ], string='Amount Range', readonly=True, states={'draft': [('readonly', False)]})
    recognition = fields.Selection([
        ('public', 'Public'),
        ('anon', 'Anonymous'),
        ('discuss', 'Discuss Later')
    ], string='Recognition', readonly=True, states={'draft': [('readonly', False)]})
    interest_areas = fields.Text(string='Interest Areas', readonly=True, states={'draft': [('readonly', False)]})
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
    
    # Financial tracking fields
    actual_amount = fields.Monetary(string='Actual Amount', currency_field='currency_id')
    currency_id = fields.Many2one('res.currency', string='Currency', 
                                 default=lambda self: self.env.company.currency_id)
    payment_method = fields.Char(string='Payment Method')
    payment_date = fields.Date(string='Payment Date')
    
    # Recognition tracking
    recognition_implemented = fields.Boolean(string='Recognition Implemented')
    recognition_notes = fields.Text(string='Recognition Notes')
    
    # Track state changes
    state_history = fields.One2many('inquiry.state.history', 'donation_inquiry_id', string='State History')

    @api.depends('source')
    def _compute_is_website_submission(self):
        for record in self:
            record.is_website_submission = record.source == 'website'

    @api.depends('activity_ids')
    def _compute_activity_count(self):
        for record in self:
            record.activity_count = len(record.activity_ids)

    @api.model_create_multi
    def create(self, vals_list):
        for vals in vals_list:
            if vals.get('name', 'New') == 'New':
                vals['name'] = self.env['ir.sequence'].next_by_code('donation.inquiry') or 'New'
        return super(DonationInquiry, self).create(vals_list)
    
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
            'donation_inquiry_id': self.id,
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

    def action_commit(self):
        for record in self:
            if record.state != 'in_progress':
                raise UserError('Only inquiries in progress can be marked as committed.')
            old_state = record.state
            record.state = 'committed'
            record._track_state_change(old_state, 'committed', 'Donation committed')
            record.message_post(body='Donation has been committed')

    def action_receive(self):
        for record in self:
            if record.state != 'committed':
                raise UserError('Only committed donations can be marked as received.')
            old_state = record.state
            record.state = 'received'
            record._track_state_change(old_state, 'received', 'Donation received')
            record.message_post(body='Donation has been received')

    def action_done(self):
        for record in self:
            if record.state != 'received':
                raise UserError('Only received donations can be completed.')
            old_state = record.state
            record.state = 'done'
            record._track_state_change(old_state, 'done', 'Process completed')
            record.message_post(body='Donation process completed')

    def action_cancel(self):
        for record in self:
            if record.state in ['done', 'cancelled', 'declined']:
                raise UserError('Cannot cancel from current state.')
            old_state = record.state
            record.state = 'cancelled'
            record._track_state_change(old_state, 'cancelled', 'Inquiry cancelled')
            record.message_post(body='Donation inquiry has been cancelled')

    def action_decline(self):
        for record in self:
            if record.state in ['done', 'cancelled', 'declined']:
                raise UserError('Cannot decline from current state.')
            old_state = record.state
            record.state = 'declined'
            record._track_state_change(old_state, 'declined', 'Inquiry declined')
            record.message_post(body='Donation inquiry has been declined')

    def action_reset_draft(self):
        for record in self:
            if record.state not in ['cancelled', 'declined']:
                raise UserError('Can only reset cancelled or declined inquiries.')
            old_state = record.state
            record.state = 'new'
            record._track_state_change(old_state, 'new', 'Reset to new')
            record.message_post(body='Inquiry reset to New status')