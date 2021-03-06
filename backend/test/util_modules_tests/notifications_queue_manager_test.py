"""Notifications Queue Manager Test."""

import random
from google.appengine.api import taskqueue
from ..test_base import TestBase
from util import NotificationsQueueManager, Notification, notification_id
from service_messages import create_message
from custom_exceptions import QueueException
from .. import mocks
from mock import patch


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
        self.assertEqual(
            num_tasks, 
            0,
            'num_tasks must be equal to 0'
        )

        id_notification = NotificationsQueueManager.create_notification_task(notification)

        num_tasks = self.queue.fetch_statistics().tasks
        self.assertEqual(
            num_tasks, 
            1,
            'num_tasks must be equal to 0'
        )
        self.assertEqual(
            id_notification, 
            notification.key,
            'id_notification must equal the notification key.'
        )
    
    def test_create_notification_task_with_invalid_notification(self):
        """Test create notification task wiht invalid notification."""
        with self.assertRaises(TypeError) as raises_context:
            NotificationsQueueManager.create_notification_task("Notification")

        self.assertEqual(
            str(raises_context.exception), 
            'Expected type Notification but got str.',
            'Exception message must be equal to Expected type Notification but got str.'
        )
    
    @patch('util.notification.send_message_notification')
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
        self.assertEqual(
            num_tasks, 
            0,
            'num_tasks must be equal to 0'
        )

        id_notification = NotificationsQueueManager.create_notification_task(notification)

        num_tasks = self.queue.fetch_statistics().tasks
        self.assertEqual(
            num_tasks, 
            1,
            'num_tasks must be equal to 1'
        )

        NotificationsQueueManager.resolve_notification_task(id_notification)

        send_message_notification.assert_called_with(**notification.format_notification())
        num_tasks = self.queue.fetch_statistics().tasks
        self.assertEqual(
            num_tasks, 
            0,
            'num_tasks must be equal to 0'
        )
    
    def test_resolve_notification_task_with_invalid_id(self):
        """Test resolve notification task with invalid id."""
        with self.assertRaises(QueueException) as raises_context:
            NotificationsQueueManager.resolve_notification_task('03-jksahdjkasjksahdshadkjsdhjksakjdhsajhkdhsajkdhas')
        
        self.assertEqual(
            str(raises_context.exception), 
            'Task not found.',
            'Exception message must be equal to Task not found.'
        )

        with self.assertRaises(QueueException) as raises_context:
            NotificationsQueueManager.resolve_notification_task('ab-jksahdjkasjksahdshadkjsdhjksakjdhsajhkdhsajkdhas')
        
        self.assertEqual(
            str(raises_context.exception), 
            'Invalid task key.',
            'Exception message must be equal to Invalid task key.'
        )          
