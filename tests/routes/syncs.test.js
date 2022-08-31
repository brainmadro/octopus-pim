const request = require('supertest')
const { app, server } = require('../../index')

const api = request(app)

describe('endpoints of synchronization', () => {
    /* test('enpoint: /dashboard => should response 200 code', () => { 
        api.get('/api/v1/dashboard') 
        .expect(200)
    })
    test('enpoint: /check => should response 200 code', async () => { 
        await api.get('/api/v1/check') 
        .expect(200)
    })
    test('enpoint: /products/:id => should response 200 code', async () => { 
        await api.get('/api/v1/products/123') 
        .expect(200)
    })
    test('enpoint: /jasper/product-relations => should response 200 code', async () => { 
        await api.get('/api/v1/jasper/product-relations') 
        .expect(200)
    })
    test('enpoint: /location => should response 200 code', async () => { 
        await api.get('/api/v1/location') 
        .expect(200)
    })
    test('enpoint: /test => should response 200 code', async () => { 
        await api.get('/api/v1/test') 
        .expect(200)
    })
    test('enpoint: /check-ip => should response 200 code', async () => { 
        await api.get('/api/v1/check-ip') 
        .expect(200)
    }) */
    /* test('enpoint: /sync/product/:id => should response 200 code', async () => { 
        await api.get('/api/v1/sync/product/123') 
        .expect(200)
    })
    test('enpoint: /sync/collection/:id => should response 200 code', async () => { 
        await api.get('/api/v1/sync/collection/:id') 
        .expect(200)
    }) */
    /* test('enpoint: /sync/prices => should response 200 code', async () => { 
        const response = await api.get('/api/v1/sync/prices').set('Accept', 'text/event-stream')
        expect(response.statusCode).not.toEqual(200)
    }) */
    /* test('enpoint: /sync/base-prices => should response 200 code', async () => { 
        await api.get('/api/v1/sync/base-prices') 
        .expect(200)
    }, 20000)
    test('enpoint: /sync/inventory => should response 200 code', async () => { 
        await api.get('/api/v1/sync/inventory') 
        .expect(200)
    }, 20000)
    test('enpoint: /sync/metafields => should response 200 code', async () => { 
        await api.get('/api/v1/sync/metafields') 
        .expect(200)
    }, 20000)
    test('enpoint: /sync/purchase-dates => should response 200 code', async () => { 
        await api.get('/api/v1/sync/purchase-dates') 
        .expect(200)
    }, 20000) */
    /* test('enpoint: /products-bigcommerce/sku => should response 200 code', async () => { 
        await api.get('/products-bigcommerce/sku') 
        .expect(200)
    })
    test('enpoint: /products-from-bigcommerce => should response 200 code', async () => { 
        await api.get('/api/v1/products-from-bigcommerce') 
        .expect(200)
    })
    test('enpoint: /products-from-jasper => should response 200 code', async () => { 
        await api.get('/api/v1/products-from-jasper') 
        .expect(200)
    })
    test('enpoint: /metafields-from-bigcommerce => should response 200 code', async () => { 
        await api.get('/api/v1/metafields-from-bigcommerce') 
        .expect(200)
    }) */
    /* test('enpoint: /sync/bulk-pricing => should response 200 code', async () => { 
        await api.get('/api/v1/sync/bulk-pricing') 
        .expect(200)
    }) */
    /* test('enpoint: /metafields/product/:id => should response 200 code', async () => { 
        await api.get('/api/v1/metafields/product/123') 
        .expect(200)
    })
    test('enpoint: /metafields/product/:product/variant/:variant => should response 200 code', async () => { 
        await api.get('/api/v1/metafields/product/:product/variant/:variant') 
        .expect(200)
    })
    test('enpoint: /promo-products => should response 200 code', async () => { 
        await api.get('/api/v1/promo-products') 
        .expect(200)
    })
    test('enpoint: /viewed-products => should response 200 code', async () => { 
        await api.get('/api/v1/viewed-products') 
        .expect(200)
    })
    test('enpoint: /pim/products => should response 200 code', async () => { 
        await api.get('/api/v1/pim/products') 
        .expect(200)
    })
    test('enpoint: /shopify-webhook/bulk-operation => should response 200 code', async () => { 
        await api.post('/api/v1/shopify-webhook/bulk-operation') 
        .expect(200)
    })
    test('enpoint: /webhooks/bigcommerce/product/created => should response 200 code', async () => { 
        await api.post('/api/v1/webhooks/bigcommerce/product/created') 
        .expect(200)
    })
    test('enpoint: /webhooks/bigcommerce/product/deleted => should response 200 code', async () => { 
        await api.post('/api/v1/webhooks/bigcommerce/product/deleted') 
        .expect(200)
    })
    test('enpoint: /webhooks/jasper/product/created => should response 200 code', async () => { 
        await api.post('/api/v1/webhooks/jasper/product/created') 
        .expect(200)
    })
    test('enpoint: /hound => should response 200 code', async () => { 
        await api.post('/api/v1/hound') 
        .expect(200)
    })
    test('enpoint: /promos-add-product => should response 200 code', async () => { 
        await api.post('/api/v1/promos-add-product') 
        .expect(200)
    })
    test('enpoint: /promos-remove-product => should response 200 code', async () => { 
        await api.post('/api/v1/promos-remove-product') 
        .expect(200)
    })
    test('enpoint: /product-from-jasper => should response 200 code', async () => { 
        await api.post('/api/v1/product-from-jasper') 
        .expect(200)
    })
    test('enpoint: /viewed-products/update => should response 200 code', async () => { 
        await api.post('/api/v1/viewed-products/update') 
        .expect(200)
    })
    test('enpoint: /jasper/create-relations => should response 200 code', async () => { 
        await api.post('/api/v1/jasper/create-relations') 
        .expect(200)
    })
    test('enpoint: /jasper/delete-relations => should response 200 code', async () => { 
        await api.post('/api/v1/jasper/delete-relations') 
        .expect(200)
    }) */
})

afterAll(() => {
    server.close()
})