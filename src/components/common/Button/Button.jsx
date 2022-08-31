import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import './Button.css'

function Button (props) {
	if (!props.hasOwnProperty('text')) return (<button onClick={props.onClick} className={`${props.className} icon-button`}><FontAwesomeIcon icon={props.icon} /></button>)
	return (
		<button onClick={props.onClick} className={props.className}>{props.text}</button>	
	)
}

export default Button