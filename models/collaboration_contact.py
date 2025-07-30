from odoo import models, fields

class CollaborationContact(models.Model):
    _name = 'collaboration.contact'
    _description = 'Collaboration Key Contact'
    
    name = fields.Char(string='Name', required=True)
    role = fields.Char(string='Role/Position')
    email = fields.Char(string='Email')
    phone = fields.Char(string='Phone')
    collaboration_id = fields.Many2one('collaboration.inquiry', string='Collaboration', ondelete='cascade')