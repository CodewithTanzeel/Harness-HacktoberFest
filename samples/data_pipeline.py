"""
Data Transformation and Filtering Pipeline.
"""

from typing import List, Dict, Any, Callable

def filter_records(records: List[Dict[str, Any]], predicate: Callable[[Dict[str, Any]], bool]) -> List[Dict[str, Any]]:
    """Filters records based on predicate function."""
    if not isinstance(records, list):
        raise TypeError("records must be a list")
    return [r for r in records if predicate(r)]

def aggregate_by_key(records: List[Dict[str, Any]], group_key: str, value_key: str) -> Dict[str, float]:
    """Sums values of value_key grouped by group_key."""
    result: Dict[str, float] = {}
    for r in records:
        if group_key not in r or value_key not in r:
            continue
        key = str(r[group_key])
        val = float(r[value_key])
        result[key] = round(result.get(key, 0.0) + val, 2)
    return result

def normalize_text_records(records: List[Dict[str, Any]], field: str) -> List[Dict[str, Any]]:
    """Strips and lowercases a specified text field in each record."""
    transformed = []
    for r in records:
        copy_r = dict(r)
        if field in copy_r and isinstance(copy_r[field], str):
            copy_r[field] = copy_r[field].strip().lower()
        transformed.append(copy_r)
    return transformed
