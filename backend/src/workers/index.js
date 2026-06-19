const logger = require("../common/utils/logger");

require("./webhook.worker");

// More workers land here as each owning module is built:
//   refund worker         -> Phase 3/4
//   reconciliation worker -> Phase 4
//   sms worker             -> Phase 6

logger.info("Worker process started — listening on: webhook");
