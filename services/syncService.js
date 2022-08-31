const utils = require('./utils');

async function purchaseDataSAP(manual) {
    var products = new Array();
  
    const session = await utils.sap.loginSAP()
    var requestSAP = new RequestSAP(session);
  
    async function getPurchaseData(skip, resolve) {
      var items = await requestSAP.getPurchaseData(skip);
      items = JSON.parse(items);
      items.value.forEach(item => {
        if (item.ItemCode.length < 2) {
          console.log(item.ItemCode);          
        }
        
        
        /* if ((item.OnHand - item.IsCommited) <= 0) {
          /* if (item.ItemCode == "750-507") {
            console.log(`PRODUCTO (${item.ItemCode}): ${item.OnHand - item.IsCommited}`);
          } 
          products.push({
            sku: item.ItemCode,
            date: date,
            quantity: item.OpenQty,
            committed: item.IsCommited,
            stock: item.OnHand
          });
          const currentProduct = products.find(x => x.sku == item.ItemCode)
          if (typeof currentProduct != 'undefined') {
            if(new Date(currentProduct.date) > new Date(date)){
              const index = products.findIndex(x => x.sku == item.ItemCode);
              products[index] = {
                sku: item.ItemCode,
                date: date,
                quantity: item.OpenQty,
                committed: item.IsCommited,
                stock: item.OnHand
              }
              //console.log(`${date} es mejor que ${products[item.ItemCode].date}`)
            }
          } else {
            products.push({
              sku: item.ItemCode,
              date: date,
              quantity: item.OpenQty,
              committed: item.IsCommited,
              stock: item.OnHand
            });
          }        
          data.sort((a, b) => {
                      const keyA = a.custom_fields.find(x => x.name == 'Sort');
                      const keyB = b.custom_fields.find(x => x.name == 'Sort');
                      // Compare the 2 dates
                      if (typeof keyA != 'undefined' && typeof keyB != 'undefined') {
                          if (keyA.value < keyB.value) return -1;
                          if (keyA.value > keyB.value) return 1;
                      }
                      return 0;
                  });   
        } */
      });
      products = products.concat(items.value)
      if (items.hasOwnProperty('odata.nextLink')) {
        skip += 20;
        console.log(skip);
        getPurchaseData(skip, resolve);
      } else {
        // Out of Stock Filter
        products = products.filter(x => { 
          if ((x.OnHand - x.IsCommited) <= 0 && (x.OnHand - x.IsCommited) + x.OpenQty > 0) {
            const date = x.ShipDate.substring(0, 4) + "-" + x.ShipDate.substring(4, 6) + "-" + x.ShipDate.substring(6, 8) + "T00:00:00-05:00"; //"2022-01-29T00:00:00-05:00"
            x.ShipDate = date;
            return x
          }
        })
  
        //Sort by dates
        products.sort((a, b) => {
          const dateA = new Date(a.ShipDate);
          const dateB = new Date(b.ShipDate);
          if (dateA < dateB) return -1;
          if (dateA > dateB) return 1;
        })
  
        //Removing duplicates
        const codes = products.map(x => x.ItemCode);
        const indexes = codes.map(x => codes.indexOf(x));
        products = products.filter(x => {
          if (indexes.includes(products.indexOf(x))) {
            return x
          }
        })
        console.log(`Found products for synchronization: ${products.length}`);
        productsRef.once("value", snapshot => sync(resolve, snapshot.val()));
        
      }
    }
  
    async function sync(resolve, bigCommerceItems) {
      const items = [];
      const notFound = [];
      products.forEach(async item => { 
        const inventoryLevel = (item.OnHand - item.IsCommited) + item.OpenQty;
        /* if (item.ItemCode == "721-002") {
          console.log(`PRODUCTO BUSCADO (${item.ItemCode}): ${inventoryLevel}  & ${item.OnHand - item.IsCommited}`);
        } */
        if (typeof bigCommerceItems.find(x => x.sku == item.ItemCode) != 'undefined') {
          items.push({
            "id": bigCommerceItems.find(x => x.sku == item.ItemCode).bigcommerce_product_id,
            "availability": "preorder",
            "preorder_release_date": item.ShipDate,
            //"is_preorder_only": true
            //"inventory_level": inventoryLevel
          });
        } else {
          notFound.push(item);
          //console.log(`Producto inexistente en PIM: SKU ${item.sku}`);
        }
      })
      console.log("Ready to sync: ", items.length);
      console.log("Not found items in BigCommerce: ", notFound.length);
      if (manual) {
        resolve(true)
      }
      const chunk = 10;
      for (var i = 0,j = items.length; i < j; i += chunk) {
          const temporary = items.slice(i, i + chunk);
          updateBatchProducts(temporary);
      }
    }
  
    return new Promise(resolve => {
      getPurchaseData(0, resolve);
    })
}

