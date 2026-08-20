"""Traffic API contract values that require explicit team approval to change."""

from __future__ import annotations


CONGESTION_UNIT = "tti_ratio"
SEVERITY_CONFIG_VERSION = "provisional_tti_v1"

# The project documents require five frontend severity levels but do not define
# their TTI boundaries.  Keep the temporary presentation mapping visible and
# isolated until the team ratifies authoritative IRC/LOS thresholds.
PROVISIONAL_TTI_SEVERITY_THRESHOLDS = (
    (1.10, "low"),
    (1.25, "moderate"),
    (1.50, "heavy"),
    (1.75, "severe"),
)


def severity_for_tti(congestion_index: float) -> str:
    for upper_bound, severity in PROVISIONAL_TTI_SEVERITY_THRESHOLDS:
        if congestion_index < upper_bound:
            return severity
    return "critical"
