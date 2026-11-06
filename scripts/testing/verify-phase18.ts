import assert from "assert";
import { encryptSecret, decryptSecret, maskSecret } from "../../src/lib/integrations/crypto";
import { validateExternalUrl } from "../../src/lib/integrations/ssrf";
import { getCircuitBreaker } from "../../src/lib/integrations/circuit-breaker";
import { ApiKeyService } from "../../src/lib/integrations/api-auth";
import { WebhookService } from "../../src/lib/integrations/webhooks";
import { IntegrationManager } from "../../src/lib/integrations/manager";
import { HrDirectorySyncEngine } from "../../src/lib/integrations/hr-sync";
import { DataExchangeEngine } from "../../src/lib/integrations/data-exchange";
import { CalendarSyncService } from "../../src/lib/integrations/calendar-sync";
import { prisma } from "../../src/lib/prisma";

async function runTests() {
  console.log("=== STARTING PHASE 18 ENTERPRISE INTEGRATION VERIFICATION ===");

  // 1. Test Crypto and Secret Masking
  console.log("\n[Test 1] Crypto & Secret Management...");
  const rawKey = "sk_live_very_secret_enterprise_token_998877";
  const encrypted = encryptSecret(rawKey);
  assert(encrypted.startsWith("enc:v1:"), "Cipher must start with enc:v1:");
  assert(!encrypted.includes(rawKey), "Encrypted string must not expose raw key");
  const decrypted = decryptSecret(encrypted);
  assert.strictEqual(decrypted, rawKey, "Decrypted secret must match original");
  const masked = maskSecret(rawKey);
  assert.strictEqual(masked, "sk_l••••••••8877", "Masked display must protect sensitive middle characters");
  console.log("✓ Secret encryption, decryption, and masking verified.");

  // 2. Test SSRF Protection
  console.log("\n[Test 2] SSRF Protection Engine...");
  const ssrfLocalhost = validateExternalUrl("http://localhost:8080/secret");
  assert.strictEqual(ssrfLocalhost.isValid, false, "Localhost must be blocked");

  const ssrf127 = validateExternalUrl("https://127.0.0.1:443/admin");
  assert.strictEqual(ssrf127.isValid, false, "127.0.0.1 loopback must be blocked");

  const ssrfAwsMetadata = validateExternalUrl("http://169.254.169.254/latest/meta-data/");
  assert.strictEqual(ssrfAwsMetadata.isValid, false, "Cloud metadata IP must be blocked");

  const ssrfPrivate10 = validateExternalUrl("https://10.0.0.5/api");
  assert.strictEqual(ssrfPrivate10.isValid, false, "Private RFC 1918 10.x IP must be blocked");

  const ssrfPrivate192 = validateExternalUrl("https://192.168.1.100/webhook");
  assert.strictEqual(ssrfPrivate192.isValid, false, "Private RFC 1918 192.168.x IP must be blocked");
  assert.strictEqual(validateExternalUrl("https://[::1]/admin").isValid, false, "IPv6 loopback must be blocked");
  assert.strictEqual(validateExternalUrl("https://[::ffff:127.0.0.1]/admin").isValid, false, "IPv4-mapped IPv6 loopback must be blocked");
  assert.strictEqual(validateExternalUrl("https://[fc00::1]/admin").isValid, false, "IPv6 unique-local addresses must be blocked");

  const ssrfValid = validateExternalUrl("https://api.corporate-partner.org/webhooks");
  assert.strictEqual(ssrfValid.isValid, true, "Public HTTPS URL must be permitted");
  console.log("✓ SSRF filter blocks private IPs, metadata endpoints, and loopback.");

  // 3. Test Circuit Breaker
  console.log("\n[Test 3] Circuit Breaker & Fault Tolerance...");
  const breaker = getCircuitBreaker("test-crm-service", { failureThreshold: 2, recoveryTimeMs: 200 });
  breaker.reset();
  assert.strictEqual(breaker.getState(), "CLOSED");

  // Trigger failures
  try {
    await breaker.execute(async () => { throw new Error("Connection timed out"); });
  } catch {}
  try {
    await breaker.execute(async () => { throw new Error("503 Service Unavailable"); });
  } catch {}

  assert.strictEqual(breaker.getState(), "OPEN", "Circuit must trip to OPEN after 2 failures");

  let fastFailed = false;
  try {
    await breaker.execute(async () => "SHOULD_NOT_RUN");
  } catch (err: any) {
    if (err.message.includes("is OPEN")) fastFailed = true;
  }
  assert.strictEqual(fastFailed, true, "Calls to OPEN circuit must fast-fail without touching external network");
  console.log("✓ Circuit breaker trips and fast-fails safely to prevent cascading LMS outages.");

  const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  assert(adminUser, "Admin user required");

  // 4. Test Integration Registry & Test Connection
  console.log("\n[Test 4] Integration Registry & Test Connection...");
  assert(adminUser.organizationId, "Admin must have organization scope");
  await IntegrationManager.ensureDefaults(adminUser.organizationId);
  const connections = await IntegrationManager.listConnections(adminUser.organizationId);
  assert(connections.length >= 5, "Default connections should be initialized");
  
  const smtpConn = connections.find((c) => c.slug === "enterprise-email");
  assert(smtpConn, "corporate-smtp should exist");
  
  const healthCheck = await IntegrationManager.testConnection(smtpConn.id, adminUser.organizationId);
  assert.strictEqual(healthCheck.ok, false, "Unconfigured provider must not claim a successful connection");
  assert(healthCheck.message.includes("No production provider adapter"), "Safe diagnostic must identify missing adapter without pretending connectivity");
  console.log(`✓ Unconfigured ${smtpConn.name} reports disconnected honestly: ${healthCheck.message}`);

  // 5. Test REST API Key Generation & Authentication
  console.log("\n[Test 5] Enterprise API Key Generation & Auth...");
  const createdKey = await ApiKeyService.createCredential({
    name: "Enterprise BI Pipeline",
    scopes: ["users:read", "assessments:read", "learning_records:read"],
    createdById: adminUser.id,
  });

  assert(createdKey.clientId.startsWith("eb_client_"));
  assert(createdKey.clientSecret.startsWith("eb_live_"));

  // Simulate incoming request header authentication
  const headers = new Headers();
  headers.set("Authorization", `Bearer ${createdKey.clientSecret}`);

  const authResult = await ApiKeyService.authenticateRequest(headers);
  assert.strictEqual(authResult.isAuthenticated, true, "API request must be authenticated with valid secret");
  assert.strictEqual(ApiKeyService.hasScope(authResult, "users:read"), true);
  assert.strictEqual(ApiKeyService.hasScope(authResult, "grades:write"), false);
  const limitedKey = await ApiKeyService.createCredential({ name: "Rate-limit test", scopes: ["users:read"], rateLimitPerMin: 1, createdById: adminUser.id });
  const limitedHeaders = new Headers({ Authorization: `Bearer ${limitedKey.clientSecret}` });
  assert.strictEqual((await ApiKeyService.authenticateRequest(limitedHeaders)).rateLimited, undefined);
  assert.strictEqual((await ApiKeyService.authenticateRequest(limitedHeaders)).rateLimited, true);
  await ApiKeyService.revokeCredential((await prisma.apiClientCredential.findFirst({ where: { clientId: limitedKey.clientId } }))!.id, adminUser.id);
  assert.strictEqual((await ApiKeyService.authenticateRequest(limitedHeaders)).isAuthenticated, false);
  console.log("✓ REST API client auth, org binding, least-privilege scopes, rate limits, and revocation passed.");

  // 6. Test Webhooks HMAC Signature & Verification
  console.log("\n[Test 6] Webhook Dispatch & Inbound Verification...");
  const samplePayload = JSON.stringify({ event: "exam.completed", score: 95, studentId: "u_123" });
  const sampleSecret = "whsec_test_secret_key_5544";
  
  const signature = `sha256=${require("crypto").createHmac("sha256", sampleSecret).update(samplePayload).digest("hex")}`;
  const isSigValid = WebhookService.verifyInboundSignature(samplePayload, signature, sampleSecret);
  assert.strictEqual(isSigValid, true, "HMAC-SHA256 signature must verify correctly");
  
  const isForgedValid = WebhookService.verifyInboundSignature(samplePayload, "sha256=invalidhash", sampleSecret);
  assert.strictEqual(isForgedValid, false, "Tampered signature must be rejected");
  console.log("✓ Webhook cryptographic signing and verification verified.");

  // 7. Test HR & Directory Synchronization
  console.log("\n[Test 7] HR & Directory Synchronization...");
  const hrMarker = Date.now();
  const syncCandidates = [
    {
      externalId: `ext_emp_${hrMarker}_101`,
      email: `alex.sync.${hrMarker}@corp.example`,
      name: "Alex Sync (HR)",
      role: "STUDENT" as const,
      department: "Logistics",
      employeeId: `EMP-${hrMarker}-101`,
      status: "ACTIVE" as const,
    },
    {
      externalId: `ext_emp_${hrMarker}_102`,
      email: `taylor.sync.${hrMarker}@corp.example`,
      name: "Taylor Sync (HR)",
      role: "TEACHER" as const,
      department: "Safety",
      employeeId: `EMP-${hrMarker}-102`,
      status: "ACTIVE" as const,
    },
  ];

  const hrResult = await HrDirectorySyncEngine.syncUsers("workday-azure-sso", adminUser.organizationId, syncCandidates);
  assert.strictEqual(hrResult.created + hrResult.updated, 2, "Both candidate users should be processed");

  const createdStudent = await prisma.user.findFirst({
    where: { email: `alex.sync.${hrMarker}@corp.example` },
  });
  assert(createdStudent, "User should be present in database");
  
  const externalLink = await prisma.externalIdentityLink.findFirst({
    where: { userId: createdStudent.id },
  });
  assert(externalLink, "User should have ExternalIdentityLink");
  assert.strictEqual(externalLink.externalSubjectId, `ext_emp_${hrMarker}_101`);
  console.log("✓ HR Directory Sync successfully provisioned users and linked external identity.");

  // 8. Test Data Exchange (Import Dry Run & Export)
  console.log("\n[Test 8] Data Exchange (CSV Dry Run & Export)...");
  const sampleCsv = `email,name,role,department\nmorgan.import@corp.example,Morgan Import,STUDENT,Aviation\ninvalid_email_row,,STUDENT,Ops`;
  
  const validation = await DataExchangeEngine.validateImport(
    "test_users.csv",
    sampleCsv,
    "USERS",
    "CSV",
    adminUser.id
  );

  assert.strictEqual(validation.totalRows, 2, "Two rows parsed");
  assert.strictEqual(validation.validRows, 1, "One valid row");
  assert.strictEqual(validation.errorRows, 1, "One invalid row with two field errors detected");

  let invalidCommitRejected = false;
  try { await DataExchangeEngine.commitImport(validation.batchId, adminUser.id); }
  catch { invalidCommitRejected = true; }
  assert.strictEqual(invalidCommitRejected, true, "Invalid import must not partially commit any valid rows");

  const batchMarker = `phase18.${Date.now()}`;
  const uniqueRows = Array.from({ length: 12 }, (_, i) => `${batchMarker}.${i}@corp.example,Phase18 User ${i},STUDENT,Ops`);
  const fullCsv = `email,name,role,department\n${uniqueRows.join("\n")}`;
  const fullValidation = await DataExchangeEngine.validateImport("large_batch.csv", fullCsv, "USERS", "CSV", adminUser.id);
  assert.strictEqual(fullValidation.validRows, 12);
  await DataExchangeEngine.commitImport(fullValidation.batchId, adminUser.id);
  const createdCount = await prisma.user.count({ where: { email: { contains: batchMarker } } });
  assert.strictEqual(createdCount, 12, "All 12 rows must be committed; preview truncation must not lose data");
  const persistedBatch = await prisma.externalDataImportBatch.findUnique({ where: { id: fullValidation.batchId } });
  assert.strictEqual(persistedBatch?.status, "COMMITTED");
  assert.strictEqual(persistedBatch?.totalRows, 12);

  const exportCsv = await DataExchangeEngine.exportTrainingRecordsCsv(adminUser.organizationId);
  assert(exportCsv.includes("AttemptId,UserEmail,UserName"), "Export CSV should include valid headers");
  console.log("✓ Dry run validates row errors, rejects partial commits, and commits complete batches atomically.");

  // 9. Test Calendar Sync (iCalendar RFC 5545)
  console.log("\n[Test 9] RFC 5545 iCalendar Feed Generation...");
  const icsData = await CalendarSyncService.generateUserIcs(adminUser.id);
  assert(icsData.includes("BEGIN:VCALENDAR"), "Must contain VCALENDAR header");
  assert(icsData.includes("END:VCALENDAR"), "Must contain VCALENDAR footer");
  console.log("✓ Calendar sync generated standard RFC 5545 iCalendar schedule.");

  console.log("\n=== ALL PHASE 18 ENTERPRISE INTEGRATION TESTS PASSED SUCCESSFULLY! ===");
}

runTests().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
