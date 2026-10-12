import { zodToJsonSchema } from 'zod-to-json-schema';
import {
  organizationInput,
  updateOrganizationInput,
  organizationRegistryViewSchema,
  profileInput,
  sourceRequestInput,
  alertPreferenceInput,
  partnerInput,
  invitationInput,
  tenderRequirementsExtractionSchema,
  procurementAIAnalysisSchema,
  opportunityBriefSchema,
} from './index.js';
export const inputSchemas = Object.fromEntries(
  Object.entries({
    OrganizationInput: organizationInput,
    UpdateOrganizationInput: updateOrganizationInput,
    OrganizationRegistryView: organizationRegistryViewSchema,
    ProfileInput: profileInput,
    SourceRequestInput: sourceRequestInput,
    AlertPreferenceInput: alertPreferenceInput,
    PartnerInput: partnerInput,
    InvitationInput: invitationInput,
    TenderRequirementsExtraction: tenderRequirementsExtractionSchema,
    ProcurementAIAnalysis: procurementAIAnalysisSchema,
    OpportunityBrief: opportunityBriefSchema,
  }).map(([name, schema]) => [
    name,
    zodToJsonSchema(schema, { target: 'openApi3', $refStrategy: 'none' }),
  ]),
);
