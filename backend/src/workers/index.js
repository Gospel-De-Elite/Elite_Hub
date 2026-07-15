const logger = require("../common/utils/logger");

require("./webhook.worker");
require("./reconciliation.worker");
require("./notification.worker");
require("./sms.worker");
require("./catalogSync.worker");

logger.info("Worker process started — listening on: webhook, reconciliation, notification, sms, catalog-sync");
