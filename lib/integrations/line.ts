/**
 * Line Official Account (OA) Integration Service
 *
 * Comprehensive Line OA integration following the integration_configs table schema.
 * Provides webhook handling, message API integration, rich message support,
 * and Thai market optimizations.
 */

import { Client } from 'pg';
import crypto from 'crypto';
import { z } from 'zod';
import { withDatabaseMonitoring, withExternalApiMonitoring } from '@/lib/monitoring/api-wrapper';
import { SentryUtils, IntegrationError } from '@/lib/monitoring/sentry-utils';
import ConversationService from '@/lib/services/conversation-service';
import { ChatbotInstanceModel } from '@/lib/models/chatbot';

// Line API types and interfaces
export interface LineConfig {
  channel_access_token: string;
  channel_secret: string;
  user_id?: string;
  line_pay_channel_id?: string; // For future payment integration
  rich_menu_id?: string;
  webhook_url?: string;
  line_login_channel_id?: string; // For Line Login integration
}

export interface LineMessage {
  id: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'location' | 'sticker' | 'imagemap' | 'template' | 'flex';
  text?: string;
  originalContentUrl?: string;
  previewImageUrl?: string;
  duration?: number;
  fileSize?: number;
  fileName?: string;
  packageId?: string;
  stickerId?: string;
  title?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  altText?: string;
  template?: LineTemplate;
  contents?: FlexContainer;
}

export interface LineTemplate {
  type: 'buttons' | 'confirm' | 'carousel' | 'image_carousel';
  text?: string;
  thumbnailImageUrl?: string;
  imageAspectRatio?: 'rectangle' | 'square';
  imageSize?: 'cover' | 'contain';
  actions?: LineAction[];
  columns?: LineTemplateColumn[];
}

export interface LineTemplateColumn {
  thumbnailImageUrl?: string;
  imageBackgroundColor?: string;
  title?: string;
  text?: string;
  defaultAction?: LineAction;
  actions?: LineAction[];
}

export interface LineAction {
  type: 'postback' | 'message' | 'uri' | 'datetimepicker' | 'camera' | 'cameraRoll' | 'location';
  label?: string;
  data?: string;
  text?: string;
  uri?: string;
  mode?: 'date' | 'time' | 'datetime';
  initial?: string;
  max?: string;
  min?: string;
  displayText?: string;
}

export interface FlexContainer {
  type: 'bubble' | 'carousel';
  header?: FlexComponent;
  hero?: FlexComponent;
  body?: FlexComponent;
  footer?: FlexComponent;
  styles?: FlexBubbleStyles;
  contents?: FlexContainer[];
}

export interface FlexComponent {
  type: 'box' | 'button' | 'filler' | 'icon' | 'image' | 'separator' | 'spacer' | 'text';
  layout?: 'horizontal' | 'vertical' | 'baseline';
  contents?: FlexComponent[];
  flex?: number;
  spacing?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  margin?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  paddingAll?: string;
  paddingTop?: string;
  paddingBottom?: string;
  paddingStart?: string;
  paddingEnd?: string;
  text?: string;
  size?: 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | '3xl' | '4xl' | '5xl';
  align?: 'start' | 'end' | 'center';
  gravity?: 'top' | 'bottom' | 'center';
  wrap?: boolean;
  weight?: 'ultralight' | 'light' | 'regular' | 'bold';
  color?: string;
  action?: LineAction;
  url?: string;
  aspectRatio?: string;
  aspectMode?: 'cover' | 'fit';
  backgroundColor?: string;
  borderColor?: string;
  borderWidth?: string;
  cornerRadius?: string;
  height?: 'sm' | 'md' | 'lg' | 'xl' | 'xxl' | '3xl' | '4xl' | '5xl';
  style?: 'link' | 'primary' | 'secondary';
  adjustMode?: 'shrink-to-fit';
  offsetTop?: string;
  offsetBottom?: string;
  offsetStart?: string;
  offsetEnd?: string;
}

export interface FlexBubbleStyles {
  header?: FlexBlockStyle;
  hero?: FlexBlockStyle;
  body?: FlexBlockStyle;
  footer?: FlexBlockStyle;
}

export interface FlexBlockStyle {
  backgroundColor?: string;
  separator?: boolean;
  separatorColor?: string;
}

export interface LineWebhookEvent {
  type: 'message' | 'follow' | 'unfollow' | 'join' | 'leave' | 'memberJoined' | 'memberLeft' | 'postback' | 'videoPlayComplete' | 'beacon' | 'accountLink' | 'things';
  timestamp: number;
  source: {
    type: 'user' | 'group' | 'room';
    userId?: string;
    groupId?: string;
    roomId?: string;
  };
  message?: LineMessage;
  postback?: {
    data: string;
    params?: Record<string, any>;
  };
  replyToken?: string;
  mode: 'active' | 'standby';
}

export interface LineUserProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
  language?: string;
}

export interface LineRichMenu {
  size: {
    width: number;
    height: number;
  };
  selected: boolean;
  name: string;
  chatBarText: string;
  areas: LineRichMenuArea[];
}

export interface LineRichMenuArea {
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  action: LineAction;
}

