const router = require('express').Router()

router.post('/jasper/create-relations', async (req, res) =>{
    const response = await createProductRelationsJasper(req.body.type, req.body.items);
    res.send(response)
})

router.post('/jasper/delete-relations', async (req, res) =>{
    const response = await deleteProductRelationsJasper(req.body.type, req.body.items)
    res.send(response)
}) 

router.post('/product-from-jasper', async (req, res) => {
    console.log(req.body);
    const response = await getProductJasper(req.body.id);
    res.send(response);
})

router.get('/jasper/product-relations', (req, res) => {
    res.render('pages/product-relations')
})