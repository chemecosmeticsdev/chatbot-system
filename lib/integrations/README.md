# Line OA Integration Documentation

## Overview

This document provides comprehensive documentation for the Line Official Account (OA) integration implementation located in `lib/integrations/line.ts`. The integration provides full Line OA capabilities with Thai market optimizations and follows the project's database schema and monitoring patterns.

## Features Implemented

### 1. Core Line OA Integration
- **Webhook endpoint handling** for Line messages
- **Message API integration** for sending responses
- **Rich message support** (text, images, quick replies, flex messages)
- **User profile and context management**
- **Line bot configuration and credential management**

### 2. Service Methods

#### Setup and Configuration
- `setupLineIntegration(chatbotId, lineConfig, organizationId, settings, createdBy)` - Configure Line OA for a chatbot
- `configureRichMenu(menuConfig, chatbotId, organizationId)` - Setup Line rich menu
- `validateLineCredentials(config)` - Test Line API credentials

#### Message Handling
- `handleWebhook(requestBody, signature, chatbotId)` - Process incoming Line messages
- `sendMessage(userId, message, messageType, chatbotId, replyToken)` - Send responses via Line API
- `validateWebhook(signature, body, channelSecret)` - Security validation
- `getUserProfile(userId, chatbotId)` - Retrieve Line user information

#### Health and Monitoring
- `performHealthCheck(integrationId)` - Comprehensive integration health check
- `updateHealthStatus(integrationId, healthUpdate)` - Update integration status
- `getIntegrationByConfigId(chatbotId, organizationId)` - Retrieve integration config

### 3. Message Types Supported

#### Text Messages
- Plain text with Thai language optimization
- Automatic spacing correction for Thai-English mixed text
- Length validation and truncation

#### Rich Messages
- **Quick Replies** - Interactive response options
- **Template Messages** - Buttons, carousels, confirmations
- **Flex Messages** - Custom JSON-based layouts
- **Postback Actions** - Interactive button responses

#### Media Messages
- **Images** - Upload and display support
- **Files** - Document handling
- **Location** - GPS coordinates and addresses
- **Stickers** - Line sticker integration

### 4. Thai Market Optimizations

#### Language Processing
- **Thai text formatting** - Proper spacing and punctuation
- **Mixed Thai-English** - Automatic spacing correction
- **Cultural adaptations** - Thai-appropriate responses

#### Business Hours
- **Bangkok timezone** support (Asia/Bangkok)
- **Weekday/weekend** scheduling
- **Outside hours** automatic responses

#### Default Thai Content
- **Greeting messages** in Thai
- **Fallback responses** for common scenarios
- **Quick reply options** in Thai
- **Rich menu** with Thai labels

### 5. Security Features

#### Webhook Security
- **Signature validation** using HMAC-SHA256
- **Request body verification**
- **Rate limiting** protection

#### Credential Management
- **Encrypted storage** of sensitive data
- **Token validation** and refresh
- **Secure API calls** with proper headers

### 6. Integration with Existing Systems

#### Database Integration
- **integration_configs table** compliance
- **Proper foreign key** relationships
- **Health status tracking**
- **Error logging** and audit trail

#### Monitoring Integration
- **Sentry error tracking** with context
- **Performance monitoring** for API calls
- **Custom error types** (IntegrationError)
- **Comprehensive logging** with breadcrumbs

#### Conversation System
- **Session management** via ConversationService
- **Message storage** with metadata
- **Context preservation** across interactions
- **Analytics integration** for tracking

## Database Schema

The integration uses the `integration_configs` table with the following structure:

```sql
CREATE TABLE integration_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chatbot_id UUID REFERENCES chatbot_instances(id) ON DELETE CASCADE,
    integration_type VARCHAR(50) NOT NULL, -- 'line_oa'
    integration_name VARCHAR(255) NOT NULL,
    credentials JSONB DEFAULT '{}', -- Encrypted Line credentials
    settings JSONB DEFAULT '{}', -- Platform-specific settings
    webhook_url VARCHAR(500),
    status VARCHAR(50) DEFAULT 'active', -- active, inactive, error, testing
    last_health_check TIMESTAMP WITH TIME ZONE,
    health_status JSONB DEFAULT '{}',
    error_log JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID -- References Stack Auth user
);
```

## Configuration Examples

### Basic Line OA Setup

```typescript
import LineIntegrationService from '@/lib/integrations/line';

const lineService = new LineIntegrationService(dbClient);

// Setup Line OA integration
const integration = await lineService.setupLineIntegration(
  'chatbot-uuid',
  {
    channel_access_token: 'your-line-access-token',
    channel_secret: 'your-line-channel-secret',
    webhook_url: 'https://your-app.com/api/v1/integrations/line/webhook/chatbot-uuid'
  },
  'organization-uuid',
  {
    thai_language_optimization: true,
    business_hours: {
      timezone: 'Asia/Bangkok',
      weekdays: { start: '09:00', end: '18:00' },
      weekends: { start: '10:00', end: '16:00' }
    },
    greeting_message: {
      text: 'สวัสดีครับ/ค่ะ ยินดีต้อนรับสู่บริการของเรา',
      quick_replies: ['ข้อมูลทั่วไป', 'ติดต่อเจ้าหน้าที่', 'ช่วยเหลือ']
    }
  },
  'user-uuid'
);
```

