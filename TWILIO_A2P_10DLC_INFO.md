# Twilio A2P 10DLC and Unregistered Number Limits

## Current Situation
- Error: 30034 - Message from an Unregistered Number
- Message SID: SM62c55f101b801440ca29dc1c4a117886
- Status: Undelivered

## Unregistered Number Limits
According to Twilio's documentation, unregistered numbers can still send messages with these limits:
- **Daily limit**: 15 messages per day
- **Per second limit**: 1 message per second
- **To unique recipients**: Limited number of unique phone numbers

## Why This Message Failed
Possible reasons:
1. **Daily limit exceeded**: Check if you've sent more than 15 messages today
2. **Carrier filtering**: Some carriers (T-Mobile, AT&T) are stricter with unregistered numbers
3. **Message content**: Certain keywords might trigger spam filters
4. **Recipient carrier**: The recipient's carrier (213 area code - Los Angeles) might have strict filtering

## Immediate Solutions

### Option 1: Test with Different Numbers
- Try sending to a different carrier/phone number
- Some carriers are more lenient with unregistered numbers

### Option 2: Use Toll-Free Number (Recommended)
- Purchase a toll-free number (1-800, 1-888, etc.)
- No A2P 10DLC registration required
- Higher throughput limits
- Better deliverability

### Option 3: Complete A2P 10DLC Registration
- Takes 1-3 days but provides best deliverability
- Required for production use anyway

## Quick Test
Try sending a simpler message to test if it's content-related:
- Instead of: "Hi Dennis! Richard Montoya wants to send you cleaning schedule reminders via GoStudioM. Reply YES to opt-in or STOP to decline."
- Try: "Test message from GoStudioM"

## For Production
A2P 10DLC registration is eventually required for any production messaging in the US. The process is straightforward and provides:
- Better deliverability
- Higher rate limits (up to 6000 msg/day)
- Compliance with carrier requirements