async function syncProductCreated(id) {
var bigCommerceItems = [];
await productsRef.once("value", snapshot => bigCommerceItems = snapshot.val());

//Get information from local data
async function getData(id) {
    return new Promise(resolve => {
    bigCommerce.get(`/catalog/products/${id}`)
        .then(data => {
            resolve(data.data);
        })
        .catch((err) => console.error(err));
    })
}

const product = await getData(id);

const session = await utils.sap.loginSAP()
var requestSAP = new RequestSAP(session);

if (product.option_set_id == null) { // It's a product without variants
    var item = await requestSAP.getItem(product.sku);
    item = JSON.parse(item);
    
    if (item.error && item.error.code == -2028) {
    console.log("Ese SKU no existe en SAP");
    } else {
    var level = (item.ItemWarehouseInfoCollection[0].InStock - item.ItemWarehouseInfoCollection[0].Committed < 0) ? 0 : item.ItemWarehouseInfoCollection[0].InStock - item.ItemWarehouseInfoCollection[0].Committed;
    var promises = [];
    var metafieldsInfo = [];
    var metafields = [{
        "permission_set": "read_and_sf_access",
        "namespace": "sap",
        "key": "master_case",
        "value": (item.U_hedel_mfr_packing == null) ? "1" : String(item.U_hedel_mfr_packing),
        "description": "Master Case"
    },{
        "permission_set": "read_and_sf_access",
        "namespace": "sap",
        "key": "inner_case",
        "value": (item.U_hedel_pack == null) ? "1" : String(item.U_hedel_pack),
        "description": "Inner Case"
    },{
        "permission_set": "read_and_sf_access",
        "namespace": "sap",
        "key": "carton_length",
        "value": (item.U_Carton_Length == null) ? "1" : String(item.U_Carton_Length),
        "description": "Carton Length"
    },{
        "permission_set": "read_and_sf_access",
        "namespace": "sap",
        "key": "carton_width",
        "value": (item.U_Carton_Width == null) ? "1" : String(item.U_Carton_Width),
        "description": "Carton width"
    },{
        "permission_set": "read_and_sf_access",
        "namespace": "sap",
        "key": "carton_height",
        "value": (item.U_Carton_Height == null) ? "1" : String(item.U_Carton_Height),
        "description": "Carton Height"
    },{
        "permission_set": "read_and_sf_access",
        "namespace": "sap",
        "key": "carton_weight",
        "value": (item.U_Carton_Weight == null) ? "1" : String(item.U_Carton_Weight),
        "description": "Carton Weight"
    },{
        "permission_set": "read_and_sf_access",
        "namespace": "sap",
        "key": "pack_multiple",
        "value": (item.U_hedel_Pack_Multiples == null) ? "1" : String(item.U_hedel_Pack_Multiples),
        "description": "Pack Multiple"
    }];
    
    bigCommerce.put(`/catalog/products/${ id }`, { 
        "price": item.ItemPrices[1].Price, 
        "inventory_level": level, 
        "inventory_warning_level": parseInt(level*0.1), 
        "inventory_tracking": "product",
        "weight": (item.U_Carton_Weight == null) ? 1 : item.U_Carton_Weight,
        "upc": (item.BarCode == null) ? "" : item.BarCode,
        "order_quantity_minimum": (item.U_hedel_Pack_Multiples == null || item.U_hedel_Pack_Multiples == "-") ? 1 : parseInt(item.U_hedel_Pack_Multiples)

    })
    .then(data => {
        console.log(`The product ${ data.data.sku } recently created has been updated`);
        //syncPurchaseDataSAP(); //Update information if the product has been created before arrive
        bigCommerceItems.push({
        "sku": data.data.sku,
        "bigcommerce_product_id": id
        })
        metafields.forEach((metafield) => {
        promises.push(bigCommerce.post(`/catalog/products/${ id }/metafields`, metafield))
        });
        Promise.all(promises).then(async (values) => {
        var tempItem = bigCommerceItems.find(x => x.bigcommerce_product_id == id)
        tempItem["metafields"] = values.map(x => x.data);
        tempItem["jasper_id"] = "";
        tempItem["price"] = item.ItemPrices[5].Price;
        productsRef.set(bigCommerceItems);
        console.log(tempItem);
        });
        return data.data;
    })
    .then(data => {
        var priceInfo = [{
        sku: data.sku,
        price: item.ItemPrices[5].Price,
        currency: "usd"
        }];
        setBulkPricingTiers(1, priceInfo);
    })
    .catch((err) => console.error(err));    
    }
} else {
    var filter = "";
    var ids = [];
    
    bigCommerce.put(`/catalog/products/${ id }`, { "inventory_tracking": "variant" })
    .then(data => {})
    .catch((err) => console.error(err));

    bigCommerce.get(`/catalog/products/${id}/variants`)
    .then(data => {
    let items = data.data;        

    items.forEach(element => {
        filter += `ItemCode%20eq%20'${ element.sku }'%20or%20`;
        ids.push({"sku": element.sku,"id": element.id});
    });

    return { "ids": ids, "filters": filter.slice(0, -8) }
    })
    .then(async (data) => {
    var infoToUpdate = [];
    
    var items = await requestSAP.getItems("ItemCode,ItemPrices,ItemWarehouseInfoCollection,BarCode,U_Carton_Weight,U_hedel_Pack_Multiples,Valid", data.filters, 0);
    items = JSON.parse(items);
    
    items.value.forEach(element => {
        var level = (element.ItemWarehouseInfoCollection[0].InStock - element.ItemWarehouseInfoCollection[0].Committed < 0) ? 0 : element.ItemWarehouseInfoCollection[0].InStock - element.ItemWarehouseInfoCollection[0].Committed;
        
        bigCommerceItems.push({
        "sku": element.ItemCode,
        "bigcommerce_product_id": id,
        "bigcommerce_variant_id":data.ids.find(x => x.sku == element.ItemCode).id
        })

        infoToUpdate.push({ 
        "id": data.ids.find(x => x.sku == element.ItemCode).id,
        "inventory_level": level,
        "inventory_warning_level": parseInt(level*0.1),
        "price": element.ItemPrices[1].Price, 
        "weight": element.U_Carton_Weight,
        "upc": element.BarCode    
        })
    });

    productsRef.set(bigCommerceItems);

    var i,j, temporary, chunk = 50;
    for (i = 0,j = infoToUpdate.length; i < j; i += chunk) {
        temporary = infoToUpdate.slice(i, i + chunk);
        syncBulkInventory(null, temporary);
    }
    setTimeout(() => { syncPurchaseDataSAP() }, 5000); //Update information if the product has been created before arrive        
    return items;
    })
    .then(data => {
    var priceInfo = [];
    data.value.forEach(element => {
        priceInfo.push({
        sku: element.ItemCode,
        price: element.ItemPrices[5].Price,
        currency: "usd"
        })
    });      
    setBulkPricingTiers(1, priceInfo);
    })
    .catch((err) => console.error(err));
}
}

