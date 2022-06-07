const syncButtons = document.getElementsByClassName('sync-button');
const syncLabels = document.getElementsByTagName('var');
const syncProducts = document.querySelector('[data-sync="products-from-bigcommerce"]');
const createTxtArea = document.getElementById('create-relations-txtarea');
const createRelationsButton = document.getElementById('create-relations');
const deleteTxtArea = document.getElementById('delete-relations-txtarea');
const deleteRelationsButton = document.getElementById('delete-relations');
const priceListCreatingInput = document.getElementById('pricelist-creating-input');
const priceListDeletingInput = document.getElementById('pricelist-deleting-input');
const removeButton = document.getElementsByClassName('remove-button');
const forms = document.getElementsByTagName('form');

var items = [];

syncProducts.addEventListener('click', event => {
    syncLabels.namedItem(event.target.dataset.sync + "-progress").innerHTML = "Processing"
    fetch('products-from-bigcommerce')
    .then((res) => console.log(res))
})

createRelationsButton.addEventListener('click', event => {
    items = createTxtArea.value.split('\n');
    items = items.filter(x => x != "");
    
    fetch('/jasper/create-relations', {
        method: 'POST',
        mode: 'same-origin',
        cache: 'no-cache',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify({ 
            type: priceListCreatingInput.value,
            items: items,
        })
    })
    .then(res => res.json())
    .then(data => {
        alert("Finished");
        console.log(data);
    })
})

deleteRelationsButton.addEventListener('click', event => {
    items = deleteTxtArea.value.split('\n');
    items = items.filter(x => x != "");
    console.log(items);
    fetch('/jasper/delete-relations', {
        method: 'POST',
        mode: 'same-origin',
        cache: 'no-cache',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify({ 
            type: priceListDeletingInput.value,
            items: items 
        })
    })
    .then(res => res.json())
    .then(data => {
        console.log(data);
    })
})


for (const item of removeButton) {
    item.addEventListener('click', () => {
        fetch('/promos-remove-product', {
            method: 'POST', // *GET, POST, PUT, DELETE, etc.
            mode: 'same-origin', // no-cors, *cors, same-origin
            cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
            credentials: 'same-origin', // include, *same-origin, omit
            headers: {
              'Content-Type': 'application/json'
              // 'Content-Type': 'application/x-www-form-urlencoded',
            },
            redirect: 'follow', // manual, *follow, error
            referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
            body: JSON.stringify({
                sku: item.dataset.sku,
                type: item.dataset.type
            })
          })
        .then(response => response.json())
        .then(data => {
            location.reload()
        });
    })
}

for (const item of forms) {
    item.addEventListener('submit', event => {
        event.preventDefault();
        fetch('/promos-add-product', {
            method: 'POST', // *GET, POST, PUT, DELETE, etc.
            mode: 'same-origin', // no-cors, *cors, same-origin
            cache: 'no-cache', // *default, no-cache, reload, force-cache, only-if-cached
            credentials: 'same-origin', // include, *same-origin, omit
            headers: {
              'Content-Type': 'application/json'
              // 'Content-Type': 'application/x-www-form-urlencoded',
            },
            redirect: 'follow', // manual, *follow, error
            referrerPolicy: 'no-referrer', // no-referrer, *no-referrer-when-downgrade, origin, origin-when-cross-origin, same-origin, strict-origin, strict-origin-when-cross-origin, unsafe-url
            body: JSON.stringify({
                sku: item.querySelector("input[name='sku']").value,
                type: item.querySelector("input[name='type']").value
            })
          })
        .then(response => response.json())
        .then(data => {
            if (data.data) {
                location.reload()                
            } else {
                console.log(data.error);
            }
        });
    })
}


for (const iterator of syncButtons) {
    iterator.addEventListener('click', event => {
        const label = syncLabels.namedItem(event.target.dataset.sync + "-progress");
        label.innerHTML = "Processing"
        fetch('/sync/' + event.target.dataset.sync)
        .then((res) => {
            label.innerHTML = "Finished"
            setTimeout(() => label.innerHTML = "", 15000);
            console.log(res)
        })
    })
}