import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Button from '../Button'

function PaginationButton (props) {

	function handlePrevPage(e) {
		console.log('You clicked submit.');
	}

	function handleNextPage(e) {
		console.log('You clicked submit.');
	}

	if (props.action == 'prev') 
	return (<Button onClick={handlePrevPage} icon={'fa-solid fa-angle-left'} />)
	if (props.action == 'next') 
	return (<Button onClick={handleNextPage} icon={'fa-solid fa-angle-right'} />)
}

export default PaginationButton