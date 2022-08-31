import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

function createData(name, slug, value, type) {
  return { name, slug, value, type };
}

const rows = [
  createData('https://shophedel.s3.us-east-2.amazonaws.com/p-imagespng/60043.png', 6.0, 'https://shophedel.s3.us-east-2.amazonaws.com/p-imagespng/60043.png', 4.0, true),
  createData('https://shophedel.s3.us-east-2.amazonaws.com/p-imagespng/720-001.png', 9.0, 'https://shophedel.s3.us-east-2.amazonaws.com/p-imagespng/720-001.png', 4.3, true),
  createData('https://shophedel.s3.us-east-2.amazonaws.com/p-imagespng/011-003.png', 262, 'https://shophedel.s3.us-east-2.amazonaws.com/p-imagespng/011-003.png', 24, true)
];

export default function CustomFieldsTable() {
  return (
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 650 }} aria-label="simple table">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell align="right">Slug</TableCell>
            <TableCell align="right">Type</TableCell>
            <TableCell align="right">Value</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.name}
              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
            >
              <TableCell component="th" scope="row">{row.name}</TableCell>
              <TableCell align="right">{row.slug}</TableCell>
              <TableCell align="right">{row.type}</TableCell>
              <TableCell align="right">{row.value}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
