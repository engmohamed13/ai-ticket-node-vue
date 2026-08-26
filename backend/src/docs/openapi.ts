// TODO: generate this document from the zod route schemas once more endpoints exist.
// Hand-authored for now so the docs have zero codegen dependencies.

import { TICKET_PRIORITIES, TICKET_STATUSES } from '../tickets/types';

export const openApiDocument = {
  openapi: '3.0.3',
  info: {
    title: 'CustomerSupportCRM API',
    version: '1.0.0',
    description: 'REST API for the CustomerSupportCRM project.'
  },
  servers: [{ url: 'http://localhost:3000/api', description: 'Local development' }],
  components: {
    schemas: {
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: {}
        },
        required: ['success', 'message', 'data']
      },
      DatabaseHealth: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['up', 'down'] },
          latencyMs: { type: 'number', nullable: true },
          schemaVersion: { type: 'string', nullable: true },
          error: { type: 'string', nullable: true }
        },
        required: ['status', 'latencyMs', 'schemaVersion', 'error']
      },
      Customer: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          email: { type: 'string' },
          phone: { type: 'string', nullable: true },
          company: { type: 'string', nullable: true },
          address: { type: 'string', nullable: true },
          city: { type: 'string', nullable: true },
          country: { type: 'string', nullable: true },
          status: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'PROSPECT', 'ARCHIVED'] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'name', 'email', 'status', 'createdAt', 'updatedAt']
      },
      CustomerNote: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          body: { type: 'string' },
          customerId: { type: 'integer' },
          authorId: { type: 'integer' },
          author: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' }
            }
          },
          createdAt: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'body', 'customerId', 'authorId', 'author', 'createdAt']
      },
      CustomerAttachment: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          fileName: { type: 'string' },
          mimeType: { type: 'string' },
          sizeBytes: { type: 'integer' },
          customerId: { type: 'integer' },
          uploadedById: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'fileName', 'mimeType', 'sizeBytes', 'customerId', 'uploadedById', 'createdAt']
      },
      TicketCategory: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          color: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'name', 'color', 'createdAt']
      },
      TicketComment: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          body: { type: 'string' },
          ticketId: { type: 'integer' },
          authorId: { type: 'integer' },
          author: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' }
            }
          },
          createdAt: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'body', 'ticketId', 'authorId', 'author', 'createdAt']
      },
      TicketsSummary: {
        type: 'object',
        properties: {
          totalTickets: { type: 'integer' },
          openTickets: { type: 'integer' },
          pendingTickets: { type: 'integer' },
          resolvedTickets: { type: 'integer' },
          overdueTickets: { type: 'integer' },
          unassignedTickets: { type: 'integer' },
          byStatus: {
            type: 'array',
            items: {
              type: 'object',
              properties: { status: { type: 'string' }, count: { type: 'integer' } }
            }
          },
          byPriority: {
            type: 'array',
            items: {
              type: 'object',
              properties: { priority: { type: 'string' }, count: { type: 'integer' } }
            }
          }
        },
        required: ['totalTickets', 'openTickets', 'resolvedTickets', 'overdueTickets', 'byStatus', 'byPriority']
      },
      CustomerSatisfaction: {
        type: 'object',
        properties: {
          averageRating: {
            type: 'number',
            nullable: true,
            description: 'null when nothing has been rated yet, never 0'
          },
          totalFeedback: { type: 'integer' },
          ratingBreakdown: {
            type: 'array',
            items: {
              type: 'object',
              properties: { rating: { type: 'integer' }, count: { type: 'integer' } }
            }
          }
        },
        required: ['averageRating', 'totalFeedback', 'ratingBreakdown']
      },
      TicketTrendPoint: {
        type: 'object',
        properties: {
          week: { type: 'string', description: 'ISO week key, e.g. 2026-W35' },
          created: { type: 'integer' },
          resolved: { type: 'integer' }
        },
        required: ['week', 'created', 'resolved']
      },
      AgentWorkloadRow: {
        type: 'object',
        properties: {
          agentId: { type: 'integer' },
          agentName: { type: 'string' },
          totalAssigned: { type: 'integer' },
          open: { type: 'integer' },
          pending: { type: 'integer' },
          resolved: { type: 'integer' },
          overdue: { type: 'integer' }
        },
        required: ['agentId', 'agentName', 'totalAssigned', 'open', 'pending', 'resolved', 'overdue']
      },
      Notification: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          userId: { type: 'integer' },
          type: {
            type: 'string',
            enum: [
              'ticket_assigned',
              'ticket_status_changed',
              'ticket_comment',
              'ticket_overdue',
              'feedback_received'
            ]
          },
          title: { type: 'string' },
          message: { type: 'string' },
          isRead: { type: 'boolean' },
          relatedTicketId: { type: 'integer', nullable: true },
          relatedCustomerId: { type: 'integer', nullable: true },
          relatedFeedbackId: { type: 'integer', nullable: true },
          createdAt: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'userId', 'type', 'title', 'message', 'isRead', 'createdAt']
      },
      KbCategory: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          createdAt: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'name', 'createdAt']
      },
      KbArticle: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          title: { type: 'string' },
          summary: { type: 'string', nullable: true },
          body: { type: 'string', description: 'Markdown. Omitted from list responses.' },
          categoryId: { type: 'integer' },
          category: { $ref: '#/components/schemas/KbCategory' },
          isPublished: { type: 'boolean' },
          viewCount: { type: 'integer' },
          authorId: { type: 'integer' },
          author: {
            type: 'object',
            properties: { id: { type: 'integer' }, name: { type: 'string' } }
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        },
        required: [
          'id',
          'title',
          'categoryId',
          'isPublished',
          'viewCount',
          'authorId',
          'createdAt',
          'updatedAt'
        ]
      },
      TicketFeedback: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          rating: { type: 'integer', minimum: 1, maximum: 5 },
          comment: { type: 'string', nullable: true },
          ticketId: { type: 'integer' },
          customerId: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'rating', 'ticketId', 'customerId', 'createdAt', 'updatedAt']
      },
      CustomerPortalSummary: {
        type: 'object',
        properties: {
          totalTickets: { type: 'integer' },
          openTickets: { type: 'integer' },
          pendingTickets: { type: 'integer' },
          resolvedTickets: { type: 'integer' },
          awaitingFeedback: { type: 'integer' }
        },
        required: ['totalTickets', 'openTickets', 'pendingTickets', 'resolvedTickets', 'awaitingFeedback']
      },
      TicketAttachment: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          fileName: { type: 'string' },
          mimeType: { type: 'string' },
          sizeBytes: { type: 'integer' },
          ticketId: { type: 'integer' },
          uploadedById: { type: 'integer' },
          uploadedBy: {
            type: 'object',
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' }
            }
          },
          createdAt: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'fileName', 'mimeType', 'sizeBytes', 'ticketId', 'uploadedById', 'createdAt']
      },
      Ticket: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          subject: { type: 'string' },
          status: { type: 'string', enum: [...TICKET_STATUSES] },
          priority: { type: 'string', enum: [...TICKET_PRIORITIES] },
          customerId: { type: 'integer' },
          categoryId: { type: 'integer', nullable: true },
          category: { allOf: [{ $ref: '#/components/schemas/TicketCategory' }], nullable: true },
          assignedToUserId: { type: 'integer', nullable: true },
          assignedTo: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              email: { type: 'string' }
            }
          },
          responseTimeMinutes: { type: 'integer', nullable: true },
          resolutionTimeMinutes: { type: 'integer', nullable: true },
          respondedAt: { type: 'string', format: 'date-time', nullable: true },
          resolvedAt: { type: 'string', format: 'date-time', nullable: true },
          comments: { type: 'array', items: { $ref: '#/components/schemas/TicketComment' } },
          attachments: { type: 'array', items: { $ref: '#/components/schemas/TicketAttachment' } },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'subject', 'status', 'priority', 'customerId', 'createdAt', 'updatedAt']
      },
      Interaction: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          channel: { type: 'string', enum: ['EMAIL', 'WHATSAPP', 'LIVE_CHAT', 'SMS', 'WEB_FORM'] },
          direction: { type: 'string', enum: ['INBOUND', 'OUTBOUND'] },
          subject: { type: 'string', nullable: true },
          body: { type: 'string' },
          externalRef: { type: 'string' },
          customerId: { type: 'integer' },
          ticketId: { type: 'integer', nullable: true },
          occurredAt: { type: 'string', format: 'date-time' },
          createdAt: { type: 'string', format: 'date-time' }
        },
        required: [
          'id',
          'channel',
          'direction',
          'body',
          'externalRef',
          'customerId',
          'occurredAt',
          'createdAt'
        ]
      },
      AuthUser: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          email: { type: 'string' },
          isActive: { type: 'boolean' },
          roleKey: { type: 'string', enum: ['SYSTEM_ADMINISTRATOR', 'CRM_MANAGER', 'SUPPORT_SUPERVISOR', 'SUPPORT_AGENT', 'CUSTOMER', 'REPORTING_USER'] },
          roleName: { type: 'string' },
          permissions: { type: 'array', items: { type: 'string' } },
          customerId: { type: 'integer', nullable: true },
          department: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' }
            }
          },
          branch: {
            type: 'object',
            nullable: true,
            properties: {
              id: { type: 'integer' },
              name: { type: 'string' },
              code: { type: 'string' }
            }
          }
        },
        required: ['id', 'name', 'email', 'isActive', 'roleKey', 'roleName', 'permissions', 'customerId', 'department', 'branch']
      },
      LoginResult: {
        type: 'object',
        properties: {
          token: { type: 'string' },
          user: { $ref: '#/components/schemas/AuthUser' }
        },
        required: ['token', 'user']
      },
      Role: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          key: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string', nullable: true },
          permissions: { type: 'array', items: { type: 'string' } }
        },
        required: ['id', 'key', 'name', 'permissions']
      },
      Permission: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          key: { type: 'string' },
          description: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'key', 'description', 'createdAt']
      },
      Branch: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          code: { type: 'string' },
          createdAt: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'name', 'code', 'createdAt']
      },
      Department: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          name: { type: 'string' },
          branchId: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'name', 'branchId', 'createdAt']
      }
    },
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT'
      }
    }
  },
  security: [{ bearerAuth: [] }],
  paths: {
    '/dashboard/tickets-summary': {
      get: {
        summary: 'Ticket KPIs and the status/priority distributions',
        description:
          'Requires reports:read. Overdue is derived per row from the SLA targets, since nothing marks a ticket overdue on a schedule. Every status and priority is returned, zeros included.',
        parameters: [
          { name: 'startDate', in: 'query', required: false, schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', required: false, schema: { type: 'string', format: 'date' } },
          { name: 'status', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'priority', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'assignedToUserId', in: 'query', required: false, schema: { type: 'integer' } }
        ],
        responses: {
          '200': {
            description: 'Counters plus the two distributions',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/TicketsSummary' } } }
          },
          '400': {
            description: 'Validation failed, or startDate is after endDate',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '401': {
            description: 'Unauthorized',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '403': {
            description: 'Forbidden - requires reports:read',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          }
        }
      }
    },
    '/dashboard/customer-satisfaction': {
      get: {
        summary: 'Average customer satisfaction rating and its breakdown',
        description:
          'Requires reports:read. Filtered by when the rating was left, not when the ticket was opened.',
        parameters: [
          { name: 'startDate', in: 'query', required: false, schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', required: false, schema: { type: 'string', format: 'date' } },
          { name: 'status', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'priority', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'assignedToUserId', in: 'query', required: false, schema: { type: 'integer' } }
        ],
        responses: {
          '200': {
            description: 'Average, total, and the 1-5 breakdown',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/CustomerSatisfaction' } }
            }
          },
          '400': {
            description: 'Validation failed, or startDate is after endDate',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '401': {
            description: 'Unauthorized',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '403': {
            description: 'Forbidden - requires reports:read',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          }
        }
      }
    },
    '/dashboard/ticket-trends': {
      get: {
        summary: 'Tickets created and resolved per week',
        description:
          'Requires reports:read. Returns one bucket per week in the trailing window, zeros included, oldest first.',
        parameters: [
          {
            name: 'weeks',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 1, maximum: 52, default: 8 }
          },
          { name: 'startDate', in: 'query', required: false, schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', required: false, schema: { type: 'string', format: 'date' } },
          { name: 'status', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'priority', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'assignedToUserId', in: 'query', required: false, schema: { type: 'integer' } }
        ],
        responses: {
          '200': {
            description: 'The weekly series',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/TicketTrendPoint' } }
              }
            }
          },
          '400': {
            description: 'Validation failed, or startDate is after endDate',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '401': {
            description: 'Unauthorized',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '403': {
            description: 'Forbidden - requires reports:read',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          }
        }
      }
    },
    '/dashboard/agent-workload': {
      get: {
        summary: 'Per-agent ticket load, busiest first',
        description:
          'Requires reports:read. Agents holding no tickets are omitted - the panel answers who is loaded, not who exists.',
        parameters: [
          { name: 'startDate', in: 'query', required: false, schema: { type: 'string', format: 'date' } },
          { name: 'endDate', in: 'query', required: false, schema: { type: 'string', format: 'date' } },
          { name: 'status', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'priority', in: 'query', required: false, schema: { type: 'string' } },
          { name: 'assignedToUserId', in: 'query', required: false, schema: { type: 'integer' } }
        ],
        responses: {
          '200': {
            description: 'One row per agent holding at least one ticket',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/AgentWorkloadRow' } }
              }
            }
          },
          '400': {
            description: 'Validation failed, or startDate is after endDate',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '401': {
            description: 'Unauthorized',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '403': {
            description: 'Forbidden - requires reports:read',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          }
        }
      }
    },
    '/dashboard/kb-top-articles': {
      get: {
        summary: 'Most-read published knowledge base articles',
        description: 'Requires reports:read.',
        parameters: [
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', minimum: 1, maximum: 25, default: 5 }
          }
        ],
        responses: {
          '200': {
            description: 'Articles ranked by view count',
            content: {
              'application/json': {
                schema: { type: 'array', items: { $ref: '#/components/schemas/KbArticle' } }
              }
            }
          },
          '400': {
            description: 'Validation failed, or startDate is after endDate',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '401': {
            description: 'Unauthorized',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '403': {
            description: 'Forbidden - requires reports:read',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          }
        }
      }
    },
    '/notifications': {
      get: {
        summary: 'List the signed-in user in-app notifications',
        description:
          'No permission gate: every authenticated caller reads its own inbox and nobody else can. Reading the list is also what raises overdue (SLA) notifications, since this module has no scheduler. Returns the newest 50 plus the unread count.',
        parameters: [
          {
            name: 'unreadOnly',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['true', 'false'] }
          }
        ],
        responses: {
          '200': {
            description: 'An object with items and unreadCount',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '400': {
            description: 'Validation failed',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '401': {
            description: 'Unauthorized',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          }
        }
      }
    },
    '/notifications/read-all': {
      patch: {
        summary: 'Mark every unread notification as read',
        responses: {
          '200': {
            description: 'The number of notifications updated',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '401': {
            description: 'Unauthorized',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          }
        }
      }
    },
    '/notifications/{id}/read': {
      patch: {
        summary: 'Mark one notification as read',
        description: 'Scoped to the caller: another user notification is a 404, not a 403.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': {
            description: 'The updated notification',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '401': {
            description: 'Unauthorized',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '404': {
            description: 'Notification not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          }
        }
      }
    },
    '/notifications/{id}': {
      delete: {
        summary: 'Dismiss one notification',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': {
            description: 'Notification dismissed',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '401': {
            description: 'Unauthorized',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '404': {
            description: 'Notification not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          }
        }
      }
    },
    '/kb/categories': {
      get: {
        summary: 'List knowledge base categories',
        description: 'Requires kb:read, which every role holds.',
        responses: {
          '200': {
            description: 'Categories, alphabetically',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '401': {
            description: 'Unauthorized',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '403': {
            description: 'Forbidden',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          }
        }
      }
    },
    '/kb/articles': {
      get: {
        summary: 'Search and list knowledge base articles',
        description:
          'Requires kb:read. Returns published articles only, unless the caller holds kb:manage and passes includeDrafts=true. The markdown body is omitted from list rows.',
        parameters: [
          {
            name: 'search',
            in: 'query',
            required: false,
            schema: { type: 'string' },
            description: 'Case-insensitive match against title, summary, and body'
          },
          { name: 'categoryId', in: 'query', required: false, schema: { type: 'integer' } },
          {
            name: 'includeDrafts',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['true', 'false'] },
            description: 'Authors only; ignored without kb:manage'
          }
        ],
        responses: {
          '200': {
            description: 'Matching articles, most-read first',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '400': {
            description: 'Validation failed',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '401': {
            description: 'Unauthorized',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '403': {
            description: 'Forbidden',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          }
        }
      },
      post: {
        summary: 'Create a knowledge base article',
        description: 'Requires kb:manage. Created as a draft unless isPublished is true.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string', maxLength: 255 },
                  body: { type: 'string' },
                  categoryId: { type: 'integer' },
                  summary: { type: 'string', maxLength: 500 },
                  isPublished: { type: 'boolean' }
                },
                required: ['title', 'body', 'categoryId']
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Article created',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '400': {
            description: 'Validation failed',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '401': {
            description: 'Unauthorized',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '403': {
            description: 'Forbidden',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '404': {
            description: 'Category not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          }
        }
      }
    },
    '/kb/articles/{id}': {
      get: {
        summary: 'Read one knowledge base article',
        description:
          'Requires kb:read. Increments the view counter on a published read. An unpublished draft is a 404 unless the caller holds kb:manage.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': {
            description: 'The article, including its markdown body',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '401': {
            description: 'Unauthorized',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '403': {
            description: 'Forbidden',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '404': {
            description: 'Article not found, or an unpublished draft',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          }
        }
      },
      patch: {
        summary: 'Update, publish, or unpublish a knowledge base article',
        description: 'Requires kb:manage. Send only the fields to change.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  title: { type: 'string', maxLength: 255 },
                  body: { type: 'string' },
                  categoryId: { type: 'integer' },
                  summary: { type: 'string', maxLength: 500, nullable: true },
                  isPublished: { type: 'boolean' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Article updated',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '400': {
            description: 'Validation failed',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '401': {
            description: 'Unauthorized',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '403': {
            description: 'Forbidden',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '404': {
            description: 'Article or category not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          }
        }
      }
    },
    '/tickets/{id}/feedback': {
      get: {
        summary: 'Get the customer satisfaction feedback left on a ticket',
        description:
          'Requires `feedback:read`. A CUSTOMER-role token may only read feedback on its own ticket. Returns `data: null` when the ticket has not been rated.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          '200': {
            description: 'Feedback, or null when the ticket has not been rated',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '401': {
            description: 'Unauthorized',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '403': {
            description: 'Forbidden',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '404': {
            description: 'Ticket not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          }
        }
      },
      post: {
        summary: 'Submit customer satisfaction feedback on a resolved ticket',
        description:
          'Requires `feedback:write` and a customer-linked account. The ticket must be Resolved or Closed and may only be rated once.',
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  rating: { type: 'integer', minimum: 1, maximum: 5 },
                  comment: { type: 'string', maxLength: 1000 }
                },
                required: ['rating']
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Feedback submitted',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '400': {
            description: 'Validation failed, or the ticket is not Resolved/Closed',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '401': {
            description: 'Unauthorized',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '403': {
            description: 'Forbidden',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '404': {
            description: 'Ticket not found',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '409': {
            description: 'Feedback already submitted for this ticket',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          }
        }
      }
    },
    '/customers/portal/tickets': {
      get: {
        summary: "List the signed-in customer's own tickets",
        description:
          'Customer portal. Requires `tickets:read` and a customer-linked account; staff tokens are refused.',
        responses: {
          '200': {
            description: "The caller's tickets, newest first, each with its feedback summary",
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '401': {
            description: 'Unauthorized',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '403': {
            description: 'Not a customer account',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          }
        }
      }
    },
    '/customers/portal/summary': {
      get: {
        summary: "Ticket counters for the signed-in customer's portal dashboard",
        responses: {
          '200': {
            description: 'Total, open, pending, resolved, and awaiting-feedback counts',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '401': {
            description: 'Unauthorized',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          },
          '403': {
            description: 'Not a customer account',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiResponse' } } }
          }
        }
      }
    },
    '/health': {
      get: {
        summary: 'API liveness check',
        security: [],
        parameters: [
          {
            name: 'verbose',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['true', 'false'] }
          }
        ],
        responses: {
          '200': {
            description: 'API and database are healthy',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '503': {
            description: 'API is up but the database is unreachable',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      }
    },
    '/health/db': {
      get: {
        summary: 'Database readiness probe',
        security: [],
        responses: {
          '200': {
            description: 'Database is reachable',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '503': {
            description: 'Database is unreachable',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      }
    },
    '/customers': {
      get: {
        summary: 'List all customers',
        parameters: [
          {
            name: 'search',
            in: 'query',
            required: false,
            schema: { type: 'string' }
          },
          {
            name: 'status',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['ACTIVE', 'INACTIVE', 'PROSPECT', 'ARCHIVED'] }
          }
        ],
        responses: {
          '200': {
            description: 'List of customers',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      },
      post: {
        summary: 'Create a customer profile',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Customer' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Customer created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '400': {
            description: 'Validation failed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '409': {
            description: 'A customer with this email already exists',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      }
    },
    '/customers/{id}': {
      get: {
        summary: 'Get a single customer profile',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        responses: {
          '200': {
            description: 'Customer profile',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '404': {
            description: 'Customer not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      },
      patch: {
        summary: 'Update a customer profile',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Customer' }
            }
          }
        },
        responses: {
          '200': {
            description: 'Customer updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '400': {
            description: 'Validation failed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '404': {
            description: 'Customer not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '409': {
            description: 'A customer with this email already exists',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      }
    },
    '/customers/{id}/notes': {
      get: {
        summary: 'List notes on a customer profile',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        responses: {
          '200': {
            description: 'List of customer notes',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '404': {
            description: 'Customer not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      },
      post: {
        summary: 'Add a note to a customer profile',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/CustomerNote' }
            }
          }
        },
        responses: {
          '201': {
            description: 'Note added',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '400': {
            description: 'Validation failed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '404': {
            description: 'Customer not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      }
    },
    '/customers/{id}/attachments': {
      get: {
        summary: 'List attachments on a customer profile',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        responses: {
          '200': {
            description: 'List of customer attachments',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '404': {
            description: 'Customer not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      },
      post: {
        summary: 'Upload an attachment to a customer profile',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: { type: 'string', format: 'binary' }
                },
                required: ['file']
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Attachment uploaded',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '400': {
            description: 'Missing file or file exceeds the maximum allowed size',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '404': {
            description: 'Customer not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      }
    },
    '/customers/{id}/attachments/{attachmentId}/download': {
      get: {
        summary: 'Download a customer attachment',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          },
          {
            name: 'attachmentId',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        responses: {
          '200': {
            description: 'The attachment binary',
            content: {
              'application/octet-stream': {}
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '404': {
            description: 'Attachment not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      }
    },
    '/customers/{id}/attachments/{attachmentId}': {
      delete: {
        summary: 'Delete a customer attachment',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          },
          {
            name: 'attachmentId',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        responses: {
          '200': {
            description: 'Attachment deleted',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '404': {
            description: 'Attachment not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      }
    },
    '/customers/{id}/timeline': {
      get: {
        summary: 'Get customer interaction timeline',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        responses: {
          '200': {
            description: 'Customer interactions in chronological order',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '404': {
            description: 'Customer not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      }
    },
    '/tickets/categories': {
      get: {
        summary: 'List ticket categories',
        responses: {
          '200': {
            description: 'List of ticket categories',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      }
    },
    '/tickets': {
      get: {
        summary: 'List tickets',
        parameters: [
          {
            name: 'customerId',
            in: 'query',
            required: false,
            schema: { type: 'integer' }
          },
          {
            name: 'status',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: [...TICKET_STATUSES] }
          },
          {
            name: 'priority',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: [...TICKET_PRIORITIES] }
          },
          {
            name: 'categoryId',
            in: 'query',
            required: false,
            schema: { type: 'integer' }
          },
          {
            name: 'assignedToUserId',
            in: 'query',
            required: false,
            schema: { type: 'integer' }
          },
          {
            name: 'assignedToMe',
            in: 'query',
            required: false,
            description: 'Dashboard My Tickets tab - resolves to the own user id of the caller.',
            schema: { type: 'string', enum: ['true', 'false'] }
          },
          {
            name: 'unassigned',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['true', 'false'] }
          }
        ],
        responses: {
          '200': {
            description: 'List of tickets',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      },
      post: {
        summary: 'Create a ticket',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  subject: { type: 'string' },
                  customerId: { type: 'integer' },
                  categoryId: { type: 'integer' },
                  priority: { type: 'string', enum: [...TICKET_PRIORITIES] },
                  assignedToUserId: { type: 'integer' },
                  responseTimeMinutes: { type: 'integer' },
                  resolutionTimeMinutes: { type: 'integer' }
                },
                required: ['subject', 'customerId']
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Ticket created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '400': {
            description: 'Validation failed or the assignee is not an active staff user',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '404': {
            description: 'Customer, category, or assignee not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      }
    },
    '/tickets/{id}': {
      get: {
        summary: 'Get a ticket by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        responses: {
          '200': {
            description: 'Ticket details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '404': {
            description: 'Ticket not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      },
      patch: {
        summary: 'Update a ticket subject, status, priority, category, or SLA targets',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  subject: { type: 'string' },
                  status: { type: 'string', enum: [...TICKET_STATUSES] },
                  priority: { type: 'string', enum: [...TICKET_PRIORITIES] },
                  categoryId: { type: 'integer', nullable: true },
                  responseTimeMinutes: { type: 'integer' },
                  resolutionTimeMinutes: { type: 'integer' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Ticket updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '400': {
            description: 'Validation failed or no fields supplied',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '404': {
            description: 'Ticket or category not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      }
    },
    '/tickets/{id}/assign': {
      patch: {
        summary: 'Assign or reassign a ticket to an agent. Send null to unassign.',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  assignedToUserId: { type: 'integer', nullable: true }
                },
                required: ['assignedToUserId']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Ticket assigned',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '400': {
            description: 'The assignee is deactivated or is a customer account',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '404': {
            description: 'Ticket or user not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      }
    },
    '/tickets/{id}/comments': {
      get: {
        summary: 'List internal comments on a ticket',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        responses: {
          '200': {
            description: 'List of ticket comments',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '404': {
            description: 'Ticket not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      },
      post: {
        summary: 'Add an internal comment to a ticket',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  body: { type: 'string' }
                },
                required: ['body']
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Comment added',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '400': {
            description: 'Validation failed',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '404': {
            description: 'Ticket not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      }
    },
    '/tickets/{id}/attachments': {
      get: {
        summary: 'List attachments on a ticket',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        responses: {
          '200': {
            description: 'List of ticket attachments',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '404': {
            description: 'Ticket not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      },
      post: {
        summary: 'Upload an attachment to a ticket',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'multipart/form-data': {
              schema: {
                type: 'object',
                properties: {
                  file: { type: 'string', format: 'binary' }
                },
                required: ['file']
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Attachment uploaded',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '400': {
            description: 'Missing file or file exceeds the maximum allowed size',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '404': {
            description: 'Ticket not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      }
    },
    '/tickets/{id}/attachments/{attachmentId}/download': {
      get: {
        summary: 'Download a ticket attachment',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          },
          {
            name: 'attachmentId',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        responses: {
          '200': {
            description: 'The attachment binary',
            content: {
              'application/octet-stream': {}
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '404': {
            description: 'Attachment not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      }
    },
    '/tickets/{id}/attachments/{attachmentId}': {
      delete: {
        summary: 'Delete a ticket attachment',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          },
          {
            name: 'attachmentId',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        responses: {
          '200': {
            description: 'Attachment deleted',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '404': {
            description: 'Attachment not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      }
    },
    '/tickets/{id}/timeline': {
      get: {
        summary: 'Get ticket interaction timeline',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        responses: {
          '200': {
            description: 'Ticket interactions in chronological order',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '404': {
            description: 'Ticket not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      }
    },
    '/interactions': {
      post: {
        summary: 'Create an interaction',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  channel: { type: 'string', enum: ['EMAIL', 'WHATSAPP', 'LIVE_CHAT', 'SMS', 'WEB_FORM'] },
                  direction: { type: 'string', enum: ['INBOUND', 'OUTBOUND'] },
                  customerId: { type: 'integer' },
                  ticketId: { type: 'integer' },
                  subject: { type: 'string' },
                  body: { type: 'string' }
                },
                required: ['channel', 'direction', 'customerId', 'body']
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Interaction created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '400': {
            description: 'Validation error or invalid ticket association',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '404': {
            description: 'Customer or ticket not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      }
    },
    '/interactions/{id}': {
      get: {
        summary: 'Get an interaction by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        responses: {
          '200': {
            description: 'Interaction details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '404': {
            description: 'Interaction not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      }
    },
    '/interactions/{id}/associate': {
      patch: {
        summary: 'Associate an interaction with a ticket',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  ticketId: { type: 'integer' }
                },
                required: ['ticketId']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Interaction associated with ticket',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '400': {
            description: 'Ticket belongs to a different customer',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '404': {
            description: 'Interaction or ticket not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      }
    },
    '/auth/login': {
      post: {
        summary: 'User login',
        security: [],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' }
                },
                required: ['email', 'password']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Login successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '401': {
            description: 'Invalid credentials',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': {
            description: 'Account deactivated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      }
    },
    '/auth/logout': {
      post: {
        summary: 'User logout',
        security: [],
        responses: {
          '200': {
            description: 'Logout successful',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      }
    },
    '/auth/me': {
      get: {
        summary: 'Get current user',
        responses: {
          '200': {
            description: 'Current user details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      }
    },
    '/users': {
      get: {
        summary: 'List users',
        responses: {
          '200': {
            description: 'List of users',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      },
      post: {
        summary: 'Create user',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string' },
                  roleId: { type: 'integer' },
                  departmentId: { type: 'integer' },
                  branchId: { type: 'integer' },
                  customerId: { type: 'integer' }
                },
                required: ['name', 'email', 'password', 'roleId']
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'User created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '409': {
            description: 'User already exists',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      }
    },
    '/users/{id}': {
      get: {
        summary: 'Get user by ID',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        responses: {
          '200': {
            description: 'User details',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '404': {
            description: 'User not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      },
      patch: {
        summary: 'Update user',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  roleId: { type: 'integer' },
                  departmentId: { type: 'integer', nullable: true },
                  branchId: { type: 'integer', nullable: true },
                  customerId: { type: 'integer', nullable: true },
                  isActive: { type: 'boolean' }
                }
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'User updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '404': {
            description: 'User not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      },
      delete: {
        summary: 'Deactivate user',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        responses: {
          '200': {
            description: 'User deactivated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '400': {
            description: 'Cannot deactivate self or last admin',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '404': {
            description: 'User not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      }
    },
    '/users/{id}/password': {
      patch: {
        summary: 'Change user password',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  password: { type: 'string' }
                },
                required: ['password']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Password updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '404': {
            description: 'User not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      }
    },
    '/roles': {
      get: {
        summary: 'List roles',
        responses: {
          '200': {
            description: 'List of roles',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      }
    },
    '/roles/{id}/permissions': {
      put: {
        summary: 'Set role permissions',
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'integer' }
          }
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  permissions: { type: 'array', items: { type: 'string' } }
                },
                required: ['permissions']
              }
            }
          }
        },
        responses: {
          '200': {
            description: 'Role permissions updated',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '400': {
            description: 'Validation error or cannot strip required permissions',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '404': {
            description: 'Role not found',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      }
    },
    '/permissions': {
      get: {
        summary: 'List permissions',
        responses: {
          '200': {
            description: 'List of permissions',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      }
    },
    '/branches': {
      get: {
        summary: 'List branches',
        responses: {
          '200': {
            description: 'List of branches',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      },
      post: {
        summary: 'Create branch',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  code: { type: 'string' }
                },
                required: ['name', 'code']
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Branch created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '409': {
            description: 'Branch already exists',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      }
    },
    '/departments': {
      get: {
        summary: 'List departments',
        parameters: [
          {
            name: 'branchId',
            in: 'query',
            required: false,
            schema: { type: 'integer' }
          }
        ],
        responses: {
          '200': {
            description: 'List of departments',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      },
      post: {
        summary: 'Create department',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  branchId: { type: 'integer' }
                },
                required: ['name', 'branchId']
              }
            }
          }
        },
        responses: {
          '201': {
            description: 'Department created',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '400': {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '401': {
            description: 'Unauthorized',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '403': {
            description: 'Forbidden',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          },
          '409': {
            description: 'Department already exists',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ApiResponse' }
              }
            }
          }
        }
      }
    }
  }
};
