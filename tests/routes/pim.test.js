const request = require('supertest')
const { matchers } = require('jest-json-schema')
const { app, server } = require('../../index')

const api = request(app)
expect.extend(matchers);

describe('endpoints of synchronization', () => {
    it('GET /products', async () => { 
		const schema = {
            properties: {
                'data': { 
                    type: 'array',
                    items: {
						type: "object"
					}
                },
                'meta': { type: 'object'}
            },
            required: ['data']
        };

        const res = await api.get('/api/v1/pim/products')
		console.log(res.body.data)
        expect(res.status).toEqual(200)
		expect(res.headers["content-type"]).toMatch(/json/)
		expect(res.body).toMatchSchema(schema)
    })
})

afterAll(() => {
    server.close()
})