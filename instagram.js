const puppeteer = require('puppeteer');

const BASE_URL = 'http://instagram.com';
const TAG_URL = 'https://www.instagram.com/explore/tags/';

async function likePosts(recentImagesWitSrc, instagram) {
    const recentImages = recentImagesWitSrc.map(img => img.img);
    for (let i = 0; i < recentImages.length; i += 1) {
        console.log(i + 1, ' of ', recentImages.length)
        let image = recentImages[i];
        
        // click image
        await image.click();
        await instagram.page.waitFor(2000);

        
        // wait for the image
        await instagram.page.waitForSelector('div[role="dialog"]')
        
        let isLikable = await instagram.page.$('section > span > button > div > span > svg[aria-label="Me gusta"]')

        if (isLikable) {
            await isLikable.click('section > span > button > div > span > svg[aria-label="Me gusta"]');
            await instagram.page.waitFor(2000);
        }
        
        
        // close modal
        let closeButton = await instagram.page.$('svg[aria-label="Cerrar"]')
        await closeButton.click();
        await instagram.page.waitFor(1000)
    }
}

async function getImages(instagram) {
    let recentImages = await instagram.page.$$('article > div:nth-child(3) img[decoding="auto"]')
    let recentImagesSrc = await instagram.page.evaluate(() => {
        let elements = Array.from(document.querySelectorAll('article > div:nth-child(3) img[decoding="auto"]'));
        let currentSrcs = elements.map(element => {
            return element.currentSrc
        })
        return currentSrcs;
    });

    const imagesWithSrc = [];
    if (recentImages.length !== recentImagesSrc.length) {
        console.log('Different Length');
        return;
    }

    console.log('Lengths ->',recentImages.length, recentImagesSrc.length)

    for (let i = 0; i < recentImages.length; i += 1) {
        let imgWithSrc = {
            img: recentImages[i],
            src: recentImagesSrc[i]
        }
        imagesWithSrc.push(imgWithSrc);
    }

    return imagesWithSrc;
}

const instagram = {
    browser: null,
    page: null,

    initialize: async() => {
        instagram.browser = await puppeteer.launch({
            headless: false
        })

        instagram.page = await instagram.browser.newPage();
    },

    login: async (username, password) => {
        await instagram.page.goto(BASE_URL, { waitUntil: 'networkidle2'});

        let privacity = await instagram.page.$x('//button[contains(text(), "Aceptar")]')

        // click accept privacy
        await privacity[0].click();

        await instagram.page.waitForSelector('input[name="username"]', { visible: true });
        await instagram.page.waitForSelector('input[name="password"]', { visible: true });

        // writing username and password
        await instagram.page.type('input[name="username"]', username, { delay:100 })
        await instagram.page.type('input[name="password"]', password, { delay:100 })
        await instagram.page.click('[type="submit"]');

        await instagram.page.waitForNavigation({ waitUntil: 'networkidle2'});

        // click dont save info
        let saveInfo = await instagram.page.$x('//button[contains(text(), "Ahora no")]');
        await saveInfo[0].click();

        await instagram.page.waitForNavigation({ waitUntil: 'networkidle2'});

        let activeNotify = await instagram.page.$x('//button[contains(text(), "Ahora no")]');
        await activeNotify[0].click();
    },

    searchAndLike: async (keywords, iterations) => {
        let count = 0;
        let historicImages = [];
        for (let keyword of keywords) {
            await instagram.page.goto(`${TAG_URL}${keyword}`, { waitUntil: 'networkidle2'});
            await instagram.page.waitForSelector('article > div:nth-child(3) img[decoding="auto"]');

            let recentImages = await getImages(instagram, historicImages);
            if (!recentImages) continue;

            historicImages = recentImages;
            await likePosts(recentImages, instagram);

            while(count < iterations)  {  
                const newImages = await getImages(instagram, historicImages);
                const newRecentImages = [];
                for (let i = 0; i < newImages.length; i += 1) {
                    const image = newImages[i];
                    const exists = historicImages.find(newImg => newImg.src === image.src);
                    if (exists) continue;

                    newRecentImages.push(image);
                    historicImages.push(image);
                }

                await likePosts(newRecentImages, instagram);
                count += 1;
            }
        }

        await instagram.page.waitFor(300000);
    }
}

module.exports = instagram;
