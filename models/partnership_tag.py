from odoo import models, fields

class PartnershipTag(models.Model):
    _name = 'partnership.tag'
    _description = 'Partnership Tag'
    _order = 'name'

    name = fields.Char(string='Name', required=True)
    color = fields.Integer(string='Color Index')
    description = fields.Text(string='Description')
    active = fields.Boolean(default=True)