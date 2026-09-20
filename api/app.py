from apiflask import APIFlask
from flask import request, jsonify, send_file
from flask_cors import CORS
from dotenv import load_dotenv
import os
import re
import hashlib
import secrets
from urllib.parse import quote
from datetime import datetime, timedelta
from werkzeug.utils import secure_filename
from functools import wraps
import jwt
import pandas as pd
from io import BytesIO
from PIL import Image, UnidentifiedImageError

# Load environment variables
load_dotenv()

# Import models and services
from models import db, Guest, MessageTemplate, Group, ScheduledSend, Settings, User
from database import init_db, get_setting, set_setting
from services.whatsapp_service import WhatsAppService
from services.scheduler_service import get_scheduler

# Create Flask app with APIFlask for automatic Swagger documentation
app = APIFlask(
    __name__,
    title='Wedding Invitation API',
    version='1.0.0',
    docs_ui='swagger-ui'
)

# Configure security for Swagger/OpenAPI
app.config['API_SECURITY_SCHEMES'] = {
    'Bearer': {
        'type': 'http',
        'scheme': 'bearer',
        'bearerFormat': 'JWT',
        'description': 'Enter your JWT token'
    }
}
app.config['API_SECURITY'] = [
    {'Bearer': []}
]

app.config['SECRET_KEY'] = os.getenv('FLASK_SECRET_KEY', 'dev-secret-key')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'mysql+pymysql://wedding_user:wedding_pass_2024@localhost:3306/wedding_invites')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Enable CORS
CORS(app)

# Initialize database
db.init_app(app)

# Create uploads folder
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Global WhatsApp service instance (lazy initialization)
_whatsapp_service = None

def get_whatsapp_service():
    """Get or create WhatsApp service instance"""
    global _whatsapp_service
    if _whatsapp_service is None:
        _whatsapp_service = WhatsAppService()
    return _whatsapp_service

# ===== AUTHENTICATION MIDDLEWARE =====

