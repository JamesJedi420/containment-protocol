// Sentry instrumentation file
// Import with `import * as Sentry from "@sentry/node"` if using ESM
const Sentry = require("@sentry/node");

Sentry.init({
  dsn: "https://b6bada652166dbfd08e5fb2baa233be3@o4511216513646592.ingest.us.sentry.io/4511216517251072",
  // Setting this option to true will send default PII data to Sentry.
  // For example, automatic IP address collection on events
  sendDefaultPii: true,
});
