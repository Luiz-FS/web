# -*- coding: utf-8 -*-

from ..test_base import TestBase

from models.survey_post import SurveyPost
from models.user import User
from models.institution import Institution
import datetime


class SurveyPostTest(TestBase):
    """Test the survey post model."""

    @classmethod
    def setUp(cls):
        """Provide the base for the tests."""
        cls.test = cls.testbed.Testbed()
        cls.test.activate()
        cls.policy = cls.datastore.PseudoRandomHRConsistencyPolicy(
            probability=1)
        cls.test.init_datastore_v3_stub(consistency_policy=cls.policy)
        cls.test.init_memcache_stub()
        initModels(cls)

    def test_create(self):
        """Test the create method."""
        survey_binary = SurveyPost.create(
            self.data_binary, self.user.key, self.institution.key)

        self.assertEquals(
            survey_binary.title, 'Survey with Binary choice',
            "It should be 'Survey with Binary choice'"
        )
        self.assertEquals(
            survey_binary.type_survey, 'binary',
            "It should be 'binary'"
        )
        self.assertEquals(
            survey_binary.options, self.options,
            "It should be equal to options"
        )

        survey_multiple = SurveyPost.create(
            self.data_multiple, self.user.key, self.institution.key)

        self.assertEquals(
            survey_multiple.type_survey, 'multiple_choice',
            "It should be 'multiple_choice'"
        )

    def test_add_vote(self):
        """Test the create method."""
        survey_binary = SurveyPost.create(
            self.data_binary, self.user.key, self.institution.key)
        option_one = survey_binary.options[0]
        survey_binary.add_vote(self.user.key, option_one['id'])

        # Update data
        option_one = survey_binary.options[0]

        self.assertEquals(
            self.user.key.urlsafe() in option_one["voters"], True,
            "It should be True"
        )
        self.assertEquals(
            option_one["number_votes"], 1,
            "It should be 1"
        )

        survey_multiple = SurveyPost.create(
            self.data_multiple, self.user.key, self.institution.key)
        option_two = survey_multiple.options[1]
        survey_multiple.add_vote(self.user.key, option_two['id'])

        # Update data
        option_two = survey_multiple.options[1]

        self.assertEquals(
            self.user.key.urlsafe() in option_two["voters"], True,
            "It should be True"
        )
        self.assertEquals(
            option_two["number_votes"], 1,
            "It should be 1"
        )

    def test_remove_vote(self):
        """Test the create method."""
        survey_binary = SurveyPost.create(
            self.data_binary, self.user.key, self.institution.key)
        option_one = survey_binary.options[0]
        # Add vote
        survey_binary.add_vote(self.user.key, option_one['id'])
        # Update data
        option_one = survey_binary.options[0]
        self.assertEquals(
            option_one["number_votes"], 1,
            "It should be 1"
        )
        # Remove vote
        survey_binary.remove_vote(self.user.key.urlsafe(), option_one['id'])
        # Update data
        option_one = survey_binary.options[0]

        self.assertEquals(
            self.user.key.urlsafe() not in option_one["voters"], True,
            "It should be True"
        )
        self.assertEquals(
            option_one["number_votes"], 0,
            "It should be 0"
        )

    def test_is_vote_valid(self):
        """Test the is_valid method."""
        frist_vote = self.data_binary["options"][0]
        second_vote = self.data_binary["options"][1]
        survey_binary = SurveyPost.create(
            self.data_binary, self.user.key, self.institution.key)
        survey_multiple = SurveyPost.create(
            self.data_multiple, self.user.key, self.institution.key)

        self.assertEquals(
            survey_binary.is_vote_valid(self.user.key, frist_vote),
            True, "It should be True"
        )
        self.assertEquals(
            survey_multiple.is_vote_valid(self.user.key, second_vote),
            True, "It should be True"
        )

        frist_vote['voters'].append(self.user.key)
        with self.assertRaises(Exception) as ex:
            survey_binary.is_vote_valid(self.user.key, frist_vote)

        self.assertEqual(
            'The user already voted for this option',
            str(ex.exception),
            'The user already voted for this option')

        survey_binary.deadline = datetime.datetime(2002, 12, 25)
        with self.assertRaises(Exception) as ex:
            survey_binary.is_vote_valid(self.user.key, frist_vote)

        self.assertEqual(
            'Deadline for receive answers has passed.',
            str(ex.exception),
            'Deadline for receive answers has passed.')

    def test_vote(self):
        """Test the create method."""
        survey_binary = SurveyPost.create(
            self.data_binary, self.user.key, self.institution.key)
        options_selected = [survey_binary.options[0]]
        survey_binary.vote(self.user.key, options_selected)
        # Update data
        option_one = survey_binary.options[0]

        self.assertEquals(
            self.user.key.urlsafe() in option_one["voters"], True,
            "It should be True"
        )
        self.assertEquals(
            option_one["number_votes"], 1,
            "It should be 1"
        )

        survey_multiple = SurveyPost.create(
            self.data_multiple, self.user.key, self.institution.key)
        options_selected = [self.options[0], self.options[1]]
        survey_multiple.vote(self.user.key, options_selected)

        # Update data
        option_one = survey_multiple.options[0]
        option_two = survey_multiple.options[1]

        self.assertEquals(
            self.user.key.urlsafe() in option_one["voters"], True,
            "It should be True"
        )
        self.assertEquals(
            option_one["number_votes"], 1,
            "It should be 1"
        )
        self.assertEquals(
            self.user.key.urlsafe() in option_two["voters"], True,
            "It should be True"
        )
        self.assertEquals(
            option_two["number_votes"], 1,
            "It should be 1"
        )


def initModels(cls):
    """Init the models."""
    # new User
    cls.user = User()
    cls.user.name = 'User'
    cls.user.email = ['user@gmail.com']
    cls.user.institutions = []
    cls.user.posts = []
    cls.user.put()

    # new Institution inst test
    cls.institution = Institution()
    cls.institution.name = 'inst test'
    cls.institution.members = [cls.user.key]
    cls.institution.admin = cls.user.key
    cls.institution.put()

    cls.user.institutions = [cls.institution.key]
    cls.user.put()

    cls.options = [
        {'id': 0,
         'text': 'frist option',
         'number_votes': 0,
         'voters': []
         },
        {'id': 1,
         'text': 'second option',
         'number_votes': 0,
         'voters': []
         }]

    cls.data_binary = {
        'title': 'Survey with Binary choice',
        'type_survey': 'binary',
        'deadline': '2020-07-25T12:30:15',
        'options': cls.options
    }

    cls.data_multiple = {
        'title': 'Survey with Multiple choice',
        'type_survey': 'multiple_choice',
        'deadline': '2020-07-25T12:30:15',
        'options': cls.options
    }
