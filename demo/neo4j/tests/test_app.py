"""The Streamlit script runs on the bundled CSV without a Neo4j connection."""

from __future__ import annotations

import unittest
from pathlib import Path

from streamlit.testing.v1 import AppTest

APP = Path(__file__).resolve().parents[1] / "app.py"


class AppSmokeTest(unittest.TestCase):
    def test_bundled_week_renders_before_and_after(self) -> None:
        app = AppTest.from_file(str(APP), default_timeout=60)
        app.run()
        self.assertEqual(list(app.exception), [])
        self.assertEqual(app.title[0].value, "TwinAML behavioral sandbox")
        metrics = {metric.label: metric.value for metric in app.metric}
        self.assertEqual(metrics["Before: rule alerts"], "16")
        self.assertEqual(metrics["After: rule alerts"], "16")
        self.assertEqual(metrics["Graph-linked cases"], "3")
        self.assertEqual(metrics["Payments"], "37")

        app.sidebar.slider[0].set_value(5_000).run()
        self.assertEqual(list(app.exception), [])
        metrics = {metric.label: metric.value for metric in app.metric}
        self.assertEqual(metrics["Before: rule alerts"], "16")
        self.assertEqual(metrics["After: rule alerts"], "30")
        self.assertEqual(metrics["Graph-linked cases"], "3")


if __name__ == "__main__":
    unittest.main()
