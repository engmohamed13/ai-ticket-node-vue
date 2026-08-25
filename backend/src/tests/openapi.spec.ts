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
});
