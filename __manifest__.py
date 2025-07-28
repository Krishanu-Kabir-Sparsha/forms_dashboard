{
    'name': 'Forms Dashboard',
    'version': '18.0.1.0.0',
    'category': 'Website',
    'summary': 'Dashboard for Website Form Submissions',
    'description': """
        Custom dashboard module to manage and view form submissions from the website:
        - Corporate Partnership Inquiries
        - Donation Inquiries
        - Institutional Collaboration Inquiries
    """,
    'author': 'Krishanu Kabir Sparsha',
    'depends': [
        'base',
        'web',
        'website',
        'mail',
    ],
    'data': [
        'security/forms_dashboard_security.xml',
        'security/ir.model.access.csv',
        'data/sequence_data.xml',
        'views/partnership_views.xml',
        'views/donation_views.xml',
        'views/collaboration_views.xml',
        'views/dashboard_views.xml',
        'views/form_response_templates.xml',
        # 'views/website_templates.xml', 
        'views/menu_views.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'https://cdn.jsdelivr.net/npm/chart.js@3.7.0/dist/chart.min.js',
            'forms_dashboard/static/src/js/dashboard.js',
            'forms_dashboard/static/src/css/dashboard.css',
            'forms_dashboard/static/src/xml/dashboard.xml', 
        ],
    },
    'installable': True,
    'application': True,
    'auto_install': False,
    'sequence': 1,
    'license': 'LGPL-3',
}