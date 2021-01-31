require('dotenv').config();
const ig = require('./instagram');

(async () => {
    await ig.initialize();
    await ig.login(process.env.IG_USER, process.env.IG_PASS);
    await ig.searchAndLike([process.env.TAG1], process.env.ITERATIONS);
})()