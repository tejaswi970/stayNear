import React from "react";

const STATUS_CONFIG = {
  verified: { className: "badge-success", label: "Verified" },
  rejected: { className: "badge-danger", label: "Not Verified" },
  pending: { className: "badge-warning", label: "Verification Pending" },
};

function VerificationBadge({ status, compact = false, className = "" }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return <span className={`badge ${config.className} ${className}`.trim()}>{compact ? config.label : `● ${config.label}`}</span>;
}

export default VerificationBadge;
