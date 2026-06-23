// Centralizes status -> badge variant so wallet transactions, orders, SMS
// campaigns, and eSIM orders all render status badges consistently instead
// of each screen inventing its own color logic.
export function getStatusVariant(status) {
  switch (status) {
    case "SUCCESS":
    case "ACTIVE":
    case "QR_DELIVERED":
    case "ACTIVATED":
      return "success";
    case "FAILED":
    case "REJECTED":
    case "BANNED":
    case "SUSPENDED":
    case "DISPUTED":
      return "destructive";
    case "PENDING":
    case "PROCESSING":
    case "SCHEDULED":
    case "QUEUED":
    case "SENDING":
    case "ADMIN_APPROVED":
    case "SUBMITTED_TO_CARRIER":
      return "warning";
    default:
      return "default";
  }
}
