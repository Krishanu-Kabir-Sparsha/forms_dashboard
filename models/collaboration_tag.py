from odoo import models, fields

class CollaborationTag(models.Model):
    _name = 'collaboration.tag'
    _description = 'Collaboration Tag'
    _order = 'name'

    name = fields.Char(string='Name', required=True)
    color = fields.Integer(string='Color Index')
    description = fields.Text(string='Description')
    active = fields.Boolean(default=True)