async function syncProductDeleted(id, type) {
var bigCommerceItems = [];
await productsRef.once("value", snapshot => bigCommerceItems = snapshot.val());
if (type == "product") {
    const index = bigCommerceItems.findIndex(x => x.bigcommerce_product_id == id);
    bigCommerceItems.splice(index, 1);
    if (typeof bigCommerceItems.find(x => x.bigcommerce_product_id == id) == 'undefined') {
    console.log("Product deleted");
    }
    productsRef.set(bigCommerceItems);
} else {
    const index = bigCommerceItems.findIndex(x => x.bigcommerce_variant_id == id);
    bigCommerceItems.splice(index, 1);
    if (typeof bigCommerceItems.find(x => x.bigcommerce_variant_id == id) == 'undefined') {
    console.log("Variant deleted");
    }
    productsRef.set(bigCommerceItems);
}
}

async function syncCustomFields() {

const session = await utils.sap.loginSAP()
var requestSAP = new RequestSAP(session);

var items = await requestSAP.getItem("ItemCode,ItemName,ItemPrices,ItemWarehouseInfoCollection,InventoryWeight,U_Catalog_Main_Category,U_Catalog_Sub_Category,U_hedel_Pack_Multiples,U_Catalog_Sub_Category,Valid", utils.sap.RequestSAP.FILTERS_FOR_SAP, skip);
items = JSON.parse(items);
items.value.forEach((item, i) => {

});

}

