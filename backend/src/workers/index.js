const logger = require("../common/utils/logger");

require("./webhook.worker");
require("./reconciliation.worker");
require("./notification.worker");
require("./sms.worker");

// More workers land here as each owning module is built:
//   refund worker -> as needed (Phase 7 eSIM disputes, admin-triggered refunds)

logger.info("Worker process started — listening on: webhook, reconciliation, notification, sms");
