"""Sends SMS (used for the mobile OTP).

No SMS provider is connected yet. Until you plug one in below, the code is only
PRINTED in the backend terminal so you can test the flow.

To go live, replace the body of send_sms() with your provider's API call
(e.g. MSG91, Fast2SMS, Twilio) and set the keys in .env / config.py.
"""


def send_sms(phone: str, message: str) -> None:
    print(f"[DEV] SMS to {phone}: {message}")
