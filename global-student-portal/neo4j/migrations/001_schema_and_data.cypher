// Reset graph for reproducible runs
MATCH (n) DETACH DELETE n;

CREATE CONSTRAINT component_name_unique IF NOT EXISTS
FOR (c:Component)
REQUIRE c.name IS UNIQUE;

UNWIND [
  {name: 'PortalWeb', layer: 'Presentation', description: 'Web client for students/faculty/admin'},
  {name: 'APIGateway', layer: 'Edge', description: 'Global API entry point, routing and auth checks'},
  {name: 'IdentityAccess', layer: 'Core', description: 'Authentication, SSO federation, authorization'},
  {name: 'PortalBFF', layer: 'Core', description: 'Backend-for-frontend / GraphQL aggregator'},
  {name: 'StudentProfile', layer: 'Core', description: 'Student profile and program data'},
  {name: 'AcademicRecords', layer: 'Core', description: 'Grades, GPA, transcripts, enrollment history'},
  {name: 'Registration', layer: 'Core', description: 'Enrollment, capacity checks, waitlist'},
  {name: 'BillingPayments', layer: 'Core', description: 'Tuition invoices, payment processing'},
  {name: 'RequestTicket', layer: 'Core', description: 'Student service request workflow'},
  {name: 'Notification', layer: 'Core', description: 'In-app/email/push/SMS notifications'},
  {name: 'Document', layer: 'Core', description: 'Generated documents and document access'},
  {name: 'TenantConfig', layer: 'Core', description: 'Tenant policies, SSO, calendar, feature flags'},
  {name: 'EventBus', layer: 'Infrastructure', description: 'Async events between core services'}
] AS component
MERGE (c:Component {name: component.name})
SET c.layer = component.layer,
    c.description = component.description;

UNWIND [
  ['PortalWeb','APIGateway'],
  ['APIGateway','IdentityAccess'],
  ['APIGateway','PortalBFF'],
  ['PortalBFF','IdentityAccess'],
  ['PortalBFF','StudentProfile'],
  ['PortalBFF','AcademicRecords'],
  ['PortalBFF','Registration'],
  ['PortalBFF','BillingPayments'],
  ['PortalBFF','RequestTicket'],
  ['PortalBFF','Notification'],
  ['PortalBFF','Document'],
  ['PortalBFF','TenantConfig'],
  ['IdentityAccess','TenantConfig'],
  ['Registration','AcademicRecords'],
  ['Registration','EventBus'],
  ['AcademicRecords','Document'],
  ['AcademicRecords','EventBus'],
  ['BillingPayments','Document'],
  ['BillingPayments','EventBus'],
  ['BillingPayments','TenantConfig'],
  ['RequestTicket','Notification'],
  ['Notification','TenantConfig'],
  ['EventBus','Notification']
] AS dep
MATCH (from:Component {name: dep[0]})
MATCH (to:Component {name: dep[1]})
MERGE (from)-[:DEPENDS_ON]->(to);

MATCH (c:Component)
RETURN c.name AS component, c.layer AS layer
ORDER BY component;
