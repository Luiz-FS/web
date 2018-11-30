'use strict';

(describe('Test EventController', function () {

    let // variables to be associated to the injected parameters
        eventCtrl, scope, httpBackend, rootScope,
        createCtrl, eventService, messageService, mdDialog, state, q;

    const // variables to create the test scenario
        institution = { name: 'Institution', key: '098745' },
        other_institution = { name: 'Other Institution', key: '75368' },
        startDate = "2018-12-22T17:27:00Z",
        endDate = "2018-12-31T17:27:00Z",
        months = [ {month: 1}, {month: 2},
        {month: 3}, {month: 4},
        {month: 5}, {month: 6},
        {month: 7}, {month: 8},
        {month: 9}, {month: 10},
        {month: 11}, {month: 12}],
        user = {
            name: 'User',
            institutions: [institution],
            follows: [institution],
            institutions_admin: institution,
            current_institution: institution,
            institution_profiles: [{
                institution_key: institution.key,
                color: 'blue'
            }],
            key: '123'
        },
        event = {
            'title': 'Title',
            'text': 'Text',
            'local': 'Local',
            'photo_url': null,
            'start_time': startDate,
            'end_time': endDate,
            'institution_key': institution.key,
            'key': '12345'
        },
        other_event = {
            'title': 'Other event',
            'text': 'Text',
            'local': 'Local',
            'photo_url': null,
            'start_time': startDate,
            'end_time': endDate,
            'institution_key': other_institution.key,
            'key': '54321'
        },
        requestEvent = {
            events: [ event, other_event ],
            next: true
        },
        requestEventInst = {
            events: [ event ],
            next: true
        },
        GET_EVENTS_URI = '/api/events?page=0&limit=5',
        GET_EVENTS_INST_URI = '/api/institutions/'+institution.key+'/events?page=0&limit=5',
        GET_EVENTS_URI_WITH_FILTERS = GET_EVENTS_URI + '&month=' + new Date(startDate).getMonth() + '&year=' + new Date(startDate).getFullYear();

    beforeEach(module('app'));

    beforeEach(inject(function ($controller, $httpBackend, AuthService,
        $rootScope, EventService, MessageService, $mdDialog, $state, $q) {
        scope = $rootScope.$new();
        httpBackend = $httpBackend;
        rootScope = $rootScope;
        eventService = EventService;
        messageService = MessageService;
        mdDialog = $mdDialog;
        state = $state;
        q = $q;
        AuthService.login(user);

        httpBackend.when('GET', GET_EVENTS_URI || GET_EVENTS_URI_WITH_FILTERS).respond(requestEvent);
        httpBackend.when('GET', GET_EVENTS_INST_URI).respond(requestEventInst);
        httpBackend.when('GET', 'app/utils/months.json').respond(months);

        spyOn(Utils, 'setScrollListener').and.callFake(function () {
            return {
                then: function (callback) {
                    return callback();
                }
            };
        });

        createCtrl = function(){
            return $controller('EventController', {
                scope: scope,
                $rootScope: rootScope,
                eventService: eventService,
                messageService: messageService,
                mdDialog: mdDialog
            });
        }

        eventCtrl = createCtrl();
        eventCtrl.showImage = true;
        eventCtrl.events = [];
        eventCtrl.$onInit();
    }));

    describe('onInit()', () => {

        it("Should not have an institution_key", () => {
            eventCtrl.$onInit();
            expect(eventCtrl.institutionKey).toEqual(undefined);
        });

        it("Should have an institution_key", () => {
            state.params.institutionKey = institution.key;
            eventCtrl.$onInit();
            expect(eventCtrl.institutionKey).toEqual(institution.key);
        });

        it("Should call _getMonths() if is mobile screen", () => {
            spyOn(Utils, 'isMobileScreen').and.returnValue(true);
            spyOn(eventCtrl, '_getMonths');
            eventCtrl.$onInit();
            expect(eventCtrl._getMonths).toHaveBeenCalled();
        });

        it("Should call loadMoreEvents() if is not mobile screen", () => {
            spyOn(Utils, 'isMobileScreen').and.returnValue(false);
            spyOn(eventCtrl, 'loadMoreEvents');
            eventCtrl.$onInit();
            expect(eventCtrl.loadMoreEvents).toHaveBeenCalled();
        });
    });

    describe('goToEvent()', () => {

        beforeEach(() => {
            spyOn(state, 'go');
        });

        it('Should call state.go', () => {
            eventCtrl.goToEvent(event);
            expect(state.go).toHaveBeenCalledWith('app.user.event', { eventKey: event.key });
        });
    });

    describe('loadFilteredEvents()', () => {

        beforeEach(() => {
            spyOn(eventCtrl, 'loadMoreEvents');
        });

        it('Should call loadMoreEvents', () => {
            eventCtrl.loadFilteredEvents();
            expect(eventCtrl.loadMoreEvents).toHaveBeenCalled();
        });
    });

    describe('_getEventsByDay()', () => {

        beforeEach(() => {
            eventCtrl.events = requestEvent.events;
            eventCtrl.selectedMonth = months[11];
        });

        it('Should populate the eventsByDay array', () => {
            expect(eventCtrl.eventsByDay.length).toEqual(0);
            eventCtrl._getEventsByDay();
            expect(eventCtrl.eventsByDay.length).toEqual(10);
        });

        it('Should have days 22 to 31', () => {
            expect(eventCtrl.eventsByDay).toEqual([]);
            eventCtrl._getEventsByDay();
            expect(eventCtrl.eventsByDay.map(obj => obj.day))
                .toEqual(['22', '23', '24', '25', '26', '27', '28', '29','30','31']);
        });
    });

    describe('getMonths()', () => {

        beforeEach(() => {
            spyOn(eventService, 'getMonths').and.callFake(function () {
                return {
                    then: function (callback) {
                        return callback(months);
                    }
                };
            });
            spyOn(eventCtrl, '_loadYears');
            spyOn(eventCtrl, 'loadMoreEvents');
        });

        it('Should call _loadYears', () => {
            eventCtrl._getMonths();
            expect(eventCtrl._loadYears).toHaveBeenCalled();
        });

        it('Should call loadMoreEvents', () => {
            eventCtrl._getMonths();
            expect(eventCtrl.loadMoreEvents).toHaveBeenCalled();
        });

        it('Should has 12 months loaded', () => {
            eventCtrl._getMonths();
            expect(eventCtrl.months).toEqual(months);
            expect(eventCtrl.months.length).toEqual(12);
        });

        it("The selectedMonth and selectedYear should equal to the current month and year", () => {
            const currentDate = new Date();
            eventCtrl._getMonths();
            expect(eventCtrl.selectedMonth).toEqual({month: currentDate.getMonth()+1});
            expect(eventCtrl.selectedYear).toEqual(currentDate.getFullYear());
        });
    });

    describe('_getDaysRange()', () => {

        it('Should return array with init day and end day in positions 0 and 1, respectively', () => {
            eventCtrl.selectedMonth = months[11].month;
            eventCtrl.selectedYear = new Date(startDate).getFullYear();
            expect(eventCtrl._getDaysRange(new Date(startDate), new Date(endDate)))
                .toEqual([22, 31]);
        });
    });

    describe('getProfileColor()', () => {

        it('Should return the color if user is member of institution of event', () => {
            eventCtrl.user = user;
            expect(eventCtrl.getProfileColor(event)).toEqual(_.first(user.institution_profiles).color);
        });

        it('Should return a default color "teal" if user is not a member of institution of event', () => {
            eventCtrl.user = {institution_profiles: []};
            expect(eventCtrl.getProfileColor(event)).toEqual('teal');
        });
    });

    describe('loadFilteredEvents()', () => {

        it('Should reset moreEvents, actualPage and isAnotherMonth', () => {
            eventCtrl._moreEvents = false;
            eventCtrl._actualPage = 5;
            eventCtrl._isAnotherMonth = false;
            eventCtrl.loadFilteredEvents();
            expect(eventCtrl._moreEvents).toBeTruthy();
            expect(eventCtrl._actualPage).toEqual(0);
            expect(eventCtrl._isAnotherMonth).toBeTruthy();
        });

        it('Should call loadMoreEvents()', () => {
            spyOn(eventCtrl, 'loadMoreEvents');
            eventCtrl.loadFilteredEvents();
            expect(eventCtrl.loadMoreEvents).toHaveBeenCalled();
        });
    });

    describe('loadMoreEvents()', () => {

        it('Should call _loadEvents', () => {
            spyOn(eventCtrl, '_loadEvents');
            eventCtrl._moreEvents = true;
            eventCtrl.loadMoreEvents();
            expect(eventCtrl._loadEvents).toHaveBeenCalled();
        });
    });

    describe('_loadEvents()', () => {

        const december = 12;
        const testYear = 2018;

        beforeEach(() => {
            spyOn(eventService, 'getEvents').and.callFake(function () {
                return {
                    then: function (callback) {
                        return callback({events: requestEvent.events, next: true});
                    }
                };
            });
        });

        it('Should call eventService.getEvents()', () => {
            eventCtrl._loadEvents(q.defer(), eventService.getEvents, december, testYear);
            expect(eventService.getEvents).toHaveBeenCalled();
        });

        it('Should call _getEventsByDay()', () => {
            spyOn(eventCtrl, '_getEventsByDay');
            eventCtrl._loadEvents(q.defer(), eventService.getEvents, december, testYear);
            expect(eventCtrl._getEventsByDay).toHaveBeenCalled();
        });

        it('Should increase +1 on _actualPage', () => {
            eventCtrl._actualPage = 0;
            eventCtrl._loadEvents(q.defer(), eventService.getEvents, december, testYear);
            expect(eventCtrl._actualPage).toEqual(1);
        });

        it('Should update _moreEvents', () => {
            eventCtrl._moreEvents = false;
            eventCtrl._loadEvents(q.defer(), eventService.getEvents, december, testYear);
            expect(eventCtrl._moreEvents).toBeTruthy();
        });

        it('Should to increase the events of controller if not is another month', () => {
            eventCtrl._isAnotherMonth = false;
            eventCtrl.events = requestEvent.events;
            expect(eventCtrl.events.length).toEqual(2);
            eventCtrl._loadEvents(q.defer(), eventService.getEvents, december, testYear);
            expect(eventCtrl.events.length).toEqual(4);
        });

        it('Should update the events of controller if is another month', () => {
            eventCtrl._isAnotherMonth = true;
            eventCtrl.events = [];
            eventCtrl._loadEvents(q.defer(), eventService.getEvents, december, testYear);
            expect(eventCtrl.events).toEqual(requestEvent.events);
            expect(eventCtrl._isAnotherMonth).toBeFalsy();
        });
    });

    describe('newEvent()', () => {

        it('should call mdDialog.show', () => {
            spyOn(mdDialog, 'show').and.callFake(() => {
                return {
                    then: function (callback) {
                        return callback({});
                    }
                };
            });
            eventCtrl.newEvent();
            expect(mdDialog.show).toHaveBeenCalled();
        });
    });

    describe('share()', () => {

        it('should call mdDialog.show', () => {
            spyOn(mdDialog, 'show');
            eventCtrl.share("$event", event);
            expect(mdDialog.show).toHaveBeenCalled();
        });
    });
}));