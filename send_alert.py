from twilio.rest import Client
import os
from dotenv import load_dotenv

load_dotenv()
client = Client(
    os.getenv("TWILIO_ACCOUNT_SID"), 
    os.getenv("TWILIO_AUTH_TOKEN")
)

sms = client.messages.create(
    body="🚨 Emergency Alert Test",
    from_=os.getenv("TWILIO_PHONE"),
    to="+917019712521"
)

print("SMS Id:", sms.sid)

call = client.calls.create(
   twiml='<Response><Say voice="alice">🚨 Emergency Alert! Please check immediately.</Say></Response>',
   from_=os.getenv("TWILIO_PHONE"),
   to = "+917019712521"
)

print("Call SId:", call.sid)