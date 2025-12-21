import requests
import base64
import os
import re
from database import get_setting

class WhatsAppService:
    def __init__(self):
        self.server_url = None
        self.api_key = None
        self.session_id = None
        self.image_path = None
        self._initialized = False
    
    def _ensure_initialized(self):
        """Lazy load settings from database or environment variables"""
        if self._initialized:
            return
            
        try:
            from database import get_setting
            self.server_url = get_setting('evolution_api_url', os.getenv('EVOLUTION_API_URL', 'http://127.0.0.1:8080'))
            self.api_key = get_setting('evolution_api_key', os.getenv('EVOLUTION_API_KEY', '12345'))
            self.session_id = get_setting('evolution_session_id', os.getenv('EVOLUTION_SESSION_ID', 'default'))
            self.image_path = get_setting('image_path', 'convite.png')
            
            # Ensure URL has scheme
            if self.server_url and not self.server_url.startswith(('http://', 'https://')):
                self.server_url = f"http://{self.server_url}"
                
        except:
            # Fallback to environment variables if database not available
            self.server_url = os.getenv('EVOLUTION_API_URL', 'http://127.0.0.1:8080')
            self.api_key = os.getenv('EVOLUTION_API_KEY', '12345')
            self.session_id = os.getenv('EVOLUTION_SESSION_ID', 'default')
            self.image_path = 'convite.png'
        
        self._initialized = True
    
    def update_settings(self, server_url=None, api_key=None, session_id=None, image_path=None):
        """Update WhatsApp service settings"""
        if server_url:
            self.server_url = server_url
            if not self.server_url.startswith(('http://', 'https://')):
                self.server_url = f"http://{self.server_url}"
        if api_key:
            self.api_key = api_key
        if session_id:
            self.session_id = session_id
        if image_path:
            self.image_path = image_path
    
    def format_phone(self, phone):
        """Format phone number (from app.py)"""
        # Remove all non-numeric characters
        cleaned = re.sub(r'\D', '', str(phone))
        
        # If it's a US number (10 digits), add +1
        if len(cleaned) == 10:
            return f"+1{cleaned}"
        
        # Add Brazil country code if not present
        if not cleaned.startswith('55'):
            cleaned = '55' + cleaned
        
        return cleaned
    
    def send_message(self, phone, message, image_path=None):
        """Send a WhatsApp message with optional image"""
        self._ensure_initialized()
        try:
            formatted_phone = self.format_phone(phone)
            
            if image_path:
                return self._send_with_image(formatted_phone, message, image_path)
            else:
                return self._send_text_only(formatted_phone, message)
        
        except Exception as e:
            print(f"Error sending message: {e}")
            return {'success': False, 'error': str(e)}
    
    def _send_text_only(self, phone, message):
        """Send text-only message"""
        url = f"{self.server_url}/message/sendText/{self.session_id}"
        
        payload = {
            "number": phone,
            "options": {
                "delay": 200,
                "presence": "composing"
            },
            "textMessage": {
                "text": message
            }
        }
        
        headers = {
            "apikey": self.api_key,
            "Content-Type": "application/json"
        }
        
        response = requests.post(url, json=payload, headers=headers)
        
        return {
            'success': response.status_code == 200 or response.status_code == 201,
            'status_code': response.status_code,
            'response': response.text
        }
    
    def _send_with_image(self, phone, message, image_path):
        """Send message with image attachment"""
        url = f"{self.server_url}/message/sendMedia/{self.session_id}"
        
        # Read and encode image
        try:
            with open(image_path, 'rb') as image_file:
                image_binary = image_file.read()
                image_b64 = base64.b64encode(image_binary).decode('utf-8')
        except FileNotFoundError:
            return {'success': False, 'error': f'Image file not found: {image_path}'}
        
        # Determine media type from extension
        ext = os.path.splitext(image_path)[1].lower()
        media_type = 'image' if ext in ['.png', '.jpg', '.jpeg', '.gif'] else 'document'
        
        payload = {
            "number": phone,
            "options": {
                "delay": 200,
                "presence": "composing"
            },
            "caption": message,
            "mediaMessage": {
                "mediatype": media_type,
                "fileName": os.path.basename(image_path),
                "caption": message,
                "media": image_b64
            }
        }
        
        headers = {
            "apikey": self.api_key,
            "Content-Type": "application/json"
        }
        
        response = requests.post(url, json=payload, headers=headers)
        
        return {
            'success': response.status_code == 200 or response.status_code == 201,
            'status_code': response.status_code,
            'response': response.text
        }
    
    def test_connection(self):
        """Test connection to EvolutionAPI"""
        self._ensure_initialized()
        try:
            url = f"{self.server_url}/instance/connectionState/{self.session_id}"
            headers = {"apikey": self.api_key}
            
            response = requests.get(url, headers=headers)
            
            return {
                'success': response.status_code == 200,
                'status_code': response.status_code,
                'response': response.json() if response.status_code == 200 else response.text
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}
