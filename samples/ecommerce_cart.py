"""
E-commerce Shopping Cart with discount rules, tax, and item counts.
"""

from typing import List, Dict, Optional

class CartItem:
    def __init__(self, sku: str, name: str, price: float, quantity: int = 1):
        if price < 0:
            raise ValueError("Price cannot be negative")
        if quantity <= 0:
            raise ValueError("Quantity must be greater than zero")
        self.sku = sku
        self.name = name
        self.price = price
        self.quantity = quantity

    def subtotal(self) -> float:
        return round(self.price * self.quantity, 2)


class ShoppingCart:
    def __init__(self, tax_rate: float = 0.08):
        self.tax_rate = tax_rate
        self.items: Dict[str, CartItem] = {}
        self.discount_coupon: Optional[str] = None

    def add_item(self, item: CartItem) -> None:
        if item.sku in self.items:
            self.items[item.sku].quantity += item.quantity
        else:
            self.items[item.sku] = item

    def remove_item(self, sku: str) -> bool:
        if sku in self.items:
            del self.items[sku]
            return True
        return False

    def apply_coupon(self, coupon_code: str) -> bool:
        valid_coupons = {"SAVE10": 0.10, "SAVE20": 0.20, "FLASH50": 0.50}
        if coupon_code.upper() in valid_coupons:
            self.discount_coupon = coupon_code.upper()
            return True
        return False

    def calculate_subtotal(self) -> float:
        return round(sum(item.subtotal() for item in self.items.values()), 2)

    def calculate_discount(self) -> float:
        subtotal = self.calculate_subtotal()
        rates = {"SAVE10": 0.10, "SAVE20": 0.20, "FLASH50": 0.50}
        if self.discount_coupon and self.discount_coupon in rates:
            return round(subtotal * rates[self.discount_coupon], 2)
        return 0.0

    def calculate_tax(self) -> float:
        taxable = self.calculate_subtotal() - self.calculate_discount()
        return round(max(0.0, taxable * self.tax_rate), 2)

    def calculate_total(self) -> float:
        subtotal = self.calculate_subtotal()
        discount = self.calculate_discount()
        tax = self.calculate_tax()
        return round(max(0.0, subtotal - discount + tax), 2)
