import re
import phonenumbers
from typing import Tuple

EMAIL = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")
CARD  = re.compile(r"\b(?:\d[ -]*?){13,19}\b")

def mask_email(text: str) -> str:
    return EMAIL.sub("[email]", text)

def mask_cards(text: str) -> str:
    return CARD.sub("[card]", text)

def mask_phones(text: str) -> str:
    def repl(m):
        try:
            num = phonenumbers.parse(m.group(), None)
            if phonenumbers.is_possible_number(num):
                return "[phone]"
        except:
            pass
        return m.group()
    return re.sub(r"\+?\d[\d \-]{7,}\d", repl, text)

def redact(text: str) -> str:
    text = mask_email(text)
    text = mask_cards(text)
    text = mask_phones(text)
    return text
