"use strict";

const { BadRequestError } = require("../expressError");


/**
 * Takes dataToUpdate object and jsToSql param
 * extracts keys from dataToUpdate, maps each key and converts
 * key names to snake_case. Replaces values with placeholders to be passed
 * to an sql query
 * returns an object like:
 * {
    setCols: '"first_name"=$1, "age"=$2'
    values: ['Aliya', 32]
  };
*/
function sqlForPartialUpdate(dataToUpdate, jsToSql) {
  const keys = Object.keys(dataToUpdate);
  if (keys.length === 0) throw new BadRequestError("No data");

  // {firstName: 'Aliya', age: 32} => ['"first_name"=$1', '"age"=$2']
  const cols = keys.map((colName, idx) =>
      `"${jsToSql[colName] || colName}"=$${idx + 1}`,
  );

  return {
    setCols: cols.join(", "),
    values: Object.values(dataToUpdate),
  };
}

module.exports = { sqlForPartialUpdate };
