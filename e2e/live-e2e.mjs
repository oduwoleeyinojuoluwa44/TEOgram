import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

function findPlaywrightRuntime() {
  const root = join(process.env.LOCALAPPDATA ?? '', 'npm-cache', '_npx');
  const candidate = join(root, 'e41f203b7505f1fb', 'node_modules', 'playwright', 'index.mjs');
  if (existsSync(candidate)) {
    return candidate;
  }
  throw new Error('Playwright runtime was not found in the local npx cache.');
}

function uniqueUser(label, suffix) {
  return {
    username: `codex_e2e_${label}_${suffix}`,
    displayName: `Codex ${label} ${suffix}`,
    password: `CodexPw_${suffix}_${label}`,
  };
}

async function main() {
  const { chromium } = await import(pathToFileURL(findPlaywrightRuntime()).href);
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const events = [];
  const appUrl = process.env.APP_URL ?? 'http://localhost:3000';

  page.on('console', (message) => events.push(`console:${message.type()}:${message.text()}`));
  page.on('pageerror', (error) => events.push(`pageerror:${error.message}`));
  page.on('response', async (response) => {
    if (response.status() >= 400) {
      const body = await response.text().catch(() => '');
      events.push(`response:${response.status()}:${response.url()}:${body.slice(0, 500)}`);
    }
  });
  page.on('request', (request) => {
    if (request.url().includes('whisperbox.koyeb.app/messages')) {
      events.push(`request:${request.method()}:${request.url()}:auth=${Boolean(request.headers().authorization)}:body=${request.postData() ?? ''}`);
    }
  });

  const suffix = Math.random().toString(36).slice(2, 10);
  const alice = uniqueUser('alice', suffix);
  const bob = uniqueUser('bob', suffix);
  const charlie = uniqueUser('charlie', suffix);
  const plaintext = `codex encrypted smoke ${suffix}`;
  const secondPlaintext = `codex isolated smoke ${suffix}`;

  const waitForText = (text) => page.getByText(text).waitFor({ timeout: 30_000 });
  const waitForSearch = () => page.getByPlaceholder('Search').waitFor({ timeout: 30_000 });
  const messageComposer = () => page.getByPlaceholder('Teogram');
  const registerTab = () => page.getByRole('button', { name: 'SignUp' });
  const loginSubmit = () => page.locator('form').getByRole('button', { name: 'Login' });
  const registerSubmit = () => page.locator('form').getByRole('button', { name: 'Register' }).last();

  async function register(user) {
    await registerTab().click();
    await page.getByLabel('Display Name').fill(user.displayName);
    await page.getByLabel('Username').fill(user.username);
    await page.getByLabel('Password').fill(user.password);
    await registerSubmit().click();
    await waitForSearch();
    await page.getByRole('button', { name: 'Log out' }).click();
    await loginSubmit().waitFor({ timeout: 30_000 });
  }

  async function login(user) {
    await page.getByLabel('Username').fill(user.username);
    await page.getByLabel('Password').fill(user.password);
    await loginSubmit().click();
    await waitForSearch();
    const tokenPresent = await page.evaluate(() => Boolean(sessionStorage.getItem('access_token')));
    if (!tokenPresent) {
      throw new Error(`No access token in session storage after login for ${user.username}`);
    }
    const loggedInUsername = await page.evaluate(async () => {
      const token = sessionStorage.getItem('access_token');
      const response = await fetch('https://whisperbox.koyeb.app/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const profile = await response.json();
      return profile.username;
    });
    if (loggedInUsername !== user.username) {
      throw new Error(`Expected ${user.username} but browser token belongs to ${loggedInUsername}`);
    }
  }

  try {
    await page.goto(appUrl, { waitUntil: 'networkidle' });
    await loginSubmit().waitFor({ timeout: 30_000 });

    await register(alice);
    await register(bob);
    await register(charlie);

    await login(alice);
    await page.getByPlaceholder('Search').fill(bob.username);
    await waitForText(bob.displayName);
    await page.getByText(bob.displayName).click();
    const tokenBeforeSend = await page.evaluate(() => Boolean(sessionStorage.getItem('access_token')));
    if (!tokenBeforeSend) {
      throw new Error('No access token in session storage before sending.');
    }
    await messageComposer().fill(plaintext);
    const sentResponse = page.waitForResponse((response) => (
      response.url() === 'https://whisperbox.koyeb.app/messages'
      && response.request().method() === 'POST'
    ), { timeout: 30_000 });
    await page.locator('form button[type="submit"]').click();
    const response = await sentResponse;
    if (!response.ok()) {
      throw new Error(`Message send failed with HTTP ${response.status()}: ${await response.text()}`);
    }
    await messageComposer().waitFor({ state: 'hidden', timeout: 1_000 }).catch(() => undefined);
    await waitForText(plaintext);
    await page.getByPlaceholder('Search').fill(charlie.username);
    await waitForText(charlie.displayName);
    await page.getByText(charlie.displayName).click();
    await messageComposer().fill(secondPlaintext);
    const secondSentResponse = page.waitForResponse((response) => (
      response.url() === 'https://whisperbox.koyeb.app/messages'
      && response.request().method() === 'POST'
    ), { timeout: 30_000 });
    await page.locator('form button[type="submit"]').click();
    const secondResponse = await secondSentResponse;
    if (!secondResponse.ok()) {
      throw new Error(`Second message send failed with HTTP ${secondResponse.status()}: ${await secondResponse.text()}`);
    }
    await waitForText(secondPlaintext);
    await page.getByText(bob.displayName).click();
    await waitForText(plaintext);
    const isolatedChatDoesNotLeak = await page.getByText(secondPlaintext).isVisible().catch(() => false);
    if (isolatedChatDoesNotLeak) {
      throw new Error('Message from Charlie conversation appeared while viewing Bob conversation.');
    }
    await page.getByRole('button', { name: 'Log out' }).click();
    await loginSubmit().waitFor({ timeout: 30_000 });

    await login(bob);
    await waitForText(alice.displayName);
    await page.getByText(alice.displayName).click();
    await waitForText(plaintext);

    const storage = await page.context().storageState();
    if (JSON.stringify(storage).includes(plaintext)) {
      throw new Error('Plaintext leaked into browser storage state.');
    }

    console.log(JSON.stringify({
      ok: true,
      alice: alice.username,
      bob: bob.username,
      charlie: charlie.username,
      plaintextVisibleToRecipient: true,
      isolatedConversationView: true,
      plaintextInStorageState: false,
    }, null, 2));
  } catch (error) {
    await page.screenshot({ path: 'e2e/live-e2e-failure.png', fullPage: true }).catch(() => undefined);
    console.error(JSON.stringify({ events }, null, 2));
    throw error;
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
