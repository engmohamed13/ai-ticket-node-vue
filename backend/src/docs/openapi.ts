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
    }
  }
};
