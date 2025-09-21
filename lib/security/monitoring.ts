import { SentryUtils } from '@/lib/monitoring/sentry-utils';
import { rateLimiter, securityAuditor } from './audit-and-rate-limiting';

// Security event types
export type SecurityEventType =
  | 'rate_limit_violation'
  | 'authentication_failure'
  | 'authorization_failure'
  | 'vulnerability_detected'
  | 'suspicious_activity'
  | 'brute_force_attempt'
  | 'injection_attempt'
  | 'data_breach_attempt'
  | 'privilege_escalation'
  | 'unusual_pattern'
  | 'geographic_anomaly'
  | 'security_audit_failure';

export interface SecurityEvent {
  id: string;
  timestamp: string;
  type: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  details: string;
  metadata: Record<string, any>;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  actions: SecurityAction[];
}

export interface SecurityAction {
  timestamp: string;
  action: 'logged' | 'blocked' | 'throttled' | 'alerted' | 'quarantined' | 'escalated';
  details: string;
  automated: boolean;
}

export interface SecurityMetrics {
  timestamp: string;
  rateLimiting: {
    activeKeys: number;
    totalViolations: number;
    recentViolations: number;
    topViolators: Array<{ key: string; count: number }>;
  };
  authentication: {
    successfulLogins: number;
    failedLogins: number;
    suspiciousAttempts: number;
  };
  vulnerabilities: {
    criticalCount: number;
    highCount: number;
    mediumCount: number;
    lowCount: number;
    lastScanTime: string;
  };
  performance: {
    averageResponseTime: number;
    errorRate: number;
    throughput: number;
  };
  geographic: {
    blockedCountries: string[];
    suspiciousRegions: string[];
    requestsByCountry: Record<string, number>;
  };
}

export interface AttackPattern {
  name: string;
  description: string;
  indicators: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  threshold: number;
  timeWindow: number; // minutes
  autoBlock: boolean;
  actions: string[];
}

// Predefined attack patterns
const ATTACK_PATTERNS: AttackPattern[] = [
  {
    name: 'SQL Injection Attempt',
    description: 'Multiple requests with SQL injection patterns',
    indicators: ['union', 'select', 'drop', 'insert', 'update', '--', ';'],
    severity: 'critical',
    threshold: 3,
    timeWindow: 5,
    autoBlock: true,
    actions: ['block_ip', 'alert_security_team', 'create_incident']
  },
  {
    name: 'XSS Attack Pattern',
    description: 'Cross-site scripting attempt detected',
    indicators: ['<script', 'javascript:', 'onerror=', 'onload='],
    severity: 'high',
    threshold: 2,
    timeWindow: 10,
    autoBlock: true,
    actions: ['block_request', 'alert_security_team']
  },
  {
    name: 'Brute Force Login',
    description: 'Multiple failed login attempts from same source',
    indicators: ['failed_login'],
    severity: 'medium',
    threshold: 5,
    timeWindow: 15,
    autoBlock: true,
    actions: ['throttle_user', 'alert_admins']
  },
  {
    name: 'Rate Limit Evasion',
    description: 'Attempts to evade rate limiting through various techniques',
    indicators: ['rate_limit_violation'],
    severity: 'medium',
    threshold: 10,
    timeWindow: 30,
    autoBlock: false,
    actions: ['increase_monitoring', 'alert_admins']
  },
  {
    name: 'Data Exfiltration Pattern',
    description: 'Unusual data access patterns indicating potential exfiltration',
    indicators: ['bulk_download', 'unusual_access_pattern'],
    severity: 'critical',
    threshold: 1,
    timeWindow: 60,
    autoBlock: true,
    actions: ['block_user', 'alert_security_team', 'create_incident']
  },
  {
    name: 'Geographic Anomaly',
    description: 'Access from unusual geographic locations',
    indicators: ['geographic_anomaly'],
    severity: 'medium',
    threshold: 1,
    timeWindow: 60,
    autoBlock: false,
    actions: ['additional_verification', 'alert_user']
  }
];

export class SecurityMonitor {
  private events: SecurityEvent[] = [];
  private attackPatterns: AttackPattern[] = ATTACK_PATTERNS;
  private metrics: SecurityMetrics | null = null;
  private alertThresholds = {
    criticalEvents: 1,
    highEvents: 5,
    mediumEvents: 20,
    rateLimitViolations: 100,
    errorRate: 0.05, // 5%
    responseTime: 5000 // 5 seconds
  };

  // Record a security event
  recordSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp' | 'resolved' | 'actions'>): string {
    const securityEvent: SecurityEvent = {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      resolved: false,
      actions: [],
      ...event
    };

    // Add initial logging action
    securityEvent.actions.push({
      timestamp: new Date().toISOString(),
      action: 'logged',
      details: 'Security event recorded',
      automated: true
    });

