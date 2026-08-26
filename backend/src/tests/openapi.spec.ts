import { openApiDocument } from '../docs/openapi';

describe('openApiDocument', () => {
  it('documents the database readiness probe', () => {
    expect(openApiDocument.paths['/health/db']).toBeDefined();
    expect(openApiDocument.paths['/health/db'].get.responses['200']).toBeDefined();
    expect(openApiDocument.paths['/health/db'].get.responses['503']).toBeDefined();
  });

  it('documents the DatabaseHealth schema', () => {
    expect(openApiDocument.components.schemas.DatabaseHealth).toBeDefined();
  });

  it('documents the 503 response on /health', () => {
    expect(openApiDocument.paths['/health'].get.responses['503']).toBeDefined();
  });

  it('documents customer endpoints', () => {
    expect(openApiDocument.paths['/customers']).toBeDefined();
    expect(openApiDocument.paths['/customers/{id}']).toBeDefined();
    expect(openApiDocument.paths['/customers/{id}/timeline']).toBeDefined();
    expect(openApiDocument.paths['/customers/{id}/notes']).toBeDefined();
    expect(openApiDocument.paths['/customers/{id}/attachments']).toBeDefined();
    expect(openApiDocument.paths['/customers/{id}/attachments/{attachmentId}']).toBeDefined();
    expect(openApiDocument.components.schemas.Customer).toBeDefined();
    expect(openApiDocument.components.schemas.CustomerNote).toBeDefined();
    expect(openApiDocument.components.schemas.CustomerAttachment).toBeDefined();
  });

  it('documents ticket endpoints', () => {
    expect(openApiDocument.paths['/tickets']).toBeDefined();
    expect(openApiDocument.paths['/tickets'].post).toBeDefined();
    expect(openApiDocument.paths['/tickets/categories']).toBeDefined();
    expect(openApiDocument.paths['/tickets/{id}']).toBeDefined();
    expect(openApiDocument.paths['/tickets/{id}'].patch).toBeDefined();
    expect(openApiDocument.paths['/tickets/{id}/assign']).toBeDefined();
    expect(openApiDocument.paths['/tickets/{id}/comments']).toBeDefined();
    expect(openApiDocument.paths['/tickets/{id}/attachments']).toBeDefined();
    expect(openApiDocument.paths['/tickets/{id}/attachments/{attachmentId}']).toBeDefined();
    expect(openApiDocument.paths['/tickets/{id}/timeline']).toBeDefined();
    expect(openApiDocument.components.schemas.Ticket).toBeDefined();
    expect(openApiDocument.components.schemas.TicketCategory).toBeDefined();
    expect(openApiDocument.components.schemas.TicketComment).toBeDefined();
    expect(openApiDocument.components.schemas.TicketAttachment).toBeDefined();
  });

  it('documents interaction endpoints', () => {
    expect(openApiDocument.paths['/interactions']).toBeDefined();
    expect(openApiDocument.paths['/interactions/{id}']).toBeDefined();
    expect(openApiDocument.paths['/interactions/{id}/associate']).toBeDefined();
    expect(openApiDocument.components.schemas.Interaction).toBeDefined();
  });
});