### Webhook Handling

```typescript
// In your API route handler
export async function POST(request: Request) {
  const signature = request.headers.get('x-line-signature');
  const body = await request.text();

  const result = await lineService.handleWebhook(
    body,
    signature,
    'chatbot-uuid'
  );

  return Response.json(result);
}
```

### Sending Messages

```typescript
// Text message
await lineService.sendMessage(
  'line-user-id',
  'สวัสดีครับ มีอะไรให้ช่วยเหลือไหมครับ',
  'text',
  'chatbot-uuid'
);

// Rich message with quick replies
const richMessage = {
  type: 'text',
  text: 'เลือกหัวข้อที่สนใจ:',
  quickReply: {
    items: [
      {
        type: 'action',
        action: {
          type: 'message',
          label: 'ข้อมูลทั่วไป',
          text: 'ข้อมูลทั่วไป'
        }
      }
    ]
  }
};

await lineService.sendMessage(
  'line-user-id',
  richMessage,
  'template',
  'chatbot-uuid'
);
```

## Rich Menu Configuration

The integration automatically sets up a default Thai-optimized rich menu:

```typescript
const richMenuConfig = {
  size: { width: 2500, height: 1686 },
  selected: true,
  name: 'เมนูหลัก',
  chatBarText: 'เมนู',
  areas: [
    {
      bounds: { x: 0, y: 0, width: 833, height: 843 },
      action: {
        type: 'postback',
        data: 'general_info',
        displayText: 'ข้อมูลทั่วไป'
      }
    }
    // Additional menu areas...
  ]
};
```

## Error Handling

The integration includes comprehensive error handling:

### Error Types
- **IntegrationError** - General integration issues
- **Webhook validation failures**
- **API credential problems**
- **Rate limiting scenarios**

### Error Monitoring
- **Sentry integration** with detailed context
- **Error logging** in integration_configs.error_log
- **Health status tracking** with success rates
- **Automatic error recovery** for transient issues

## Performance Features

### Rate Limiting
- **200 messages per minute** limit
- **1000 broadcast messages per hour** limit
- **Automatic throttling** and queuing

### Caching
- **User profile caching** for repeated requests
- **Integration config caching** for performance
- **Health status caching** to reduce database load

### Monitoring
- **Response time tracking** for all API calls
- **Success rate monitoring** over 24-hour periods
- **Performance alerting** for degraded service

## Thai Market Utilities

The integration includes utilities specifically for the Thai market:

```typescript
import { ThaiLineUtils } from '@/lib/integrations/line';

// Format Thai phone numbers
const formattedPhone = ThaiLineUtils.formatThaiPhoneNumber('081-234-5678');
// Result: '+66812345678'

// Format Thai text for Line
const lineText = ThaiLineUtils.formatThaiTextForLine('ข้อความภาษาไทย');

// Generate Thai quick replies
const quickReplies = ThaiLineUtils.generateThaiQuickReplies();
// Result: ['ข้อมูลทั่วไป', 'ราคาและโปรโมชั่น', ...]

// Get Thai business hours template
const businessHours = ThaiLineUtils.getThaiBusinessHours();
```

## Testing and Validation

### Health Checks
The integration provides comprehensive health checking:

```typescript
const healthStatus = await lineService.performHealthCheck('integration-uuid');
// Returns:
// {
//   webhook_reachable: boolean,
//   token_valid: boolean,
//   rich_menu_configured: boolean,
//   error_count_24h: number,
//   success_rate_24h: number
// }
```

### Webhook Testing
Validate webhook signatures and test message processing:

```typescript
const isValid = lineService.validateWebhook(signature, body, channelSecret);
```

## Future Enhancements

### Planned Features
1. **Line Pay Integration** - Payment processing support
2. **Line Login Integration** - User authentication
3. **Broadcast Messaging** - Mass message distribution
4. **Analytics Dashboard** - Line-specific metrics
5. **A/B Testing** - Message effectiveness testing

### Scalability Considerations
1. **Message Queue** - High-volume message processing
2. **Multi-region Support** - Geographic distribution
3. **Advanced Analytics** - User behavior tracking
4. **Custom Integrations** - Third-party service connections

## Support and Maintenance

### Monitoring
- **Real-time error tracking** via Sentry
- **Performance dashboards** for API metrics
- **Health check automation** with alerting
- **Usage analytics** and reporting

### Documentation
- **API documentation** auto-generated from code
- **Integration guides** for common scenarios
- **Troubleshooting guides** for common issues
- **Best practices** for Thai market optimization

This implementation provides a comprehensive, production-ready Line OA integration with full Thai market optimization and enterprise-grade monitoring and error handling.