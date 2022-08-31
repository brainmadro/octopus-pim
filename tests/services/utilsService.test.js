const { matchers } = require('jest-json-schema')
const { sap, bigCommerce } = require('../../services/utils')

expect.extend(matchers);

describe('SAP utils', () => {
    test('validate access', async () => {
        const session = await sap.loginSAP()
        expect(session).toBeDefined()
        expect(session).toMatch(/11ed-8000-0a81a4fdfeb7/)
    });

    test('validate getItem function', async () => {
        const schema = {
            properties: {
                'odata.metadata': { type: 'string'},
                'odata.etag': { type: 'string' },
                ItemCode: { type: 'string' },
                Valid: { type: 'string' }
            },
            required: ['odata.metadata', 'odata.etag']
        };
        const session = await sap.loginSAP()
        const requestSAP = new sap.RequestSAP(session);
        const res = await requestSAP.getItem('60043');
        expect(res).toBeDefined()
        expect(res.length).toBeGreaterThan(10000)
        expect(JSON.parse(res)).toMatchSchema(schema);
    });

    test('validate getItems function', async () => {
        const schema = {
            properties: {
                'odata.metadata': { type: 'string'},
                value: { 
                    type: 'array',
                    items: {
                        type: "object"
                    },
                    minItems: 20
                }
            },
            required: ['odata.metadata', 'value']
        };
        const session = await sap.loginSAP()
        const requestSAP = new sap.RequestSAP(session);
        const res = await requestSAP.getItems("ItemCode", sap.RequestSAP.FILTERS_FOR_SAP, 0);
        expect(res).toBeDefined()
        expect(res.length).toBeGreaterThan(2700)
        expect(JSON.parse(res)).toMatchSchema(schema);
    });

    test('validate getSpecialPrices function', async () => {
        const schema = {
            properties: {
                'odata.metadata': { type: 'string'},
                value: { 
                    type: 'array',
                    items: {
                        type: "object"
                    },
                    minItems: 20
                }
            },
            required: ['odata.metadata', 'value']
        };
        const session = await sap.loginSAP()
        const requestSAP = new sap.RequestSAP(session);
        const res = await requestSAP.getSpecialPrices("Valid%20eq%20%27tYES%27%20and%20PriceListNum%20eq%206", 0);
        expect(res).toBeDefined()
        expect(res.length).toBeGreaterThan(33000)
        expect(JSON.parse(res)).toMatchSchema(schema);
    });

    test('validate getPurchaseData function', async () => {
        const schema = {
            properties: {
                'odata.metadata': { type: 'string'},
                value: { 
                    type: 'array',
                    items: {
                        type: "object"
                    },
                    minItems: 20
                }
            },
            required: ['odata.metadata', 'value']
        };
        const session = await sap.loginSAP()
        const requestSAP = new sap.RequestSAP(session);
        const res = await requestSAP.getPurchaseData(0)
        expect(res).toBeDefined()
        expect(res.length).toBeGreaterThan(3700)
        expect(JSON.parse(res)).toMatchSchema(schema);
    });
})
  
describe('BigCommerce utils', () => {
    test('conection and retrive info', async () => {
        const schema = {
            properties: {
                'data': { 
                    type: 'object',
                    properties: {
                        "availability": { type: 'string' },
                        "brand_id": { type: 'number' },
                        "categories": { type: 'array' },
                        "date_created": { type: 'string' },
                        "date_modified": { type: 'string' },
                        "price": { type: 'number' },
                        "sku": { type: 'string' },
                        "type": { type: 'string' },
                        "upc": { type: 'string' },
                        "weight": { type: 'number' },
                    }
                },
                'meta': { type: 'object'}
            },
            required: ['data']
        };

        const product  = await bigCommerce.request.get(`/catalog/products/2487`)
        expect(product).toBeDefined()
        expect(product).toMatchSchema(schema);
    })

    test('validate updateBatchProducts function', async () => {
        const respo = await bigCommerce.updateBatchProducts([{
            "id": 2487,
            "description": "<p><span>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Morbi vel metus ac est egestas porta sed quis erat.</span></p>"
        }])
		expect(respo).toBe(200)
    })

	test('validate setBulkPricingTiers function', async () => {
        const respo = await bigCommerce.setBulkPricingTiers(1, [
			{
			  "sku": "0000",
			  "price": 27.39,
			  "currency": "usd",
			  "bulk_pricing_tiers": [
				{
				  "quantity_min": 10,
				  "quantity_max": 19,
				  "type": "percent",
				  "amount": 1
				},
				{
				  "quantity_min": 20,
				  "quantity_max": 29,
				  "type": "percent",
				  "amount": 3
				},
				{
				  "quantity_min": 30,
				  "quantity_max": 2147483647,
				  "type": "percent",
				  "amount": 5
				}
			  ]
			}
		])
		expect(respo).toBe(200)
    })
})