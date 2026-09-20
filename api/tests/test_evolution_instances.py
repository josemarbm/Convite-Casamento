import os
import sys
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

os.environ['DATABASE_URL'] = 'sqlite://'
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app import app
from database import get_setting
from models import User, db
from services.whatsapp_service import WhatsAppService
import jwt
import requests
import hashlib
from models import Guest


class FakeResponse:
    def __init__(self, status_code=200, body=None):
        self.status_code = status_code
        self._body = body if body is not None else {}
        self.text = str(self._body)
        self.ok = 200 <= status_code < 300

    def json(self):
        return self._body


class EvolutionServiceTest(unittest.TestCase):
    def setUp(self):
        self.service = WhatsAppService()
        self.service.server_url = 'http://evolution:8080'
        self.service.api_key = 'global-key'
        self.service._initialized = True

    @patch('services.whatsapp_service.requests.request')
    def test_instance_lifecycle_uses_expected_evolution_routes(self, request_mock):
        request_mock.return_value = FakeResponse(200, [{'instance': {'instanceName': 'casamento', 'status': 'open'}}])
        self.assertEqual(self.service.list_instances()['data'][0]['name'], 'casamento')

        request_mock.return_value = FakeResponse(201, {'qrcode': {'base64': 'abc'}})
        self.assertTrue(self.service.create_instance('casamento')['success'])
        self.assertTrue(self.service.get_connection('casamento')['success'])
        self.assertTrue(self.service.get_qr_code('casamento')['success'])
        self.assertTrue(self.service.logout_instance('casamento')['success'])
        self.assertTrue(self.service.delete_instance('casamento')['success'])

        calls = [(call.args[0], call.args[1]) for call in request_mock.call_args_list]
        self.assertEqual(calls, [
            ('GET', 'http://evolution:8080/instance/fetchInstances'),
            ('POST', 'http://evolution:8080/instance/create'),
            ('GET', 'http://evolution:8080/instance/connectionState/casamento'),
            ('GET', 'http://evolution:8080/instance/connect/casamento'),
            ('DELETE', 'http://evolution:8080/instance/logout/casamento'),
            ('DELETE', 'http://evolution:8080/instance/delete/casamento'),
        ])
        self.assertEqual(request_mock.call_args_list[1].kwargs['json'], {'instanceName': 'casamento', 'qrcode': True})

    @patch('services.whatsapp_service.requests.request', side_effect=requests.ConnectionError('offline'))
    def test_request_failure_is_normalized(self, request_mock):
        result = self.service.list_instances()
        self.assertFalse(result['success'])
        self.assertIn('Não foi possível comunicar', result['error'])


class EvolutionRoutesTest(unittest.TestCase):
    def setUp(self):
        self.client = app.test_client()
        with app.app_context():
            user = User.query.first()
            self.token = jwt.encode({'user_id': user.id}, app.config['SECRET_KEY'], algorithm='HS256')
        self.headers = {'Authorization': f'Bearer {self.token}'}
        self.service = Mock()
        self.service.session_id = 'antiga'

    def test_evolution_routes_require_authentication(self):
        self.assertEqual(self.client.get('/api/evolution/instances').status_code, 401)

    @patch('app.get_whatsapp_service')
    def test_activate_instance_persists_session_and_updates_service(self, get_service):
        get_service.return_value = self.service
        response = self.client.post('/api/evolution/instances/casamento2026/activate', headers=self.headers)
        self.assertEqual(response.status_code, 200)
        with app.app_context():
            self.assertEqual(get_setting('evolution_session_id'), 'casamento2026')
        self.service.update_settings.assert_called_once_with(session_id='casamento2026')

    def test_invalid_instance_name_is_rejected(self):
        response = self.client.post('/api/evolution/instances', json={'name': 'Nome inválido'}, headers=self.headers)
        self.assertEqual(response.status_code, 400)

    @patch('app.get_whatsapp_service')
    def test_send_direct_requires_an_active_instance(self, get_service):
        service = Mock()
        service.session_id = ''
        service.image_path = '/tmp/convite.png'
        service._ensure_initialized.return_value = None
        get_service.return_value = service

        with app.app_context():
            guest = Guest(name='Convidado sem instância', phone='5511999999999')
            db.session.add(guest)
            db.session.commit()

            template = MessageTemplate.query.filter_by(is_default=True).first()
            if template is None:
                template = MessageTemplate(name='Padrão', content='Oi {nome}', is_default=True)
                db.session.add(template)
                db.session.commit()

        response = self.client.post('/api/send/direct', json={'template_id': template.id, 'filters': {}}, headers=self.headers)

        self.assertEqual(response.status_code, 400)
        self.assertIn('instância ativa', response.get_json()['error'].lower())

    def test_public_rsvp_is_immutable_after_the_first_response(self):
        token = 'individual-rsvp-token-for-test'
        with app.app_context():
            guest = Guest(name='Convidado RSVP', phone='5511999999999')
            guest.rsvp_token_hash = hashlib.sha256(token.encode()).hexdigest()
            db.session.add(guest)
            db.session.commit()

        details = self.client.get(f'/api/rsvp/{token}')
        self.assertEqual(details.status_code, 200)
        self.assertEqual(details.get_json()['status'], 'pending')

        confirmed = self.client.post(f'/api/rsvp/{token}', json={'response': 'confirmed'})
        self.assertEqual(confirmed.status_code, 200)
        self.assertEqual(confirmed.get_json()['status'], 'confirmed')

        retry = self.client.post(f'/api/rsvp/{token}', json={'response': 'declined'})
        self.assertEqual(retry.status_code, 409)


if __name__ == '__main__':
    unittest.main()
