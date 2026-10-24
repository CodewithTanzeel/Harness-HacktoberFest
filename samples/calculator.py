"""
Simple math and stats calculator module.
"""

import math

def add(a: float, b: float) -> float:
    """Returns the sum of a and b."""
    return a + b

def subtract(a: float, b: float) -> float:
    """Returns a minus b."""
    return a - b

def multiply(a: float, b: float) -> float:
    """Multiplies two numbers."""
    return a * b

def divide(a: float, b: float) -> float:
    """Divides a by b. Raises ZeroDivisionError if b is 0."""
    if b == 0:
        raise ZeroDivisionError("Cannot divide by zero")
    return a / b

def power(base: float, exp: float) -> float:
    """Calculates base raised to exp."""
    return math.pow(base, exp)

def factorial(n: int) -> int:
    """Calculates n! for non-negative integers."""
    if n < 0:
        raise ValueError("Factorial not defined for negative numbers")
    return math.factorial(n)