export interface LineIntegrationConfig {
  id: string;
  chatbot_id: string;
  integration_type: 'line_oa';
  integration_name: string;
  credentials: LineConfig;
  settings: {
    auto_reply_enabled: boolean;
    rich_menu_enabled: boolean;
    thai_language_optimization: boolean;
    business_hours?: {
      timezone: string;
      weekdays: {
        start: string; // HH:mm
        end: string;   // HH:mm
      };
      weekends?: {
        start: string;
        end: string;
      };
    };
    greeting_message?: {
      text: string;
      quick_replies?: string[];
    };
    fallback_responses?: {
      no_match: string;
      error: string;
      outside_hours: string;
    };
    message_types: {
      text: boolean;
      image: boolean;
      video: boolean;
      audio: boolean;
      file: boolean;
      location: boolean;
      sticker: boolean;
    };
  };
  webhook_url?: string;
  status: 'active' | 'inactive' | 'error' | 'testing';
  last_health_check?: Date;
  health_status: {
    webhook_reachable: boolean;
    token_valid: boolean;
    last_message_at?: Date;
    error_count_24h: number;
    success_rate_24h: number;
  };
  error_log: Array<{
    timestamp: Date;
    error_type: string;
    error_message: string;
    context?: Record<string, any>;
  }>;
  created_at: Date;
  updated_at: Date;
  created_by?: string;
}

// Validation schemas
export const LineConfigSchema = z.object({
  channel_access_token: z.string().min(1, 'Channel Access Token is required'),
  channel_secret: z.string().min(1, 'Channel Secret is required'),
  user_id: z.string().optional(),
  line_pay_channel_id: z.string().optional(),
  rich_menu_id: z.string().optional(),
  webhook_url: z.string().url().optional(),
  line_login_channel_id: z.string().optional()
});

export const LineIntegrationSettingsSchema = z.object({
  auto_reply_enabled: z.boolean().default(true),
  rich_menu_enabled: z.boolean().default(true),
  thai_language_optimization: z.boolean().default(true),
  business_hours: z.object({
    timezone: z.string().default('Asia/Bangkok'),
    weekdays: z.object({
      start: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
      end: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format')
    }),
    weekends: z.object({
      start: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format'),
      end: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time format')
    }).optional()
  }).optional(),
  greeting_message: z.object({
    text: z.string(),
    quick_replies: z.array(z.string()).optional()
  }).optional(),
  fallback_responses: z.object({
    no_match: z.string().default('ขออภัย ฉันไม่เข้าใจคำถามของคุณ กรุณาลองถามใหม่อีกครั้ง'),
    error: z.string().default('เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้งในภายหลัง'),
    outside_hours: z.string().default('ขณะนี้อยู่นอกเวลาทำการ กรุณาติดต่อในเวลา จันทร์-ศุกร์ 9:00-18:00 น.')
  }).optional(),
  message_types: z.object({
    text: z.boolean().default(true),
    image: z.boolean().default(true),
    video: z.boolean().default(false),
    audio: z.boolean().default(false),
    file: z.boolean().default(true),
    location: z.boolean().default(true),
    sticker: z.boolean().default(true)
  }).default({
    text: true,
    image: true,
    video: false,
    audio: false,
    file: true,
    location: true,
    sticker: true
  })
});

export class LineIntegrationService {
  private client: Client;
  private conversationService: ConversationService;

  // Line API endpoints
  private static readonly LINE_API_BASE = 'https://api.line.me/v2/bot';
  private static readonly LINE_CONTENT_API_BASE = 'https://api-data.line.me/v2/bot';

  // Thai market constants
  private static readonly THAI_BUSINESS_TIMEZONE = 'Asia/Bangkok';
  private static readonly DEFAULT_THAI_GREETING = 'สวัสดีครับ/ค่ะ ยินดีต้อนรับสู่บริการของเรา มีอะไรให้ช่วยเหลือไหมครับ/ค่ะ';

  // Rate limiting
  private static readonly RATE_LIMIT_MESSAGES_PER_MINUTE = 200;
  private static readonly RATE_LIMIT_BROADCAST_PER_HOUR = 1000;

  constructor(client: Client) {
    this.client = client;
    this.conversationService = new ConversationService(client);
  }

