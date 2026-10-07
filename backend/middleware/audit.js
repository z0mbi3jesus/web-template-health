/**
 * HIPAA Audit Logging Middleware
 * Logs all actions for compliance and security
 */

const { supabase: supabaseClient } = require('../config/database');

/**
 * Middleware factory for audit logging
 * @param {string} action - Action being performed (e.g., 'create', 'view', 'delete')
 * @param {string} resourceType - Type of resource (e.g., 'appointment', 'video_visit')
 */
function auditLog(action, resourceType) {
    return async (req, res, next) => {
        // Capture original send function
        const originalSend = res.send;

        // Store request info
        const auditEntry = {
            user_id: req.user?.id || null,
            action: action,
            resource_type: resourceType,
            resource_id: req.params.id || req.params.appointmentId || req.params.videoVisitId || null,
            ip_address: req.ip || req.connection.remoteAddress,
            user_agent: req.get('user-agent'),
            status: null,
            status_code: null,
            error_message: null,
            details: {
                method: req.method,
                path: req.path,
                query: req.query,
                userId: req.user?.id,
                userRole: req.user?.role
            }
        };

        // Override res.send to capture response
        res.send = function(data) {
            auditEntry.status_code = res.statusCode;
            auditEntry.status = res.statusCode < 400 ? 'success' : 'failure';

            // Log to database asynchronously (don't block response)
            logAudit(auditEntry).catch(err => {
                console.error('Audit logging error:', err);
            });

            // Call original send
            return originalSend.call(this, data);
        };

        next();
    };
}

/**
 * Record audit entry to database
 */
async function logAudit(entry) {
    try {
        await supabaseClient
            .from('audit_log')
            .insert([entry]);
    } catch (error) {
        console.error('Failed to log audit entry:', error);
    }
}

/**
 * Retrieve audit log (admin only)
 */
async function getAuditLog(filters = {}) {
    try {
        let query = supabaseClient
            .from('audit_log')
            .select('*')
            .order('created_at', { ascending: false });

        // Apply filters
        if (filters.userId) {
            query = query.eq('user_id', filters.userId);
        }
        if (filters.action) {
            query = query.eq('action', filters.action);
        }
        if (filters.resourceType) {
            query = query.eq('resource_type', filters.resourceType);
        }
        if (filters.startDate) {
            query = query.gte('created_at', filters.startDate);
        }
        if (filters.endDate) {
            query = query.lte('created_at', filters.endDate);
        }

        // Limit results
        query = query.limit(filters.limit || 1000);

        const { data, error } = await query;
        
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error retrieving audit log:', error);
        throw error;
    }
}

/**
 * Log failed access attempt
 */
async function logAccessDenied(userId, action, resourceType, resourceId, reason) {
    try {
        await supabaseClient
            .from('audit_log')
            .insert([{
                user_id: userId,
                action: action,
                resource_type: resourceType,
                resource_id: resourceId,
                status: 'denied',
                error_message: reason
            }]);
    } catch (error) {
        console.error('Failed to log denied access:', error);
    }
}

/**
 * Log video visit events specifically
 */
async function logVideoEvent(userId, videoVisitId, event, details = {}) {
    try {
        await supabaseClient
            .from('audit_log')
            .insert([{
                user_id: userId,
                action: `video_${event}`,
                resource_type: 'video_visit',
                resource_id: videoVisitId,
                status: 'success',
                details: {
                    timestamp: new Date().toISOString(),
                    ...details
                }
            }]);
    } catch (error) {
        console.error('Failed to log video event:', error);
    }
}

module.exports = {
    auditLog,
    logAudit,
    getAuditLog,
    logAccessDenied,
    logVideoEvent
};
