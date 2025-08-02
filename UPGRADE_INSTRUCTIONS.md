# Upgrade Account to Pro Tier - Production

## Option 1: Supabase SQL Editor (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard/project/puvlcvcbxmobxpnbjrwp
2. Navigate to **SQL Editor** in the left sidebar
3. Copy and paste the contents of `scripts/upgrade-user-to-pro.sql`
4. Click **Run** to execute
5. You should see your account upgraded to Pro tier

## Option 2: Using Supabase CLI (if you have it configured)

```bash
# Connect to production
supabase db remote commit

# Run the migration
supabase db push --db-url "postgresql://postgres:[YOUR-PASSWORD]@db.puvlcvcbxmobxpnbjrwp.supabase.co:5432/postgres"
```

## Option 3: Deploy the admin endpoint (temporary)

If you want to use the admin upgrade page:

1. Deploy to production:
   ```bash
   git add .
   git commit -m "Add temporary admin upgrade endpoint"
   git push origin main
   ```

2. Visit: https://your-vercel-app.vercel.app/admin/upgrade

3. Click "Upgrade to Pro Tier"

4. After upgrading, remove the admin endpoint:
   ```bash
   rm -rf src/app/admin
   rm src/app/api/admin/upgrade-user/route.ts
   git add .
   git commit -m "Remove temporary admin endpoint"
   git push origin main
   ```

## Verification

After upgrading, verify by:
1. Going to `/listings` - the "Add Listing" button should be enabled
2. Check that it shows "16 of unlimited listings" instead of "16 of 3 listings"

## What Pro Tier Gives You

- **Unlimited listings** (was limited to 3)
- **Unlimited cleaners** (was limited to 5)  
- SMS notifications (when Twilio is configured)
- WhatsApp notifications
- Cleaner dashboard access
- Auto-assignment features
- Daily alerts
- Advanced analytics
- All premium features