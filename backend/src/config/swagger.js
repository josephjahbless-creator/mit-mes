'use strict';

const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'MIT M&E System API',
      version: '1.0.0',
      description: 'Ministry of Industry & Trade — Monitoring and Evaluation System REST API.\n\n' +
        'Authentication: Bearer JWT token (from POST /api/auth/login) or API Key (X-API-Key header).',
      contact: { name: 'MIT ICT Department', email: 'ict@mit.go.tz' },
    },
    servers: [
      { url: 'https://172.16.20.54:5443', description: 'Production (LAN)' },
      { url: 'https://localhost:5443',     description: 'Local development' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        apiKey:     { type: 'apiKey', in: 'header', name: 'X-API-Key' },
      },
      schemas: {
        IndicatorActual: {
          type: 'object',
          properties: {
            id:              { type: 'string', format: 'uuid' },
            indicatorId:     { type: 'string', format: 'uuid' },
            institutionId:   { type: 'string', format: 'uuid' },
            fiscalYear:      { type: 'string', example: '2025-2026' },
            reportingPeriod: { type: 'string', enum: ['Q1','Q2','Q3','Q4','Annual'] },
            actualValue:     { type: 'number' },
            status:          { type: 'string', enum: ['draft','submitted','approved','rejected'] },
          },
        },
        Indicator: {
          type: 'object',
          properties: {
            id:   { type: 'string', format: 'uuid' },
            name: { type: 'string' },
            code: { type: 'string' },
            unit: { type: 'string' },
          },
        },
        Error: {
          type: 'object',
          properties: { error: { type: 'string' } },
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: 'Auth',         description: 'Authentication endpoints' },
      { name: 'Indicators',   description: 'Indicator definitions and library' },
      { name: 'Data Entry',   description: 'Submit and manage indicator actuals' },
      { name: 'Analytics',    description: 'Reporting analytics and AI insights' },
      { name: 'Institutions', description: 'Institution management' },
      { name: 'Reports',      description: 'Report generation and exports' },
      { name: 'Webhooks',     description: 'External data ingestion endpoints' },
    ],
  },
  apis: ['./src/modules/**/*.routes.js', './src/modules/**/*.controller.js'],
};

module.exports = swaggerJsdoc(options);
