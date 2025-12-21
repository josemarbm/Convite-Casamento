import os
from models import db, Guest, MessageTemplate, Group, ScheduledSend, Settings

def init_db(app):
    """Initialize the database and create all tables"""
    with app.app_context():
        db.create_all()
        
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
        
        # Create default settings if they don't exist
        default_settings = {
            'evolution_api_url': os.getenv('EVOLUTION_API_URL', 'http://127.0.0.1:8080'),
            'evolution_api_key': os.getenv('EVOLUTION_API_KEY', '12345'),
            'evolution_session_id': os.getenv('EVOLUTION_SESSION_ID', 'default'),
            'image_path': 'convite.png',
            'theme': 'dark'
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
