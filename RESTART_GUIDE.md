# Restart Guide - Clean Calendar

## Current Status (August 5, 2025)

### ✅ What's Working
- **Core application**: All features functional in production
- **Cleaner share links**: Fixed and enhanced with refresh button and mobile optimization
- **Calendar sync**: Automated 3-hour sync via Vercel cron
- **Database**: All migrations applied, RLS policies optimized
- **Authentication**: Google OAuth for managers, SMS for cleaners (mock mode)

### ⏳ Pending Tasks
1. **Twilio A2P Approval** (HIGH PRIORITY)
   - Campaign ID: CMba872a661f73c51b9083efb214b6a727
   - Status: "In progress" - waiting for TCR approval
   - Timeline: 2-3 weeks for Sole Proprietor
   - Next step: Check status at https://console.twilio.com/us1/trusthub/insights/branded-calls/a2p

2. **SQL Migration Needed**
   - Run `/supabase/migrations/manual_update_share_token_functions.sql` in Supabase
   - This adds source and manual_rule_frequency fields to share link functions

### 🚀 Quick Start After Break

#### 1. Check Twilio Status
```bash
# Visit Twilio Console
https://console.twilio.com/us1/trusthub/insights/branded-calls/a2p

# If approved, add phone to messaging service:
# Service SID: MG16c2dd5b961df31963e30492e172f2c1
```

#### 2. Run Pending SQL Migration
```sql
-- In Supabase SQL Editor, run:
-- /supabase/migrations/manual_update_share_token_functions.sql
```

#### 3. Test Key Features
- Share link: https://www.gostudiom.com/cleaner/schedule/[token]
- Dashboard: https://www.gostudiom.com/dashboard
- SMS test: https://www.gostudiom.com/test-sms (after A2P approval)

### 📋 TODO List Summary
1. **Wait for A2P campaign approval** (2-3 weeks)
2. **Add Twilio number to approved campaign**
3. **Create SMS notification cron jobs** (daily/weekly)
4. **Add SMS settings to user preferences**
5. **Implement Settings page save functionality**
6. **Add conflict detection for scheduling overlaps**
7. **Add multi-user/team support features**
8. **Implement manual override/postponement system**

### 🔧 Development Commands
```bash
# Local development
git checkout local
npm run docker:dev
docker logs -f clean-calendar-app-1

# Production deployment
git checkout main
git push origin main
# Auto-deploys to Vercel

# Run tests
npm test

# Type checking
npm run typecheck
```

### 📝 Recent Changes (August 5)
1. Fixed cleaner share link database errors
2. Added refresh button to share links
3. Made mobile view edge-to-edge
4. Added "Next: [timing]" info to match exports
5. Created SQL migration for updated functions

### 🔗 Important Links
- Production: https://www.gostudiom.com
- GitHub: https://github.com/lokoloko/clean-calendar
- Supabase: https://app.supabase.com/project/puvlcvcbxmobxpnbjrwp
- Vercel: https://vercel.com/lokoloko/clean-calendar
- Twilio: https://console.twilio.com

### 💡 Next Steps When You Return
1. Check Twilio A2P campaign status
2. If approved, configure SMS notifications
3. If not approved, continue waiting
4. Consider implementing Settings page save functionality
5. Add conflict detection for overlapping bookings