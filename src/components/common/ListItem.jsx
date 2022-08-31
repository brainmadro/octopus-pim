import React, { useState } from 'react';

function ListItem ({data} = {}) {
    const [value, updateValue] = useState();    
    /* console.log(typeof data);
    if (typeof data == 'object' && data.length > 0) {
        console.log("es array");
    } else {
        data
    } */
    return(        
        <li key={"341"}>{ data.map(x => <div>{String(x)}</div>) }</li>
    );
    
}

export default ListItem;