    this.events.push(securityEvent);

    // Process the event
    this.processSecurityEvent(securityEvent);

    // Log to Sentry
    SentryUtils.captureError(new Error(`Security Event: ${event.type}`), {
      operation: 'security_event',
      additionalData: {
        event_id: securityEvent.id,
        event_type: event.type,
        severity: event.severity,
        source: event.source,
        details: event.details,
        metadata: event.metadata
      }
    });

    return securityEvent.id;
  }

  // Process a security event and take appropriate actions
  private processSecurityEvent(event: SecurityEvent): void {
    // Check for attack patterns
    this.checkAttackPatterns(event);

    // Take immediate actions based on severity
    switch (event.severity) {
      case 'critical':
        this.handleCriticalEvent(event);
        break;
      case 'high':
        this.handleHighSeverityEvent(event);
        break;
      case 'medium':
        this.handleMediumSeverityEvent(event);
        break;
      case 'low':
        this.handleLowSeverityEvent(event);
        break;
    }

    // Check if we need to trigger alerts
    this.checkAlertThresholds();
  }

  // Check for attack patterns
  private checkAttackPatterns(event: SecurityEvent): void {
    const recentEvents = this.getRecentEvents(60); // Last hour

    for (const pattern of this.attackPatterns) {
      const matchingEvents = recentEvents.filter(e =>
        pattern.indicators.some(indicator =>
          e.details.toLowerCase().includes(indicator.toLowerCase()) ||
          e.type.toLowerCase().includes(indicator.toLowerCase())
        )
      );

      if (matchingEvents.length >= pattern.threshold) {
        const patternEvent = this.recordPatternDetection(pattern, matchingEvents);

        if (pattern.autoBlock) {
          this.executeAutomatedActions(pattern, patternEvent);
        }
      }
    }
  }

  // Record pattern detection
  private recordPatternDetection(pattern: AttackPattern, matchingEvents: SecurityEvent[]): SecurityEvent {
    return {
      id: this.generateEventId(),
      timestamp: new Date().toISOString(),
      type: 'suspicious_activity',
      severity: pattern.severity,
      source: 'pattern_detection',
      details: `Attack pattern detected: ${pattern.name}`,
      metadata: {
        pattern_name: pattern.name,
        pattern_description: pattern.description,
        matching_event_count: matchingEvents.length,
        matching_event_ids: matchingEvents.map(e => e.id),
        auto_block: pattern.autoBlock
      },
      resolved: false,
      actions: [{
        timestamp: new Date().toISOString(),
        action: 'logged',
        details: 'Attack pattern detection logged',
        automated: true
      }]
    };
  }

  // Execute automated actions
  private executeAutomatedActions(pattern: AttackPattern, event: SecurityEvent): void {
    for (const actionType of pattern.actions) {
      let actionDetails = '';
      let success = true;

      switch (actionType) {
        case 'block_ip':
          actionDetails = 'IP address blocked (simulated)';
          break;
        case 'block_user':
          actionDetails = 'User account blocked (simulated)';
          break;
        case 'block_request':
          actionDetails = 'Request blocked';
          break;
        case 'throttle_user':
          actionDetails = 'User rate limit reduced';
          break;
        case 'alert_security_team':
          actionDetails = 'Security team alerted';
          this.sendSecurityAlert(event, 'security_team');
          break;
        case 'alert_admins':
          actionDetails = 'Administrators alerted';
          this.sendSecurityAlert(event, 'admins');
          break;
        case 'create_incident':
          actionDetails = 'Security incident created';
          this.createSecurityIncident(event);
          break;
        case 'additional_verification':
          actionDetails = 'Additional verification required';
          break;
        case 'alert_user':
          actionDetails = 'User notified of unusual activity';
          break;
        default:
          actionDetails = `Unknown action: ${actionType}`;
          success = false;
      }

      event.actions.push({
        timestamp: new Date().toISOString(),
        action: actionType as any,
        details: actionDetails,
        automated: true
      });

      if (success) {
        SentryUtils.addBreadcrumb(`Automated security action: ${actionType}`, {
          event_id: event.id,
          action: actionType,
          details: actionDetails
        });
      }
    }
  }

  // Handle different severity levels
  private handleCriticalEvent(event: SecurityEvent): void {
    event.actions.push({
      timestamp: new Date().toISOString(),
      action: 'escalated',
      details: 'Critical security event escalated',
      automated: true
    });

    this.sendImmediateAlert(event);
    SentryUtils.captureError(new Error('Critical Security Event'), {
      operation: 'critical_security_event',
      additionalData: event
    });
  }

  private handleHighSeverityEvent(event: SecurityEvent): void {
    event.actions.push({
      timestamp: new Date().toISOString(),
      action: 'alerted',
      details: 'High severity security event triggered alert',
      automated: true
    });

    this.sendSecurityAlert(event, 'security_team');
  }

  private handleMediumSeverityEvent(event: SecurityEvent): void {
    event.actions.push({
      timestamp: new Date().toISOString(),
      action: 'logged',
      details: 'Medium severity security event logged for review',
      automated: true
    });
  }

  private handleLowSeverityEvent(event: SecurityEvent): void {
    // Just log, no immediate action needed
  }

  // Send security alerts
  private sendImmediateAlert(event: SecurityEvent): void {
    // In a real implementation, this would integrate with alerting systems
    // like PagerDuty, Slack, email, SMS, etc.
    console.error(`🚨 CRITICAL SECURITY ALERT: ${event.type} - ${event.details}`);

    SentryUtils.captureError(new Error('Critical Security Alert'), {
      operation: 'immediate_security_alert',
      additionalData: {
        alert_type: 'immediate',
        event_id: event.id,
        event_type: event.type,
        severity: event.severity,
        details: event.details
      }
    });
  }

  private sendSecurityAlert(event: SecurityEvent, audience: 'security_team' | 'admins'): void {
    console.warn(`⚠️ Security Alert [${audience}]: ${event.type} - ${event.details}`);

    SentryUtils.addBreadcrumb(`Security alert sent to ${audience}`, {
      event_id: event.id,
      audience,
      event_type: event.type,
      severity: event.severity
    });
  }

  private createSecurityIncident(event: SecurityEvent): void {
    // In a real implementation, this would create tickets in JIRA, ServiceNow, etc.
    console.error(`🎫 Security Incident Created: ${event.type}`);

    SentryUtils.addBreadcrumb('Security incident created', {
      event_id: event.id,
      incident_type: event.type,
      severity: event.severity
    });
  }

  // Check alert thresholds
  private checkAlertThresholds(): void {
    const recentEvents = this.getRecentEvents(60); // Last hour
    const criticalCount = recentEvents.filter(e => e.severity === 'critical').length;
    const highCount = recentEvents.filter(e => e.severity === 'high').length;
    const mediumCount = recentEvents.filter(e => e.severity === 'medium').length;

    if (criticalCount >= this.alertThresholds.criticalEvents) {
      this.triggerThresholdAlert('critical', criticalCount);
    } else if (highCount >= this.alertThresholds.highEvents) {
      this.triggerThresholdAlert('high', highCount);
    } else if (mediumCount >= this.alertThresholds.mediumEvents) {
      this.triggerThresholdAlert('medium', mediumCount);
    }

    // Check rate limit violations
    const rateLimitStats = rateLimiter.getRateLimitStats();
    if (rateLimitStats.recentViolations >= this.alertThresholds.rateLimitViolations) {
      this.triggerRateLimitAlert(rateLimitStats.recentViolations);
    }
  }

  private triggerThresholdAlert(severity: string, count: number): void {
    console.warn(`📊 Threshold Alert: ${count} ${severity} security events in the last hour`);

    SentryUtils.captureError(new Error(`Security Event Threshold Exceeded`), {
      operation: 'threshold_alert',
      additionalData: {
        severity,
        count,
        threshold_type: 'event_count',
        time_window: '1_hour'
      }
    });
  }

  private triggerRateLimitAlert(violationCount: number): void {
    console.warn(`🚦 Rate Limit Alert: ${violationCount} violations in the last hour`);

    SentryUtils.captureError(new Error('Rate Limit Violations Threshold Exceeded'), {
      operation: 'rate_limit_alert',
      additionalData: {
        violation_count: violationCount,
        threshold: this.alertThresholds.rateLimitViolations,
        time_window: '1_hour'
      }
    });
  }

  // Utility methods
  private generateEventId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getRecentEvents(minutes: number): SecurityEvent[] {
    const cutoff = new Date(Date.now() - minutes * 60 * 1000);
    return this.events.filter(event => new Date(event.timestamp) > cutoff);
  }

  // Public methods for monitoring and reporting
  getSecurityMetrics(): SecurityMetrics {
    const rateLimitStats = rateLimiter.getRateLimitStats();
    const recentEvents = this.getRecentEvents(60);

    const metrics: SecurityMetrics = {
      timestamp: new Date().toISOString(),
      rateLimiting: rateLimitStats,
      authentication: {
        successfulLogins: 0, // Would come from auth system
        failedLogins: recentEvents.filter(e => e.type === 'authentication_failure').length,
        suspiciousAttempts: recentEvents.filter(e => e.type === 'brute_force_attempt').length
      },
      vulnerabilities: {
        criticalCount: recentEvents.filter(e => e.severity === 'critical').length,
        highCount: recentEvents.filter(e => e.severity === 'high').length,
        mediumCount: recentEvents.filter(e => e.severity === 'medium').length,
        lowCount: recentEvents.filter(e => e.severity === 'low').length,
        lastScanTime: new Date().toISOString()
      },
      performance: {
        averageResponseTime: 0, // Would come from monitoring system
        errorRate: 0, // Would come from monitoring system
        throughput: 0 // Would come from monitoring system
      },
      geographic: {
        blockedCountries: [],
        suspiciousRegions: [],
        requestsByCountry: {}
      }
    };

    this.metrics = metrics;
    return metrics;
  }

  getRecentSecurityEvents(hours: number = 24): SecurityEvent[] {
    return this.getRecentEvents(hours * 60);
  }

  getEventsByType(type: SecurityEventType): SecurityEvent[] {
    return this.events.filter(event => event.type === type);
  }

  getUnresolvedEvents(): SecurityEvent[] {
    return this.events.filter(event => !event.resolved);
  }

  getCriticalEvents(): SecurityEvent[] {
    return this.events.filter(event => event.severity === 'critical' && !event.resolved);
  }

  // Resolve a security event
  resolveEvent(eventId: string, resolvedBy: string, resolution: string): boolean {
    const event = this.events.find(e => e.id === eventId);
    if (!event) return false;

    event.resolved = true;
    event.resolvedAt = new Date().toISOString();
    event.resolvedBy = resolvedBy;
    event.actions.push({
      timestamp: new Date().toISOString(),
      action: 'logged',
      details: `Event resolved: ${resolution}`,
      automated: false
    });

    SentryUtils.addBreadcrumb('Security event resolved', {
      event_id: eventId,
      resolved_by: resolvedBy,
      resolution
    });

    return true;
  }

  // Update alert thresholds
  updateAlertThresholds(newThresholds: Partial<typeof this.alertThresholds>): void {
    this.alertThresholds = { ...this.alertThresholds, ...newThresholds };
  }

  // Add custom attack pattern
  addAttackPattern(pattern: AttackPattern): void {
    this.attackPatterns.push(pattern);
  }

  // Run security health check
  async runSecurityHealthCheck(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check recent critical events
    const criticalEvents = this.getCriticalEvents();
    if (criticalEvents.length > 0) {
      issues.push(`${criticalEvents.length} unresolved critical security events`);
      recommendations.push('Review and resolve critical security events immediately');
    }

    // Check rate limit violations
    const rateLimitStats = rateLimiter.getRateLimitStats();
    if (rateLimitStats.recentViolations > this.alertThresholds.rateLimitViolations) {
      issues.push(`High rate limit violations: ${rateLimitStats.recentViolations}`);
      recommendations.push('Review rate limiting configuration and consider tightening limits');
    }

    // Run security audit
    const auditResult = await securityAuditor.runSecurityAudit();
    if (auditResult.overallStatus === 'fail') {
      issues.push(`Security audit failed with ${auditResult.critical} critical issues`);
      recommendations.push('Address critical security vulnerabilities identified in audit');
    }

    let status: 'healthy' | 'warning' | 'critical' = 'healthy';
    if (criticalEvents.length > 0 || auditResult.overallStatus === 'fail') {
      status = 'critical';
    } else if (issues.length > 0) {
      status = 'warning';
    }

    return { status, issues, recommendations };
  }
}

