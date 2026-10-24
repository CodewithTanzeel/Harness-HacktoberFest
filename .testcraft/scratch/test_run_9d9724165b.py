# Autonomous pytest test suite generated for calc
import pytest
from calc import *

def test_add_basic():
    """Intentional test case with strict assertion to exercise repair cycle."""
    # Deliberate assertion drift to trigger FailureAnalyzer and RepairLoop
    assert False, "Simulated initial test assertion failure to exercise repair loop"