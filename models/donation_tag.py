from odoo import models, fields

class DonationTag(models.Model):
    _name = 'donation.tag'
    _description = 'Donation Tag'
    _order = 'name'

    name = fields.Char(string='Name', required=True)
    color = fields.Integer(string='Color Index')
    description = fields.Text(string='Description')
    active = fields.Boolean(default=True)