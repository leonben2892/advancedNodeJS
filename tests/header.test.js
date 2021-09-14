const puppeteer = require('puppeteer');

let browser, page;

beforeEach(async () => {
    jest.setTimeout(30000);
    browser = await puppeteer.launch({
        headless: false
    });
    page = await browser.newPage();
    await page.goto('localhost:3000');
});

afterEach(async () => {
    await browser.close();
});

test('the header has the correct text', async () => {
    const text = await page.$eval('a.brand-logo', el => el.innerHTML);

    expect(text).toEqual('Blogster');
});

test('clicking login starts oauth flow', async () => {
    await page.click('.right a');

    const url = await page.url();

    expect(url).toMatch(/accounts\.google\.com/);
});

test('When signed in, shows logout button', async () => {
    const userId = '613b03158422552c544caf55';

    const Buffer = require('safe-buffer').Buffer;
    const sessionObject = {
        passport: {
            user: userId
        }
    };

    const sessionString = Buffer.from(JSON.stringify(sessionObject)).toString('base64');

    const Keygrip = require('keygrip');
    const keys = require('../config/keys');

    const keygrip = new Keygrip([keys.cookieKey]);
    const sig = keygrip.sign('session=' + sessionString);
    
    await page.setCookie({ name: 'session', value: sessionString }) ;
    await page.setCookie({ name: 'session.sig', value: sig });
    await page.goto('localhost:3000');

    await page.waitFor('a[href="/auth/logout"]');
    const text = await page.$eval('a[href="/auth/logout"]', el => el.innerHTML);

    expect(text).toEqual('Logout');
});