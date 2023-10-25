"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");

/** Related functions for companies. */

class Company {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ handle, name, description, numEmployees, logoUrl }) {
    const duplicateCheck = await db.query(`
        SELECT handle
        FROM companies
        WHERE handle = $1`, [handle]);

    if (duplicateCheck.rows[0])
      throw new BadRequestError(`Duplicate company: ${handle}`);

    const result = await db.query(`
                INSERT INTO companies (handle,
                                       name,
                                       description,
                                       num_employees,
                                       logo_url)
                VALUES ($1, $2, $3, $4, $5)
                RETURNING
                    handle,
                    name,
                    description,
                    num_employees AS "numEmployees",
                    logo_url AS "logoUrl"`, [
      handle,
      name,
      description,
      numEmployees,
      logoUrl,
    ],
    );
    const company = result.rows[0];

    return company;
  }

  //TODO:Sexify this docstring copy from route
  /**Find all companies that match input parameters
   *Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   */

  static async findAll(searchParameters) {
    const { query, values } = this._companyFilterFunction(searchParameters);

    const companiesRes = await db.query(`
        SELECT handle,
               name,
               description,
               num_employees AS "numEmployees",
               logo_url      AS "logoUrl"
        FROM companies
        ${query}
        ORDER BY name`, values);
    return companiesRes.rows;
  }

  /**
   * Takes parameters object of allowed search parameters:
   *  minEmployees, maxEmployees, nameLike
   * Returns SQL query that filters by them and their values
   *  throws error if minEmployees > maxEmployees
  */

  static _companyFilterFunction(parameterInputs={}) {

    let { maxEmployees, minEmployees, nameLike } = parameterInputs ;

    //TODO:handle this in route
    maxEmployees = parseInt(maxEmployees);
    minEmployees = parseInt(minEmployees);

    //TODO:throw this error before calling _companyFilter..
    //Min and max both exist
    if (maxEmployees && minEmployees) {//TODO:no need for this line
      if (maxEmployees < minEmployees) {
        throw new BadRequestError("minEmployees cannot be greater than maxEmployees");
      }
    }

    let query = [];
    const values = [];
    //TODO:Can refactor to not use count, use length of arrays
    let count = 1;

    //If NameLike exists as a parameter (not undefined)
    if (nameLike) {
      query.push(`name ILIKE $${count}`);
      // query.push(`to_tsvector('english',name)) @@ to_tsquery('english', $${count}`);
      count++;
      values.push(`%${nameLike}%`);
    }

    //Only min employees
    if ((minEmployees)) {
      query.push(`$${count} <= num_employees`);
      count = count + 1;
      values.push(minEmployees);
    }

    //only max employees
    if ((maxEmployees)) {
      query.push(`num_employees <= $${count}`);
      count = count + 1;
      values.push(maxEmployees);
    }

    //TODO:refactor to use ternary
    if (query.length === 0) {
      return { query: '', values: [] };
    }

    return { query: 'WHERE ' + query.join(' AND '), values };
  }


  /** Given a company handle, return data about company.
   *
   * Returns { handle, name, description, numEmployees, logoUrl, jobs }
   *   where jobs is [{ id, title, salary, equity, companyHandle }, ...]
   *
   * Throws NotFoundError if not found.
   **/

  static async get(handle) {
    const companyRes = await db.query(`
        SELECT handle,
               name,
               description,
               num_employees AS "numEmployees",
               logo_url      AS "logoUrl"
        FROM companies
        WHERE handle = $1`, [handle]);

    const company = companyRes.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Update company data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {name, description, numEmployees, logoUrl}
   *
   * Returns {handle, name, description, numEmployees, logoUrl}
   *
   * Throws NotFoundError if not found.
   */

  static async update(handle, data) {
    const { setCols, values } = sqlForPartialUpdate(
      data,
      {
        numEmployees: "num_employees",
        logoUrl: "logo_url",
      });
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `
        UPDATE companies
        SET ${setCols}
        WHERE handle = ${handleVarIdx}
        RETURNING
            handle,
            name,
            description,
            num_employees AS "numEmployees",
            logo_url AS "logoUrl"`;
    const result = await db.query(querySql, [...values, handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);

    return company;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(handle) {
    const result = await db.query(`
        DELETE
        FROM companies
        WHERE handle = $1
        RETURNING handle`, [handle]);
    const company = result.rows[0];

    if (!company) throw new NotFoundError(`No company: ${handle}`);
  }
}


module.exports = Company;
