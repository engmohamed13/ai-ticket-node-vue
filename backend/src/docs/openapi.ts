// TODO: generate this document from the zod route schemas once more endpoints exist.
// Hand-authored for now so the docs have zero codegen dependencies.

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
          createdAt: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'name', 'email', 'createdAt']
      },
      Ticket: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          subject: { type: 'string' },
          status: { type: 'string' },
          customerId: { type: 'integer' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        },
        required: ['id', 'subject', 'status', 'customerId', 'createdAt', 'updatedAt']
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
      }
    }
  },
  paths: {
    '/health': {
      get: {
        summary: 'API liveness check',
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
        responses: {
          '200': {
            description: 'List of customers',
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
    '/tickets': {
      get: {
        summary: 'List tickets',
        parameters: [
          {
            name: 'customerId',
            in: 'query',
            required: false,
            schema: { type: 'integer' }
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
    }
  }
};
