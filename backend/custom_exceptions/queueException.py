"""Queue Exception."""

__all__ = ['QueueException']

class QueueException(Exception):
    """Entity Exception."""

    def __init__(self, msg=None):
        """Init method."""
        super(QueueException, self).__init__(msg or 'Invalid task')