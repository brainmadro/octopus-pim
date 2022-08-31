const router = require('express').Router()
const syncControllers = require('../../controllers/syncControllers')

//router.get('/sync/product/:id', syncControllers.)
/* router.get('/sync/collection/:id', (req, res) => {
    var id = req.params.id;
    sinctronizarItems(id, 23);
    res.render('pages/index')
}) */
router.get('/prices', syncControllers.prices)
router.get('/base-prices', syncControllers.basePrices)
router.get('/inventory', syncControllers.inventory)
router.get('/metafields', syncControllers.metafields)
router.get('/purchase-dates', syncControllers.purchaseDates)
router.get('/bulk-pricing', syncControllers.bulkPricing)

module.exports = router;