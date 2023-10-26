"use strict";

const request = require("supertest");

const db = require("../db");
const app = require("../app");

const {
  commonBeforeAll,
  commonBeforeEach,
  commonAfterEach,
  commonAfterAll,
  u1Token,
  a1Token
} = require("./_testCommon");


let jobId;
beforeAll(commonBeforeAll);
beforeEach(commonBeforeEach);
beforeEach(async () => {
  const resultForJobId = await db.query(`
    SELECT id FROM jobs WHERE title = 'j1'`);
  jobId = resultForJobId.rows[0].id;
});
afterEach(commonAfterEach);
afterAll(commonAfterAll);

/************************************** POST /jobs */

describe("POST /jobs", function () {
  const newJob = {
    title: "j3",
    salary: 3,
    equity: 0.3,
    companyHandle: "c3"
  };

  test("unauth for non-admins", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
    expect(resp.body).toEqual({
      "error": {
        "message": "Unauthorized",
        "status": 401
      }
    });
  });

  test("works admin users", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send(newJob)
      .set("authorization", `Bearer ${a1Token}`);
    expect(resp.statusCode).toEqual(201);
    expect(resp.body).toEqual({
      "job": {
        "id": expect.any(Number),
        "title": "j3",
        "salary": 3,
        "equity": "0.3",
        "companyHandle": "c3"
      }
    });
  });

  test("bad request with missing data", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send({
        title: "j4",
        companyHandle: "c3",
      })
      .set("authorization", `Bearer ${a1Token}`);
    expect(resp.statusCode).toEqual(400);
  });

  test("bad request with invalid data", async function () {
    const resp = await request(app)
      .post("/jobs")
      .send({
        ...newJob,
        title: 4,
      })
      .set("authorization", `Bearer ${a1Token}`);
    expect(resp.statusCode).toEqual(400);
  });
});

/************************************** GET /jobs */

describe("GET /jobs", function () {
  test("works for anon", async function () {
    const resp = await request(app).get("/jobs");
    expect(resp.body).toEqual({
      jobs:
        [
          {
            id: expect.any(Number),
            title: "j1",
            salary: 1,
            equity: "0",
            companyHandle: "c1"
          },
          {
            id: expect.any(Number),
            title: "j2",
            salary: 2,
            equity: "0.2",
            companyHandle: "c2"
          }
        ]
    });
  });


  test("Test with filters", async function () {
    const filters = '?minSalary=1&hasEquity=true&title=2';
    const resp = await request(app).get(`/jobs${filters}`);
    expect(resp.body).toEqual({
      jobs:
        [
          {
            id: expect.any(Number),
            title: "j2",
            salary: 2,
            equity: "0.2",
            companyHandle: "c2"
          }
        ],
    });
  });

  test("Test fail with extra filter parameter", async function () {
    const filters = '?minSalary=1&hasEquity=true&title=2&TEST=TEST';
    const resp = await request(app).get(`/jobs${filters}`);
    expect(resp.status).toEqual(400);
    expect(resp.body).toEqual({
      "error": {
        "message": [
          "instance is not allowed to have the additional property \"TEST\""
        ],
        "status": 400
      }
    });
  });


  test("Test fail non-integer passed for minSalary", async function () {
    const filters = '?minSalary="test"';
    const resp = await request(app).get(`/jobs${filters}`);
    expect(resp.status).toEqual(400);
    expect(resp.body).toEqual({
      "error": {
        "message": [
          "instance.minSalary is not of a type(s) integer"
        ],
        "status": 400
      }
    });
  });

  test("Test fail hasEquity=test", async function () {
    const filters = '?hasEquity=test';
    const resp = await request(app).get(`/jobs${filters}`);
    expect(resp.status).toEqual(400);
    expect(resp.body).toEqual({
      "error": {
        "message": [
          "instance.hasEquity is not of a type(s) boolean"
        ],
        "status": 400
      }
    });
  });


});

/************************************** GET /jobs/:id */

