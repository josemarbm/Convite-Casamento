import os
from sqlalchemy import inspect, text
from models import db, Guest, MessageTemplate, Group, ScheduledSend, Settings, User

def init_db(app):
    """Initialize the database and create all tables"""
    with app.app_context():
        db.create_all()
        # create_all does not add columns to existing databases; keep this small
        # additive migration so deployments with an existing guest list work.
        guest_columns = {column['name'] for column in inspect(db.engine).get_columns('guests')}
        additions = {
            'rsvp_token_hash': 'VARCHAR(64)',
            'rsvp_status': "VARCHAR(20) NOT NULL DEFAULT 'pending'",
            'rsvp_responded_at': 'DATETIME'
        }
        for column, definition in additions.items():
            if column not in guest_columns:
                db.session.execute(text(f'ALTER TABLE guests ADD COLUMN {column} {definition}'))
        db.session.commit()
        
        # Create default user if none exists
        if User.query.count() == 0:
            default_user = User(
                username='admin',
                email='admin@casamento.com'
            )
            default_user.set_password('admin123')
            db.session.add(default_user)
        
        # Create default message template if none exists
        if MessageTemplate.query.count() == 0:
            default_template = MessageTemplate(
                name='Convite Padrão',
                content="""Querido(a) *{nome}*,

📣 CHEGOU O GRANDE MOMENTO!! 🚨
É com muito carinho que enviamos o convite do nosso casamento! 💐 ❤️

Sua presença tornará nosso dia ainda mais especial.
🗓️ Por favor, confirme até *16/12/2025* no link abaixo

👉 Confirmar presença:
https://noivos.casar.com/gabrielaejosemar?preview_as_guest=1&_ref_=/one-page/home#/rsvp

🎁 Lista de presentes:
https://noivos.casar.com/gabrielaejosemar?preview_as_guest=1&_ref_=/one-page/home#/lista-de-presentes

🌐 Site do casamento:
http://noivos.casar.com/gabrielaejosemar

💒Local:
https://maps.app.goo.gl/5EXFabhRzoVqHhYP9

Com carinho,
_Gabriela & Josemar_ 💍💍""",
                is_default=True
            )
            db.session.add(default_template)
        else:
            # Move the bundled template from the old external RSVP page to this app's
            # per-guest link without changing user-created templates.
            legacy_rsvp_url = 'https://noivos.casar.com/gabrielaejosemar?preview_as_guest=1&_ref_=/one-page/home#/rsvp'
            default_template = MessageTemplate.query.filter_by(is_default=True).first()
            if default_template and legacy_rsvp_url in default_template.content:
                default_template.content = default_template.content.replace(legacy_rsvp_url, '{confirmacao_url}')
        
        # Create default settings if they don't exist
        default_settings = {
            'evolution_api_url': os.getenv('EVOLUTION_API_URL', 'http://127.0.0.1:8080'),
            'evolution_api_key': os.getenv('EVOLUTION_API_KEY', '12345'),
            'evolution_session_id': os.getenv('EVOLUTION_SESSION_ID', 'default'),
            'image_path': 'convite.png',
            'theme': 'dark',
            'couple_name': os.getenv('COUPLE_NAME', 'Gabriela & Josemar')
        }
        
        for key, value in default_settings.items():
            if not Settings.query.filter_by(key=key).first():
                setting = Settings(key=key, value=value)
                db.session.add(setting)
        
        db.session.commit()
        print("✅ Database initialized successfully!")

def get_setting(key, default=None):
    """Get a setting value"""
    setting = Settings.query.filter_by(key=key).first()
    return setting.value if setting else default

def set_setting(key, value):
    """Set a setting value"""
    setting = Settings.query.filter_by(key=key).first()
    if setting:
        setting.value = value
    else:
        setting = Settings(key=key, value=value)
        db.session.add(setting)
    db.session.commit()
