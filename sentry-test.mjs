// Sentry error test snippet (ESM)
import * as Sentry from "@sentry/node";

try {
  foo(); // intentional error: foo is not defined
} catch (e) {
  Sentry.captureException(e);
}
