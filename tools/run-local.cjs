"use strict";

const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const { compileFunction } = require("node:vm");
const { format, parseArgs } = require("node:util");

const ROOT = path.resolve(__dirname, "..");

async function execute(data, { method = "template-node-hello", constants = {} } = {}) {
    const methodPath = path.resolve(ROOT, "methods", `${method}.js`);
    if (path.dirname(methodPath) !== path.join(ROOT, "methods")) {
        throw new Error("Choose a method directly inside methods/.");
    }

    const values = { ...constants };
    const logs = [];
    const log = {};
    for (const level of ["debug", "info", "warn", "warning", "error", "critical"]) {
        log[level] = (...args) => logs.push({ level, message: format(...args) });
    }
    log.isEnabled = () => true;

    const runtime = {
        log,
        constants: {
            get(name) {
                if (typeof name !== "string") {
                    throw new TypeError("Constant name must be a string.");
                }

                if (!Object.hasOwn(values, name)) {
                    throw new Error(`Constant '${name}' is not defined.`);
                }

                return values[name];
            }
        },
        jobId: "00000000-0000-0000-0000-000000000001",
        attemptId: "00000000-0000-0000-0000-000000000002",
        methodName: method
    };

    const realRequire = createRequire(methodPath);
    const localRequire = (name) => name === "zapqio" ? runtime : realRequire(name);
    const source = fs.readFileSync(methodPath, "utf8");
    const load = compileFunction(
        source + '\nreturn typeof run === "function" ? run : null;\n',
        ["require", "module", "exports", "__filename", "__dirname"],
        { filename: methodPath }
    );
    const module = { exports: {} };
    const run = load(localRequire, module, module.exports, methodPath, path.dirname(methodPath));
    if (run === null) {
        throw new Error("Method must declare function run(data).");
    }

    const output = await run(data);
    if (output !== undefined && output !== null && typeof output !== "string") {
        throw new TypeError("run(data) must return a string, null or undefined.");
    }

    return { output, logs };
}

async function main() {
    const { values } = parseArgs({
        options: {
            input: { type: "string" },
            method: { type: "string", default: "template-node-hello" },
            "demo-secret": { type: "boolean", default: false }
        }
    });
    if (!values.input) {
        throw new Error("Pass --input with a UTF-8 file containing the step input.");
    }

    const data = fs.readFileSync(values.input, "utf8");
    const constants = values["demo-secret"] ? { EXAMPLE_API_TOKEN: "local-demo-value-not-a-real-token" } : {};
    const result = await execute(data, { method: values.method, constants });
    for (const entry of result.logs) {
        console.error(`${entry.level.toUpperCase()}: ${entry.message}`);
    }

    if (result.output !== undefined && result.output !== null) {
        console.log(result.output);
    }
}

if (require.main === module) {
    main().catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    });
}

module.exports = { execute };