async function prices(res) {
var products = [];
var prices = [];
var bigCommerceItems = [{
    bigcommerce_product_id: 155,
    bigcommerce_variant_id: 127,
    jasper_id: 17,
    sku: "727-206"
}];
//await productsRef.once("value", snapshot => bigCommerceItems = snapshot.val());

const session = await utils.sap.loginSAP()
var requestSAP = new utils.sap.RequestSAP(session);

async function getData(skip, resolve) {
    const response = await requestSAP.getItems("ItemCode,ItemPrices,Valid", utils.sap.RequestSAP.FILTERS_FOR_SAP, skip);
    const items = (JSON.parse(response).hasOwnProperty('odata.metadata')) ? JSON.parse(response) : null;
    if (items === null) { resolve({in_process: false, error: JSON.parse(response).error }); return }
    items.value.forEach(item => {
    
    const bigCommerceItem = (typeof bigCommerceItems.find(x => x.sku == item.ItemCode) != 'undefined') ? bigCommerceItems.find(x => x.sku == item.ItemCode) : {};
    prices.push({
        sku: item.ItemCode,
        price: item.ItemPrices[5].Price,
        currency: "usd"
    });
    products.push({
        id: bigCommerceItem.bigcommerce_product_id,
        sku: item.ItemCode,
        price: item.ItemPrices[1].Price
    });
    /* if (typeof bigCommerceItems.find(x => x.sku == item.ItemCode) == 'undefined') {
        //console.log(`Activo en SAP pero no exite en BigCommerce: ${ item.ItemCode }`);
    } else {
        prices.push({
        sku: item.ItemCode,
        price: item.ItemPrices[5].Price,
        currency: "usd"
        });
        products.push({
        id: bigCommerceItems.find(x => x.sku == item.ItemCode).bigcommerce_product_id,
        price: item.ItemPrices[1].Price
        });
    } */
    });

    if (items.hasOwnProperty('odata.nextLink')) {
        skip += 20;
        //console.log(skip);
        //resolve({in_process: true, error: ''})
        const data = `data: ${JSON.stringify({
            sap_info_progress: skip,
            sap_info_total: 1000,

        })}\n\n`;
        res.write(data)
        getData(skip, resolve);
    } else {
        sync(resolve);
    }
}

function sync(resolve) {
    const itemsSku = bigCommerceItems.map(x => x.sku);
    console.log("Products A Length: ",products.length);
    prices = prices.filter(x => itemsSku.includes(x.sku))
    products = products.filter(x => itemsSku.includes(x.sku))
    console.log("Products B Length: ",products.length);

    /* prices.forEach(async x => {
        const text = `UPDATE products SET price = '${x.price}' WHERE sku = '${x.sku}';`
        try {
            const res = await clientDB.query(text)
            console.log(res)
        } catch (error) {
            console.log(error.stack)
            console.log(text);
        }
    }) */
    
    var chunk = 10;
    for (var i = 0;i < products.length;i += chunk) {
        const temporary = products.slice(i, i + chunk);
        //utils.bigCommerce.updateBatchProducts(temporary);
    }
    
    chunk = 1000;
    for (var i = 0; i < prices.length; i += chunk) {
        var temporary = prices.slice(i, i + chunk);
        //utils.bigCommerce.setBulkPricingTiers(1, temporary);
        if (temporary.length < i) {
        resolve(true);
        }
    }/* 
    prices.forEach(element => {
        const productData = bigCommerceItems.find(x => x.sku == element.sku)
        productData['price'] = element.price;
        bigCommerceItems.splice(bigCommerceItems.findIndex(x => x.sku == element.sku), 1, productData);
        fs.writeFileSync(path.join(__dirname + '/data/items-by-sku.json'), JSON.stringify(bigCommerceItems));        
    }) */
}

return new Promise(resolve => {
    getData(0, resolve);
})

}

async function basePrices(res) {
var products = [];

const session = await utils.sap.loginSAP()
var requestSAP = new RequestSAP(session);

async function getData(skip) {
    var items = await requestSAP.getItems("ItemCode,ItemPrices,Valid", utils.sap.RequestSAP.FILTERS_FOR_SAP, skip);
    items = JSON.parse(items);
    products = products.concat(items.value);
    if (items.hasOwnProperty('odata.nextLink')) {
    skip += 20;
    console.log(skip);
    getData(skip);
    } else {
    var bigCommerceItems = [];
    await productsRef.once("value", snapshot => bigCommerceItems = snapshot.val());
    var prices = [];
    products.forEach((item, i) => {
        if (typeof bigCommerceItems.find(x => x.sku == item.ItemCode) == 'undefined') {
        console.log(`Activo en SAP pero no exite en BigCommerce: ${ item.ItemCode }`);
        } else {
        if (!bigCommerceItems.find(x => x.sku == item.ItemCode).hasOwnProperty("bigcommerce_variant_id")) {
            /*prices.push({
            "id": bigCommerceItems.find(x => x.sku == item.ItemCode).bigcommerce_product_id,
            "price": item.ItemPrices[1].Price
            });*/ // para version 2 del código max 10 por arreglo
            bigCommerce.put(`/catalog/products/${ bigCommerceItems.find(x => x.sku == item.ItemCode).bigcommerce_product_id }`, { price: item.ItemPrices[1].Price })
            .then(data => {
                // Catch any errors, or handle the data returned
                console.log(data.data.sku + " Updated");
            })
            .catch((err) => console.error(err));
        } else {
            bigCommerce.put(`/catalog/products/${ bigCommerceItems.find(x => x.sku == item.ItemCode).bigcommerce_product_id }/variants/${ bigCommerceItems.find(x => x.sku == item.ItemCode).bigcommerce_variant_id }`, { price: item.ItemPrices[1].Price })
            .then(data => {
                // Catch any errors, or handle the data returned
                console.log(data.data.sku + " Updated");
            })
            .catch((err) => console.error(err));
        }
        }
    });
    syncBulkPrices(prices);
    }
}
/*function updatePrices() {
    var bigCommerceItems = require(path.join(__dirname + '/data/items-by-sku.json'));
    //var brandId = brands.brands.filter(function(brand) { return brand.name === item.brand; });
    console.log(items);

    items.value.forEach((item, i) => {
    if (!bigCommerceItems[item.ItemCode]) {
        console.log("Este producto está activo en SAP pero no existe en BigCommerce: " + item.ItemCode);
    } else {
        console.log(item.ItemCode + ":" + item.ItemPrices[1].Price);
        bigCommerce.put('/catalog/products/' + bigCommerceItems[item.ItemCode].bigcommerce_product_id, { price: item.ItemPrices[1].Price })
        .then(data => {
        // Catch any errors, or handle the data returned
        //console.log(data.data.price);
        })
        .catch((err) => console.error(err));
    }
    });
};*/

    try {
        await getData(0);
    } catch (e) {
    e.message === 'HTTP request failed'
        ? console.error(JSON.stringify(e.response, null, 2))
        : console.error(e)
    }
}

