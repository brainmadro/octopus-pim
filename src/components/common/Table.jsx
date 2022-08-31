import React from 'react';
//import "../../../assets/style/components/sidebar.css"

function Table ({title, data, columns, options = {}}) {
    return(
        <table>
            <thead>
                <tr>
                    {
                        columns.map(x => <th key={title + "-header-" + x.field}>{x.title}</th>)  
                    }
                </tr>
            </thead>
            <tbody>
                {
                    data.map((x, index) => {
                        return (
                            <tr key={title + "-" + index} data-id={x.id}>
                                {
                                    Object.values(x).map((n, i) => {
                                        if(i > 0) return <td key={title + "-" + i + "-" + n}><a href={`products/${x.id}`}>{n}</a></td>
                                    })
                                }
                            </tr>
                        )
                    })
                }
            </tbody>
        </table>
    );  
}
export default Table;