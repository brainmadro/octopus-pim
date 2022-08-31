import React, { useRef } from "react";
import Button from "../Button";

function SearchForm(props) {
	const input = useRef();
	
	function handleChange(event) {
		//console.log(event.target.value);
	}

	function handleSubmit(event) {
		event.preventDefault();
		//console.log(input.current.value);
		props.onSubmit(input.current.value)
	}

	function setVisibility() {
		input.current.classList.toggle('visual-hidden');
		input.current.focus();
	}

	return (
		<form onSubmit={handleSubmit}>
			<input className="visual-hidden" ref={input} onChange={handleChange} type="search" name="search-input" id="product-search-input" />
			<Button onClick={setVisibility} className='header-option-button' icon={'fa-solid fa-magnifying-glass'} />
		</form>
	)
}

export default SearchForm