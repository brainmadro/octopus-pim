const syncService = require("../services/syncService");

/* (req, res) => {
    var id = req.params.id;
    if (id.length > 8) {
      sinctronizarItem(id, 23);
    } else {
      sincronizarItemFromSAP(id)
    }
    res.render('pages/index') */

const prices = (req, res) => {
    const headers = {
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
    };
    res.writeHead(200, headers);
    
    syncService.prices(res);
    
    req.on('close', () => {
        //console.log(`Connection closed`);
    });
}

const basePrices = (req, res) => {
    const headers = {
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
    };
    res.writeHead(200, headers);
    
    syncService.basePrices(res);
    
    req.on('close', () => {
        //console.log(`Connection closed`);
    });
}

const inventory = (req, res) => {
    const headers = {
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
    };
    res.writeHead(200, headers);
    
    syncService.inventory(res);
    
    req.on('close', () => {
        //console.log(`Connection closed`);
    });
}

const metafields = (req, res) => {
    //syncMetafields();
    res.render('pages/index')
}

const purchaseDates = (req, res) => {
    const headers = {
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
    };
    res.writeHead(200, headers);
    
    syncService.purchaseDataSAP(res);
    
    req.on('close', () => {
        //console.log(`Connection closed`);
    });
}

const bulkPricing = async (req, res) => {
    const headers = {
        'Content-Type': 'text/event-stream',
        'Connection': 'keep-alive',
        'Cache-Control': 'no-cache'
    };
    res.writeHead(200, headers);
    
    syncService.bulkPricing(res);
    
    req.on('close', () => {
        //console.log(`Connection closed`);
    });
}

module.exports = {
    prices,
    basePrices,
    inventory,
    metafields,
    purchaseDates,
    bulkPricing
}