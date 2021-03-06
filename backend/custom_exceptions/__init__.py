"""Initialize custom exceptions modules."""

from .entityException import *
from .fieldException import *
from .notAuthorizedException import *
from .queryException import *
from .queueException import *
from .notAllowedException import *

exceptions = [entityException, fieldException, notAuthorizedException, queryException, queueException, notAllowedException]

__all__ = [prop for exception in exceptions for prop in exception.__all__]
