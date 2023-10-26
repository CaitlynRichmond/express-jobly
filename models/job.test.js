"use strict";

const db = require("../db.js");
const { BadRequestError, NotFoundError } = require("../expressError");
const Job = require("./job.js");
const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
} = require("./_testCommon");

beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** create */

describe("create", function () {
  const newJob = {
    title: "newJobTitle",
    salary: 100,
    equity: 0.9,
    companyHandle: "c1"
  };

  test("works", async function () {
    let job = await Job.create(newJob);
    expect(job).toEqual(newJob);

    const result = await db.query(
      `SELECT id, title, salary, equity, company_handle
           FROM jobs
           WHERE title = 'newJobTitle'`);
    expect(result.rows).toEqual([
      {
        id: expect.any(Number),
        title: "newJobTitle",
        salary: 100,
        equity: 0.9
      },
    ]);
  });

  test("can insert same job mulitple times", async function () {

    await Job.create(newJob);
    await Job.create(newJob);
    const result = await db.query(
      `SELECT id, title, salary, equity, company_handle
        FROM jobs
        WHERE title = 'newJobTitle'`);
    expect(result.rows).toEqual([
      {
        id: expect.any(Number),
        title: "newJobTitle",
        salary: 100,
        equity: 0.9
      },
      {
        id: expect.any(Number),
        title: "newJobTitle",
        salary: 100,
        equity: 0.9
      }
    ]);
  });
});

/************************************** findAll */
describe("findAll", function () {
  test("works: no filter", async function () {
    let jobs = await Job.findAll();
    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: "j1",
        salary: 1,
        equity: 0.1,
        companyHandle: 'c1'
      },
      {
        id: expect.any(Number),
        title: "j2",
        salary: 2,
        equity: 0.2,
        companyHandle: 'c2'
      },
      {
        id: expect.any(Number),
        title: "j3",
        salary: 3,
        equity: 0.3,
        companyHandle: 'c3'
      },
    ]);
  });

  test("works: all filters present", async function () {
    const filters = {
      title: "j",
      equity: true,
      salary: 3
    };

    let jobs = await Job.findAll(filters);

    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: "j3",
        salary: 3,
        equity: 0.3,
        companyHandle: 'c3'
      },
    ]);
  });

  test("works: nameLike", async function () {
    const filters = {
      title: "2"
    };

    let jobs = await Job.findAll(filters);

    expect(jobs).toEqual([
      {
        id: expect.any(Number),
        title: "j2",
        salary: 2,
        equity: 0.2,
        companyHandle: 'c2'
      }
    ]);
  });
});

/************************************** _companyFilter */
describe("_jobFilter", function () {
  test("works: with title", async function () {
    const filters = {
      title: "2"
    };

    let jobs = Job._jobFilter(filters);

    expect(jobs).toEqual({
      query: "WHERE title ILIKE $1",
      values: ["%2%"]
    });
  });

  test("works: with salary and equity", async function () {
    const filters = {
      minSalary: 1,
      hasEquity: true
    };

    let jobs = Job._jobFilter(filters);

    expect(jobs).toEqual({
      query: "WHERE $1 <= salary AND equity > $2",
      values: [1, 0]
    });
  });

  test("works: all filters", async function () {
    const filters = {
      title: "2",
      minSalary: 2,
      hasEquity: true
    };

    let jobs = Job._jobFilter(filters);

    expect(jobs).toEqual({
      query: "WHERE title ILIKE $1 AND $2 <= salary AND equity > $3",
      values: ["%2%", 2, 0]
    });
  });

  test("works: no params", async function () {

    let jobs = Job._jobFilter();

    expect(jobs).toEqual({
      query: "",
      values: []
    });
  });
});

/************************************** get */

describe("get", function () {
  test("works", async function () {
    const jobId = await db.query(`
    SELECT id FROM jobs WHERE title = 'j1'`)
    let job = await Job.get(jobId);
    expect(job).toEqual({
      id: jobId,
      title: "j1",
      salary: 1,
      equity: 0.1,
      companyHandle: 'c1'
    });
  });

  test("not found if no such job", async function () {
    try {
      await Job.get(123213213);
      throw new Error("fail test, you shouldn't get here");
    } catch (err) {
      expect(err instanceof NotFoundError).toBeTruthy();
    }
  });
});

/************************************** update */

describe("update", function () {

  const updateData = {
    title: "newJ1",
    salary: 100,
    equity: 0.9
  };

  test("works", async function () {
    const jobId = await db.query(`
    SELECT id FROM jobs WHERE title = 'j1'`)

    let job = await Job.update(jobId, updateData);
    expect(job).toEqual({
      id: jobId,
      companyHandle: "c1",
      ...updateData,
    });

    const result = await db.query(
      `SELECT id, title, salary, equity, company_handle
           FROM jobs
           WHERE id = ${jobId}`);
    expect(result.rows).toEqual([{
      id: jobId,
      title: "newJ1",
      salary: 100,
      equity: 0.9,
      company_handle:"c1"
    }]);
  });

  test("bad: extra field", async function () {
    const jobId = await db.query(`
    SELECT id FROM jobs WHERE title = 'j1'`)

    const updateDataExtraField = {
      title: "New",
      salary: 0,
      equity: 0.1,
      company_handle: "c1",
      thisIsNotAllowed: "test"
    };

    expect(async () => await Job.update(jobId, updateDataExtraField)).rejects.toThrow(BadRequestError);

  });

  // test("not found if no such company", async function () {
  //   try {
  //     await Company.update("nope", updateData);
  //     throw new Error("fail test, you shouldn't get here");
  //   } catch (err) {
  //     expect(err instanceof NotFoundError).toBeTruthy();
  //   }
  // });

  // test("bad request with no data", async function () {
  //   try {
  //     await Company.update("c1", {});
  //     throw new Error("fail test, you shouldn't get here");
  //   } catch (err) {
  //     expect(err instanceof BadRequestError).toBeTruthy();
  //   }
  // });
});

/************************************** remove */

// describe("remove", function () {
//   test("works", async function () {
//     await Company.remove("c1");
//     const res = await db.query(
//       "SELECT handle FROM companies WHERE handle='c1'");
//     expect(res.rows.length).toEqual(0);
//   });

//   test("not found if no such company", async function () {
//     try {
//       await Company.remove("nope");
//       throw new Error("fail test, you shouldn't get here");
//     } catch (err) {
//       expect(err instanceof NotFoundError).toBeTruthy();
//     }
//   });
// });
