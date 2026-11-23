# Branding and keeper workflow QA

23 November 2026

Tests ran on Windows with local PostgreSQL and MailHog. The test harness created isolated databases and temporary PDF directories. Browser tests used Chromium with deterministic voice fixtures.

| Check                                      | Result                                                                                                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| ESLint and TypeScript                      | Passed                                                                                                                                            |
| Vitest                                     | 101 tests passed, including the two Poppler visual comparisons, multi-page rendering, and PDF file-path persistence                               |
| Production Next.js build                   | Passed                                                                                                                                            |
| Playwright mobile                          | 6 tests passed                                                                                                                                    |
| Playwright desktop                         | 6 tests passed                                                                                                                                    |
| Lighthouse 13.6.0 accessibility on sign-in | 100 mobile and 100 desktop                                                                                                                        |
| Visual review                              | Sign-in reviewed at 393 × 852 and 1440 × 900. Mobile note review inspected at 360 × 800. Cairo loaded and the inspected screens fit horizontally. |

The browser suite covers keeper sign-in and role gating, archive navigation, owner settings and test email, recording and typing, line corrections, confirmation, and PDF preview and download. The voice review test also runs axe.

The production checklist still includes the sharing abstraction and WhatsApp Business stub, installability and offline sync, confirmation email, the Chromium render pool and health checks, API security and observability, and the Ubuntu production stack and backup/restore check.

The browser suite uses a fake microphone and stubs the device share and print dialogs. It does not exercise live WhatsApp delivery or the physical printer. Previously confirmed notes whose filesystem PDF path was never recorded may still require recovery.
