"""Notifications Queue Manager Test."""

import random
from google.appengine.api import taskqueue
from ..test_base import TestBase
from util import NotificationsQueueManager, Notification, NotificationNIL
from util.notifications_queue_manager import notification_id, get_notification_id
from service_messages import create_message
from .. import mocks
from mock import patch


class TimeMock(object):
    def __init__(self):
        self.rand_time = 0

    def time(self):
        self.rand_time = random.randint(1000000, 2000000)
        return self.rand_time

class NotificationsQueueManagerTest(TestBase):
    
    @classmethod
    def setUp(cls):
        """Provide the base for the tests."""
        cls.test = cls.testbed.Testbed()
        cls.test.activate()
        cls.policy = cls.datastore.PseudoRandomHRConsistencyPolicy(
            probability=1)
        cls.test.init_datastore_v3_stub(consistency_policy=cls.policy)
        cls.test.init_memcache_stub()
        cls.notifications_type = notification_id.values()
        cls.queue = taskqueue.Queue('notifications-manage-pull')
    
    def tearDown(self):
        """Deactivate the test."""
        self.test.deactivate()
        self.queue.purge()
    
    def get_notification_type(self):
        """Method to get random notification_type."""
        notification_type = self.notifications_type[random.randint(0, len(self.notifications_type) - 1)]

        while notification_type == 'NOTIFICATION_NIL':
            notification_type = self.notifications_type[random.randint(0, len(self.notifications_type) - 1)]

        return notification_type
    
    @patch('util.notifications_queue_manager.time')
    def test_create_notification(self, time):
        """Test create new notification."""
        timeMock = TimeMock()
        time.time.side_effect = timeMock.time

        user = mocks.create_user()
        institution = mocks.create_institution()
        notification_type = self.get_notification_type()

        message = create_message(
            sender_key=user.key,
            current_institution_key=institution.key,
            receiver_institution_key=institution.key,
            sender_institution_key=institution.key,
        )

        notification = Notification(
            message=message,
            entity_key=institution.key.urlsafe(),
            notification_type=notification_type,
            receiver_key=user.key.urlsafe()
        )

        id = get_notification_id(notification_type)
        entity_hash = hash(institution.key.urlsafe())
        receiver_hash = hash(user.key.urlsafe())
        timestamp = timeMock.rand_time

        expected_key = id + '-' + str(entity_hash) + str(receiver_hash) + str(timestamp)
        
        self.assertEqual(notification.key, expected_key)
        self.assertEqual(notification.message, message)
        self.assertEqual(notification.entity_key, institution.key.urlsafe())
        self.assertEqual(notification.notification_type, notification_type)
        self.assertEqual(notification.receiver_key, user.key.urlsafe())
    
    def test_create_notification_with_unregistred_type(self):
        """Test create notification with unregistred_type."""
        user = mocks.create_user()
        institution = mocks.create_institution()
        notification_type = 'ANY_NOTIFICATIONS'

        message = create_message(
            sender_key=user.key,
            current_institution_key=institution.key,
            receiver_institution_key=institution.key,
            sender_institution_key=institution.key,
        )

        notification = Notification(
            message=message,
            entity_key=institution.key.urlsafe(),
            notification_type=notification_type,
            receiver_key=user.key.urlsafe()
        )

        self.assertEqual(notification.notification_type, 'ALL_NOTIFICATIONS')
    
    @patch('util.notifications_queue_manager.send_message_notification')
    def test_send_notification(self, send_message_notification):
        """Test send notification."""
        user = mocks.create_user()
        institution = mocks.create_institution()
        notification_type = self.get_notification_type()

        message = create_message(
            sender_key=user.key,
            current_institution_key=institution.key,
            receiver_institution_key=institution.key,
            sender_institution_key=institution.key,
        )

        notification = Notification(
            message=message,
            entity_key=institution.key.urlsafe(),
            notification_type=notification_type,
            receiver_key=user.key.urlsafe()
        )

        notification.send_notification()
        send_message_notification.assert_called_with(**notification.format_notification())
    
    def test_format_notification(self):
        """Test format notification."""
        user = mocks.create_user()
        institution = mocks.create_institution()
        notification_type = self.get_notification_type()

        message = create_message(
            sender_key=user.key,
            current_institution_key=institution.key,
            receiver_institution_key=institution.key,
            sender_institution_key=institution.key,
        )

        notification = Notification(
            message=message,
            entity_key=institution.key.urlsafe(),
            notification_type=notification_type,
            receiver_key=user.key.urlsafe()
        )

        expected_format = {
            'receiver_key': user.key.urlsafe(),
            'message': message,
            'notification_type': notification_type,
            'entity_key': institution.key.urlsafe()
        }

        self.assertEqual(notification.format_notification(), expected_format)
        
    def test_create_notification_task(self):
        """Test create notification task."""
        user = mocks.create_user()
        institution = mocks.create_institution()
        notification_type = self.get_notification_type()

        message = create_message(
            sender_key=user.key,
            current_institution_key=institution.key,
            receiver_institution_key=institution.key,
            sender_institution_key=institution.key,
        )

        notification = Notification(
            message=message,
            entity_key=institution.key.urlsafe(),
            notification_type=notification_type,
            receiver_key=user.key.urlsafe()
        )

        num_tasks = self.queue.fetch_statistics().tasks
        self.assertEqual(num_tasks, 0)

        id_notification = NotificationsQueueManager.create_notification_task(notification)

        num_tasks = self.queue.fetch_statistics().tasks
        self.assertEqual(num_tasks, 1)
        self.assertEqual(id_notification, notification.key)
    
    @patch('util.notifications_queue_manager.send_message_notification')
    def test_resolve_notification_task(self, send_message_notification):
        """Test resolve notification task."""
        user = mocks.create_user()
        institution = mocks.create_institution()
        notification_type = self.get_notification_type()

        message = create_message(
            sender_key=user.key,
            current_institution_key=institution.key,
            receiver_institution_key=institution.key,
            sender_institution_key=institution.key,
        )

        notification = Notification(
            message=message,
            entity_key=institution.key.urlsafe(),
            notification_type=notification_type,
            receiver_key=user.key.urlsafe()
        )

        num_tasks = self.queue.fetch_statistics().tasks
        self.assertEqual(num_tasks, 0)

        id_notification = NotificationsQueueManager.create_notification_task(notification)

        num_tasks = self.queue.fetch_statistics().tasks
        self.assertEqual(num_tasks, 1)

        NotificationsQueueManager.resolve_notification_task(id_notification)

        send_message_notification.assert_called_with(**notification.format_notification())
        num_tasks = self.queue.fetch_statistics().tasks
        self.assertEqual(num_tasks, 0)
