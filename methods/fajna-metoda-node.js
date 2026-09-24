const zapqio = require("zapqio");
const { greeting } = require("../lib/greetings");

function run(data) {
    const name = "Zbysław"

    zapqio.log.critical(name)
    
    return JSON.stringify({
        message: greeting(name.trim()),       
    });
}