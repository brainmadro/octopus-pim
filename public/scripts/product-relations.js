const createTxtArea = document.getElementById('create-relations-txtarea');
const createRelationsButton = document.getElementById('create-relations');
const deleteTxtArea = document.getElementById('delete-relations-txtarea');
const deleteRelationsButton = document.getElementById('delete-relations');
var items = [];
createRelationsButton.addEventListener('click', event => {
    items = createTxtArea.value.split('\n');
    items = items.filter(x => x != "");
    
    fetch('/jasper/create-relations', {
        method: 'POST',
        mode: 'same-origin',
        cache: 'no-cache',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json'},
        body: JSON.stringify({ items: items })
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
        body: JSON.stringify({ items: items })
    })
    .then(res => res.json())
    .then(data => {
        console.log(data);
    })
})