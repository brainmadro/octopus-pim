import React from 'react';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

export default function EnabledButton() {
  const [availability, setAvailability] = React.useState('left');

  const handleAvailability = (event, newAvailability) => {
    setAvailability(newAvailability);
  };

  return (
    <ToggleButtonGroup
      value={availability}
      exclusive
      onChange={handleAvailability}
      aria-label="text alignment"
    >
      <ToggleButton value="left" aria-label="left aligned">
        Enabled
      </ToggleButton>
      <ToggleButton value="center" aria-label="centered">
	  	Disabled
      </ToggleButton>
    </ToggleButtonGroup>
  );
}
