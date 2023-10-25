"use strict";

const { BadRequestError } = require("../expressError");
const { sqlForPartialUpdate } = require("./sql");

describe("sqlForPartialUpdate", function () {
  test("sqlForPartialUpdate works", function () {
    const dataToUpdate = { firstName: 'Aliya', age: 32 };
    const jsToSql = { firstName: "first_name" };
    const result = sqlForPartialUpdate(dataToUpdate, jsToSql);
    expect(result).toEqual({
      setCols: '"first_name"=$1, "age"=$2',
      values: ['Aliya', 32],
    });
  });

  test("sqlForPartialUpdate with empty body", function () {
    const dataToUpdate = {};
    const jsToSql = {};

    expect( () => sqlForPartialUpdate(dataToUpdate, jsToSql)).toThrow(BadRequestError);
  });

});
