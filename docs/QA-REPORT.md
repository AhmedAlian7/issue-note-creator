# Production QA

25 November 2026

The release was tested on Windows with Chromium, disposable PostgreSQL databases, and local MailHog. Browser tests use deterministic AI fixtures. Production Compose was checked with a separate Docker project and synthetic credentials.

| Check                         | Result                                                                                                                                                                                  |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ESLint and TypeScript         | Passed.                                                                                                                                                                                 |
| Next.js production build      | Passed.                                                                                                                                                                                 |
| Production dependency audit   | Passed with zero known advisories.                                                                                                                                                      |
| Vitest                        | All 107 test assertions passed. A Windows Chromium teardown timeout failed one run. The suite is being rerun with Vitest managing its browser process.                                  |
| PDF visual comparisons        | The Poppler comparisons against the blank template and sample 972 passed. The multipage and 20-concurrent-render tests passed.                                                          |
| Playwright mobile and desktop | Both default runs encountered an existing Next.js development server for this checkout. The suites are being rerun against the production build on the dedicated test port.             |
| Lighthouse 13.6 accessibility | 100 on sign-in and 100 on the offline shell in both mobile and desktop profiles.                                                                                                        |
| PWA installability            | Modern Lighthouse does not provide a PWA score. The browser suite checks Chromium installability and verifies that an offline reload preserves queued audio and text through reconnect. |
| Production Compose and Caddy  | Compose configuration and Caddy automatic HTTPS configuration validated. The complete Linux image build and startup are still under verification.                                       |

## Acceptance checks that need a real deployment

- Install the app on a physical phone over a public HTTPS domain. Check its home-screen icon, standalone launch, real microphone permission, and share sheet.
- Verify that Caddy obtains a public certificate for the warehouse domain. Check the credentials for any enabled production email and voice-analysis provider.
- The keeper queue sends when the workspace is open or reopened online. Items are available for review before any issue number is assigned.

[Chrome documentation on Lighthouse PWA checks](https://developer.chrome.com/blog/update-install-criteria)
