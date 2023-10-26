"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");
//TODO: CHANGE DOCSTRINGS
/** Related functions for companies. */

class Job {
  /** Create a company (from data), update db, return new company data.
   *
   * data should be { handle, name, description, numEmployees, logoUrl }
   *
   * Returns { handle, name, description, numEmployees, logoUrl }
   *
   * Throws BadRequestError if company already in database.
   * */

  static async create({ title, salary, equity, companyHandle }) {
    const checkCompanyHandle = await db.query(`
        SELECT handle
        FROM companies
        WHERE handle = $1`, [companyHandle]);

    if (checkCompanyHandle.rows[0])
      throw new NotFoundError(`No company with handle: ${companyHandle}`);

    const result = await db.query(`
                INSERT INTO jobs (title,
                                       salary,
                                       equity,
                                       company_handle)
                VALUES ($1, $2, $3, $4)
                RETURNING
                    id,
                    title,
                    salary,
                    equity,
                    company_handle AS "companyHandle"`, [
      title,
      salary,
      equity,
      companyHandle
    ],
    );
    const job = result.rows[0];

    return job;
  }


  /**Find all companies that match input parameters
   *  Can filter on provided search filters:
   * - minEmployees
   * - maxEmployees
   * - nameLike (will find case-insensitive, partial matches)
   *Returns [{ handle, name, description, numEmployees, logoUrl }, ...]
   */

  static async findAll(searchParameters) {
    const { query, values } = this._jobFilter(searchParameters);

    const jobsRes = await db.query(`
        SELECT id,
               title,
               salary,
               equity ,
               company_handle AS "companyHandle"
        FROM jobs
        ${query}
        ORDER BY company_handle, title `, values);
    return jobsRes.rows;
  }

  /**
   * Takes parameters object of allowed search parameters:
   *  minEmployees, maxEmployees, nameLike
   * Returns SQL query that filters by them and their values
   *  throws error if minEmployees > maxEmployees
  */
  static _jobFilter(parameterInputs = {}) {

    let { maxEmployees, minEmployees, nameLike } = parameterInputs;

    let query = [];
    const values = [];

    if (nameLike) {
      values.push(`%${nameLike}%`);
      query.push(`name ILIKE $${values.length}`);
      // query.push(`to_tsvector('english',name)) @@ to_tsquery('english', $${count}`);
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

  static async get(id) {
    const jobRes = await db.query(`
        SELECT id,
               title,
               salary,
               equity,
               company_handle AS "companyHandle"
        FROM jobs
        WHERE id = $1`, [id]);

    const job = jobRes.rows[0];

    if (!job) throw new NotFoundError(`No job: ${handle}`);

    return job;
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

  static async update(id, data) {
    const { setCols, values } = sqlForPartialUpdate(data, {});
    const handleVarIdx = "$" + (values.length + 1);

    const querySql = `
        UPDATE jobs
        SET ${setCols}
        WHERE handle = ${handleVarIdx}
        RETURNING
            id,
            title,
            salary,
            equity,
            company_handle AS "companyHandle"`;
    const result = await db.query(querySql, [...values, id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);

    return job;
  }

  /** Delete given company from database; returns undefined.
   *
   * Throws NotFoundError if company not found.
   **/

  static async remove(id) {
    const result = await db.query(`
        DELETE
        FROM jobs
        WHERE id = $1
        RETURNING id`, [id]);
    const job = result.rows[0];

    if (!job) throw new NotFoundError(`No job: ${id}`);
  }
}


module.exports = Job;