async function inventory(res) {
var products = [];

const session = await utils.sap.loginSAP()
var requestSAP = new RequestSAP(session);

async function getData(skip, resolve) {
    var items = await requestSAP.getItems("ItemCode,ItemWarehouseInfoCollection,U_hedel_Pack_Multiples,U_Carton_Weight,Valid", utils.sap.RequestSAP.FILTERS_FOR_SAP, skip);
    items = JSON.parse(items);
    products = products.concat(items.value);
    if (items.hasOwnProperty('odata.nextLink')) {
    skip += 20;
    console.log(skip);
    getData(skip, resolve);
    } else {
    productsRef.once("value", snapshot => sync(resolve, snapshot.val()));
    }
}

async function sync(resolve, bigCommerceItems) {
    var inventoriesProducts = [];
    var inventoriesVariants = [];
    const itemsSku = bigCommerceItems.map(x => x.sku);
    console.log("Products A Length: ",products.length);
    products = products.filter(x => itemsSku.includes(x.ItemCode))
    console.log("Products B Length: ",products.length);
    products.forEach(item => {
    if (item.ItemWarehouseInfoCollection[0].WarehouseCode == "01") {
        const bigCommerceItem = bigCommerceItems.find(x => x.sku == item.ItemCode);
        var level = (item.ItemWarehouseInfoCollection[0].InStock - item.ItemWarehouseInfoCollection[0].Committed < 0) ? 0 : item.ItemWarehouseInfoCollection[0].InStock - item.ItemWarehouseInfoCollection[0].Committed;
        var packMultiple = (parseInt(item.U_hedel_Pack_Multiples) > 0) ? parseInt(item.U_hedel_Pack_Multiples) : 1;
        //If it's a product without variants
        if (!bigCommerceItem.hasOwnProperty("option_values") || bigCommerceItem.option_values.length == 0) {
        if (level < packMultiple && level > 0) {
            inventoriesProducts.push({
            "id": bigCommerceItem.bigcommerce_product_id,
            "inventory_level": level,
            "inventory_warning_level": parseInt(level*0.1),
            "inventory_tracking": "product",
            "order_quantity_minimum": level,
            "order_quantity_maximum": level,
            "weight": (item.U_Carton_Weight == null) ? 1 : item.U_Carton_Weight
            });
        } else {
            inventoriesProducts.push({
            "id": bigCommerceItem.bigcommerce_product_id,
            "availability": "available",
            "inventory_level": level,
            "inventory_warning_level": parseInt(level*0.1),
            "inventory_tracking": "product",
            "order_quantity_minimum": packMultiple,
            "order_quantity_maximum": 0,
            "weight": (item.U_Carton_Weight == null) ? 1 : item.U_Carton_Weight
            });
        }
        }
        else {
        inventoriesVariants.push({
            "id": bigCommerceItem.bigcommerce_variant_id,
            "inventory_level": level,
            "inventory_warning_level": parseInt(level*0.1),
            "weight": item.U_Carton_Weight
        });
        if (level < packMultiple && level > 0) {
            const metafield = {
            "permission_set": "read_and_sf_access",
            "namespace": "sap",
            "key": "pack_multiples",
            "value": String(level),
            "description": "Pack Multiples"
            }
            bigCommerce.post(`/catalog/products/${bigCommerceItem.bigcommerce_product_id}/variants/${bigCommerceItem.bigcommerce_variant_id}/metafields`, metafield)
            .then(data => {
            //console.log(data);
            })
            .catch((err) => {
            console.error(err.code);
            if (err.code == 409) {
                bigCommerce.put(`/catalog/products/${bigCommerceItem.bigcommerce_product_id}/variants/${bigCommerceItem.bigcommerce_variant_id}/metafields/${bigCommerceItem.metafields.find(x => x.key == 'pack_multiples').id}`, metafield)
                .then(data => {
                console.log("Se Actualizó", data);
                })
                .catch((err) => console.error(err));                    
            }
            });
        }
        bigCommerce.put(`/catalog/products/${bigCommerceItem.bigcommerce_product_id}`, { "inventory_tracking": "variant" })
        .then(data => {
            //console.log("Se Actualizó", data);
        })
        .catch((err) => console.error(err));
        }
    }
    /* if (typeof element == 'undefined') {
        //console.log(`Activo en SAP pero no exite en BigCommerce: ${ item.ItemCode }`);
    } else {
        if (item.ItemWarehouseInfoCollection[0].WarehouseCode == "01") {
        var level = (item.ItemWarehouseInfoCollection[0].InStock - item.ItemWarehouseInfoCollection[0].Committed < 0) ? 0 : item.ItemWarehouseInfoCollection[0].InStock - item.ItemWarehouseInfoCollection[0].Committed;
        var packMultiple = (parseInt(item.U_hedel_Pack_Multiples) > 0) ? parseInt(item.U_hedel_Pack_Multiples) : 1;
        //If it's a product without variants
        if (!element.hasOwnProperty("bigcommerce_variant_id")) {
            if (level < packMultiple && level > 0) {
            inventoriesProducts.push({
                "id": element.bigcommerce_product_id,
                "inventory_level": level,
                "inventory_warning_level": parseInt(level*0.1),
                "inventory_tracking": "product",
                "order_quantity_minimum": level,
                "order_quantity_maximum": level,
                "weight": (item.U_Carton_Weight == null) ? 1 : item.U_Carton_Weight
            });
            } else {
            inventoriesProducts.push({
                "id": element.bigcommerce_product_id,
                "inventory_level": level,
                "inventory_warning_level": parseInt(level*0.1),
                "inventory_tracking": "product",
                "order_quantity_minimum": packMultiple,
                "order_quantity_maximum": 0,
                "weight": (item.U_Carton_Weight == null) ? 1 : item.U_Carton_Weight
            });
            }
        }
        else {
            inventoriesVariants.push({
            "id": element.bigcommerce_variant_id,
            "inventory_level": level,
            "inventory_warning_level": parseInt(level*0.1),
            "weight": item.U_Carton_Weight
            });
            if (level < packMultiple && level > 0) {
            const metafield = {
                "permission_set": "read_and_sf_access",
                "namespace": "sap",
                "key": "pack_multiples",
                "value": String(level),
                "description": "Pack Multiples"
            }
            bigCommerce.post(`/catalog/products/${element.bigcommerce_product_id}/variants/${element.bigcommerce_variant_id}/metafields`, metafield)
            .then(data => {
                //console.log(data);
            })
            .catch((err) => {
                console.error(err.code);
                if (err.code == 409) {
                bigCommerce.put(`/catalog/products/${element.bigcommerce_product_id}/variants/${element.bigcommerce_variant_id}/metafields/${element.metafields.find(x => x.key == 'pack_multiples').id}`, metafield)
                .then(data => {
                    console.log("Se Actualizó", data);
                })
                .catch((err) => console.error(err));                    
                }
            });
            }
            bigCommerce.put(`/catalog/products/${element.bigcommerce_product_id}`, { "inventory_tracking": "variant" })
            .then(data => {
            //console.log("Se Actualizó", data);
            })
            .catch((err) => console.error(err));
        }
        }
    } */
    });
    if (manual) {
    resolve(true);
    }
    const chunk = 10;
    for (var i = 0; i < inventoriesProducts.length; i += chunk) {
    var temporary = inventoriesProducts.slice(i, i + chunk);
        syncBulkInventory(temporary, null);
        if (inventoriesProducts.length-1 == i) {
        setTimeout(() => resolve(true), 60000);
        }
    }

    /* chunk = 50;
    for (i = 0,j = inventoriesVariants.length; i < j; i += chunk) {
        temporary = inventoriesVariants.slice(i, i + chunk);
        syncBulkInventory(null, temporary);
        if (i == j-1) {
        console.log("Proccess finished");
        }
    } */
}

return new Promise(resolve => {
    getData(0, resolve)
})
}

