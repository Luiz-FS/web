# -*- coding: utf-8 -*-
"""Utils."""
import json
import datetime
import sys
import logging

from app_version import APP_VERSION

from google.appengine.ext import ndb

from models.user import User
from models.institution import Institution

from oauth2client import client
from oauth2client.crypt import AppIdentityError

from custom_exceptions.notAuthorizedException import NotAuthorizedException
from custom_exceptions.queryException import QueryException


class Utils():

    STATUS_SUCCESS = 201
    NOT_FOUND = 404
    FORBIDDEN = 403
    BAD_REQUEST = 400
    DEFAULT_PAGINATION_LIMIT = 10
    DEFAULT_PAGINATION_OFFSET = 0

    @staticmethod
    def getJSONError(status_error, message):
        error = {'status_error': status_error, 'msg': message}
        return json.dumps(error)

    @staticmethod
    def toJson(entity, loadkey=None, host=None):
        if isinstance(entity, list):
            return [Utils.toJson(
                item, loadkey=loadkey, host=host) for item in entity]
        if isinstance(entity, dict):
            out = {}
            for item in entity:
                out[item] = Utils.toJson(
                    entity[item], loadkey=loadkey, host=host)
            return out
        if isinstance(entity, datetime.datetime):
            return entity.isoformat()
        if isinstance(entity, ndb.Key):
            if loadkey:
                entity = entity.get()
                return Utils.toJson(entity, loadkey=loadkey, host=host)
            else:
                if host is not None:
                    # TODO: Change between http and https when deployed
                    # and local
                    # @author: André Abrantes
                    return "http://%s/api/key/%s" % (host, entity.urlsafe())
                else:
                    return entity.urlsafe()
        if isinstance(entity, ndb.Model):
            out = entity.to_dict()
            if (entity.key):
                out['key'] = entity.key.urlsafe()
            return Utils.toJson(out, loadkey=loadkey, host=host)
        return entity

    @staticmethod
    def _assert(condition, msg, exception):
        """Check the condition, if true, raise an generic exception."""
        if condition:
            raise exception(msg)

    @staticmethod
    def getHash(obj):
        """Generate a hash to an object."""
        if type(obj) is not dict:
            obj = obj.to_dict()
        hash_num = hash(tuple(obj.items())) % (sys.maxint)
        return str(hash_num)

# The URL that provides public certificates for verifying ID tokens issued
# by Firebase and the Google APIs infrastructure
_GOOGLE_APIS_CERTS_URL = (
    'https://www.googleapis.com/robot/v1/metadata/x509'
    '/securetoken@system.gserviceaccount.com')


def verify_token(request):
    """Verify Firebase auth."""
    token = request.headers['Authorization']
    if token:
        token = token.split(' ').pop()
        try:
            credential = client.verify_id_token(token, None, cert_uri=_GOOGLE_APIS_CERTS_URL)
            return credential
        except (ValueError, AppIdentityError) as error:
            logging.exception(str(error))
            return None

def setup_current_institution(user, request):
    """
    Current institution is used by the backend to specify which
    institution the user is logged. The HTTP header Institution-Authorization,
    if exist, comes with the institution key that provides the direct
    access to the resource. Once the header exists, it creates a user
    property 'current_institution' with a ndb.Key to be used during 
    the transaction.
    """
    try:
        institution_header = request.headers['Institution-Authorization']
        institution_key = ndb.Key(urlsafe=institution_header)
        Utils._assert(not user.is_member(institution_key),
            "Invalid Current Institution! User is not an active member.",
            NotAuthorizedException)
        user.current_institution = institution_key
    except KeyError as error:
        user.current_institution = None


def login_required(method):
    """Handle required login."""
    def login(self, *args):
        credential = verify_token(self.request)
        if not credential:
            self.response.write(json.dumps({
                'msg': 'Auth needed',
                'login_url': 'http://%s/#/signin' % self.request.host
            }))
            self.response.set_status(401)
            return

        user_name = credential.get('name', 'Unknown')
        user_email = credential.get('email', 'Unknown')
        user = User.get_by_email(user_email)

        if user is None:
            user = User()
            user.name = user_name
            user.email = [user_email]

        setup_current_institution(user, self.request)

        method(self, user, *args)
    return login

