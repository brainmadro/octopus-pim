import React from 'react';
import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';

function createData(uri, id, path, type, enabled) {
  return { uri, id, path, type, enabled };
}

const rows = [
  createData('https://shophedel.s3.us-east-2.amazonaws.com/p-imagespng/60043.png', 6.0, 'https://shophedel.s3.us-east-2.amazonaws.com/p-imagespng/60043.png', 4.0, true),
  createData('https://shophedel.s3.us-east-2.amazonaws.com/p-imagespng/720-001.png', 9.0, 'https://shophedel.s3.us-east-2.amazonaws.com/p-imagespng/720-001.png', 4.3, true),
  createData('https://shophedel.s3.us-east-2.amazonaws.com/p-imagespng/011-003.png', 262, 'https://shophedel.s3.us-east-2.amazonaws.com/p-imagespng/011-003.png', 24, true)
];

export default function AssetsTable(props, { productId }) {

  utils.

  return (
    <TableContainer component={Paper}>
      <Table sx={{ minWidth: 650 }} aria-label="simple table">
        <TableHead>
          <TableRow>
            <TableCell>Image</TableCell>
            <TableCell align="right">Asset Id</TableCell>
            <TableCell align="right">Path</TableCell>
            <TableCell align="right">Type</TableCell>
            <TableCell align="right">Enabled</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.id}
              sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
            >
              <TableCell component="th" scope="row"><img src={row.uri} alt='product_image' width={'100'}/></TableCell>
              <TableCell align="right">{row.id}</TableCell>
              <TableCell align="right">{row.path}</TableCell>
              <TableCell align="right">{row.type}</TableCell>
              <TableCell align="right">{row.enabled}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
