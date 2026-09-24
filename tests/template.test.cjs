"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const { execute } = require("../tools/run-local.cjs");

const ROOT = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");

test("example input produces the documented output", async () => {
    const result = await execute(read("examples/input.json"));
    assert.deepEqual(JSON.parse(result.output), JSON.parse(read("examples/output.json")));
});

test("Unicode and surrounding whitespace are preserved correctly", async () => {
    const result = await execute(JSON.stringify({ name: "  Łukasz  " }));
    assert.equal(JSON.parse(result.output).message, "Cześć, Łukasz!");
});

test("the secret is optional", async () => {
    const result = await execute('{"name":"Anna"}');
    assert.equal(JSON.parse(result.output).secret_loaded, false);
});

test("the secret value does not reach output or logs", async () => {
    const secret = "test-sentinel-never-log-this-value";
    const result = await execute(read("examples/input-with-secret.json"), {
        constants: { EXAMPLE_API_TOKEN: secret }
    });
    assert.equal(JSON.parse(result.output).secret_loaded, true);
    assert.equal(JSON.stringify(result).includes(secret), false);
    assert.ok(result.logs.some((entry) => entry.level === "info"));
});

test("a missing requested secret fails", async () => {
    await assert.rejects(
        execute('{"name":"Anna","check_secret":true}'),
        /Constant 'EXAMPLE_API_TOKEN' is not defined/
    );
});

test("an empty requested secret fails", async () => {
    await assert.rejects(
        execute('{"name":"Anna","check_secret":true}', { constants: { EXAMPLE_API_TOKEN: "" } }),
        /EXAMPLE_API_TOKEN constant is empty/
    );
});

test("invalid input is rejected", async () => {
    for (const data of ["", "not-json", "[]", "null", '{"name":null}', '{"name":42}', '{"name":""}', '{"name":"  "}']) {
        await assert.rejects(execute(data));
    }
});

test("the secret flag must be a boolean", async () => {
    for (const check_secret of ["true", 1, null, []]) {
        await assert.rejects(execute(JSON.stringify({ name: "Anna", check_secret })), /must be a boolean/);
    }
});

test("output matches the declared contract", async () => {
    const metadata = JSON.parse(read("methods/template-node-hello.json"));
    const result = JSON.parse((await execute('{"name":"Anna"}')).output);
    for (const field of metadata.out.required) {
        assert.ok(Object.hasOwn(result, field));
    }

    assert.equal(typeof result.message, "string");
    assert.equal(typeof result.secret_loaded, "boolean");
});