async function bulkPricing(res) {
var products = [];
var products2Delete = [];
var bulkPricingList = [];
await productsBulkPricingListRef.once("value", snapshot => bulkPricingList = snapshot.val());
if (typeof bulkPricingList == 'string') bulkPricingList = [];
bulkPricingList = bulkPricingList.map(x => x.sku);

const session = await utils.sap.loginSAP()
var requestSAP = new RequestSAP(session);

async function getData(skip, resolve) {
    var items = await requestSAP.getSpecialPrices("Valid%20eq%20%27tYES%27%20and%20PriceListNum%20eq%206", skip);
    items = JSON.parse(items);
    items.value.forEach(item => {
    //if (item.ItemCode == "56-007") console.log(item.SpecialPriceDataAreas[0].SpecialPriceQuantityAreas);
    products.push({
        sku: item.ItemCode,
        currency: "usd",
        "special_prices": item.SpecialPriceDataAreas[0].SpecialPriceQuantityAreas,
        "bulk_pricing_tiers": []
    });
    });
    if (items.hasOwnProperty('odata.nextLink')) {
    skip += 20;
    console.log(skip);
    getData(skip, resolve);
    } else {
    products.forEach(product => {
        var rules = product.special_prices;
        rules.forEach((rule, i) => {
        product.bulk_pricing_tiers.push({
            "quantity_min": rule.Quantity,
            "quantity_max": ((i < rules.length - 1) ? (product.special_prices[i+1].Quantity) - 1 : 0),
            "type": "fixed",
            "amount": rule.SpecialPrice
        });
        });
        delete product.special_prices
    });

    const p = products.map(x => x.sku);
    bulkPricingList.forEach(item => {
        if (!p.includes(item)) {
            products2Delete.push({
            sku: item,
            currency:"usd",
            bulk_pricing_tiers: [],
            });
        }
    })

    products = products.concat(products2Delete);
    productsBulkPricingListRef.set(products);
    //console.log(products);
    
    if (manual) {
        resolve(true)
    }
    
    setBulkPricingTiers(1, products);
    }
}

return new Promise(resolve => {
    getData(0, resolve);
})
}

