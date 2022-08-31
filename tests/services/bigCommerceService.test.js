const request = require('supertest')
const { app, server } = require('../../index')
const autoSynchronications = require('../../services/bigCommerceService')

const api = request(app)

describe.skip('autoSynchronications', () => {
    test('should be executing', () => { 
		jest.useFakeTimers();
		expect(autoSynchronications()).toBe(0);  // Success!
		jest.advanceTimersByTime(58000);
		expect(autoSynchronications()).toBe(3);  // Success!
     })
})