// Sentry error test snippet
const Sentry = require("@sentry/node");

try {
  foo(); // intentional error: foo is not defined
} catch (e) {
  Sentry.captureException(e);
}
