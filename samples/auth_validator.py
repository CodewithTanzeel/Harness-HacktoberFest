"""
Authentication & input validator module.
"""

import re
from typing import Tuple, List

def validate_email(email: str) -> bool:
    """Validates email format using regex."""
    if not isinstance(email, str) or not email.strip():
        return False
    pattern = r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$"
    return bool(re.match(pattern, email.strip()))

def validate_password_strength(password: str) -> Tuple[bool, List[str]]:
    """
    Checks password strength.
    Requires >= 8 chars, 1 uppercase, 1 digit, 1 special character.
    Returns (is_strong, list_of_missing_requirements).
    """
    missing = []
    if len(password) < 8:
        missing.append("Minimum 8 characters")
    if not any(c.isupper() for c in password):
        missing.append("At least one uppercase letter")
    if not any(c.isdigit() for c in password):
        missing.append("At least one numeric digit")
    if not any(c in "!@#$%^&*()_+-=[]{}|;:,.<>?" for c in password):
        missing.append("At least one special character")

    return (len(missing) == 0, missing)

def sanitize_username(username: str) -> str:
    """Removes non-alphanumeric chars (except _ and -) and converts to lowercase."""
    cleaned = re.sub(r"[^a-zA-Z0-9_\-]", "", username)
    return cleaned.lower()
