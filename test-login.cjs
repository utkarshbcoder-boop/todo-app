const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:5173/login');
  await page.fill('input[type="email"]', 'utkarshbcoder@gmail.com');
  await page.fill('input[type="password"]', 'Utkarshb@2007');
  await page.click('button:has-text("Sign In")');
  
  await page.waitForTimeout(2000); // wait for request
  
  const content = await page.content();
  if (content.includes('Login failed')) {
    console.log('Login failed reproduced!');
  } else {
    console.log('Login succeeded in UI!');
  }
  await browser.close();
})();