describe("GET /jobs/:id", function () {
  test("works for anon", async function () {
    const resp = await request(app).get(`/jobs/${jobId}`);
    expect(resp.body).toEqual({
      job: {
        id: jobId,
        title: "j1",
        salary: 1,
        equity: "0",
        companyHandle: "c1"
      },
    });
  });

  test("not found for no such job", async function () {
    const resp = await request(app).get(`/jobs/2341234`);
    expect(resp.statusCode).toEqual(404);
  });

  test("400 for string job id", async function () {
    const resp = await request(app).get(`/jobs/test`);
    expect(resp.statusCode).toEqual(500);

  });
});

/************************************** PATCH /jobs/:id */

describe("PATCH /jobs/:id", function () {
  test("works for admins", async function () {
    const resp = await request(app)
      .patch(`/jobs/${jobId}`)
      .send({
        title: "test",
      })
      .set("authorization", `Bearer ${a1Token}`);
    expect(resp.body).toEqual({
      "job": {
        "id": jobId,
        "title": "test",
        "salary": 1,
        "equity": "0",
        "companyHandle": "c1"
      },
    });
    expect(resp.status).toEqual(200);

  });

  test("unauth for non-admin", async function () {
    const resp = await request(app)
      .patch(`/jobs/${jobId}`)
      .send({
        title: "test",
      })
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.body).toEqual({
      "error": {
        "message": "Unauthorized",
        "status": 401
      }
    });
    expect(resp.status).toEqual(401);

  });

  test("unauth for anon", async function () {
    const resp = await request(app)
      .patch(`/jobs/${jobId}`)
      .send({
        title: "test",
      });
    expect(resp.statusCode).toEqual(401);
  });

  test("not found on non-existant jobId", async function () {
    const resp = await request(app)
      .patch(`/jobs/12354123`)
      .send({
        title: "new nope",
      })
      .set("authorization", `Bearer ${a1Token}`);
    expect(resp.statusCode).toEqual(404);
    expect(resp.body).toEqual({
      "error": {
        "message": "No job: 12354123",
        "status": 404
      }
    });
  });

  test("bad request on handle change attempt", async function () {
    const resp = await request(app)
      .patch(`/jobs/${jobId}`)
      .send({
        id: "j1-new",
      })
      .set("authorization", `Bearer ${a1Token}`);
    expect(resp.statusCode).toEqual(400);
    expect(resp.body).toEqual({
      "error": {
        "message": [
          "instance is not allowed to have the additional property \"id\""
        ],
        "status": 400
      }
    });
  });

  test("bad request on invalid data", async function () {
    const resp = await request(app)
      .patch(`/jobs/${jobId}`)
      .send({
        salary: "test",
      })
      .set("authorization", `Bearer ${a1Token}`);
    expect(resp.statusCode).toEqual(400);
    expect(resp.body).toEqual({
      "error": {
        "message": [
          "instance.salary is not of a type(s) integer"
        ],
        "status": 400
      }
    });
  });
});

/************************************** DELETE /jobs/:id */

describe("DELETE /jobs/:id", function () {
  test("works for admins", async function () {
    const resp = await request(app)
      .delete(`/jobs/${jobId}`)
      .set("authorization", `Bearer ${a1Token}`);
    expect(resp.body).toEqual({ deleted: `${jobId}` });
  });

  test("unauth for non-admins", async function () {
    const resp = await request(app)
      .delete(`/jobs/${jobId}`)
      .set("authorization", `Bearer ${u1Token}`);
    expect(resp.statusCode).toEqual(401);
    expect(resp.body).toEqual({
      "error": {
        "message": "Unauthorized",
        "status": 401
      }
    });

  });

  test("unauth for anon", async function () {
    const resp = await request(app)
      .delete(`/jobs/${jobId}`);
    expect(resp.statusCode).toEqual(401);
    expect(resp.body).toEqual({
      "error": {
        "message": "Unauthorized",
        "status": 401
      }
    });
  });

  test("not found for no such company", async function () {
    const resp = await request(app)
      .delete(`/jobs/0`)
      .set("authorization", `Bearer ${a1Token}`);
    expect(resp.statusCode).toEqual(404);
  });
});
