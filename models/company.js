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


  /**Find all companies that match input parameters
   *  Can filter on provided search filters:
   * - minEmployees
   * - maxEmployees
   * - nameLike (will find case-insensitive, partial matches)
   *Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   */

  static async findAll(searchParameters) {
    const { query, values } = this._companyFilter(searchParameters);

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

  static _companyFilter(parameterInputs = {}) {

    let { maxEmployees, minEmployees, nameLike } = parameterInputs;

    let query = [];
    const values = [];

    if (nameLike) {
      values.push(`%${nameLike}%`);
      // query.push(`name ILIKE $${values.length}`);
      query.push(`to_tsvector('english',name) @@ to_tsquery('english', $${values.length}`);
    }

    if (minEmployees >= 0) {
      values.push(minEmployees);
      query.push(`$${values.length} <= num_employees`);
    }

    if (maxEmployees >= 0) {
      values.push(maxEmployees);
      query.push(`num_employees <= $${values.length}`);
    }

    query = query.length ? 'WHERE ' + query.join(' AND ') : '';

    return { query, values };

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

    const jobRes = await db.query(`
        SELECT id,
               title,
               salary,
               equity,
               company_handle AS "companyHandle"
        FROM jobs
        WHERE company_handle = $1
        ORDER BY title `, [handle]);

    company.jobs = jobRes.rows.map(j => (
      {
        id: j.id,
        title: j.title,
        salary: j.salary,
        equity: j.equity,
        companyHandle: j.companyHandle
      }
    ));

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