  /**
   * Setup Line OA integration for a chatbot
   */
  async setupLineIntegration(
    chatbotId: string,
    lineConfig: LineConfig,
    organizationId: string,
    settings?: Partial<LineIntegrationConfig['settings']>,
    createdBy?: string
  ): Promise<LineIntegrationConfig> {
    return withDatabaseMonitoring(
      async () => {
        // Validate configuration
        const validatedConfig = LineConfigSchema.parse(lineConfig);
        const validatedSettings = LineIntegrationSettingsSchema.parse(settings || {});

        // Test Line API credentials
        await this.validateLineCredentials(validatedConfig);

        // Check if integration already exists
        const existingIntegration = await this.getIntegrationByConfigId(chatbotId, organizationId);
        if (existingIntegration) {
          throw new IntegrationError(
            'Line integration already exists for this chatbot',
            { chatbot_id: chatbotId, existing_id: existingIntegration.id }
          );
        }

        // Create webhook URL
        const webhookUrl = this.generateWebhookUrl(chatbotId);

        // Store integration configuration
        const integrationConfig: Omit<LineIntegrationConfig, 'id' | 'created_at' | 'updated_at'> = {
          chatbot_id: chatbotId,
          integration_type: 'line_oa',
          integration_name: `Line OA Integration - ${new Date().toLocaleDateString('th-TH')}`,
          credentials: this.encryptCredentials(validatedConfig),
          settings: {
            ...validatedSettings,
            // Thai market defaults
            thai_language_optimization: validatedSettings.thai_language_optimization ?? true,
            business_hours: validatedSettings.business_hours || {
              timezone: LineIntegrationService.THAI_BUSINESS_TIMEZONE,
              weekdays: { start: '09:00', end: '18:00' },
              weekends: { start: '10:00', end: '16:00' }
            },
            greeting_message: validatedSettings.greeting_message || {
              text: LineIntegrationService.DEFAULT_THAI_GREETING,
              quick_replies: ['ข้อมูลทั่วไป', 'ติดต่อเจ้าหน้าที่', 'ช่วยเหลือ']
            },
            fallback_responses: {
              no_match: 'ขออภัย ฉันไม่เข้าใจคำถามของคุณ กรุณาลองถามใหม่อีกครั้ง',
              error: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้งในภายหลัง',
              outside_hours: 'ขณะนี้อยู่นอกเวลาทำการ กรุณาติดต่อในเวลา จันทร์-ศุกร์ 9:00-18:00 น.',
              ...validatedSettings.fallback_responses
            }
          },
          webhook_url: webhookUrl,
          status: 'testing',
          health_status: {
            webhook_reachable: false,
            token_valid: true,
            error_count_24h: 0,
            success_rate_24h: 0
          },
          error_log: [],
          created_by: createdBy
        };

        const query = `
          INSERT INTO integration_configs (
            chatbot_id, integration_type, integration_name, credentials,
            settings, webhook_url, status, health_status, error_log, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          RETURNING *
        `;

        const values = [
          integrationConfig.chatbot_id,
          integrationConfig.integration_type,
          integrationConfig.integration_name,
          JSON.stringify(integrationConfig.credentials),
          JSON.stringify(integrationConfig.settings),
          integrationConfig.webhook_url,
          integrationConfig.status,
          JSON.stringify(integrationConfig.health_status),
          JSON.stringify(integrationConfig.error_log),
          integrationConfig.created_by
        ];

        const result = await this.client.query(query, values);

        if (result.rows.length === 0) {
          throw new IntegrationError('Failed to create Line integration');
        }

        const savedConfig = this.parseIntegrationConfigRow(result.rows[0]);

        // Set up rich menu if enabled
        if (savedConfig.settings.rich_menu_enabled) {
          try {
            const richMenuId = await this.setupDefaultRichMenu(validatedConfig, savedConfig.settings.thai_language_optimization);
            await this.updateIntegrationCredentials(savedConfig.id, {
              ...validatedConfig,
              rich_menu_id: richMenuId
            }, organizationId);
          } catch (error) {
            SentryUtils.captureError(error as Error, {
              chatbotId,
              operation: 'setup_rich_menu',
              additionalData: { integration_id: savedConfig.id }
            });
          }
        }

        // Set webhook URL in Line console (informational)
        SentryUtils.addBreadcrumb('Line integration created', {
          chatbot_id: chatbotId,
          integration_id: savedConfig.id,
          webhook_url: webhookUrl,
          organization_id: organizationId
        });

        return savedConfig;
      },
      {
        operation: 'setupLineIntegration',
        table: 'integration_configs',
        organizationId,
        additionalData: { chatbot_id: chatbotId, integration_type: 'line_oa' }
      }
    );
  }

  /**
   * Handle incoming Line webhook requests
   */
  async handleWebhook(
    requestBody: string,
    signature: string,
    chatbotId?: string
  ): Promise<{ success: boolean; processed_events: number; errors: string[] }> {
    const startTime = Date.now();

    try {
      return await withExternalApiMonitoring(
        async () => {
          // Parse webhook body
          let webhookData;
          try {
            webhookData = JSON.parse(requestBody);
          } catch (error) {
            throw new IntegrationError('Invalid JSON in webhook body');
          }

          const events = webhookData.events || [];
          let processedEvents = 0;
          const errors: string[] = [];

          // Process each event
          for (const event of events) {
            try {
              await this.processWebhookEvent(event, chatbotId);
              processedEvents++;
            } catch (error) {
              const errorMessage = (error as Error).message;
              errors.push(errorMessage);

              SentryUtils.captureError(error as Error, {
                chatbotId: chatbotId || 'unknown',
                operation: 'process_webhook_event',
                additionalData: {
                  event_type: event.type,
                  event_source: event.source?.type,
                  user_id: event.source?.userId
                }
              });
            }
          }

          const processingTime = Date.now() - startTime;

          // Log webhook processing
          SentryUtils.addBreadcrumb('Line webhook processed', {
            chatbot_id: chatbotId,
            events_count: events.length,
            processed_count: processedEvents,
            errors_count: errors.length,
            processing_time_ms: processingTime
          });

          return {
            success: errors.length === 0,
            processed_events: processedEvents,
            errors
          };
        },
        {
          service: 'line_webhook',
          endpoint: 'handle',
          chatbotId: chatbotId,
          additionalData: {
            events_count: JSON.parse(requestBody).events?.length || 0
          }
        }
      );
    } catch (error) {
      SentryUtils.captureError(error as Error, {
        chatbotId: chatbotId || 'unknown',
        operation: 'handle_webhook',
        additionalData: {
          signature,
          body_length: requestBody.length
        }
      });

      return {
        success: false,
        processed_events: 0,
        errors: [(error as Error).message]
      };
    }
  }

