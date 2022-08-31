import React from 'react'
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

function SideBarLink ({to, text, icon}) {
    icon = "fa-solid " + icon;
    return (
        <Link to={to}>
            <FontAwesomeIcon icon={icon} />
            {text}
        </Link>
    )
}

export default SideBarLink