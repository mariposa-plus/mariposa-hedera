import fs from 'fs';
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { type Page } from 'puppeteer';

puppeteer.use(StealthPlugin());

const LOG_PREFIX = '[CRE Headless Browser]';

let pendingCodeResolve: ((code: string) => void) | null = null;
let pendingCodeReject: ((reason: Error) => void) | null = null;

export function submitVerificationCode(code: string): boolean {
  if (pendingCodeResolve) {
    console.log(`${LOG_PREFIX} Verification code received, resuming browser automation`);
    pendingCodeResolve(code);
    pendingCodeResolve = null;
    pendingCodeReject = null;
    return true;
  }
  console.warn(`${LOG_PREFIX} submitVerificationCode called but no browser is waiting`);
  return false;
}

/**
 * Capture diagnostics from the current page for debugging failures.
 * Saves a screenshot to /tmp and returns page metadata.
 */
async function captureDiagnostics(page: Page, context: string): Promise<string> {
  const parts: string[] = [];
  try {
    const url = page.url();
    parts.push(`url=${url}`);
  } catch { parts.push('url=<unavailable>'); }

  try {
    const title = await page.title();
    parts.push(`title="${title}"`);
  } catch { parts.push('title=<unavailable>'); }

  try {
    const html = await page.content();
    const snippet = html.substring(0, 2000);
    parts.push(`html_snippet=${snippet}`);
  } catch { parts.push('html=<unavailable>'); }

  try {
    const screenshotPath = `/tmp/cre-login-debug-${Date.now()}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: true });
    parts.push(`screenshot=${screenshotPath}`);
    console.log(`${LOG_PREFIX} [${context}] Screenshot saved to ${screenshotPath}`);
  } catch (e: any) {
    parts.push(`screenshot=<failed: ${e.message}>`);
  }

  const diagnostics = parts.join(', ');
  console.error(`${LOG_PREFIX} [${context}] Diagnostics: ${diagnostics}`);
  return diagnostics;
}

/**
 * Dump the complete form DOM structure for debugging.
 * Logs all forms, inputs, hidden fields, React fiber keys, _valueTracker state, and buttons.
 */
async function captureFormDiagnostics(page: Page, context: string): Promise<void> {
  try {
    const formData = await page.evaluate(`
      (() => {
        var result = {};
        var forms = Array.from(document.querySelectorAll('form'));
        result.forms = forms.map(function(f, i) {
          return {
            index: i,
            action: f.action,
            method: f.method,
            id: f.id,
            className: f.className,
            childCount: f.children.length,
          };
        });
        var inputs = Array.from(document.querySelectorAll('input'));
        result.inputs = inputs.map(function(el) {
          var reactFiberKey = Object.keys(el).find(function(k) { return k.startsWith('__reactFiber$'); });
          var reactPropsKey = Object.keys(el).find(function(k) { return k.startsWith('__reactProps$'); });
          var tracker = el._valueTracker;
          return {
            id: el.id,
            name: el.name,
            type: el.type,
            value: el.value,
            placeholder: el.placeholder,
            className: el.className,
            hasReactFiber: !!reactFiberKey,
            hasReactProps: !!reactPropsKey,
            valueTrackerValue: tracker ? tracker.getValue() : '<no tracker>',
            parentFormIndex: el.form ? forms.indexOf(el.form) : -1,
          };
        });
        var buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
        result.buttons = buttons.map(function(btn) {
          return {
            tag: btn.tagName,
            type: btn.type,
            name: btn.name,
            value: btn.value,
            text: (btn.textContent || '').trim().substring(0, 100),
            className: btn.className,
            disabled: btn.disabled,
          };
        });
        return result;
      })()
    `);

    console.log(`${LOG_PREFIX} [${context}] Form diagnostics: ${JSON.stringify(formData, null, 2)}`);
  } catch (e: any) {
    console.error(`${LOG_PREFIX} [${context}] captureFormDiagnostics error: ${e.message}`);
  }
}

/**
 * Wait for React to finish hydrating before interacting with the page.
 * Checks for __reactFiber$ / __reactProps$ keys on DOM elements.
 */
async function waitForReactHydration(page: Page, timeoutMs = 10000): Promise<void> {
  console.log(`${LOG_PREFIX} Waiting for React hydration...`);
  try {
    await page.waitForFunction(
      `(() => {
        var inputs = document.querySelectorAll('input');
        if (inputs.length === 0) return false;
        for (var i = 0; i < inputs.length; i++) {
          var hasReact = Object.keys(inputs[i]).some(function(k) {
            return k.startsWith('__reactFiber$') || k.startsWith('__reactProps$');
          });
          if (hasReact) return true;
        }
        return false;
      })()`,
      { timeout: timeoutMs }
    );
    console.log(`${LOG_PREFIX} React hydration detected, adding safety buffer...`);
    await new Promise(r => setTimeout(r, 500));
    console.log(`${LOG_PREFIX} React hydration complete`);
  } catch {
    console.log(`${LOG_PREFIX} React hydration check timed out after ${timeoutMs}ms — proceeding anyway`);
  }
}

/**
 * Detect and handle Auth0's email verification code page.
 * Returns { handled: true } if the page was a verification page (with optional error),
 * or { handled: false } if it was not a verification page.
 */
async function handleVerificationCodePage(
  page: Page
): Promise<{ handled: boolean; error?: string }> {
  const { wsService } = await import('./websocket.service');

  // Check URL first
  const url = page.url();
  const isVerificationUrl = url.includes('login-email-verification');

  // Fallback: check page content
  let isVerificationContent = false;
  if (!isVerificationUrl) {
    try {
      isVerificationContent = await page.evaluate(`
        (() => {
          var text = document.body ? document.body.innerText : '';
          return text.includes('Verify Your Identity') || text.includes('enter a code');
        })()
      `) as boolean;
    } catch {}
  }

  if (!isVerificationUrl && !isVerificationContent) {
    return { handled: false };
  }

  console.log(`${LOG_PREFIX} Verification code page detected (url=${isVerificationUrl}, content=${isVerificationContent})`);
  console.log(`${LOG_PREFIX} Emitting cre:code:needed via WebSocket`);
  wsService.emitCRECodeNeeded();

  // Wait for the user to submit a code via the API (3-minute timeout)
  let code: string;
  try {
    code = await new Promise<string>((resolve, reject) => {
      pendingCodeResolve = resolve;
      pendingCodeReject = reject;
      setTimeout(() => {
        if (pendingCodeResolve === resolve) {
          pendingCodeResolve = null;
          pendingCodeReject = null;
          reject(new Error('Verification code timeout — no code received within 3 minutes'));
        }
      }, 180000);
    });
  } catch (err: any) {
    return { handled: true, error: err.message };
  }

  console.log(`${LOG_PREFIX} Typing verification code into page...`);

  // Find the code input
  const codeSelector = await waitForAnySelector(page, [
    'input[name="code"]',
    'input[placeholder*="code" i]',
    'input[placeholder*="Code" i]',
    'input[type="text"]',
    'input[inputmode="numeric"]',
  ], 5000);

  if (!codeSelector) {
    const diag = await captureDiagnostics(page, 'verification-code-input-not-found');
    return { handled: true, error: `Could not find code input on verification page — ${diag}` };
  }

  await typeIntoInput(page, codeSelector, code);
  console.log(`${LOG_PREFIX} Verification code typed, clicking submit...`);

  const submitClicked = await clickSubmitButton(page);
  if (!submitClicked) {
    const diag = await captureDiagnostics(page, 'verification-submit-not-found');
    return { handled: true, error: `Could not find submit button on verification page — ${diag}` };
  }

  // Wait for transition away from verification page
  await waitForPageTransition(page, [
    'button[type="submit"]',
    'button[name="action"]',
  ], 15000);

  console.log(`${LOG_PREFIX} Post-verification transition — URL: ${page.url()}`);

  // If still on verification page, code was wrong
  if (page.url().includes('login-email-verification')) {
    const authError = await checkForAuthError(page);
    return { handled: true, error: authError || 'Verification code was rejected' };
  }

  return { handled: true };
}

/**
 * Automates the login.chain.link OAuth flow using a headless browser.
 * Since `cre login` spawns a localhost callback server on the same machine,
 * the OAuth redirect to localhost:PORT will succeed when driven from the backend.
 */
export async function completeOAuthLoginHeadless(
  authUrl: string,
  email: string,
  password: string,
  timeoutMs = 60000
): Promise<{ success: boolean; error?: string }> {
  let browser;

  try {
    console.log(`${LOG_PREFIX} Launching browser...`);
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu', '--disable-dev-shm-usage'],
    });
    console.log(`${LOG_PREFIX} Browser launched successfully`);

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent(
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    );
    await page.setDefaultTimeout(timeoutMs);

    // Navigate to the OAuth authorization URL
    console.log(`${LOG_PREFIX} Navigating to auth URL: ${authUrl.substring(0, 80)}...`);
    await page.goto(authUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    console.log(`${LOG_PREFIX} Navigation complete — URL: ${page.url()}, title: "${await page.title()}"`);

    // Wait for React to hydrate before interacting
    await waitForReactHydration(page);

    // Wait for and fill email input (Auth0 / login.chain.link uses various selectors)
    const emailSelector = await waitForAnySelector(page, [
      'input[name="email"]',
      'input[type="email"]',
      'input#username',
      'input[name="username"]',
      'input[name="login"]',
    ]);

    if (!emailSelector) {
      const diag = await captureDiagnostics(page, 'email-input-not-found');
      return { success: false, error: `Could not find email input on login page — ${diag}` };
    }

    console.log(`${LOG_PREFIX} Found email input: ${emailSelector}`);
    await captureFormDiagnostics(page, 'before-email-entry');
    await typeIntoInput(page, emailSelector, email);
    console.log(`${LOG_PREFIX} Email entered`);
    await captureFormDiagnostics(page, 'after-email-before-submit');
    try {
      const preSubmitPath = `/tmp/cre-login-pre-submit-${Date.now()}.png`;
      await page.screenshot({ path: preSubmitPath, fullPage: true });
      console.log(`${LOG_PREFIX} Pre-submit screenshot: ${preSubmitPath}`);
    } catch {}

    // Check if password is on the same page or a separate step
    const passwordSelector = await waitForAnySelector(page, [
      'input[name="password"]',
      'input[type="password"]',
      'input#password',
    ], 3000);

    const passwordSelectors = [
      'input[name="password"]',
      'input[type="password"]',
      'input#password',
    ];

    if (passwordSelector) {
      // Email and password on the same page
      console.log(`${LOG_PREFIX} Found password input (same page): ${passwordSelector}`);
      await typeIntoInput(page, passwordSelector, password);
      console.log(`${LOG_PREFIX} Password entered`);

      // Click submit
      const submitClicked = await clickSubmitButton(page);
      if (!submitClicked) {
        const diag = await captureDiagnostics(page, 'submit-button-not-found');
        return { success: false, error: `Could not find submit button on login page — ${diag}` };
      }
      console.log(`${LOG_PREFIX} Submit clicked, waiting for transition...`);

      // Wait for redirect or next step after submit
      await waitForPageTransition(page, ['button[type="submit"]', 'button[name="action"]'], 15000);
      console.log(`${LOG_PREFIX} Post-submit transition — URL: ${page.url()}`);

      // Check for email verification code page before checking for auth errors
      const verifyResult1 = await handleVerificationCodePage(page);
      if (verifyResult1.handled) {
        if (verifyResult1.error) {
          return { success: false, error: `Verification failed: ${verifyResult1.error}` };
        }
      } else {
        const authError = await checkForAuthError(page);
        if (authError) {
          console.error(`${LOG_PREFIX} Auth0 error after submit: ${authError}`);
          const diag = await captureDiagnostics(page, 'auth-error-after-submit');
          return { success: false, error: `Auth0 error: ${authError} — ${diag}` };
        }
      }
    } else {
      // Multi-step: submit email first, then password
      console.log(`${LOG_PREFIX} Password not on same page, submitting email first...`);
      const submitClicked = await clickSubmitButton(page);
      if (!submitClicked) {
        const diag = await captureDiagnostics(page, 'continue-button-not-found');
        return { success: false, error: `Could not find continue button for email step — ${diag}` };
      }
      console.log(`${LOG_PREFIX} Email step submitted, waiting for password field...`);

      // Wait for the SPA transition to show the password input
      const transitionResult = await waitForPageTransition(page, passwordSelectors, 15000);
      if (!transitionResult) {
        const emailStepError = await checkForAuthError(page);
        if (emailStepError) {
          console.error(`${LOG_PREFIX} Auth0 error at email step: ${emailStepError}`);
        }
        await captureFormDiagnostics(page, 'email-step-error-detail');
        const diag = await captureDiagnostics(page, 'email-to-password-transition-timeout');
        return { success: false, error: `Page did not transition to password step after email submit${emailStepError ? ` (Auth0 error: ${emailStepError})` : ''} — ${diag}` };
      }
      console.log(`${LOG_PREFIX} Transition detected (${transitionResult}), verifying password input...`);

      // Short safety check to make sure the password field is actually visible
      const pwdSelector = await waitForAnySelector(page, passwordSelectors, 5000);

      if (!pwdSelector) {
        const diag = await captureDiagnostics(page, 'password-input-not-found');
        return { success: false, error: `Could not find password input after email step — ${diag}` };
      }

      console.log(`${LOG_PREFIX} Found password input (step 2): ${pwdSelector}`);
      await typeIntoInput(page, pwdSelector, password);
      console.log(`${LOG_PREFIX} Password entered`);

      const submitClicked2 = await clickSubmitButton(page);
      if (!submitClicked2) {
        const diag = await captureDiagnostics(page, 'password-submit-not-found');
        return { success: false, error: `Could not find submit button for password step — ${diag}` };
      }
      console.log(`${LOG_PREFIX} Password step submitted, waiting for transition...`);

      // Wait for either redirect to localhost or a next-step button (invitation/consent)
      await waitForPageTransition(page, [
        'button[type="submit"]',
        'button[name="action"]',
        'button[value="accept"]',
        'input[type="submit"]',
      ], 15000);
      console.log(`${LOG_PREFIX} Post-password transition — URL: ${page.url()}`);

      // Check for email verification code page before checking for auth errors
      const verifyResult2 = await handleVerificationCodePage(page);
      if (verifyResult2.handled) {
        if (verifyResult2.error) {
          return { success: false, error: `Verification failed: ${verifyResult2.error}` };
        }
      } else {
        const pwdError = await checkForAuthError(page);
        if (pwdError) {
          console.error(`${LOG_PREFIX} Auth0 error after password submit: ${pwdError}`);
          const diag = await captureDiagnostics(page, 'auth-error-after-password');
          return { success: false, error: `Auth0 error: ${pwdError} — ${diag}` };
        }
      }
    }

    // Step 3: Handle invitation/consent acceptance if still on Auth0 domain
    const postLoginUrl = page.url();
    console.log(`${LOG_PREFIX} Checking for invitation/consent step — URL: ${postLoginUrl}`);
    if (!postLoginUrl.includes('localhost')) {
      console.log(`${LOG_PREFIX} Still on Auth0 domain, looking for accept/consent button...`);
      const acceptSelector = await waitForAnySelector(page, [
        'button[type="submit"]',
        'button[name="action"]',
        'button[value="accept"]',
        'input[type="submit"]',
        'button.auth0-lock-submit',
      ], 5000);

      if (acceptSelector) {
        console.log(`${LOG_PREFIX} Found accept/consent button: ${acceptSelector} — clicking...`);
        const acceptButton = await page.$(acceptSelector);
        if (acceptButton) {
          await acceptButton.click();
          console.log(`${LOG_PREFIX} Accept/consent button clicked, waiting for redirect...`);
          await waitForPageTransition(page, [], 15000);
          console.log(`${LOG_PREFIX} Post-accept transition — URL: ${page.url()}`);
        }
      } else {
        console.log(`${LOG_PREFIX} No accept/consent button found, proceeding to wait for redirect...`);
      }
    }

    // Wait for the OAuth redirect to localhost callback
    // The CRE CLI is listening on localhost:PORT/callback, so the redirect should succeed
    console.log(`${LOG_PREFIX} Waiting for OAuth redirect to localhost callback...`);
    try {
      await page.waitForFunction(
        'window.location.href.includes("localhost") && window.location.href.includes("callback")',
        { timeout: timeoutMs }
      );
      console.log(`${LOG_PREFIX} Redirect complete — final URL: ${page.url()}`);
    } catch {
      // Check if we're already on a success page or if the URL changed
      const currentUrl = page.url();
      if (currentUrl.includes('localhost') && currentUrl.includes('callback')) {
        console.log(`${LOG_PREFIX} Already on callback URL: ${currentUrl}`);
      } else if (currentUrl.includes('error') || currentUrl.includes('unauthorized')) {
        const diag = await captureDiagnostics(page, 'login-rejected');
        return { success: false, error: `Login failed — invalid credentials or authorization denied — ${diag}` };
      } else {
        const diag = await captureDiagnostics(page, 'redirect-timeout');
        return { success: false, error: `Login timed out waiting for redirect — ${diag}` };
      }
    }

    console.log(`${LOG_PREFIX} Login flow completed successfully`);
    return { success: true };
  } catch (error: any) {
    console.error(`${LOG_PREFIX} Unexpected error: ${error.message}`);
    // Try to capture diagnostics from the page if browser is still open
    if (browser) {
      try {
        const pages = await browser.pages();
        if (pages.length > 0) {
          await captureDiagnostics(pages[pages.length - 1], 'unexpected-error');
        }
      } catch {}
    }
    return { success: false, error: `Headless login error: ${error.message}` };
  } finally {
    // Reject any pending verification code promise so it doesn't leak
    if (pendingCodeReject) {
      pendingCodeReject(new Error('Browser closed before verification code was processed'));
      pendingCodeResolve = null;
      pendingCodeReject = null;
    }
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

/**
 * Verify that a DOM input's value matches the expected value.
 * Also reads back _valueTracker state for debugging.
 */
async function verifyInputValue(
  page: Page,
  selector: string,
  expected: string
): Promise<boolean> {
  const result = await page.evaluate(`
    (() => {
      var el = document.querySelector(${JSON.stringify(selector)});
      if (!el) return { found: false, value: '', trackerValue: '' };
      var tracker = el._valueTracker;
      return {
        found: true,
        value: el.value,
        trackerValue: tracker ? tracker.getValue() : '<no tracker>',
      };
    })()
  `) as { found: boolean; value: string; trackerValue: string };
  console.log(
    `${LOG_PREFIX} verifyInputValue: selector=${selector}, expected="${expected}", ` +
    `actual="${result.value}", tracker="${result.trackerValue}", match=${result.value === expected}`
  );
  return result.value === expected;
}

/**
 * Type into an input field using multiple strategies to ensure React
 * controlled components update their internal state.
 * Tries three strategies in sequence until one succeeds.
 */
async function typeIntoInput(page: Page, selector: string, value: string): Promise<void> {
  // Strategy B (first): page.type() with real CDP keyboard events
  // This generates actual keydown/keypress/input/keyup events at the browser level
  // that any framework (Auth0 ULP, React, vanilla JS) will recognize.
  console.log(`${LOG_PREFIX} typeIntoInput Strategy B: page.type() with CDP key events`);
  try {
    await page.click(selector);
    await new Promise(r => setTimeout(r, 100));

    // Clear existing value: Ctrl+A to select all, then Backspace to delete
    await page.keyboard.down('Control');
    await page.keyboard.press('a');
    await page.keyboard.up('Control');
    await page.keyboard.press('Backspace');
    await new Promise(r => setTimeout(r, 100));

    // Type using real CDP key events with slightly longer delay for reliability
    await page.type(selector, value, { delay: 50 });
    await new Promise(r => setTimeout(r, 300));

    if (await verifyInputValue(page, selector, value)) {
      console.log(`${LOG_PREFIX} Strategy B succeeded`);
      return;
    }
    console.log(`${LOG_PREFIX} Strategy B: value set but verification failed, trying Strategy A`);
  } catch (e: any) {
    console.log(`${LOG_PREFIX} Strategy B failed: ${e.message}`);
  }

  // Strategy A: _valueTracker deletion + native setter + full event sequence
  console.log(`${LOG_PREFIX} typeIntoInput Strategy A: _valueTracker deletion + native setter`);
  try {
    await page.click(selector);
    await new Promise(r => setTimeout(r, 100));

    await page.evaluate(`
      (() => {
        var el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return;

        // Delete _valueTracker so React treats any value as "new"
        if (el._valueTracker) {
          delete el._valueTracker;
        }

        // Set value via native setter
        var nativeSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype, 'value'
        ).set;
        nativeSetter.call(el, ${JSON.stringify(value)});

        // Dispatch focus events
        el.dispatchEvent(new FocusEvent('focus', { bubbles: true }));
        el.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

        // Dispatch per-character key events
        var chars = ${JSON.stringify(value)};
        for (var i = 0; i < chars.length; i++) {
          var char = chars[i];
          el.dispatchEvent(new KeyboardEvent('keydown', { key: char, bubbles: true }));
          el.dispatchEvent(new KeyboardEvent('keypress', { key: char, bubbles: true }));
          el.dispatchEvent(new InputEvent('input', {
            bubbles: true,
            inputType: 'insertText',
            data: char,
          }));
          el.dispatchEvent(new KeyboardEvent('keyup', { key: char, bubbles: true }));
        }

        // Final change event
        el.dispatchEvent(new Event('change', { bubbles: true }));
      })()
    `);

    await new Promise(r => setTimeout(r, 300));
    if (await verifyInputValue(page, selector, value)) {
      console.log(`${LOG_PREFIX} Strategy A succeeded`);
      return;
    }
    console.log(`${LOG_PREFIX} Strategy A: value set but verification failed, trying Strategy C`);
  } catch (e: any) {
    console.log(`${LOG_PREFIX} Strategy A failed: ${e.message}`);
  }

  // Strategy C: keyboard.sendCharacter() per character (CDP Input.insertText)
  console.log(`${LOG_PREFIX} typeIntoInput Strategy C: keyboard.sendCharacter() per char`);
  try {
    await page.click(selector);
    await new Promise(r => setTimeout(r, 100));

    // Clear via evaluate: delete _valueTracker, native setter to empty
    await page.evaluate(`
      (() => {
        var el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return;
        if (el._valueTracker) {
          delete el._valueTracker;
        }
        var nativeSetter = Object.getOwnPropertyDescriptor(
          HTMLInputElement.prototype, 'value'
        ).set;
        nativeSetter.call(el, '');
        el.dispatchEvent(new Event('input', { bubbles: true }));
      })()
    `);
    await new Promise(r => setTimeout(r, 100));

    // Focus the element
    await page.focus(selector);

    // Send each character via CDP Input.insertText
    for (const char of value) {
      await page.keyboard.sendCharacter(char);
      await new Promise(r => setTimeout(r, 10));
    }

    // Dispatch final InputEvent + change
    await page.evaluate(`
      (() => {
        var el = document.querySelector(${JSON.stringify(selector)});
        if (!el) return;
        el.dispatchEvent(new InputEvent('input', {
          bubbles: true,
          inputType: 'insertText',
          data: el.value,
        }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      })()
    `);

    await new Promise(r => setTimeout(r, 300));
    if (await verifyInputValue(page, selector, value)) {
      console.log(`${LOG_PREFIX} Strategy C succeeded`);
      return;
    }
    console.log(`${LOG_PREFIX} Strategy C: verification failed`);
  } catch (e: any) {
    console.log(`${LOG_PREFIX} Strategy C failed: ${e.message}`);
  }

  console.warn(`${LOG_PREFIX} All typing strategies exhausted for selector=${selector}. Proceeding with best effort.`);
}

/**
 * Check if Auth0 displayed an error message on the page (wrong creds, bot block, etc.).
 */
async function checkForAuthError(page: Page): Promise<string | null> {
  return page.evaluate(`
    (() => {
      var errorEl = document.querySelector('[id*="error"], [class*="error"], [role="alert"]');
      return errorEl ? (errorEl.textContent || '').trim() || null : null;
    })()
  `) as Promise<string | null>;
}

/**
 * Wait for any of several selectors, returning the first one found.
 */
async function waitForAnySelector(
  page: Page,
  selectors: string[],
  timeoutMs = 15000
): Promise<string | null> {
  console.log(`${LOG_PREFIX} Waiting for selectors: ${selectors.join(', ')} (timeout=${timeoutMs}ms)`);
  try {
    const result = await Promise.race([
      ...selectors.map(async (selector) => {
        try {
          await page.waitForSelector(selector, { visible: true, timeout: timeoutMs });
          return selector;
        } catch {
          return null;
        }
      }),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
    if (result) {
      console.log(`${LOG_PREFIX} Selector matched: ${result}`);
    } else {
      console.log(`${LOG_PREFIX} No selector matched within ${timeoutMs}ms`);
    }
    return result;
  } catch {
    console.log(`${LOG_PREFIX} waitForAnySelector failed (exception)`);
    return null;
  }
}

/**
 * Wait for a page transition after clicking a button. Handles both SPA-style
 * DOM updates (Auth0) and full-page navigations. Resolves with the matched
 * selector, 'navigation', 'urlchange', or null on timeout.
 */
async function waitForPageTransition(
  page: Page,
  targetSelectors: string[],
  timeoutMs = 15000
): Promise<string | null> {
  const startUrl = page.url();
  console.log(`${LOG_PREFIX} waitForPageTransition — watching for: ${targetSelectors.join(', ')} (timeout=${timeoutMs}ms)`);

  try {
    const result = await Promise.race([
      // Primary signal: one of the target selectors becomes visible (SPA transition)
      ...targetSelectors.map(async (selector) => {
        try {
          await page.waitForSelector(selector, { visible: true, timeout: timeoutMs });
          return selector;
        } catch {
          return null;
        }
      }),
      // Fallback: full-page navigation fires
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: timeoutMs })
        .then(() => 'navigation' as string)
        .catch(() => null),
      // Secondary SPA signal: URL changes via pushState/replaceState
      (async () => {
        const pollInterval = 300;
        const maxPolls = Math.ceil(timeoutMs / pollInterval);
        for (let i = 0; i < maxPolls; i++) {
          await new Promise((r) => setTimeout(r, pollInterval));
          try {
            if (page.url() !== startUrl) return 'urlchange' as string;
          } catch { break; }
        }
        return null;
      })(),
      // Hard timeout
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);

    if (result) {
      console.log(`${LOG_PREFIX} waitForPageTransition resolved: ${result} — URL: ${page.url()}`);
    } else {
      console.log(`${LOG_PREFIX} waitForPageTransition timed out after ${timeoutMs}ms — URL: ${page.url()}`);
    }
    return result;
  } catch (e: any) {
    console.log(`${LOG_PREFIX} waitForPageTransition exception: ${e.message}`);
    return null;
  }
}

/**
 * Try to click a submit/continue button using various selectors.
 */
async function clickSubmitButton(page: Page): Promise<boolean> {
  const submitSelectors = [
    'button[type="submit"]',
    'button[name="submit"]',
    'button[name="action"]',
    'input[type="submit"]',
    'button.auth0-lock-submit',
  ];

  console.log(`${LOG_PREFIX} Looking for submit button...`);
  for (const selector of submitSelectors) {
    // Find index of first visible button matching this selector
    const btnResult = await page.evaluate(`
      (() => {
        var buttons = document.querySelectorAll(${JSON.stringify(selector)});
        for (var i = 0; i < buttons.length; i++) {
          var btn = buttons[i];
          var style = window.getComputedStyle(btn);
          var isHidden =
            style.display === 'none' ||
            style.visibility === 'hidden' ||
            btn.offsetParent === null ||
            (btn.className && btn.className.includes('hidden'));
          var parentForm = btn.closest('form');
          var info = {
            index: i,
            tag: btn.tagName,
            type: btn.type,
            name: btn.name,
            value: btn.value,
            text: (btn.textContent || '').trim().substring(0, 100),
            className: btn.className,
            disabled: btn.disabled,
            parentFormAction: parentForm ? parentForm.action : '<no form>',
            parentFormId: parentForm ? parentForm.id : '<no form>',
            isHidden: isHidden,
          };
          if (isHidden) {
            console.log(${JSON.stringify(`${LOG_PREFIX} Skipping hidden button: `)} + ${JSON.stringify(selector)} + ' — details: ' + JSON.stringify(info));
          } else {
            return { found: true, info: info };
          }
        }
        return { found: false, info: null };
      })()
    `) as { found: boolean; info: any };

    if (btnResult.found) {
      console.log(`${LOG_PREFIX} Found visible submit button: ${selector} — details: ${JSON.stringify(btnResult.info)} — clicking...`);
      // Click the button at the found index
      const buttons = await page.$$(selector);
      if (buttons[btnResult.info.index]) {
        await buttons[btnResult.info.index].click();
        return true;
      }
    }
  }

  console.log(`${LOG_PREFIX} No submit button found among: ${submitSelectors.join(', ')}`);
  return false;
}
