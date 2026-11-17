"""AI shopping assistant: a Gemini tool-calling agent that searches the catalog and looks after the customer's orders.

Security model (see context.py): who the customer is comes only from the verified sign-in token or from proof
given in this conversation. Tools read it from the server-side context; the model never passes a user id, so
nothing it is told can make it reach another customer's data.
"""
