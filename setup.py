"""
Setup script for TestCraft & ValidateKaro
Installs the global CLI binary `ValidateKaro` and `testcraft` across any operating system.
"""

from setuptools import setup, find_packages

setup(
    name="testcraft",
    version="0.1.0",
    description="Autonomous Python Test Generator & Self-Healing CLI",
    author="TestCraft Team",
    packages=find_packages(),
    entry_points={
        "console_scripts": [
            "ValidateKaro=engine.cli:main_validatekaro",
            "validatekaro=engine.cli:main_validatekaro",
            "testcraft=engine.cli:main",
        ]
    },
    python_requires=">=3.10",
)
