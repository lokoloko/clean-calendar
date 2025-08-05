# Calendar Share Link Feature

## Overview
Added a calendar share link feature that allows hosts to easily share the cleaner portal access link with their cleaners. The feature provides a user-friendly way to copy and share the calendar URL.

## Implementation

### 1. Calendar Share Button
- Added a calendar icon button in the cleaners table actions column
- Button has tooltip "Share calendar link" for clarity
- Clicking opens a modal with sharing options

### 2. Share Modal Dialog
The modal includes:
- **Link Display**: Shows the cleaner portal URL in a copyable format
- **Copy Button**: One-click copy to clipboard functionality
- **Instructions**: Clear explanation of how the calendar system works
- **Cleaner Info**: Shows the selected cleaner's name and phone number

### 3. How It Works
The modal explains the process:
1. Cleaner visits the shared link
2. Enters their phone number for authentication
3. Receives SMS verification code
4. Once verified, can view their schedule
5. Sees schedules from ALL hosts they work for

## Technical Details

### Components Added
- `handleShareCalendarLink()`: Opens the share modal for selected cleaner
- `copyLinkToClipboard()`: Copies the URL to clipboard with toast feedback
- Share modal dialog with instructions and copy functionality

### UI Elements
- Calendar icon button (consistent with other action buttons)
- Modal dialog with:
  - Title and description
  - Copyable link in a highlighted box
  - Copy button with icon
  - Step-by-step instructions
  - Cleaner phone number display

## User Flow

1. **Host Action**:
   - Navigate to Cleaners page
   - Click calendar icon next to cleaner's name
   - Modal opens with shareable link

2. **Sharing Options**:
   - Click copy button to copy link
   - Share via preferred method (SMS, email, etc.)
   - Close modal when done

3. **Cleaner Access**:
   - Receives link from host
   - Visits `/cleaner` URL
   - Logs in with phone number
   - Views calendar with all assigned cleanings

## Benefits

1. **Simplicity**: One consistent URL for all cleaners
2. **Security**: Phone-based authentication required
3. **Clarity**: Clear instructions for both hosts and cleaners
4. **Convenience**: Easy copy-to-clipboard functionality
5. **Multi-Host Support**: Cleaners see all their schedules in one place

## Future Enhancements

1. **Direct SMS Sharing**: Send link via SMS directly from the app
2. **QR Code**: Generate QR code for easy scanning
3. **Custom Messages**: Allow hosts to add personalized instructions
4. **Tracking**: See which cleaners have accessed their calendars
5. **Expiring Links**: Time-limited access links for security