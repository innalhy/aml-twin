"""Classroom dials for the synthetic ledger.

The amount line is a slider in the sandbox. It is not a statutory reporting
threshold and it is not an instruction to a bank.
"""

SANDBOX_TAG = "twinaml-aml-week"

# Starting amount line the presenter uses on day 2, in Hong Kong dollars.
BASELINE_THRESHOLD_HKD = 10_000
DEFAULT_THRESHOLD_HKD = 10_000
SLIDER_MIN_HKD = 1_000
SLIDER_MAX_HKD = 20_000
SLIDER_STEP_HKD = 500

# Smurfing band: slices that sit under the starting line and at or above 5,000.
# The slider does not move this band. That is what makes the stress test readable.
SMURF_SLICE_MIN_HKD = 5_000
SMURF_SLICE_MAX_HKD = 10_000
SMURF_MIN_PAYERS = 5
SMURF_MIN_SUM_HKD = 30_000
SMURF_WINDOW_HOURS = 72

CYCLE_MIN_AMOUNT_HKD = 5_000
CYCLE_MIN_LEN = 3
CYCLE_MAX_LEN = 4
CYCLE_WINDOW_HOURS = 72

# Pass-through: most of the money leaves soon after it arrives.
PASS_THROUGH_MIN_INBOUND_HKD = 15_000
PASS_THROUGH_RATIO = 0.75
PASS_THROUGH_HOURS = 36
MULE_MAX_HOPS = 4

# Upload guard. The bundled ledger is far under both caps.
MAX_ACCOUNTS = 400
MAX_TRANSACTIONS = 2_000