async function syncMetafields() {
var products = [];

const session = await utils.sap.loginSAP()
var requestSAP = new RequestSAP(session);

async function getData(skip) {
    const bigCommerceItems = Object.values(require(path.join(__dirname + '/data/items-by-sku.json')));
    var items = await requestSAP.getItems("ItemCode,U_Carton_Length,U_Carton_Width,U_Carton_Height,U_Carton_Weight,U_hedel_Pack_Multiples,U_hedel_mfr_packing,U_hedel_pack,Valid", utils.sap.RequestSAP.FILTERS_FOR_SAP, skip);
    items = JSON.parse(items);
    items.value.forEach((item, i) => {
    if (typeof bigCommerceItems.find(x => x.sku == sku) == 'undefined') {
        //console.log(`Activo en SAP pero no exite en BigCommerce: ${ item.ItemCode }`);
    } else {
        products.push({
        sku: item.ItemCode,
        metafields: [{
        "permission_set": "read_and_sf_access",
        "namespace": "sap",
        "key": "master_case",
        "value": (item.U_hedel_mfr_packing == null) ? "1" : String(item.U_hedel_mfr_packing),
        "description": "Master Case"
        },{
        "permission_set": "read_and_sf_access",
        "namespace": "sap",
        "key": "inner_case",
        "value": (item.U_hedel_pack == null) ? "1" : String(item.U_hedel_pack),
        "description": "Inner Case"
        },
            {
        "permission_set": "read_and_sf_access",
        "namespace": "sap",
        "key": "pack_multiples",
        "value": (item.U_hedel_Pack_Multiples == null) ? "1" : String(item.U_hedel_Pack_Multiples),
        "description": "Pack Multiples"
        },
            {
        "permission_set": "read_and_sf_access",
        "namespace": "sap",
        "key": "carton_length",
        "value": (item.U_Carton_Length == null) ? "1" : String(item.U_Carton_Length),
        "description": "Carton Length"
        },
            {
        "permission_set": "read_and_sf_access",
        "namespace": "sap",
        "key": "carton_width",
        "value": (item.U_Carton_Width == null) ? "1" : String(item.U_Carton_Width),
        "description": "Carton width"
        },
            {
        "permission_set": "read_and_sf_access",
        "namespace": "sap",
        "key": "carton_height",
        "value": (item.U_Carton_Height == null) ? "1" : String(item.U_Carton_Height),
        "description": "Carton Height"
        },
            {
        "permission_set": "read_and_sf_access",
        "namespace": "sap",
        "key": "carton_weight",
        "value": (item.U_Carton_Weight == null) ? "1" : String(item.U_Carton_Weight),
        "description": "Carton Height"
        }
        ]
        });
    }
    });
    if (items.hasOwnProperty('odata.nextLink')) {
    skip += 20;
    console.log(skip);
    getData(skip);
    } else {
    console.log(products.length);
    products.forEach((item, i) => {
        if (bigCommerceItems[item.sku].hasOwnProperty("bigcommerce_product_metafields") && bigCommerceItems[item.sku].bigcommerce_product_metafields.length > 0 || bigCommerceItems[item.sku].hasOwnProperty("bigcommerce_variant_metafields") && bigCommerceItems[item.sku].bigcommerce_variant_metafields.length > 0) {
        if (bigCommerceItems[item.sku].hasOwnProperty("bigcommerce_variant_metafields")) {
            item.metafields.forEach((metafield, i) => {
            var id = bigCommerceItems[item.sku].bigcommerce_variant_metafields.filter(function(item) { return item.key === metafield.key; });
            if (typeof id[0] != 'undefined') {
                bigCommerce.put(`/catalog/products/${bigCommerceItems[item.sku].bigcommerce_product_id}/variants/${bigCommerceItems[item.sku].bigcommerce_variant_id}/metafields/${id[0].id}`, metafield)
                .then(data => {
                //console.log(data);
                })
                .catch((err) => console.error(err));
            }
            });
        } else {
            item.metafields.forEach((metafield, i) => {
            var id = bigCommerceItems[item.sku].bigcommerce_product_metafields.filter(function(item) { return item.key === metafield.key; });
            if (typeof id[0] != 'undefined') {
                bigCommerce.put(`/catalog/products/${bigCommerceItems[item.sku].bigcommerce_product_id}/metafields/${id[0].id}`, metafield)
                .then(data => {
                //console.log(data);
                })
                .catch((err) => console.error(err));
                
                if (metafield.key == "pack_multiples") {
                bigCommerce.put(`/catalog/products/${ bigCommerceItems[item.sku].bigcommerce_product_id }`, { "order_quantity_minimum": metafield.value })
                    .then(data => {
                    // Catch any errors, or handle the data returned
                    console.log(data.data.sku + " Metafield Updated");
                    if (data.data.sku == "011-396") {
                        console.log("Aqui está \n");
                    }
                    })
                    .catch((err) => console.error(err));
                }
            }
            });
        }
        } else {
        if (bigCommerceItems[item.sku].hasOwnProperty("bigcommerce_variant_id")) {
            item.metafields.forEach((metafield, i) => {
            bigCommerce.post(`/catalog/products/${bigCommerceItems[item.sku].bigcommerce_product_id}/variants/${bigCommerceItems[item.sku].bigcommerce_variant_id}/metafields`, metafield)
            .then(data => {
                //console.log(data);
            })
            .catch((err) => console.error(err));
            });
        } else {  
            item.metafields.forEach((metafield, i) => {
            bigCommerce.post(`/catalog/products/${bigCommerceItems[item.sku].bigcommerce_product_id}/metafields`, metafield)
            .then(data => {
                //console.log(data);
            })
            .catch((err) => console.error(err));      

            if (metafield.key == "pack_multiples") {
                bigCommerce.put(`/catalog/products/${ bigCommerceItems[item.sku].bigcommerce_product_id }`, { "order_quantity_minimum": metafield.value })
                .then(data => {
                    // Catch any errors, or handle the data returned
                    console.log(data.data.sku + " Variant Metafield Updated");
                })
                .catch((err) => console.error(err));
            }
            });
        }
        } 
    });
    }
}

try {
    await getData(0);
} catch (e) {
e.message === 'HTTP request failed'
    ? console.error(JSON.stringify(e.response, null, 2))
    : console.error(e)
}
}

function syncBulkInventory(products, variants) {
if (products != null) {
    bigCommerce.put('/catalog/products', products)
    .then(data => console.log(products.length + " Products Updated Successfully => Inventory"))
    .catch((err) => {
    if (err.code == 500) {
        setTimeout(()=> syncBulkInventory(products), 15000);
    } else {
        console.error(err)
    }
    });
}
if (variants != null) {
    bigCommerce.put('/catalog/variants', variants)
    .then(data => {
    console.log(variants.length + " Variants Updated Successfully => Inventory");
    })
    .catch((err) => {
    if (err.code == 500) {
        setTimeout(()=> syncBulkInventory(variants), 15000);
    } else {
        console.error(err)
    }
    });
}
}

function syncBulkPrices(prices) {
bigCommerce.put('/catalog/products', prices)
    .then(data => {
    // Catch any errors, or handle the data returned
    console.log(data);
    })
    .catch((err) => console.error(err));
}

module.exports = {
    prices
} 