def follow_inst(user,inst):
    user.follow(inst.key)
    inst.follow(user.key)

def create_user(name, email):
    """Create user."""
    user = User()
    user.email = email
    user.name = name
    user.photo_url = "app/images/avatar.png"
    health_ministry = get_health_ministry().get()
    deciis = get_deciis().get()
    """"TODO: All users have to follow MS and DECIIS
        Think of a better way to do it
        @author: Mayza Nunes 24/01/2018
    """
    if health_ministry is not None:
        follow_inst(user, health_ministry)
    if deciis is not None:
        follow_inst(user, deciis)
    user.put()
    
    return user

def get_health_ministry():
    """Get health ministry institution."""
    query = Institution.query(Institution.name == "Ministério da Saúde", Institution.acronym == "MS")
    return query

def get_deciis():
    """Get health ministry institution."""
    query = Institution.query(Institution.name == "Departamento do Complexo Industrial e Inovação em Saúde", Institution.acronym == "DECIIS")
    return query

def json_response(method):
    """Add content type header to the response."""
    def response(self, *args):
        self.response.headers['Access-Control-Allow-Origin'] = '*'
        self.response.headers['Access-Control-Expose-Headers'] = 'APP_VERSION'
        self.response.headers['Access-Control-Allow-Headers'] = 'X-API-KEY, Origin, X-Requested-With, Content-Type, Accept, Access-Control-Request-Method, Authorization, Institution-Authorization'
        self.response.headers['Access-Control-Allow-Methods'] = 'POST, GET, PUT, DELETE, PATCH'
        self.response.headers['Content-Type'] = 'application/json; charset=utf-8'
        self.response.headers['APP_VERSION'] = APP_VERSION
        method(self, *args)
    return response


def get_super_institution():
    """Return Super Institution of system."""
    # TODO: Currently, The Super Institution is 'CIS' but will change to 'Ministério da Saúde',
    # should modify how to verify it.
    # @author: Maiana Brito
    return Institution.query().filter(Institution.name == "Complexo Industrial da Saude").get()


def getSuperUsers():
    """Get users of institutions trusted that has permission to analize resquests for new institutions."""
    userswithpermission = []
    institutionsTrusted = Institution.query(Institution.trusted == True)
    for institution in institutionsTrusted:
        for userKey in institution.members:
            user = userKey.get()
            if user.has_permission('analyze_request_inst', institution.key.urlsafe()):
                userswithpermission.append(user)
    return userswithpermission


def offset_pagination(page, number_fetchs, query):
    """Modify query for get entities using offset pagination."""
    offset = page * number_fetchs

    query, next_cursor, more = query.fetch_page(
        number_fetchs,
        offset=offset)

    return [query, more]


def query_paginated(request_data, query):
    """Paginate queries
    
    Keyword arguments:
    request_data -- The query string params
    query -- The query result of an specific entity
    """
    request_data = dict(request_data)

    page = to_int(
        request_data['page'] if 'page' in request_data.keys(
        ) else Utils.DEFAULT_PAGINATION_OFFSET,
        QueryException,
        "Query param page must be an integer")
    limit = to_int(
        request_data['limit'] if 'limit' in request_data.keys(
        ) else Utils.DEFAULT_PAGINATION_LIMIT,
        QueryException,
        "Query param limit must be an integer")

    more = False
    query, more = offset_pagination(page, limit, query)

    return [query, more]


def to_int(value, exception, message_exception):
    """
    Convert string value to integer.

    Otherwise it generates an exception with the specified message.
    """
    try:
        value = int(value)
    except ValueError:
        raise exception(message_exception)

    return value

def make_user(user, request):
    user_json = Utils.toJson(user, host=request.host)
    user_json['logout'] = 'http://%s/logout?redirect=%s' %\
        (request.host, request.path)
    user_json['institutions'] = []
    for institution in user.institutions:
        user_json['institutions'].append(
            Utils.toJson(institution.get())
        )
    user_json['follows'] = [institution_key.get().make(
        ['name','acronym', 'photo_url', 'key', 'parent_institution'])
        for institution_key in user.follows
        if institution_key.get().state != 'inactive']
    user_json['institution_profiles'] = [profile.make()
        for profile in user.institution_profiles]
    return user_json