"use strict";

const db = require("../db");
const { BadRequestError, NotFoundError } = require("../expressError");
const { sqlForPartialUpdate } = require("../helpers/sql");


/** Related functions for jobs. */

class Job {
  /** Create a job (from data), update db, return new job data.
   *
   * data should be { title, salary, equity, companyHandle }
   *
   * Returns { id, title, salary, equity, companyHandle }
   *
   * Throws BadRequestError if companyHandle doesn't exist in companies
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
   * - title (case insensitive, partial matches)
   * - minSalary
   * - hasEquity (true: shows only routes with equity, false: shows all jobs)
   *Returns [{ id, title, salary, equity, companyHandle }, ...]
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
   *  title, minSalary, hasEquity
   * Returns SQL query that filters by them and their values
  */
  static _jobFilter(parameterInputs = {}) {

    let { title, minSalary, hasEquity } = parameterInputs;

    let query = [];
    const values = [];

    if (title) {
      values.push(`%${title}%`);
      query.push(`title ILIKE $${values.length}`);
      // query.push(`to_tsvector('english',title)) @@ to_tsquery('english', $${count}`);
    }

    if (minSalary >= 0) {
      values.push(minSalary);
      query.push(`$${values.length} <= salary`);
    }

    if (hasEquity === true) {
      //Design decision to push 0 and still use values.length despite it not
      //being a user input to maintain the pattern and maintain scalability
      values.push(0);
      query.push(`equity > $${values.length}`);
    }

    query = query.length ? 'WHERE ' + query.join(' AND ') : '';

    return { query, values };

  }


  /** Given a job id, return data about job.
   *
   * Returns { id, title, salary, equity, companyHandle}
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

  /** Update job data with `data`.
   *
   * This is a "partial update" --- it's fine if data doesn't contain all the
   * fields; this only changes provided ones.
   *
   * Data can include: {title, salary, equity}
   *
   * Returns {id, title, salary, equity, companyHandle}
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

  /** Delete given job from database; returns undefined.
   *
   * Throws NotFoundError if job not found.
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
