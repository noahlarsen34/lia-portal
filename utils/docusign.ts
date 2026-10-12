import "server-only";

import { createHmac, createSign, timingSafeEqual } from "node:crypto";

type DocusignConfig = {
  accountId: string;
  baseUri: string;
  integrationKey: string;
  oauthBasePath: string;
  privateKey: string;
  userId: string;
};

type CreateMouEnvelopeInput = {
  document: Buffer;
  draftId: string;
  emailMessage: string;
  emailSubject: string;
  fileName: string;
  signerEmail: string;
  signerName: string;
  webhookUrl?: string;
};

export function isDocusignSendingEnabled() {
  return process.env.DOCUSIGN_SENDING_ENABLED?.trim().toLowerCase() === "true";
}

function base64Url(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function normalizePrivateKey(value: string) {
  return value.trim().replaceAll("\\n", "\n");
}

function normalizeHost(value: string) {
  return value.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function normalizeBaseUri(value: string) {
  return value.trim().replace(/\/$/, "");
}

function getDocusignConfig(): DocusignConfig {
  const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY?.trim();
  const userId = process.env.DOCUSIGN_USER_ID?.trim();
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID?.trim();
  const baseUri = process.env.DOCUSIGN_BASE_URI?.trim();
  const oauthBasePath = process.env.DOCUSIGN_OAUTH_BASE_PATH?.trim();
  const privateKey = process.env.DOCUSIGN_PRIVATE_KEY;

  if (!integrationKey || !userId || !accountId || !baseUri || !oauthBasePath || !privateKey) {
    throw new Error("DocuSign environment variables are incomplete.");
  }

  return {
    integrationKey,
    userId,
    accountId,
    baseUri: normalizeBaseUri(baseUri),
    oauthBasePath: normalizeHost(oauthBasePath),
    privateKey: normalizePrivateKey(privateKey),
  };
}

async function getAccessToken(config: DocusignConfig) {
  const now = Math.floor(Date.now() / 1000);
  const encodedHeader = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const encodedPayload = base64Url(JSON.stringify({
    iss: config.integrationKey,
    sub: config.userId,
    aud: config.oauthBasePath,
    iat: now,
    exp: now + 55 * 60,
    scope: "signature impersonation",
  }));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsignedToken);
  signer.end();
  const assertion = `${unsignedToken}.${base64Url(signer.sign(config.privateKey))}`;

  const response = await fetch(`https://${config.oauthBasePath}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
    cache: "no-store",
  });
  const result = await response.json() as { access_token?: string; error?: string; error_description?: string };

  if (!response.ok || !result.access_token) {
    throw new Error(result.error_description || result.error || `DocuSign authentication failed (${response.status}).`);
  }

  return result.access_token;
}

async function docusignRequest(path: string, init: RequestInit = {}) {
  const config = getDocusignConfig();
  const accessToken = await getAccessToken(config);
  const response = await fetch(
    `${config.baseUri}/restapi/v2.1/accounts/${config.accountId}${path}`,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        ...init.headers,
      },
      cache: "no-store",
    },
  );

  return response;
}

export async function createMouSignatureEnvelope(input: CreateMouEnvelopeInput) {
  const eventNotification = input.webhookUrl ? {
    url: input.webhookUrl,
    loggingEnabled: "true",
    requireAcknowledgment: "true",
    deliveryMode: "SIM",
    includeHMAC: "true",
    envelopeEvents: [
      { envelopeEventStatusCode: "sent" },
      { envelopeEventStatusCode: "delivered" },
      { envelopeEventStatusCode: "completed" },
      { envelopeEventStatusCode: "declined" },
      { envelopeEventStatusCode: "voided" },
    ],
    recipientEvents: [
      { recipientEventStatusCode: "delivered" },
      { recipientEventStatusCode: "completed" },
      { recipientEventStatusCode: "declined" },
    ],
    eventData: {
      version: "restv2.1",
      format: "json",
    },
  } : undefined;

  const response = await docusignRequest("/envelopes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      emailSubject: input.emailSubject,
      emailBlurb: input.emailMessage,
      status: "sent",
      documents: [{
        documentBase64: input.document.toString("base64"),
        documentId: "1",
        fileExtension: "docx",
        name: input.fileName,
      }],
      recipients: {
        signers: [{
          email: input.signerEmail,
          name: input.signerName,
          recipientId: "1",
          routingOrder: "1",
          tabs: {
            signHereTabs: [{
              anchorString: "Authorized Representative",
              anchorUnits: "pixels",
              anchorXOffset: "0",
              anchorYOffset: "18",
              anchorIgnoreIfNotPresent: "false",
            }],
            dateSignedTabs: [{
              anchorString: "Authorized Representative",
              anchorUnits: "pixels",
              anchorXOffset: "0",
              anchorYOffset: "64",
              anchorIgnoreIfNotPresent: "false",
            }],
          },
        }],
      },
      customFields: {
        textCustomFields: [{
          name: "lia_mou_draft_id",
          value: input.draftId,
          show: "false",
        }],
      },
      ...(eventNotification ? { eventNotification } : {}),
    }),
  });
  const result = await response.json() as {
    envelopeId?: string;
    status?: string;
    statusDateTime?: string;
    errorCode?: string;
    message?: string;
  };

  if (!response.ok || !result.envelopeId) {
    throw new Error(result.message || result.errorCode || `DocuSign envelope creation failed (${response.status}).`);
  }

  return {
    envelopeId: result.envelopeId,
    status: result.status || "sent",
    statusDateTime: result.statusDateTime || new Date().toISOString(),
  };
}

export async function getDocusignEnvelopeStatus(envelopeId: string) {
  const response = await docusignRequest(`/envelopes/${encodeURIComponent(envelopeId)}`);
  const result = await response.json() as {
    status?: string;
    statusChangedDateTime?: string;
    completedDateTime?: string;
    declinedDateTime?: string;
    voidedDateTime?: string;
    voidedReason?: string;
    errorCode?: string;
    message?: string;
  };

  if (!response.ok || !result.status) {
    throw new Error(result.message || result.errorCode || `DocuSign status request failed (${response.status}).`);
  }

  return result;
}

export async function downloadDocusignDocument(envelopeId: string, documentId: "combined" | "certificate") {
  const response = await docusignRequest(`/envelopes/${encodeURIComponent(envelopeId)}/documents/${documentId}`, {
    headers: { Accept: "application/pdf" },
  });

  if (!response.ok) {
    let message = `DocuSign document download failed (${response.status}).`;
    try {
      const result = await response.json() as { message?: string };
      message = result.message || message;
    } catch {
      // The error response is not guaranteed to be JSON.
    }
    throw new Error(message);
  }

  return Buffer.from(await response.arrayBuffer());
}

export function verifyDocusignHmac(payload: string, signature: string | null) {
  const secret = process.env.DOCUSIGN_CONNECT_HMAC_SECRET?.trim();
  if (!secret || !signature) return false;

  const expected = createHmac("sha256", secret).update(payload).digest();
  let received: Buffer;
  try {
    received = Buffer.from(signature, "base64");
  } catch {
    return false;
  }

  return expected.length === received.length && timingSafeEqual(expected, received);
}
