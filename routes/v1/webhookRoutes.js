router.post('/webhooks/bigcommerce/product/created', (req, res) => {
    var id = req.body.data.id;
    console.log(`Created product: ${id}`);
    syncProductCreated(id);
    res.send("Success")
})

router.post('/webhooks/bigcommerce/product/deleted', (req, res) => {
    var id = req.body.data.id;
    console.log(`Deleting: ${id}`);
    syncProductDeleted(id, req.body.data.type)
    res.send("Success")
})

router.post('/webhooks/jasper/product/created', (req, res) => {
    var id = req.body.data.id;
    console.log(`Created product: ${id}`);
    syncProductCreated(id);
    res.send("Success")
})

router.post('/shopify-webhook/bulk-operation', (req, res) => {
    console.log(res.statusCode);
    console.log(req.headers);
    console.log(req.body);
    console.log(JSON.stringify(req));
    /*const query = `query {
      node(id: "${ response.bulkOperationRunQuery.bulkOperation.id }") {
        ... on BulkOperation {
          url
          partialDataUrl
        }
      }
    }`;
    shopify
      .graphql(query)
      .then((response) => {
        //console.log("URL", response.node.url);
        const file = fs.createWriteStream("data/bulk-data-shopify.jsonl");
        const request = https.get(response.node.url, function(response) {
          response.pipe(file);
        });
      })
      .catch((err) => console.error(err));*/
    res.sendStatus(res.statusCode)
    res.send("Success")
})