  /**
   * Send message via Line API
   */
  async sendMessage(
    userId: string,
    message: string | LineMessage,
    messageType: 'text' | 'template' | 'flex' = 'text',
    chatbotId?: string,
    replyToken?: string
  ): Promise<{ success: boolean; messageId?: string }> {
    return withExternalApiMonitoring(
      async () => {
        // Get integration config if chatbotId provided
        let integration: LineIntegrationConfig | null = null;
        if (chatbotId) {
          integration = await this.getIntegrationByConfigId(chatbotId);
          if (!integration || integration.status !== 'active') {
            throw new IntegrationError('Line integration not found or inactive');
          }
        }

        // Prepare message payload
        let messagePayload: any;

        if (typeof message === 'string') {
          // Simple text message
          messagePayload = {
            type: 'text',
            text: this.processThaiText(message, integration?.settings.thai_language_optimization)
          };
        } else {
          // Rich message
          messagePayload = message;

          // Apply Thai optimization if enabled
          if (integration?.settings.thai_language_optimization && messagePayload.text) {
            messagePayload.text = this.processThaiText(messagePayload.text, true);
          }
        }

        // Choose API endpoint based on reply token
        const endpoint = replyToken
          ? `${LineIntegrationService.LINE_API_BASE}/message/reply`
          : `${LineIntegrationService.LINE_API_BASE}/message/push`;

        const payload = replyToken
          ? {
              replyToken,
              messages: [messagePayload]
            }
          : {
              to: userId,
              messages: [messagePayload]
            };

        // Get access token
        const accessToken = integration
          ? this.decryptCredentials(integration.credentials).channel_access_token
          : process.env.LINE_CHANNEL_ACCESS_TOKEN;

        if (!accessToken) {
          throw new IntegrationError('Line access token not available');
        }

        // Send API request
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorBody = await response.text();
          throw new IntegrationError(
            `Line API error: ${response.status} ${response.statusText}`,
            { response_body: errorBody }
          );
        }

        const result = await response.json();

        // Update health status
        if (integration) {
          await this.updateHealthStatus(integration.id, {
            last_message_at: new Date(),
            token_valid: true
          });
        }

        return {
          success: true,
          messageId: result.sentMessages?.[0]?.id
        };
      },
      {
        service: 'line_api',
        endpoint: 'send_message',
        chatbotId: chatbotId,
        additionalData: {
          user_id: userId,
          message_type: messageType,
          has_reply_token: !!replyToken
        }
      }
    );
  }

  /**
   * Validate webhook signature
   */
  validateWebhook(signature: string, body: string, channelSecret: string): boolean {
    try {
      const hash = crypto
        .createHmac('sha256', channelSecret)
        .update(body)
        .digest('base64');

      return signature === hash;
    } catch (error) {
      SentryUtils.captureError(error as Error, {
        operation: 'validate_webhook_signature'
      });
      return false;
    }
  }

  /**
   * Get Line user profile
   */
  async getUserProfile(
    userId: string,
    chatbotId?: string
  ): Promise<LineUserProfile | null> {
    return withExternalApiMonitoring(
      async () => {
        let accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

        // Get access token from integration if chatbotId provided
        if (chatbotId) {
          const integration = await this.getIntegrationByConfigId(chatbotId);
          if (integration && integration.status === 'active') {
            accessToken = this.decryptCredentials(integration.credentials).channel_access_token;
          }
        }

        if (!accessToken) {
          throw new IntegrationError('Line access token not available');
        }

        const response = await fetch(
          `${LineIntegrationService.LINE_API_BASE}/profile/${userId}`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          }
        );

        if (!response.ok) {
          if (response.status === 404) {
            return null; // User not found
          }
          const errorBody = await response.text();
          throw new IntegrationError(
            `Failed to get user profile: ${response.status}`,
            { response_body: errorBody }
          );
        }

        const profile = await response.json();
        return {
          userId: profile.userId,
          displayName: profile.displayName,
          pictureUrl: profile.pictureUrl,
          statusMessage: profile.statusMessage,
          language: profile.language
        };
      },
      {
        service: 'line_api',
        endpoint: 'get_profile',
        chatbotId: chatbotId,
        additionalData: { user_id: userId }
      }
    );
  }

  /**
   * Configure Line rich menu
   */
  async configureRichMenu(
    menuConfig: LineRichMenu,
    chatbotId: string,
    organizationId: string
  ): Promise<{ success: boolean; richMenuId?: string }> {
    return withExternalApiMonitoring(
      async () => {
        const integration = await this.getIntegrationByConfigId(chatbotId, organizationId);
        if (!integration || integration.status !== 'active') {
          throw new IntegrationError('Line integration not found or inactive');
        }

        const credentials = this.decryptCredentials(integration.credentials);
        const accessToken = credentials.channel_access_token;

        // Create rich menu
        const createResponse = await fetch(
          `${LineIntegrationService.LINE_API_BASE}/richmenu`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            },
            body: JSON.stringify(menuConfig)
          }
        );

        if (!createResponse.ok) {
          const errorBody = await createResponse.text();
          throw new IntegrationError(
            `Failed to create rich menu: ${createResponse.status}`,
            { response_body: errorBody }
          );
        }

        const createResult = await createResponse.json();
        const richMenuId = createResult.richMenuId;

        // Update integration config with rich menu ID
        await this.updateIntegrationCredentials(integration.id, {
          ...credentials,
          rich_menu_id: richMenuId
        }, organizationId);

        return {
          success: true,
          richMenuId
        };
      },
      {
        service: 'line_api',
        endpoint: 'configure_rich_menu',
        chatbotId: chatbotId,
        additionalData: { organization_id: organizationId }
      }
    );
  }

  /**
   * Get integration configuration by chatbot ID
   */
  async getIntegrationByConfigId(
    chatbotId: string,
    organizationId?: string
  ): Promise<LineIntegrationConfig | null> {
    return withDatabaseMonitoring(
      async () => {
        let query = `
          SELECT ic.* FROM integration_configs ic
          JOIN chatbot_instances ci ON ic.chatbot_id = ci.id
          WHERE ic.chatbot_id = $1 AND ic.integration_type = 'line_oa'
        `;
        const params = [chatbotId];

        if (organizationId) {
          query += ` AND ci.organization_id = $2`;
          params.push(organizationId);
        }

        query += ` ORDER BY ic.created_at DESC LIMIT 1`;

        const result = await this.client.query(query, params);

        if (result.rows.length === 0) {
          return null;
        }

        return this.parseIntegrationConfigRow(result.rows[0]);
      },
      {
        operation: 'getIntegrationByConfigId',
        table: 'integration_configs',
        organizationId,
        additionalData: { chatbot_id: chatbotId }
      }
    );
  }

  /**
   * Update integration health status
   */
  async updateHealthStatus(
    integrationId: string,
    healthUpdate: Partial<LineIntegrationConfig['health_status']>
  ): Promise<void> {
    return withDatabaseMonitoring(
      async () => {
        const query = `
          UPDATE integration_configs
          SET health_status = health_status || $1, updated_at = NOW()
          WHERE id = $2
        `;

        await this.client.query(query, [
          JSON.stringify(healthUpdate),
          integrationId
        ]);
      },
      {
        operation: 'updateHealthStatus',
        table: 'integration_configs',
        additionalData: { integration_id: integrationId }
      }
    );
  }

  /**
   * Process webhook event
   */
  private async processWebhookEvent(event: LineWebhookEvent, chatbotId?: string): Promise<void> {
    const userId = event.source.userId;
    if (!userId) {
      throw new IntegrationError('User ID not found in webhook event');
    }

    // Determine chatbot from webhook URL if not provided
    if (!chatbotId) {
      // Extract from webhook context - this would be implemented based on webhook URL structure
      chatbotId = await this.extractChatbotIdFromEvent(event);
    }

    if (!chatbotId) {
      throw new IntegrationError('Could not determine chatbot ID from webhook event');
    }

    // Get integration config
    const integration = await this.getIntegrationByConfigId(chatbotId);
    if (!integration || integration.status !== 'active') {
      throw new IntegrationError('Line integration not found or inactive');
    }

    // Check business hours if configured
    if (integration.settings.business_hours && !this.isWithinBusinessHours(integration.settings.business_hours)) {
      if (event.replyToken) {
        await this.sendMessage(
          userId,
          integration.settings.fallback_responses?.outside_hours || 'ขณะนี้อยู่นอกเวลาทำการ',
          'text',
          chatbotId,
          event.replyToken
        );
      }
      return;
    }

    switch (event.type) {
      case 'message':
        await this.handleMessageEvent(event, integration, userId, chatbotId);
        break;

      case 'follow':
        await this.handleFollowEvent(event, integration, userId, chatbotId);
        break;

      case 'postback':
        await this.handlePostbackEvent(event, integration, userId, chatbotId);
        break;

      default:
        SentryUtils.addBreadcrumb('Unhandled Line event type', {
          event_type: event.type,
          chatbot_id: chatbotId,
          user_id: userId
        });
    }
  }

  /**
   * Handle message events
   */
  private async handleMessageEvent(
    event: LineWebhookEvent,
    integration: LineIntegrationConfig,
    userId: string,
    chatbotId: string
  ): Promise<void> {
    if (!event.message) return;

    const message = event.message;

    // Check if message type is supported
    if (!integration.settings.message_types[message.type as keyof typeof integration.settings.message_types]) {
      if (event.replyToken) {
        await this.sendMessage(
          userId,
          `ขออภัย ระบบไม่รองรับข้อความประเภท ${message.type} ในขณะนี้`,
          'text',
          chatbotId,
          event.replyToken
        );
      }
      return;
    }

    // Get or create conversation session
    const session = await this.conversationService.createSession({
      chatbot_id: chatbotId,
      user_identifier: userId,
      platform: 'line',
      metadata: {
        line_user_id: userId,
        line_source_type: event.source.type,
        line_group_id: event.source.groupId,
        line_room_id: event.source.roomId
      }
    }, integration.chatbot_id);

    let messageContent = '';
    let attachments: any[] = [];

    switch (message.type) {
      case 'text':
        messageContent = message.text || '';
        break;

      case 'image':
      case 'video':
      case 'audio':
      case 'file':
        messageContent = `[${message.type.toUpperCase()}]`;
        if (message.originalContentUrl) {
          attachments.push({
            type: message.type,
            url: message.originalContentUrl,
            preview_url: message.previewImageUrl,
            file_size: message.fileSize,
            file_name: message.fileName
          });
        }
        break;

      case 'location':
        messageContent = `[LOCATION] ${message.address || 'Unknown location'}`;
        if (message.latitude && message.longitude) {
          attachments.push({
            type: 'location',
            latitude: message.latitude,
            longitude: message.longitude,
            address: message.address
          });
        }
        break;

      case 'sticker':
        messageContent = `[STICKER] Package: ${message.packageId}, Sticker: ${message.stickerId}`;
        attachments.push({
          type: 'sticker',
          package_id: message.packageId,
          sticker_id: message.stickerId
        });
        break;
    }

    // Store user message
    const messageResponse = await this.conversationService.addMessage(
      session.id,
      {
        role: 'user',
        content: messageContent,
        attachments,
        metadata: {
          line_message_id: message.id,
          line_message_type: message.type,
          timestamp: event.timestamp
        }
      },
      integration.chatbot_id // organization_id
    );

    // Generate and send bot response if this was a text message
    if (message.type === 'text' && messageContent.trim()) {
      try {
        const botResponse = await this.generateBotResponse(
          messageContent,
          integration,
          messageResponse.context_sources
        );

        // Store bot response
        await this.conversationService.addMessage(
          session.id,
          {
            role: 'assistant',
            content: botResponse.text,
            metadata: {
              sources: messageResponse.context_sources,
              response_type: 'ai_generated'
            }
          },
          integration.chatbot_id
        );

        // Send response via Line
        if (event.replyToken) {
          await this.sendMessage(
            userId,
            botResponse.text,
            'text',
            chatbotId,
            event.replyToken
          );

          // Send quick replies if available
          if (botResponse.quickReplies && botResponse.quickReplies.length > 0) {
            const quickReplyMessage = {
              type: 'text' as const,
              text: 'คุณต้องการข้อมูลเพิ่มเติมหรือไม่?',
              quickReply: {
                items: botResponse.quickReplies.map(reply => ({
                  type: 'action' as const,
                  action: {
                    type: 'message' as const,
                    label: reply,
                    text: reply
                  }
                }))
              }
            };

            await this.sendMessage(userId, quickReplyMessage, 'template', chatbotId);
          }
        }
      } catch (error) {
        SentryUtils.captureError(error as Error, {
          chatbotId,
          operation: 'generate_bot_response',
          additionalData: {
            session_id: session.id,
            user_message: messageContent.substring(0, 100)
          }
        });

        // Send fallback response
        if (event.replyToken) {
          await this.sendMessage(
            userId,
            integration.settings.fallback_responses?.error || 'เกิดข้อผิดพลาดในระบบ',
            'text',
            chatbotId,
            event.replyToken
          );
        }
      }
    }
  }

  /**
   * Handle follow events (new user)
   */
  private async handleFollowEvent(
    event: LineWebhookEvent,
    integration: LineIntegrationConfig,
    userId: string,
    chatbotId: string
  ): Promise<void> {
    // Get user profile
    const userProfile = await this.getUserProfile(userId, chatbotId);

    // Send greeting message
    const greetingText = integration.settings.greeting_message?.text ||
                        LineIntegrationService.DEFAULT_THAI_GREETING;

    await this.sendMessage(userId, greetingText, 'text', chatbotId);

    // Send quick replies if configured
    if (integration.settings.greeting_message?.quick_replies) {
      const quickReplyMessage = {
        type: 'text' as const,
        text: 'เลือกหัวข้อที่สนใจ:',
        quickReply: {
          items: integration.settings.greeting_message.quick_replies.map(reply => ({
            type: 'action' as const,
            action: {
              type: 'message' as const,
              label: reply,
              text: reply
            }
          }))
        }
      };

      await this.sendMessage(userId, quickReplyMessage, 'template', chatbotId);
    }

    // Log new follower
    SentryUtils.addBreadcrumb('New Line follower', {
      chatbot_id: chatbotId,
      user_id: userId,
      user_name: userProfile?.displayName,
      timestamp: event.timestamp
    });
  }

  /**
   * Handle postback events
   */
  private async handlePostbackEvent(
    event: LineWebhookEvent,
    integration: LineIntegrationConfig,
    userId: string,
    chatbotId: string
  ): Promise<void> {
    if (!event.postback) return;

    const postbackData = event.postback.data;

    // Get or create conversation session
    const session = await this.conversationService.createSession({
      chatbot_id: chatbotId,
      user_identifier: userId,
      platform: 'line',
      metadata: {
        line_user_id: userId,
        line_source_type: event.source.type
      }
    }, integration.chatbot_id);

    // Store postback as user message
    await this.conversationService.addMessage(
      session.id,
      {
        role: 'user',
        content: `[POSTBACK] ${postbackData}`,
        metadata: {
          postback_data: postbackData,
          postback_params: event.postback.params,
          timestamp: event.timestamp
        }
      },
      integration.chatbot_id
    );

    // Handle specific postback actions
    await this.handlePostbackAction(postbackData, userId, chatbotId, event.replyToken);
  }

  /**
   * Generate bot response using chatbot configuration
   */
  private async generateBotResponse(
    userMessage: string,
    integration: LineIntegrationConfig,
    contextSources?: Array<{ document_name: string; similarity: number; content_snippet: string }>
  ): Promise<{ text: string; quickReplies?: string[] }> {
    // This would integrate with the chatbot's LLM service
    // For now, return a mock response

    // Apply Thai language optimization
    let responseText = `ขอบคุณสำหรับคำถาม: "${userMessage}"`;

    if (contextSources && contextSources.length > 0) {
      responseText += '\n\nจากข้อมูลที่เกี่ยวข้อง:\n';
      responseText += contextSources[0].content_snippet;
    } else {
      responseText = integration.settings.fallback_responses?.no_match ||
                   'ขออภัย ฉันไม่พบข้อมูลที่เกี่ยวข้องกับคำถามของคุณ';
    }

    return {
      text: this.processThaiText(responseText, integration.settings.thai_language_optimization),
      quickReplies: ['ข้อมูลเพิ่มเติม', 'ติดต่อเจ้าหน้าที่', 'เมนูหลัก']
    };
  }

  /**
   * Handle postback actions
   */
  private async handlePostbackAction(
    postbackData: string,
    userId: string,
    chatbotId: string,
    replyToken?: string
  ): Promise<void> {
    let responseText = '';

    switch (postbackData) {
      case 'main_menu':
        responseText = 'กลับสู่เมนูหลัก - เลือกหัวข้อที่สนใจ';
        break;

      case 'contact_support':
        responseText = 'กรุณารอสักครู่ เจ้าหน้าที่จะติดต่อกลับภายใน 15 นาที';
        break;

      case 'general_info':
        responseText = 'ข้อมูลทั่วไปเกี่ยวกับบริการของเรา...';
        break;

      default:
        responseText = 'ขออภัย ไม่พบข้อมูลที่เกี่ยวข้อง';
    }

    if (replyToken) {
      await this.sendMessage(userId, responseText, 'text', chatbotId, replyToken);
    }
  }

  /**
   * Check if current time is within business hours
   */
  private isWithinBusinessHours(businessHours: NonNullable<LineIntegrationConfig['settings']['business_hours']>): boolean {
    const now = new Date();
    const bangkokTime = new Date(now.toLocaleString('en-US', { timeZone: businessHours.timezone }));

    const currentHour = bangkokTime.getHours();
    const currentMinute = bangkokTime.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const isWeekend = bangkokTime.getDay() === 0 || bangkokTime.getDay() === 6;
    const schedule = isWeekend && businessHours.weekends ? businessHours.weekends : businessHours.weekdays;

    const [startHour, startMinute] = schedule.start.split(':').map(Number);
    const [endHour, endMinute] = schedule.end.split(':').map(Number);

    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    return currentTime >= startTime && currentTime <= endTime;
  }

  /**
   * Process Thai text with language optimizations
   */
  private processThaiText(text: string, optimization: boolean = true): string {
    if (!optimization) return text;

    return text
      // Add proper spacing for Thai text
      .replace(/([ก-๏])([a-zA-Z])/g, '$1 $2')
      .replace(/([a-zA-Z])([ก-๏])/g, '$1 $2')
      // Ensure proper punctuation spacing
      .replace(/([ก-๏])([.!?])/g, '$1$2')
      // Clean up multiple spaces
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Validate Line API credentials
   */
  private async validateLineCredentials(config: LineConfig): Promise<void> {
    try {
      const response = await fetch(
        `${LineIntegrationService.LINE_API_BASE}/info`,
        {
          headers: {
            'Authorization': `Bearer ${config.channel_access_token}`
          }
        }
      );

      if (!response.ok) {
        throw new IntegrationError(
          `Invalid Line credentials: ${response.status} ${response.statusText}`
        );
      }
    } catch (error) {
      if (error instanceof IntegrationError) throw error;
      throw new IntegrationError(
        'Failed to validate Line credentials',
        { original_error: (error as Error).message }
      );
    }
  }

  /**
   * Setup default rich menu for Thai market
   */
  private async setupDefaultRichMenu(
    config: LineConfig,
    thaiOptimization: boolean = true
  ): Promise<string> {
    const menuConfig: LineRichMenu = {
      size: {
        width: 2500,
        height: 1686
      },
      selected: true,
      name: thaiOptimization ? 'เมนูหลัก' : 'Main Menu',
      chatBarText: thaiOptimization ? 'เมนู' : 'Menu',
      areas: [
        {
          bounds: { x: 0, y: 0, width: 833, height: 843 },
          action: {
            type: 'postback',
            data: 'general_info',
            displayText: thaiOptimization ? 'ข้อมูลทั่วไป' : 'General Info'
          }
        },
        {
          bounds: { x: 833, y: 0, width: 834, height: 843 },
          action: {
            type: 'postback',
            data: 'contact_support',
            displayText: thaiOptimization ? 'ติดต่อเจ้าหน้าที่' : 'Contact Support'
          }
        },
        {
          bounds: { x: 1667, y: 0, width: 833, height: 843 },
          action: {
            type: 'postback',
            data: 'help',
            displayText: thaiOptimization ? 'ช่วยเหลือ' : 'Help'
          }
        },
        {
          bounds: { x: 0, y: 843, width: 1250, height: 843 },
          action: {
            type: 'message',
            text: thaiOptimization ? 'สอบถามข้อมูล' : 'Ask Question'
          }
        },
        {
          bounds: { x: 1250, y: 843, width: 1250, height: 843 },
          action: {
            type: 'postback',
            data: 'main_menu',
            displayText: thaiOptimization ? 'เมนูหลัก' : 'Main Menu'
          }
        }
      ]
    };

    const response = await fetch(
      `${LineIntegrationService.LINE_API_BASE}/richmenu`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.channel_access_token}`
        },
        body: JSON.stringify(menuConfig)
      }
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new IntegrationError(
        `Failed to create default rich menu: ${response.status}`,
        { response_body: errorBody }
      );
    }

    const result = await response.json();
    return result.richMenuId;
  }

  /**
   * Generate webhook URL for chatbot
   */
  private generateWebhookUrl(chatbotId: string): string {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://your-app.com';
    return `${baseUrl}/api/v1/integrations/line/webhook/${chatbotId}`;
  }

  /**
   * Extract chatbot ID from webhook event (implementation depends on URL structure)
   */
  private async extractChatbotIdFromEvent(event: LineWebhookEvent): Promise<string | null> {
    // This would be implemented based on how webhook URLs are structured
    // For now, return null to require explicit chatbot ID
    return null;
  }

  /**
   * Update integration credentials
   */
  private async updateIntegrationCredentials(
    integrationId: string,
    credentials: LineConfig,
    organizationId?: string
  ): Promise<void> {
    return withDatabaseMonitoring(
      async () => {
        const query = `
          UPDATE integration_configs
          SET credentials = $1, updated_at = NOW()
          WHERE id = $2
        `;

        await this.client.query(query, [
          JSON.stringify(this.encryptCredentials(credentials)),
          integrationId
        ]);
      },
      {
        operation: 'updateIntegrationCredentials',
        table: 'integration_configs',
        organizationId,
        additionalData: { integration_id: integrationId }
      }
    );
  }

  /**
   * Parse integration config row from database
   */
  private parseIntegrationConfigRow(row: any): LineIntegrationConfig {
    return {
      id: row.id,
      chatbot_id: row.chatbot_id,
      integration_type: row.integration_type,
      integration_name: row.integration_name,
      credentials: this.decryptCredentials(row.credentials),
      settings: row.settings,
      webhook_url: row.webhook_url,
      status: row.status,
      last_health_check: row.last_health_check,
      health_status: row.health_status,
      error_log: row.error_log,
      created_at: row.created_at,
      updated_at: row.updated_at,
      created_by: row.created_by
    };
  }

  /**
   * Encrypt sensitive credentials (mock implementation - use proper encryption in production)
   */
  private encryptCredentials(credentials: LineConfig): any {
    // In production, implement proper encryption
    return credentials;
  }

  /**
   * Decrypt sensitive credentials (mock implementation - use proper decryption in production)
   */
  private decryptCredentials(encryptedCredentials: any): LineConfig {
    // In production, implement proper decryption
    return encryptedCredentials;
  }

  /**
   * Health check for Line integration
   */
  async performHealthCheck(integrationId: string): Promise<{
    webhook_reachable: boolean;
    token_valid: boolean;
    rich_menu_configured: boolean;
    error_count_24h: number;
    success_rate_24h: number;
  }> {
    return withDatabaseMonitoring(
      async () => {
        // Get integration config
        const query = `SELECT * FROM integration_configs WHERE id = $1`;
        const result = await this.client.query(query, [integrationId]);

        if (result.rows.length === 0) {
          throw new IntegrationError('Integration not found');
        }

        const integration = this.parseIntegrationConfigRow(result.rows[0]);
        const credentials = this.decryptCredentials(integration.credentials);

        // Test token validity
        let tokenValid = false;
        try {
          const response = await fetch(
            `${LineIntegrationService.LINE_API_BASE}/info`,
            {
              headers: {
                'Authorization': `Bearer ${credentials.channel_access_token}`
              }
            }
          );
          tokenValid = response.ok;
        } catch (error) {
          tokenValid = false;
        }

        // Check rich menu configuration
        const richMenuConfigured = !!credentials.rich_menu_id;

        // Calculate error metrics (mock implementation)
        const errorCount24h = integration.error_log.filter(
          log => new Date(log.timestamp) > new Date(Date.now() - 24 * 60 * 60 * 1000)
        ).length;

        const successRate24h = Math.max(0, 100 - (errorCount24h * 5)); // Mock calculation

        const healthStatus = {
          webhook_reachable: true, // Would implement actual webhook testing
          token_valid: tokenValid,
          rich_menu_configured: richMenuConfigured,
          error_count_24h: errorCount24h,
          success_rate_24h: successRate24h
        };

        // Update health status in database
        await this.updateHealthStatus(integrationId, {
          ...healthStatus,
          last_message_at: new Date()
        });

        return healthStatus;
      },
      {
        operation: 'performHealthCheck',
        table: 'integration_configs',
        additionalData: { integration_id: integrationId }
      }
    );
  }
}

export default LineIntegrationService;

// Thai market utility functions
export const ThaiLineUtils = {
  /**
   * Format Thai phone number for Line
   */
  formatThaiPhoneNumber(phone: string): string {
    return phone.replace(/[^\d]/g, '').replace(/^0/, '+66');
  },

  /**
   * Convert Thai text to Line-friendly format
   */
  formatThaiTextForLine(text: string): string {
    return text
      .replace(/\s+/g, ' ')
      .trim()
      .substring(0, 5000); // Line message limit
  },

  /**
   * Generate Thai quick reply options
   */
  generateThaiQuickReplies(): string[] {
    return [
      'ข้อมูลทั่วไป',
      'ราคาและโปรโมชั่น',
      'วิธีการสั่งซื้อ',
      'การจัดส่ง',
      'การชำระเงิน',
      'ติดต่อเจ้าหน้าที่',
      'ช่วยเหลือ',
      'เมนูหลัก'
    ];
  },

  /**
   * Thai business hours templates
   */
  getThaiBusinessHours(): LineIntegrationConfig['settings']['business_hours'] {
    return {
      timezone: 'Asia/Bangkok',
      weekdays: { start: '09:00', end: '18:00' },
      weekends: { start: '10:00', end: '16:00' }
    };
  }
};