// Global security monitor instance
export const securityMonitor = new SecurityMonitor();

// Helper functions for common security monitoring tasks
export function recordRateLimitViolation(source: string, details: string, metadata: Record<string, any> = {}): string {
  return securityMonitor.recordSecurityEvent({
    type: 'rate_limit_violation',
    severity: 'medium',
    source,
    details,
    metadata
  });
}

export function recordAuthenticationFailure(source: string, details: string, metadata: Record<string, any> = {}): string {
  return securityMonitor.recordSecurityEvent({
    type: 'authentication_failure',
    severity: 'medium',
    source,
    details,
    metadata
  });
}

export function recordSuspiciousActivity(source: string, details: string, severity: 'low' | 'medium' | 'high' | 'critical', metadata: Record<string, any> = {}): string {
  return securityMonitor.recordSecurityEvent({
    type: 'suspicious_activity',
    severity,
    source,
    details,
    metadata
  });
}

export function recordVulnerabilityDetected(source: string, details: string, severity: 'low' | 'medium' | 'high' | 'critical', metadata: Record<string, any> = {}): string {
  return securityMonitor.recordSecurityEvent({
    type: 'vulnerability_detected',
    severity,
    source,
    details,
    metadata
  });
}

export default {
  SecurityMonitor,
  securityMonitor,
  recordRateLimitViolation,
  recordAuthenticationFailure,
  recordSuspiciousActivity,
  recordVulnerabilityDetected
};