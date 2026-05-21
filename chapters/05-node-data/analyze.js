// Chapter 5: Node.js

const aq = require('arquero');
const fs = require('fs');

// Read iris.csv from disk and parse with arquero
const csv = fs.readFileSync('/home/student/datasets/iris.csv', 'utf-8');
const iris = aq.fromCSV(csv);

console.log('First 5 rows:');
iris.slice(0, 5).print();

console.log('\nSummary by species:');
iris
  .groupby('species')
  .rollup({
    n: aq.op.count(),
    avg_sepal_length: aq.op.mean('sepal_length'),
    avg_petal_length: aq.op.mean('petal_length'),
  })
  .print();
