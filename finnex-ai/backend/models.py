"""
models.py
Pydantic schemas used across the API for request validation and responses.
"""

from typing import Optional, Literal
from pydantic import BaseModel, EmailStr, Field


class SignupRequest(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=6)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict


class AccountIn(BaseModel):
    name: str
    type: Literal["bank", "wallet", "cash", "credit_card"] = "bank"
    initial_balance: float = 0.0


class TransactionIn(BaseModel):
    date: str  # YYYY-MM-DD
    type: Literal["income", "expense"]
    category: Optional[str] = None  # auto-categorized if omitted
    merchant: Optional[str] = None
    description: Optional[str] = ""
    amount: float = Field(gt=0)
    is_recurring: bool = False
    account_id: Optional[int] = None


class TransactionUpdate(BaseModel):
    date: Optional[str] = None
    type: Optional[Literal["income", "expense"]] = None
    category: Optional[str] = None
    merchant: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    account_id: Optional[int] = None


class BudgetIn(BaseModel):
    category: str
    monthly_limit: float = Field(ge=0)


class GoalIn(BaseModel):
    name: str
    target_amount: float = Field(gt=0)
    target_date: Optional[str] = None


class GoalDepositIn(BaseModel):
    amount: float = Field(gt=0)


class BillIn(BaseModel):
    name: str
    amount: float = Field(gt=0)
    due_date: str
    recurring: str = "monthly"


class ChatRequest(BaseModel):
    message: str


class RiskProfileIn(BaseModel):
    risk_profile: Literal["conservative", "moderate", "aggressive"]


class CurrencyIn(BaseModel):
    currency: str  # e.g. "USD", "INR", "EUR"
