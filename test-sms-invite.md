# SMS Invite Test Guide

Now that the SMS fields have been added to your production database, you should be able to send SMS invites successfully.

## To Test:

1. Go to https://gostudiom.com/cleaners
2. Find a cleaner with a phone number (like Dennis)
3. Click the "Send SMS Invite" button
4. You should see a success message instead of the 500 error

## What Happens:

1. The cleaner will receive an SMS:
   ```
   Hi [Cleaner Name]! [Your Name] wants to send you cleaning schedule reminders via GoStudioM. Reply YES to opt-in or STOP to decline.
   ```

2. When they reply "YES":
   - Their `sms_opted_in` status is updated to true
   - They can now receive daily/weekly schedule reminders
   - The SMS status in the cleaners table will update

3. If they reply "STOP":
   - They are opted out
   - You cannot send them another invite for 48 hours

## Verify Database Update:

Run this query in your Supabase SQL Editor to see the SMS fields:

```sql
SELECT 
    name,
    phone,
    sms_opted_in,
    sms_opted_in_at,
    sms_invite_sent_at,
    sms_invite_token
FROM public.cleaners
WHERE phone IS NOT NULL
ORDER BY name;
```

## Next Steps:

Once cleaners have opted in, you can:
1. Send daily reminders (need to set up cron job)
2. Send weekly schedules (need to set up cron job)
3. They will automatically receive notifications

The SMS fields are now properly configured in your production database!