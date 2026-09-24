"use strict";

const zapqio = require("zapqio");
const { greeting } = require("../lib/greetings");

function run(data) {
    let payload;
    try {
        payload = JSON.parse(data);
    } catch {
        throw new Error("Input must be valid JSON.");
    }

    if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
        throw new Error("Input must be a JSON object.");
    }

    const name = payload.name;
    if (typeof name !== "string" || name.trim().length === 0) {
        throw new Error("The 'name' field must be a non-empty string.");
    }

    const checkSecret = Object.hasOwn(payload, "check_secret") ? payload.check_secret : false;
    if (typeof checkSecret !== "boolean") {
        throw new Error("The 'check_secret' field must be a boolean.");
    }

    if (checkSecret) {
        const token = zapqio.constants.get("EXAMPLE_API_TOKEN");
        if (!token) {
            throw new Error("The EXAMPLE_API_TOKEN constant is empty.");
        }
    }

    zapqio.log.info("Example Node.js method completed.");

    return JSON.stringify({
        message: greeting(name.trim()),
        secret_loaded: checkSecret
    });
}