def token_required(f):
    """Decorator to protect routes with JWT token verification"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = None
        
        # Check for token in headers
        if 'Authorization' in request.headers:
            auth_header = request.headers['Authorization']
            try:
                token = auth_header.split(" ")[1]
            except IndexError:
                return jsonify({'error': 'Invalid token format'}), 401
        
        if not token:
            return jsonify({'error': 'Token is missing'}), 401
        
        try:
            data = jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
            current_user = db.session.get(User, data['user_id'])
            
            if not current_user or not current_user.is_active:
                return jsonify({'error': 'User not found or inactive'}), 401
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        
        return f(current_user, *args, **kwargs)
    
    return decorated

# ===== AUTHENTICATION ENDPOINTS =====

@app.route('/api/auth/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        data = request.get_json()
        
        # Validate input
        if not data.get('username') or not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Check if user already exists
        if User.query.filter_by(username=data['username']).first():
            return jsonify({'error': 'Username already exists'}), 400
        
        if User.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'Email already exists'}), 400
        
        # Create new user
        user = User(
            username=data['username'],
            email=data['email']
        )
        user.set_password(data['password'])
        
        db.session.add(user)
        db.session.commit()
        
        return jsonify({
            'message': 'User created successfully',
            'user': user.to_dict()
        }), 201
    
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@app.route('/api/auth/login', methods=['POST'])
def login():
    """
    Login user and return JWT token
    ---
    tags:
      - Authentication
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - username
            - password
          properties:
            username:
              type: string
              example: "admin"
            password:
              type: string
              example: "admin123"
    responses:
      200:
        description: Login successful
        schema:
          type: object
          properties:
            message:
              type: string
            token:
              type: string
              description: JWT Token (valid for 30 days)
            user:
              type: object
              properties:
                id:
                  type: integer
                username:
                  type: string
                email:
                  type: string
                is_active:
                  type: boolean
      400:
        description: Missing required fields
      401:
        description: Invalid credentials
    """
    try:
        data = request.get_json()
        
        if not data.get('username') or not data.get('password'):
            return jsonify({'error': 'Username and password required'}), 400
        
        user = User.query.filter_by(username=data['username']).first()
        
        if not user or not user.check_password(data['password']):
            return jsonify({'error': 'Invalid username or password'}), 401
        
        if not user.is_active:
            return jsonify({'error': 'User account is inactive'}), 401
        
        # Generate JWT token
        token = jwt.encode(
            {
                'user_id': user.id,
                'username': user.username,
                'exp': datetime.utcnow() + timedelta(days=30)
            },
            app.config['SECRET_KEY'],
            algorithm='HS256'
        )
        
        return jsonify({
            'message': 'Login successful',
            'token': token,
            'user': user.to_dict()
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/api/auth/me', methods=['GET'])
@token_required
def get_current_user(current_user):
    """
    Get current authenticated user info
    
    ---
    tags:
      - Authentication
    security:
      - Bearer: []
    responses:
      200:
        description: Current user information
      401:
        description: Unauthorized - Invalid or missing token
    """
    return jsonify(current_user.to_dict()), 200

@app.route('/api/guests', methods=['GET'])
@token_required
def get_guests(current_user):
    """
    Get all guests with optional filtering and pagination
    
    ---
    tags:
      - Guests
    security:
      - Bearer: []
    parameters:
      - name: page
        in: query
        type: integer
        default: 1
      - name: per_page
        in: query
        type: integer
        default: 50
      - name: search
        in: query
        type: string
        description: Search by name or phone
      - name: status
        in: query
        type: string
        enum: [pending, sent, failed]
      - name: group_id
        in: query
        type: integer
    responses:
      200:
        description: Guests list
      401:
        description: Unauthorized
    """
    try:
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 50, type=int)
        search = request.args.get('search', '', type=str)
        status = request.args.get('status', '', type=str)
        rsvp_status = request.args.get('rsvp_status', '', type=str)
        group_id = request.args.get('group_id', '', type=str)
        
        # Build query
        query = Guest.query
        
        # Apply filters
        if search:
            query = query.filter(Guest.name.contains(search) | Guest.phone.contains(search))
        if status:
            query = query.filter_by(status=status)
        if rsvp_status in {'pending', 'confirmed', 'declined'}:
            query = query.filter_by(rsvp_status=rsvp_status)
        if group_id:
            query = query.filter_by(group_id=int(group_id))
        
        # Paginate
        pagination = query.order_by(Guest.created_at.desc()).paginate(
            page=page, per_page=per_page, error_out=False
        )
        
        return jsonify({
            'guests': [guest.to_dict() for guest in pagination.items],
            'total': pagination.total,
            'page': page,
            'per_page': per_page,
            'pages': pagination.pages
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/guests/<int:guest_id>', methods=['GET'])
@token_required
def get_guest(current_user, guest_id):
    """Get a single guest"""
    guest = Guest.query.get_or_404(guest_id)
    return jsonify(guest.to_dict())

@app.route('/api/guests', methods=['POST'])
@token_required
def create_guest(current_user):
    """
    Create a new guest
    ---
    tags:
      - Guests
    security:
      - Bearer: []
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - name
            - phone
          properties:
            name:
              type: string
              example: "João Silva"
            phone:
              type: string
              example: "(11) 99999-9999"
            group_id:
              type: integer
              description: Optional group ID
    responses:
      201:
        description: Guest created successfully
      400:
        description: Invalid input
      401:
        description: Unauthorized
    """
    try:
        data = request.get_json()
        
        guest = Guest(
            name=data['name'],
            phone=data['phone'],
            group_id=data.get('group_id'),
            status='pending'
        )
        
        db.session.add(guest)
        db.session.commit()
        
        return jsonify(guest.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@app.route('/api/guests/<int:guest_id>', methods=['PUT'])
@token_required
def update_guest(current_user, guest_id):
    """
    Update a guest
    ---
    tags:
      - Guests
    security:
      - Bearer: []
    parameters:
      - name: guest_id
        in: path
        type: integer
        required: true
      - name: body
        in: body
        required: true
        schema:
          type: object
          properties:
            name:
              type: string
            phone:
              type: string
            group_id:
              type: integer
    responses:
      200:
        description: Guest updated successfully
      400:
        description: Invalid input
      401:
        description: Unauthorized
      404:
        description: Guest not found
    """
    try:
        guest = Guest.query.get_or_404(guest_id)
        data = request.get_json()
        
        guest.name = data.get('name', guest.name)
        guest.phone = data.get('phone', guest.phone)
        guest.group_id = data.get('group_id', guest.group_id)
        
        db.session.commit()
        
        return jsonify(guest.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@app.route('/api/guests/<int:guest_id>', methods=['DELETE'])
@token_required
def delete_guest(current_user, guest_id):
    """
    Delete a guest
    ---
    tags:
      - Guests
    security:
      - Bearer: []
    parameters:
      - name: guest_id
        in: path
        type: integer
        required: true
    responses:
      200:
        description: Guest deleted successfully
      401:
        description: Unauthorized
      404:
        description: Guest not found
    """
    try:
        guest = Guest.query.get_or_404(guest_id)
        db.session.delete(guest)
        db.session.commit()
        
        return jsonify({'message': 'Guest deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@app.route('/api/guests/import', methods=['POST'])
@token_required
def import_guests(current_user):
    """Import guests from Excel file"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        
        # Read Excel file
        df = pd.read_excel(file)
        
        # Map columns
        imported = 0
        skipped = 0
        
        for _, row in df.iterrows():
            name = row.get('Nome') or row.get('nome')
            phone = row.get('Telefone') or row.get('telefone')
            
            if not name or not phone:
                skipped += 1
                continue
            
            # Check if guest already exists
            existing = Guest.query.filter_by(phone=str(phone)).first()
            if existing:
                skipped += 1
                continue
            
            guest = Guest(name=str(name), phone=str(phone), status='pending')
            db.session.add(guest)
            imported += 1
        
        db.session.commit()
        
        return jsonify({
            'message': f'Imported {imported} guests, skipped {skipped}',
            'imported': imported,
            'skipped': skipped
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@app.route('/api/guests/export', methods=['GET'])
@token_required
def export_guests(current_user):
    """Export guests to Excel file"""
    try:
        guests = Guest.query.all()
        
        data = [{
            'Nome': guest.name,
            'Telefone': guest.phone,
            'Grupo': guest.group.name if guest.group else '',
            'Status': guest.status
        } for guest in guests]
        
        df = pd.DataFrame(data)
        
        # Create Excel file in memory
        output = BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, index=False, sheet_name='Convidados')
        output.seek(0)
        
        return send_file(
            output,
            mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            as_attachment=True,
            download_name=f'convidados-{datetime.now().strftime("%Y-%m-%d")}.xlsx'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ===== TEMPLATES ENDPOINTS =====

@app.route('/api/templates', methods=['GET'])
@token_required
def get_templates(current_user):
    """
    Get all message templates
    
    ---
    tags:
      - Templates
    security:
      - Bearer: []
    responses:
      200:
        description: List of templates
      401:
        description: Unauthorized
    """
    templates = MessageTemplate.query.order_by(MessageTemplate.created_at.desc()).all()
    return jsonify([template.to_dict() for template in templates])

@app.route('/api/templates/<int:template_id>', methods=['GET'])
@token_required
def get_template(current_user, template_id):
    """Get a single template"""
    template = MessageTemplate.query.get_or_404(template_id)
    return jsonify(template.to_dict())

@app.route('/api/templates', methods=['POST'])
@token_required
def create_template(current_user):
    """
    Create a new template
    
    ---
    tags:
      - Templates
    security:
      - Bearer: []
    parameters:
      - name: body
        in: body
        required: true
        schema:
          type: object
          required:
            - name
            - content
          properties:
            name:
              type: string
              example: "Convite Padrão"
            content:
              type: string
              example: "Olá {nome}, você está convidado!"
            is_default:
              type: boolean
    responses:
      201:
        description: Template created
      401:
        description: Unauthorized
    """
    try:
        data = request.get_json()
        
        # If setting as default, unset others
        if data.get('is_default'):
            MessageTemplate.query.update({'is_default': False})
        
        template = MessageTemplate(
            name=data['name'],
            content=data['content'],
            is_default=data.get('is_default', False)
        )
        
        db.session.add(template)
        db.session.commit()
        
        return jsonify(template.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@app.route('/api/templates/<int:template_id>', methods=['PUT'])
@token_required
def update_template(current_user, template_id):
    """Update a template"""
    try:
        template = MessageTemplate.query.get_or_404(template_id)
        data = request.get_json()
        
        template.name = data.get('name', template.name)
        template.content = data.get('content', template.content)
        
        if data.get('is_default') and not template.is_default:
            MessageTemplate.query.update({'is_default': False})
            template.is_default = True
        
        db.session.commit()
        
        return jsonify(template.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@app.route('/api/templates/<int:template_id>', methods=['DELETE'])
@token_required
def delete_template(current_user, template_id):
    """Delete a template"""
    try:
        template = MessageTemplate.query.get_or_404(template_id)
        
        if template.is_default:
            return jsonify({'error': 'Cannot delete default template'}), 400
        
        db.session.delete(template)
        db.session.commit()
        
        return jsonify({'message': 'Template deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

# ===== GROUPS ENDPOINTS =====

@app.route('/api/groups', methods=['GET'])
@token_required
def get_groups(current_user):
    """
    Get all groups
    
    ---
    tags:
      - Groups
    security:
      - Bearer: []
    responses:
      200:
        description: List of groups
      401:
        description: Unauthorized
    """
    groups = Group.query.order_by(Group.created_at.desc()).all()
    return jsonify([group.to_dict() for group in groups])

@app.route('/api/groups/<int:group_id>', methods=['GET'])
@token_required
def get_group(current_user, group_id):
    """Get a single group"""
    group = Group.query.get_or_404(group_id)
    return jsonify(group.to_dict())

@app.route('/api/groups', methods=['POST'])
@token_required
def create_group(current_user):
    """Create a new group"""
    try:
        data = request.get_json()
        
        group = Group(
            name=data['name'],
            description=data.get('description', '')
        )
        
        db.session.add(group)
        db.session.commit()
        
        return jsonify(group.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@app.route('/api/groups/<int:group_id>', methods=['PUT'])
@token_required
def update_group(current_user, group_id):
    """Update a group"""
    try:
        group = Group.query.get_or_404(group_id)
        data = request.get_json()
        
        group.name = data.get('name', group.name)
        group.description = data.get('description', group.description)
        
        db.session.commit()
        
        return jsonify(group.to_dict())
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@app.route('/api/groups/<int:group_id>', methods=['DELETE'])
@token_required
def delete_group(current_user, group_id):
    """Delete a group"""
    try:
        group = Group.query.get_or_404(group_id)
        db.session.delete(group)
        db.session.commit()
        
        return jsonify({'message': 'Group deleted successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

# ===== SENDING ENDPOINTS =====

def create_rsvp_url(guest):
    """Create a one-time RSVP link; only its SHA-256 digest is persisted."""
    token = secrets.token_urlsafe(32)
    guest.rsvp_token_hash = hashlib.sha256(token.encode()).hexdigest()
    guest.rsvp_status = 'pending'
    guest.rsvp_responded_at = None
    base_url = os.getenv('PUBLIC_APP_URL', 'http://192.168.0.216:3000').rstrip('/')
    return f'{base_url}/rsvp.html?token={quote(token)}'

def render_invitation_message(template_content, guest):
    rsvp_url = create_rsvp_url(guest)
    message = template_content.replace('{nome}', guest.name).replace('{confirmacao_url}', rsvp_url)
    if '{confirmacao_url}' not in template_content:
        message += f'\n\n👉 Confirme sua presença: {rsvp_url}'
    return message

@app.route('/api/send/direct', methods=['POST'])
@token_required
def send_direct(current_user):
    """Send messages directly to guests"""
    try:
        data = request.get_json()
        
        guest_ids = data.get('guest_ids', [])
        template_id = data.get('template_id')
        group_id = data.get('group_id')
        filters = data.get('filters', {})
        
        # Get template
        template = db.session.get(MessageTemplate, template_id) if template_id else MessageTemplate.query.filter_by(is_default=True).first()
        
        if not template:
            return jsonify({'error': 'No template found'}), 400
        
        # Get guests
        if guest_ids:
            guests = Guest.query.filter(Guest.id.in_(guest_ids)).all()
        elif group_id:
            guests = Guest.query.filter_by(group_id=group_id).all()
        else:
            # Apply filters if provided (for "Send to All")
            query = Guest.query
            
            if filters.get('search'):
                search = filters['search']
                query = query.filter(Guest.name.contains(search) | Guest.phone.contains(search))
            
            if filters.get('status'):
                query = query.filter_by(status=filters['status'])
                
            if filters.get('group_id'):
                query = query.filter_by(group_id=int(filters['group_id']))
                
            guests = query.all()
        
        if not guests:
            return jsonify({'error': 'No guests found'}), 400

        # Convites are sent with an image attachment. Do not mark guests as failed
        # one by one when the configured attachment was never uploaded.
        whatsapp = get_whatsapp_service()
        whatsapp._ensure_initialized()
        if not whatsapp.image_path or not os.path.isfile(whatsapp.image_path):
            return jsonify({
                'error': 'Imagem do convite não encontrada. Vá em Configurações e faça o upload da imagem antes de enviar.'
            }), 400
        
        # Send to each guest
        results = []
        for guest in guests:
            message = render_invitation_message(template.content, guest)
            
            result = whatsapp.send_message(
                phone=guest.phone,
                message=message,
                image_path=whatsapp.image_path
            )
            
            if result.get('success'):
                guest.status = 'sent'
                guest.sent_at = datetime.utcnow()
            else:
                guest.status = 'failed'
            
            results.append({
                'guest_id': guest.id,
                'name': guest.name,
                'success': result.get('success'),
                'error': result.get('error')
            })
        
        db.session.commit()
        
        success_count = len([r for r in results if r['success']])
        
        return jsonify({
            'message': f'Sent {success_count}/{len(results)} messages',
            'results': results
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

# ===== PUBLIC RSVP ENDPOINTS =====

def guest_from_rsvp_token(token):
    if not token or len(token) > 256:
        return None
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    return Guest.query.filter_by(rsvp_token_hash=token_hash).first()

@app.route('/api/rsvp/<string:token>', methods=['GET'])
def get_rsvp(token):
    guest = guest_from_rsvp_token(token)
    if not guest:
        return jsonify({'error': 'Link de confirmação inválido.'}), 404
    return jsonify({
        'guest_name': guest.name,
        'status': guest.rsvp_status or 'pending',
        'responded_at': guest.rsvp_responded_at.isoformat() if guest.rsvp_responded_at else None
    })

@app.route('/api/rsvp/<string:token>', methods=['POST'])
def submit_rsvp(token):
    guest = guest_from_rsvp_token(token)
    if not guest:
        return jsonify({'error': 'Link de confirmação inválido.'}), 404
    if guest.rsvp_status in {'confirmed', 'declined'}:
        return jsonify({'error': 'Esta resposta já foi registrada e não pode ser alterada.', 'status': guest.rsvp_status}), 409
    response = (request.get_json(silent=True) or {}).get('response')
    if response not in {'confirmed', 'declined'}:
        return jsonify({'error': 'Resposta inválida.'}), 400
    guest.rsvp_status = response
    guest.rsvp_responded_at = datetime.utcnow()
    db.session.commit()
    return jsonify({'message': 'Resposta registrada com sucesso.', 'status': guest.rsvp_status})

@app.route('/api/send/schedule', methods=['POST'])
@token_required
def schedule_send(current_user):
    """Schedule a send for later"""
    try:
        data = request.get_json()

        whatsapp = get_whatsapp_service()
        whatsapp._ensure_initialized()
        if not whatsapp.image_path or not os.path.isfile(whatsapp.image_path):
            return jsonify({
                'error': 'Imagem do convite não encontrada. Faça o upload da imagem em Configurações antes de agendar envios.'
            }), 400
        
        scheduled_time = datetime.fromisoformat(data['scheduled_time'].replace('Z', '+00:00'))
        filters = data.get('filters', {})
        group_id = data.get('group_id')
        
        # Resolve guests if filters are provided
        guest_ids = []
        target_group_id = None
        
        if filters:
             # Apply filters to find specific guests
            query = Guest.query
            
            if filters.get('search'):
                search = filters['search']
                query = query.filter(Guest.name.contains(search) | Guest.phone.contains(search))
            
            if filters.get('status'):
                query = query.filter_by(status=filters['status'])
                
            if filters.get('group_id'):
                query = query.filter_by(group_id=int(filters['group_id']))
                
            guests = query.all()
            guest_ids = [g.id for g in guests]
        elif group_id:
             # If just group_id is provided without other filters, we can use group_id optimization
             target_group_id = group_id
        else:
             # No filters and no group = All guests
             guests = Guest.query.all()
             guest_ids = [g.id for g in guests]
        
        scheduled_send = ScheduledSend(
            template_id=data['template_id'],
            group_id=target_group_id,
            scheduled_time=scheduled_time,
            status='pending'
        )
        
        if guest_ids:
            scheduled_send.set_guest_ids(guest_ids)
            
        db.session.add(scheduled_send)
        db.session.commit()
        
        # Schedule the task
        scheduler = get_scheduler()
        scheduler.schedule_send(scheduled_send.id, scheduled_time)
        
        return jsonify(scheduled_send.to_dict()), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

@app.route('/api/send/scheduled', methods=['GET'])
@token_required
def get_scheduled_sends(current_user):
    """Get all scheduled sends"""
    scheduled_sends = ScheduledSend.query.order_by(ScheduledSend.scheduled_time.desc()).all()
    return jsonify([s.to_dict() for s in scheduled_sends])

@app.route('/api/send/scheduled/<int:send_id>', methods=['DELETE'])
@token_required
def cancel_scheduled_send(current_user, send_id):
    """Cancel a scheduled send"""
    try:
        scheduled_send = ScheduledSend.query.get_or_404(send_id)
        
        if scheduled_send.status != 'pending':
            return jsonify({'error': 'Can only cancel pending sends'}), 400
        
        # Cancel in scheduler
        scheduler = get_scheduler()
        scheduler.cancel_scheduled_send(send_id)
        
        # Update database
        scheduled_send.status = 'cancelled'
        db.session.commit()
        
        return jsonify({'message': 'Scheduled send cancelled'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 400

# ===== IMAGES ENDPOINT =====

@app.route('/api/images/upload', methods=['POST'])
@token_required
def upload_image(current_user):
    """Upload a new invitation image"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file uploaded'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
        extension = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
        if extension not in allowed_extensions:
            return jsonify({'error': 'Envie uma imagem PNG, JPG, JPEG, GIF ou WEBP.'}), 400

        try:
            image = Image.open(file.stream)
            image.verify()
            file.stream.seek(0)
        except (UnidentifiedImageError, OSError):
            return jsonify({'error': 'O arquivo enviado não é uma imagem válida.'}), 400

        # Secure filename
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        
        file.save(filepath)
        
        # Update settings
        set_setting('image_path', filepath)
        get_whatsapp_service().image_path = filepath
        
        return jsonify({
            'message': 'Image uploaded successfully',
            'filename': filename,
            'path': filepath
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# ===== SETTINGS ENDPOINTS =====

@app.route('/api/settings', methods=['GET'])
@token_required
def get_settings(current_user):
    """
    Get all settings
    
    ---
    tags:
      - Settings
    security:
      - Bearer: []
    responses:
      200:
        description: Settings object
      401:
        description: Unauthorized
    """
    settings = {s.key: s.value for s in Settings.query.all()}
    settings.setdefault('couple_name', os.getenv('COUPLE_NAME', 'Gabriela & Josemar'))
    return jsonify(settings)

@app.route('/api/settings', methods=['PUT'])
@token_required
def update_settings(current_user):
    """Update settings"""
    try:
        data = request.get_json() or {}
        if not isinstance(data, dict):
            return jsonify({'error': 'Expected a JSON object'}), 400
        
        for key, value in data.items():
            set_setting(key, value)

        if 'couple_name' in data:
            set_setting('couple_name', data.get('couple_name', 'Gabriela & Josemar'))
        
        # Update WhatsApp service settings
        get_whatsapp_service().update_settings(
            server_url=data.get('evolution_api_url'),
            api_key=data.get('evolution_api_key'),
            session_id=data.get('evolution_session_id'),
            image_path=data.get('image_path')
        )
        
        return jsonify({'message': 'Settings updated successfully'})
    except Exception as e:
        return jsonify({'error': str(e)}), 400

# ===== UTILITY ENDPOINTS =====

def evolution_error_response(result):
    """Keep upstream errors useful without leaking credentials or raw internals."""
    return jsonify({'error': result.get('error', 'Evolution API request failed')}), result.get('status_code', 502)

def valid_instance_name(name):
    return isinstance(name, str) and bool(re.fullmatch(r'[a-z0-9]+', name))

@app.route('/api/evolution/instances', methods=['GET'])
@token_required
def list_evolution_instances(current_user):
    result = get_whatsapp_service().list_instances()
    if not result['success']:
        return evolution_error_response(result)
    active_name = get_whatsapp_service().session_id
    return jsonify({'instances': [dict(instance, active=instance['name'] == active_name) for instance in result['data']]})

@app.route('/api/evolution/instances', methods=['POST'])
@token_required
def create_evolution_instance(current_user):
    data = request.get_json(silent=True) or {}
    name = data.get('name')
    if not valid_instance_name(name):
        return jsonify({'error': 'O nome deve conter somente letras minúsculas e números.'}), 400
    result = get_whatsapp_service().create_instance(name)
    if not result['success']:
        return evolution_error_response(result)
    # The creation response can include an instance token; never forward it to the browser.
    return jsonify({'message': 'Instância criada com sucesso.', 'instance': {'name': name}}), 201

@app.route('/api/evolution/instances/<string:name>/connection', methods=['GET'])
@token_required
def evolution_connection(current_user, name):
    if not valid_instance_name(name):
        return jsonify({'error': 'Nome de instância inválido.'}), 400
    result = get_whatsapp_service().get_connection(name)
    if not result['success']:
        return evolution_error_response(result)
    return jsonify({'connection': result['data']})

@app.route('/api/evolution/instances/<string:name>/qr', methods=['GET'])
@token_required
def evolution_qr(current_user, name):
    if not valid_instance_name(name):
        return jsonify({'error': 'Nome de instância inválido.'}), 400
    result = get_whatsapp_service().get_qr_code(name)
    if not result['success']:
        return evolution_error_response(result)
    return jsonify({'qr': result['data']})

@app.route('/api/evolution/instances/<string:name>/logout', methods=['DELETE'])
@token_required
def evolution_logout(current_user, name):
    if not valid_instance_name(name):
        return jsonify({'error': 'Nome de instância inválido.'}), 400
    result = get_whatsapp_service().logout_instance(name)
    if not result['success']:
        return evolution_error_response(result)
    return jsonify({'message': 'Instância desconectada.', 'result': result['data']})

@app.route('/api/evolution/instances/<string:name>', methods=['DELETE'])
@token_required
def evolution_delete(current_user, name):
    if not valid_instance_name(name):
        return jsonify({'error': 'Nome de instância inválido.'}), 400
    result = get_whatsapp_service().delete_instance(name)
    if not result['success']:
        return evolution_error_response(result)
    if get_whatsapp_service().session_id == name:
        set_setting('evolution_session_id', '')
        get_whatsapp_service().session_id = ''
    return jsonify({'message': 'Instância excluída.', 'result': result['data']})

@app.route('/api/evolution/instances/<string:name>/activate', methods=['POST'])
@token_required
def activate_evolution_instance(current_user, name):
    if not valid_instance_name(name):
        return jsonify({'error': 'Nome de instância inválido.'}), 400
    set_setting('evolution_session_id', name)
    get_whatsapp_service().update_settings(session_id=name)
    return jsonify({'message': 'Instância ativa atualizada.', 'active_instance': name})

@app.route('/api/test-connection', methods=['GET'])
@token_required
def test_connection(current_user):
    """Test EvolutionAPI connection"""
    result = get_whatsapp_service().test_connection()
    return jsonify(result)

@app.route('/api/stats', methods=['GET'])
@token_required
def get_stats(current_user):
    """
    Get dashboard statistics
    
    ---
    tags:
      - Dashboard
    security:
      - Bearer: []
    responses:
      200:
        description: Dashboard statistics
        schema:
          type: object
          properties:
            total_guests:
              type: integer
            sent:
              type: integer
            pending:
              type: integer
            failed:
              type: integer
            groups:
              type: integer
            templates:
              type: integer
      401:
        description: Unauthorized
    """
    total_guests = Guest.query.count()
    sent = Guest.query.filter_by(status='sent').count()
    pending = Guest.query.filter_by(status='pending').count()
    failed = Guest.query.filter_by(status='failed').count()
    confirmed_rsvps = Guest.query.filter_by(rsvp_status='confirmed').count()
    declined_rsvps = Guest.query.filter_by(rsvp_status='declined').count()
    groups_count = Group.query.count()
    templates_count = MessageTemplate.query.count()
    
    return jsonify({
        'total_guests': total_guests,
        'sent': sent,
        'pending': pending,
        'failed': failed,
        'confirmed_rsvps': confirmed_rsvps,
        'declined_rsvps': declined_rsvps,
        'groups': groups_count,
        'templates': templates_count
    })

@app.route('/')
def index():
    """API info endpoint"""
    return jsonify({
        'name': 'Wedding Invitation API',
        'version': '2.0',
        'status': 'running'
    })

# Initialize database and scheduler on startup
with app.app_context():
    init_db(app)
    # DEBUG: Print settings keys
    from database import Settings
    print("DEBUG_DB_KEYS:", [s.key for s in Settings.query.all()])
    scheduler = get_scheduler()
    scheduler.load_pending_schedules()

if __name__ == '__main__':
  app.run(
    debug=os.getenv('FLASK_ENV') != 'production',
    host='0.0.0.0',
    port=int(os.getenv('PORT', '5000'))
  )
