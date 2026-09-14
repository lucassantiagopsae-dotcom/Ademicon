// -----------------------------------------------------------------------------
// HighLevel / LeadConnector adapter.
//
// Ademicon uses the CRM pipeline as the source of truth for bottom-funnel
// events. The workflow sends an outbound webhook here when an opportunity moves
// to a mapped stage, and the generic CRM core sends that event back to Meta.
// -----------------------------------------------------------------------------

const HIGHLEVEL = {
  name: 'highlevel',
  tokenEnvVar: 'HIGHLEVEL_API_TOKEN',
  slugEnvVar: 'HIGHLEVEL_WEBHOOK_SLUG',

  parseWebhook({ body, hook }) {
    const contact = pickObject(body.contact)
      || pickObject(body.contactData)
      || pickObject(body.contact_data)
      || body;

    const opportunity = pickObject(body.opportunity)
      || pickObject(body.opportunityData)
      || pickObject(body.opportunity_data)
      || pickObject(body.deal)
      || body;

    const stage = firstString(
      body.stage,
      body.stage_name,
      body.stageName,
      body.pipeline_stage,
      body.pipelineStage,
      body.pipeline_stage_name,
      body.pipelineStageName,
      opportunity.stage,
      opportunity.stage_name,
      opportunity.stageName,
      opportunity.pipeline_stage,
      opportunity.pipelineStage,
      opportunity.pipeline_stage_name,
      opportunity.pipelineStageName,
      hook
    );

    return {
      personId: firstString(
        body.contact_id,
        body.contactId,
        body.contact?.id,
        body.contact?.contact_id,
        body.contact?.contactId,
        contact.id,
        contact.contact_id,
        contact.contactId,
        contact.email,
        contact.phone,
        body.email,
        body.phone
      ),
      dealId: firstString(
        body.opportunity_id,
        body.opportunityId,
        body.deal_id,
        body.dealId,
        opportunity.id,
        opportunity.opportunity_id,
        opportunity.opportunityId,
        opportunity.deal_id,
        opportunity.dealId
      ),
      stage,
      email: firstString(body.email, body.contact_email, contact.email, contact.emailAddress),
      phone: firstString(body.phone, body.contact_phone, contact.phone, contact.phoneNumber),
      name: firstString(
        body.name,
        body.full_name,
        body.fullName,
        contact.name,
        contact.full_name,
        contact.fullName,
        [contact.first_name || contact.firstName, contact.last_name || contact.lastName].filter(Boolean).join(' ')
      ),
      value: parseMoney(firstString(
        body.value,
        body.monetary_value,
        body.monetaryValue,
        opportunity.value,
        opportunity.monetary_value,
        opportunity.monetaryValue
      )),
    };
  },
};

export default HIGHLEVEL;

function pickObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function firstString(...values) {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const s = String(value).trim();
    if (s) return s;
  }
  return '';
}

function parseMoney(value) {
  if (!value) return 0;
  const s = String(value).trim();
  if (!s) return 0;

  const normalized = s
    .replace(/[^\d,.-]/g, '')
    .replace(/\.(?=\d{3}(?:\D|$))/g, '')
    .replace(',', '.');

  const n = Number.parseFloat(normalized);
  return Number.isFinite(n) ? n : 0;
}
