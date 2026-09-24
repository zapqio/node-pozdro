const zapqio = require("zapqio");
const { greeting } = require("../lib/greetings");

function run(data) {
    const name = "Zbysław"

    zapqio.log.critical(name)

    const token = zapqio.constants.get("EXAMPLE_API_TOKEN");
    zapqio.log.critical(token)

    
    return JSON.stringify({
        message: greeting(name.trim()),       
    });
}