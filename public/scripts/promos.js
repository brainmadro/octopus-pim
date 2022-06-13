const removeButton = document.getElementsByClassName('remove-button');
const forms = document.getElementsByTagName('form');

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